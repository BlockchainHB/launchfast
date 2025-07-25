import { 
  supabaseServer, 
  TABLES, 
  BatchHelpers, 
  QueryBuilders, 
  ErrorHelpers,
  SupabaseTransaction 
} from './supabase-client'
import { Logger } from './logger'
import type { 
  KeywordResearchResult, 
  KeywordResearchOptions,
  AsinKeywordResult,
  AggregatedKeyword,
  AsinComparisonData,
  OpportunityData,
  GapAnalysisResult 
} from '@/types'

export interface SavedSession {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
  settings: KeywordResearchOptions
  asins: Array<{
    asin: string
    is_user_product: boolean
    order_index: number
    status: string
  }>
}

export class KeywordResearchDB {
  
  /**
   * Save complete research session to database
   */
  static async saveResearchSession(
    userId: string,
    asins: string[],
    results: KeywordResearchResult,
    options: KeywordResearchOptions,
    sessionName?: string
  ): Promise<string> {
    try {
      Logger.dev.trace(`Saving research session for ${asins.length} ASINs`)
      
      // Generate session name if not provided
      const name = sessionName || this.generateSessionName(asins)
      
      // Create session record
      const { data: session, error: sessionError } = await supabaseServer
        .from(TABLES.SESSIONS)
        .insert({
          user_id: userId,
          name,
          settings: options
        })
        .select('id')
        .single()
      
      if (sessionError || !session) {
        throw new Error(`Failed to create session: ${sessionError?.message}`)
      }
      
      const sessionId = session.id
      Logger.dev.trace(`Created session ${sessionId}`)
      
      // Save in transaction-like manner
      await this.saveSessionData(sessionId, asins, results)
      
      Logger.dev.trace(`Research session ${sessionId} saved successfully`)
      return sessionId
      
    } catch (error) {
      Logger.error('Failed to save research session', error)
      throw new Error(ErrorHelpers.formatError(error))
    }
  }
  
  /**
   * Save all session data (ASINs, keywords, rankings, opportunities, gaps)
   */
  private static async saveSessionData(
    sessionId: string,
    asins: string[],
    results: KeywordResearchResult
  ): Promise<void> {
    try {
      // 1. Save ASINs
      await this.saveSessionAsins(sessionId, asins)
      
      // 2. Collect and save all unique keywords
      const keywordMap = await this.saveAllKeywords(results)
      
      // 3. Save ASIN keyword rankings
      await this.saveKeywordRankings(sessionId, results.asinResults, keywordMap)
      
      // 4. Save opportunities
      if (results.opportunities?.length > 0) {
        await this.saveOpportunities(sessionId, results.opportunities, keywordMap)
      }
      
      // 5. Save gap analysis
      if (results.gapAnalysis) {
        await this.saveGapAnalysis(sessionId, results.gapAnalysis, keywordMap)
      }
      
    } catch (error) {
      Logger.error('Failed to save session data', error)
      throw error
    }
  }
  
  /**
   * Save session ASINs with proper ordering
   */
  private static async saveSessionAsins(sessionId: string, asins: string[]): Promise<void> {
    const asinRecords = asins.map((asin, index) => ({
      session_id: sessionId,
      asin,
      is_user_product: index === 0, // First ASIN is user's product
      order_index: index,
      status: 'completed',
      processed_at: new Date().toISOString()
    }))
    
    const { error } = await supabaseServer
      .from(TABLES.ASINS)
      .insert(asinRecords)
    
    if (error) {
      throw new Error(`Failed to save ASINs: ${error.message}`)
    }
  }
  
  /**
   * Save all unique keywords from research results
   */
  private static async saveAllKeywords(results: KeywordResearchResult): Promise<Map<string, string>> {
    // Collect all unique keywords from different sources
    const uniqueKeywords = new Map<string, {
      keyword_text: string
      search_volume: number
      cpc: number
    }>()
    
    // From ASIN results
    results.asinResults.forEach(asinResult => {
      if (asinResult.status === 'success') {
        asinResult.keywords.forEach(kw => {
          if (!uniqueKeywords.has(kw.keyword)) {
            uniqueKeywords.set(kw.keyword, {
              keyword_text: kw.keyword,
              search_volume: kw.searchVolume,
              cpc: kw.cpc
            })
          }
        })
      }
    })
    
    // From aggregated keywords
    results.aggregatedKeywords.forEach(kw => {
      if (!uniqueKeywords.has(kw.keyword)) {
        uniqueKeywords.set(kw.keyword, {
          keyword_text: kw.keyword,
          search_volume: kw.searchVolume,
          cpc: kw.avgCpc
        })
      }
    })
    
    // From opportunities
    results.opportunities?.forEach(opp => {
      if (!uniqueKeywords.has(opp.keyword)) {
        uniqueKeywords.set(opp.keyword, {
          keyword_text: opp.keyword,
          search_volume: opp.searchVolume,
          cpc: opp.avgCpc
        })
      }
    })
    
    // From gap analysis
    results.gapAnalysis?.gaps.forEach(gap => {
      if (!uniqueKeywords.has(gap.keyword)) {
        uniqueKeywords.set(gap.keyword, {
          keyword_text: gap.keyword,
          search_volume: gap.searchVolume,
          cpc: gap.avgCpc
        })
      }
    })
    
    // Batch insert keywords
    return await BatchHelpers.insertKeywordsBatch(Array.from(uniqueKeywords.values()))
  }
  
  /**
   * Save keyword rankings for each ASIN
   */
  private static async saveKeywordRankings(
    sessionId: string,
    asinResults: AsinKeywordResult[],
    keywordMap: Map<string, string>
  ): Promise<void> {
    const rankings: Array<{
      session_id: string
      asin: string
      keyword_id: string
      ranking_position: number | null
      traffic_percentage: number | null
    }> = []
    
    asinResults.forEach(asinResult => {
      if (asinResult.status === 'success') {
        asinResult.keywords.forEach(kw => {
          const keywordId = keywordMap.get(kw.keyword)
          if (keywordId) {
            rankings.push({
              session_id: sessionId,
              asin: asinResult.asin,
              keyword_id: keywordId,
              ranking_position: kw.rankingPosition || null,
              traffic_percentage: kw.trafficPercentage || null
            })
          }
        })
      }
    })
    
    if (rankings.length > 0) {
      await BatchHelpers.insertRankingsBatch(rankings)
    }
  }
  
  /**
   * Save opportunity keywords
   */
  private static async saveOpportunities(
    sessionId: string,
    opportunities: OpportunityData[],
    keywordMap: Map<string, string>
  ): Promise<void> {
    const oppRecords = opportunities.map(opp => {
      const keywordId = keywordMap.get(opp.keyword)
      if (!keywordId) return null
      
      return {
        session_id: sessionId,
        keyword_id: keywordId,
        opportunity_type: opp.opportunityType || 'standard',
        competition_score: opp.competitionScore,
        supply_demand_ratio: opp.supplyDemandRatio,
        competitor_performance: opp.competitorPerformance || {}
      }
    }).filter(Boolean)
    
    if (oppRecords.length > 0) {
      const { error } = await supabaseServer
        .from(TABLES.OPPORTUNITIES)
        .insert(oppRecords)
      
      if (error) {
        throw new Error(`Failed to save opportunities: ${error.message}`)
      }
    }
  }
  
  /**
   * Save gap analysis results
   */
  private static async saveGapAnalysis(
    sessionId: string,
    gapAnalysis: GapAnalysisResult,
    keywordMap: Map<string, string>
  ): Promise<void> {
    const gapRecords = gapAnalysis.gaps.map(gap => {
      const keywordId = keywordMap.get(gap.keyword)
      if (!keywordId) return null
      
      return {
        session_id: sessionId,
        keyword_id: keywordId,
        gap_type: gap.gapType,
        gap_score: gap.gapScore,
        user_ranking_position: gap.userRanking.position,
        competitors_data: {
          user_asin: gap.userRanking.asin,
          competitor_rankings: gap.competitorRankings,
          user_ranking: gap.userRanking
        },
        recommendation: gap.recommendation,
        potential_impact: gap.potentialImpact
      }
    }).filter(Boolean)
    
    if (gapRecords.length > 0) {
      const { error } = await supabaseServer
        .from(TABLES.GAPS)
        .insert(gapRecords)
      
      if (error) {
        throw new Error(`Failed to save gap analysis: ${error.message}`)
      }
    }
  }
  
  /**
   * Load user's research sessions
   */
  static async loadUserSessions(userId: string): Promise<SavedSession[]> {
    try {
      const { data, error } = await QueryBuilders.sessionListQuery(userId)
      
      if (error) {
        throw new Error(`Failed to load sessions: ${error.message}`)
      }
      
      return (data || []).map(session => ({
        id: session.id,
        name: session.name,
        user_id: userId,
        created_at: session.created_at,
        updated_at: session.updated_at,
        settings: session.settings || {},
        asins: (session.research_asins || []).map(asin => ({
          asin: asin.asin,
          is_user_product: asin.is_user_product,
          order_index: asin.order_index,
          status: 'completed'
        }))
      }))
      
    } catch (error) {
      Logger.error('Failed to load user sessions', error)
      throw new Error(ErrorHelpers.formatError(error))
    }
  }
  
  /**
   * Reconstruct complete research results from database
   */
  static async reconstructSessionResults(
    userId: string,
    sessionId: string
  ): Promise<KeywordResearchResult | null> {
    try {
      Logger.dev.trace(`Reconstructing session ${sessionId} from database`)
      
      // Verify user owns this session
      const { data: sessionCheck } = await supabaseServer
        .from(TABLES.SESSIONS)  
        .select('user_id')
        .eq('id', sessionId)
        .single()
      
      if (!sessionCheck || sessionCheck.user_id !== userId) {
        Logger.warn(`User ${userId} attempted to access session ${sessionId}`)
        return null
      }
      
      // Load all session data
      const queries = QueryBuilders.sessionReconstructQuery(sessionId)
      const [session, asins, rankings, opportunities, gaps] = await Promise.all([
        queries.session,
        queries.asins,
        queries.rankings,
        queries.opportunities,
        queries.gaps
      ])
      
      if (session.error || !session.data) {
        throw new Error(`Session not found: ${session.error?.message}`)
      }
      
      // Reconstruct the results object
      const result = await this.buildResultsFromData({
        session: session.data,
        asins: asins.data || [],
        rankings: rankings.data || [],
        opportunities: opportunities.data || [],
        gaps: gaps.data || []
      })
      
      Logger.dev.trace(`Successfully reconstructed session ${sessionId}`)
      return result
      
    } catch (error) {
      Logger.error('Failed to reconstruct session results', error)
      return null
    }
  }
  
  /**
   * Build KeywordResearchResult from database data
   */
  private static async buildResultsFromData(data: {
    session: any
    asins: any[]
    rankings: any[]
    opportunities: any[]
    gaps: any[]
  }): Promise<KeywordResearchResult> {
    
    // Build ASIN results
    const asinResults: AsinKeywordResult[] = data.asins.map(asin => {
      const asinRankings = data.rankings.filter(r => r.asin === asin.asin)
      
      return {
        asin: asin.asin,
        productTitle: undefined,
        keywordCount: asinRankings.length,
        keywords: asinRankings.map(r => ({
          keyword: r.keyword_research_keywords.keyword_text,
          searchVolume: r.keyword_research_keywords.search_volume,
          rankingPosition: r.ranking_position,
          trafficPercentage: r.traffic_percentage,
          cpc: r.keyword_research_keywords.cpc
        })),
        status: 'success' as const
      }
    })
    
    // Build aggregated keywords
    const keywordMap = new Map<string, {
      keyword: string
      searchVolume: number
      cpcValues: number[]
      rankingAsins: Array<{
        asin: string
        position: number
        trafficPercentage: number
      }>
    }>()
    
    data.rankings.forEach(r => {
      const keyword = r.keyword_research_keywords.keyword_text
      if (!keywordMap.has(keyword)) {
        keywordMap.set(keyword, {
          keyword,
          searchVolume: r.keyword_research_keywords.search_volume,
          cpcValues: [],
          rankingAsins: []
        })
      }
      
      const kwData = keywordMap.get(keyword)!
      kwData.cpcValues.push(r.keyword_research_keywords.cpc)
      kwData.rankingAsins.push({
        asin: r.asin,
        position: r.ranking_position || 0,
        trafficPercentage: r.traffic_percentage || 0
      })
    })
    
    const aggregatedKeywords: AggregatedKeyword[] = Array.from(keywordMap.values()).map(kwData => {
      const avgCpc = kwData.cpcValues.reduce((sum, cpc) => sum + cpc, 0) / kwData.cpcValues.length
      const opportunityScore = this.calculateOpportunityScore(kwData, avgCpc)
      
      return {
        keyword: kwData.keyword,
        searchVolume: kwData.searchVolume,
        avgCpc: Math.round(avgCpc * 100) / 100,
        rankingAsins: kwData.rankingAsins,
        opportunityScore
      }
    }).sort((a, b) => b.opportunityScore - a.opportunityScore)
    
    // Build comparison view
    const comparisonView: AsinComparisonData[] = asinResults.map(result => {
      const sortedKeywords = [...result.keywords].sort((a, b) => b.searchVolume - a.searchVolume)
      const strongKeywords = result.keywords.filter(kw => 
        kw.rankingPosition && kw.rankingPosition <= 15
      ).sort((a, b) => a.rankingPosition! - b.rankingPosition!)
      
      const weakKeywords = result.keywords.filter(kw => 
        kw.rankingPosition && kw.rankingPosition > 15
      ).sort((a, b) => b.searchVolume - a.searchVolume)
      
      const avgSearchVolume = result.keywords.length > 0
        ? Math.round(result.keywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / result.keywords.length)
        : 0
      
      return {
        asin: result.asin,
        productTitle: result.productTitle,
        totalKeywords: result.keywords.length,
        avgSearchVolume,
        topKeywords: sortedKeywords.slice(0, 20),
        strongKeywords: strongKeywords.slice(0, 15),
        weakKeywords: weakKeywords.slice(0, 15),
        status: 'success' as const
      }
    })
    
    // Build opportunities
    const opportunities: OpportunityData[] = data.opportunities.map(opp => ({
      keyword: opp.keyword_research_keywords.keyword_text,
      searchVolume: opp.keyword_research_keywords.search_volume,
      competitionScore: opp.competition_score,
      supplyDemandRatio: opp.supply_demand_ratio,
      avgCpc: opp.keyword_research_keywords.cpc,
      competitorPerformance: opp.competitor_performance,
      opportunityType: opp.opportunity_type
    }))
    
    // Build gap analysis
    let gapAnalysis: GapAnalysisResult | undefined
    if (data.gaps.length > 0) {
      const userAsin = data.asins.find(a => a.is_user_product)?.asin || data.asins[0]?.asin
      const competitorAsins = data.asins.filter(a => !a.is_user_product).map(a => a.asin)
      
      const gaps = data.gaps.map(gap => ({
        keyword: gap.keyword_research_keywords.keyword_text,
        searchVolume: gap.keyword_research_keywords.search_volume,
        avgCpc: gap.keyword_research_keywords.cpc,
        gapType: gap.gap_type,
        gapScore: gap.gap_score,
        competitorRankings: gap.competitors_data.competitor_rankings || [],
        userRanking: gap.competitors_data.user_ranking || {
          asin: userAsin,
          position: gap.user_ranking_position,
          trafficPercentage: 0
        },
        recommendation: gap.recommendation,
        potentialImpact: gap.potential_impact
      }))
      
      const totalGapPotential = gaps.reduce((sum, g) => sum + g.searchVolume, 0)
      
      gapAnalysis = {
        userAsin,
        competitorAsins,
        analysis: {
          totalGapsFound: gaps.length,
          highVolumeGaps: gaps.filter(g => g.searchVolume >= 5000).length,
          mediumVolumeGaps: gaps.filter(g => g.searchVolume >= 1000 && g.searchVolume < 5000).length,
          avgGapVolume: gaps.length > 0 ? Math.round(totalGapPotential / gaps.length) : 0,
          totalGapPotential
        },
        gaps
      }
    }
    
    // Calculate overview
    const successfulResults = asinResults.filter(r => r.status === 'success')
    const totalKeywords = successfulResults.reduce((sum, r) => sum + r.keywordCount, 0)
    const avgSearchVolume = aggregatedKeywords.length > 0 
      ? Math.round(aggregatedKeywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / aggregatedKeywords.length)
      : 0
    
    return {
      overview: {
        totalAsins: data.asins.length,
        totalKeywords,
        avgSearchVolume,
        processingTime: 0 // Reconstruct doesn't have processing time
      },
      asinResults,
      aggregatedKeywords,
      comparisonView,
      opportunities,
      gapAnalysis
    }
  }
  
  /**
   * Find sessions matching specific ASINs
   */
  static async findMatchingSessions(userId: string, asins: string[]): Promise<SavedSession[]> {
    try {
      const { data, error } = await supabaseServer
        .from(TABLES.SESSIONS)
        .select(`
          *,
          research_asins!inner(asin, order_index)
        `)
        .eq('user_id', userId)
      
      if (error) {
        throw new Error(`Failed to find matching sessions: ${error.message}`)
      }
      
      // Filter sessions that have exactly the same ASINs in the same order
      const matchingSessions = (data || []).filter(session => {
        const sessionAsins = session.research_asins
          .sort((a, b) => a.order_index - b.order_index)
          .map(a => a.asin)
        
        return sessionAsins.length === asins.length &&
               sessionAsins.every((asin, index) => asin === asins[index])
      })
      
      return matchingSessions.map(session => ({
        id: session.id,
        name: session.name,
        user_id: session.user_id,
        created_at: session.created_at,
        updated_at: session.updated_at,
        settings: session.settings || {},
        asins: session.research_asins.map(asin => ({
          asin: asin.asin,
          is_user_product: false, // Will be set properly if needed
          order_index: asin.order_index,
          status: 'completed'
        }))
      }))
      
    } catch (error) {
      Logger.error('Failed to find matching sessions', error)
      return []
    }
  }
  
  /**
   * Delete a research session and all related data
   */
  static async deleteSession(userId: string, sessionId: string): Promise<void> {
    try {
      // Verify ownership
      const { data: session } = await supabaseServer
        .from(TABLES.SESSIONS)
        .select('user_id')
        .eq('id', sessionId)
        .single()
      
      if (!session || session.user_id !== userId) {
        throw new Error('Session not found or access denied')
      }
      
      // Delete session (cascade will handle related data)
      const { error } = await supabaseServer
        .from(TABLES.SESSIONS)
        .delete()
        .eq('id', sessionId)
      
      if (error) {
        throw new Error(`Failed to delete session: ${error.message}`)
      }
      
      Logger.dev.trace(`Session ${sessionId} deleted successfully`)
      
    } catch (error) {
      Logger.error('Failed to delete session', error)
      throw new Error(ErrorHelpers.formatError(error))
    }
  }
  
  /**
   * Update session name
   */
  static async updateSessionName(
    userId: string,
    sessionId: string,
    newName: string
  ): Promise<void> {
    try {
      const { error } = await supabaseServer
        .from(TABLES.SESSIONS)
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', userId) // Ensure user owns session
      
      if (error) {
        throw new Error(`Failed to update session name: ${error.message}`)
      }
      
    } catch (error) {
      Logger.error('Failed to update session name', error)
      throw new Error(ErrorHelpers.formatError(error))
    }
  }
  
  // Helper methods
  
  private static generateSessionName(asins: string[]): string {
    const timestamp = new Date().toLocaleDateString()
    if (asins.length === 1) {
      return `${asins[0]} - ${timestamp}`
    }
    return `${asins[0]} vs ${asins.length - 1} competitors - ${timestamp}`
  }
  
  private static calculateOpportunityScore(
    keywordData: { searchVolume: number; rankingAsins: any[] },
    avgCpc: number
  ): number {
    const searchVolumeScore = Math.min(keywordData.searchVolume / 10000, 10)
    const competitionScore = Math.max(0, 10 - keywordData.rankingAsins.length)
    const cpcScore = avgCpc > 0.5 && avgCpc < 3.0 ? 5 : Math.max(0, 5 - Math.abs(avgCpc - 1.5))
    
    return Math.round((searchVolumeScore + competitionScore + cpcScore) / 3 * 100) / 100
  }
}

// Export for easy access
export const kwDB = KeywordResearchDB