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
  GapAnalysisResult,
  KeywordData 
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
    sessionName?: string,
    existingSessionId?: string
  ): Promise<string> {
    try {
      Logger.dev.trace(`Saving research session for ${asins.length} ASINs`)
      
      // Generate session name if not provided
      const name = sessionName || this.generateSessionName(asins)
      
      let sessionId: string
      
      if (existingSessionId) {
        // Use existing session ID
        sessionId = existingSessionId
        
        // Update or create session record
        const { error: sessionError } = await supabaseServer
          .from(TABLES.SESSIONS)
          .upsert({
            id: sessionId,
            user_id: userId,
            name,
            settings: options
          })
        
        if (sessionError) {
          throw new Error(`Failed to upsert session: ${sessionError.message}`)
        }
        
        Logger.dev.trace(`Using existing session ${sessionId}`)
      } else {
        // Create new session
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
      
        sessionId = session.id
      Logger.dev.trace(`Created session ${sessionId}`)
      }
      
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
   * Create enhanced keyword record from keyword data
   */
  private static createEnhancedKeywordRecord(keyword: any, keywordText: string, searchVolume: number, cpc: number) {
    return {
      keyword_text: keywordText,
      search_volume: searchVolume,
      cpc: cpc,
      // Enhanced fields from reverse ASIN and keyword mining
      purchases: keyword.purchases,
      purchase_rate: keyword.purchaseRate,
      monopoly_click_rate: keyword.monopolyClickRate,
      cvs_share_rate: keyword.cvsShareRate,
      products_count: keyword.products !== undefined ? Math.round(keyword.products) : null,
      ad_products_count: keyword.adProducts !== undefined ? Math.round(keyword.adProducts) : null,
      supply_demand_ratio: keyword.supplyDemandRatio,
      avg_price: keyword.avgPrice,
      avg_rating: keyword.avgRating || keyword.avgRatings,
      bid_min: keyword.bidMin || null,
      bid_max: keyword.bidMax || null,
      title_density: keyword.titleDensity,
      relevancy_score: keyword.relevancy,
      word_count: keyword.wordCount ? Math.round(keyword.wordCount) : null,
      spr_rank: keyword.spr ? Math.round(keyword.spr) : null,
      search_rank: keyword.searchRank ? Math.round(keyword.searchRank) : null,
      departments: keyword.departments,
      amazon_choice: keyword.amazonChoice,
      is_supplement: keyword.supplement === 'Y',
      keyword_cn: keyword.keywordCn,
      keyword_jp: keyword.keywordJp,
      marketplace: 'US',
      data_month: keyword.month
    }
  }

  /**
   * Create a session early for streaming keyword research
   */
  static async createSession(userId: string, sessionId: string, sessionName?: string): Promise<string> {
    try {
      const { data: session, error } = await supabaseServer
        .from(TABLES.SESSIONS)
        .insert({
          id: sessionId,
          user_id: userId,
          name: sessionName || `Research Session ${new Date().toLocaleDateString()}`,
          settings: {}
        })
        .select('id')
        .single()
      
      if (error) {
        Logger.error('Failed to create session', error)
        throw error
      }
      
      Logger.dev.trace(`Created session ${sessionId} for early keyword saving`)
      return session.id
    } catch (error) {
      Logger.error('Error creating session', error)
      throw error
    }
  }

  /**
   * Save raw keywords immediately after reverseASIN
   * This preserves all enhanced fields before any processing
   */
  static async saveRawKeywords(sessionId: string, asin: string, keywords: KeywordData[]) {
    try {
      // Deduplicate keywords within this ASIN's results
      // Keep the first occurrence of each keyword (which typically has the best data)
      const uniqueKeywords = keywords.reduce((acc: Map<string, KeywordData>, kw: KeywordData) => {
        const key = kw.keyword.toLowerCase().trim()
        if (!acc.has(key)) {
          acc.set(key, kw)
        } else {
          // Log duplicates for debugging
          Logger.dev.trace(`Duplicate keyword "${kw.keyword}" found for ASIN ${asin}, keeping first occurrence`)
        }
        return acc
      }, new Map<string, KeywordData>())

      Logger.dev.trace(`Deduplication: ${keywords.length} keywords reduced to ${uniqueKeywords.size} unique keywords for ASIN ${asin}`)

      const keywordRecords = Array.from(uniqueKeywords.values()).map(kw => ({
        ...this.createEnhancedKeywordRecord(kw, kw.keyword, kw.searchVolume, kw.cpc),
        session_id: sessionId,
        asin,
        source: 'reverseASIN' as const
      }))

      const { error } = await supabaseServer
        .from('keyword_research_keywords')
        .upsert(keywordRecords, {
          onConflict: 'session_id,keyword_text,asin',
          ignoreDuplicates: false
        })

      if (error) {
        Logger.error('Failed to save raw keywords', error)
        throw error
      }

      Logger.dev.trace(`Saved ${keywordRecords.length} unique raw keywords for ASIN ${asin} with enhanced fields`)
    } catch (error) {
      Logger.error('Error in saveRawKeywords', error)
      throw error
    }
  }

  /**
   * Save all unique keywords from research results with enhanced data
   */
  private static async saveAllKeywords(results: KeywordResearchResult): Promise<Map<string, string>> {
    // Collect all unique keywords from different sources with enhanced data
    const uniqueKeywords = new Map<string, any>()
    
    // From ASIN results
    results.asinResults.forEach(asinResult => {
      if (asinResult.status === 'success') {
        asinResult.keywords.forEach(kw => {
          if (!uniqueKeywords.has(kw.keyword)) {
            uniqueKeywords.set(kw.keyword, this.createEnhancedKeywordRecord(kw, kw.keyword, kw.searchVolume, kw.cpc))
          }
        })
      }
    })
    
    // From aggregated keywords
    results.aggregatedKeywords.forEach(kw => {
      if (!uniqueKeywords.has(kw.keyword)) {
        uniqueKeywords.set(kw.keyword, this.createEnhancedKeywordRecord(kw, kw.keyword, kw.searchVolume, kw.avgCpc))
      }
    })
    
    // From opportunities
    results.opportunities?.forEach(opp => {
      if (!uniqueKeywords.has(opp.keyword)) {
        uniqueKeywords.set(opp.keyword, this.createEnhancedKeywordRecord(opp, opp.keyword, opp.searchVolume, opp.avgCpc))
      }
    })
    
    // From gap analysis
    results.gapAnalysis?.gaps.forEach(gap => {
      if (!uniqueKeywords.has(gap.keyword)) {
        uniqueKeywords.set(gap.keyword, this.createEnhancedKeywordRecord(gap, gap.keyword, gap.searchVolume, gap.avgCpc))
      }
    })
    
    // Batch insert keywords with all enhanced data
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
      // Enhanced reverse ASIN fields
      products_count?: number
      purchase_rate?: number
      bid_max?: number
      bid_min?: number
      badges?: any
      rank_overall?: number
      position_absolute?: number
      page_number?: number
      latest_1_days_ads?: number
      latest_7_days_ads?: number
      latest_30_days_ads?: number
      supply_demand_ratio?: number
      traffic_keyword_type?: string
      conversion_keyword_type?: string
      calculated_weekly_searches?: number
      updated_time?: string
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
              traffic_percentage: kw.trafficPercentage || null,
              // Enhanced reverse ASIN fields
              products_count: kw.products,
              purchase_rate: kw.purchaseRate,
              bid_max: kw.bidMax,
              bid_min: kw.bidMin,
              badges: kw.badges,
              rank_overall: kw.rank,
              position_absolute: kw.position,
              page_number: kw.page,
              latest_1_days_ads: kw.latest1DaysAds,
              latest_7_days_ads: kw.latest7DaysAds,
              latest_30_days_ads: kw.latest30DaysAds,
              supply_demand_ratio: kw.supplyDemandRatio,
              traffic_keyword_type: kw.trafficKeywordType,
              conversion_keyword_type: kw.conversionKeywordType,
              calculated_weekly_searches: kw.calculatedWeeklySearches,
              updated_time: kw.updatedTime
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
      
      // Map opportunity types to match database constraint
      // Database allows: 'keyword_gap' | 'ranking_opportunity' | 'volume_opportunity' | 'competition_gap'
      const mapOpportunityType = (type?: string) => {
        switch (type) {
          case 'keyword_mining': return 'volume_opportunity'
          case 'market_gap': return 'keyword_gap'
          case 'weak_competitors': return 'competition_gap'  
          case 'low_competition': return 'ranking_opportunity'
          default: return 'ranking_opportunity' // Default fallback
        }
      }

      
      return {
        session_id: sessionId,
        keyword_id: keywordId,
        opportunity_type: mapOpportunityType(opp.opportunityType),
        competition_score: opp.competitionScore,
        supply_demand_ratio: opp.supplyDemandRatio,
        competitor_performance: opp.competitorPerformance || {},
        // Enhanced fields from keyword mining
        purchases: opp.purchases,
        purchase_rate: opp.purchaseRate,
        monopoly_click_rate: opp.monopolyClickRate,
        cvs_share_rate: opp.cvsShareRate,
        products_count: opp.products !== undefined ? Math.round(opp.products) : null,
        ad_products_count: opp.adProducts !== undefined ? Math.round(opp.adProducts) : null,
        avg_price: opp.avgPrice,
        avg_rating: opp.avgRating || opp.avgRatings,
        bid_min: opp.bidMin || null,
        bid_max: opp.bidMax || null,
        title_density: opp.titleDensity,
        relevancy_score: opp.relevancy,
        word_count: opp.wordCount ? Math.round(opp.wordCount) : null,
        spr_rank: opp.spr ? Math.round(opp.spr) : null,
        search_rank: opp.searchRank ? Math.round(opp.searchRank) : null,
        departments: opp.departments,
        amazon_choice: opp.amazonChoice,
        is_supplement: opp.supplement === 'Y'
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
      
      // Debug logging to see what's causing the null gap_score
      if (gap.gapScore === null || gap.gapScore === undefined || isNaN(gap.gapScore)) {
        console.error('Invalid gap score detected:', {
          keyword: gap.keyword,
          gapScore: gap.gapScore,
          gapType: gap.gapType,
          searchVolume: gap.searchVolume,
          gap: gap
        })
        // Don't save gaps with invalid scores
        return null
      }
      
      // Map service gap types to database gap types
      const mapGapType = (serviceType: string) => {
        switch (serviceType) {
          case 'market_gap': return 'keyword_gap'
          case 'competitor_weakness': return 'competition_gap'
          case 'user_advantage': return 'ranking_gap'
          default: return 'keyword_gap' // Default fallback
        }
      }
      
      return {
        session_id: sessionId,
        keyword_id: keywordId,
        gap_type: mapGapType(gap.gapType),
        gap_score: Math.max(1, Math.min(10, Math.round(gap.gapScore || 1))), // Ensure valid score
        user_ranking_position: gap.userRanking?.position || null,
        competitors_data: {
          user_asin: gap.userRanking?.asin || '',
          competitor_rankings: gap.competitorRankings || [],
          user_ranking: gap.userRanking || { asin: '', position: null, trafficPercentage: 0 }
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
          cpc: r.keyword_research_keywords.cpc,
          // Include all enhanced fields
          products: r.keyword_research_keywords.products_count,
          purchases: r.keyword_research_keywords.purchases,
          purchaseRate: r.keyword_research_keywords.purchase_rate,
          monopolyClickRate: r.keyword_research_keywords.monopoly_click_rate,
          adProducts: r.keyword_research_keywords.ad_products_count,
          supplyDemandRatio: r.keyword_research_keywords.supply_demand_ratio,
          bidMin: r.keyword_research_keywords.bid_min,
          bidMax: r.keyword_research_keywords.bid_max,
          titleDensity: r.keyword_research_keywords.title_density,
          relevancyScore: r.keyword_research_keywords.relevancy_score,
          // Also include the ranking-specific enhanced fields
          badges: r.badges,
          rank: r.rank_overall,
          position: r.position_absolute,
          page: r.page_number,
          latest1DaysAds: r.latest_1_days_ads,
          latest7DaysAds: r.latest_7_days_ads,
          latest30DaysAds: r.latest_30_days_ads,
          calculatedWeeklySearches: r.calculated_weekly_searches,
          updatedTime: r.updated_time
        })),
        status: 'success' as const
      }
    })
    
    // Build aggregated keywords using the new method that handles per-ASIN keyword storage
    const aggregatedKeywords = this.buildAggregatedKeywordsView(data.rankings)
    
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
    
    // Get the first ASIN (user's product)
    const userAsin = data.asins.find(a => a.is_user_product)?.asin || data.asins[0]?.asin
    
    // Build opportunities with ALL enhanced fields - FIRST ASIN ONLY
    const opportunities: OpportunityData[] = data.opportunities
      .filter(opp => {
        // Only include opportunities where the first ASIN has ranking data for this keyword
        return data.rankings.some(ranking => 
          ranking.asin === userAsin && 
          ranking.keyword_research_keywords.keyword_text === opp.keyword_research_keywords.keyword_text
        )
      })
      .map(opp => ({
          keyword: opp.keyword_research_keywords.keyword_text,
          searchVolume: opp.keyword_research_keywords.search_volume,
          competitionScore: opp.competition_score,
          supplyDemandRatio: opp.supply_demand_ratio,
          avgCpc: opp.keyword_research_keywords.cpc,
          competitorPerformance: opp.competitor_performance,
          opportunityType: opp.opportunity_type,
          // Enhanced fields from keyword mining
          purchases: opp.purchases,
          purchaseRate: opp.purchase_rate,
          avgPrice: opp.avg_price,
          products: opp.products_count,
          adProducts: opp.ad_products_count,
          avgRating: opp.avg_rating,
          avgRatings: opp.avg_rating, // Use same field for now
          bidMin: opp.bid_min,
          bidMax: opp.bid_max,
          monopolyClickRate: opp.monopoly_click_rate,
          relevancy: opp.relevancy_score,
          titleDensity: opp.title_density
        }))
    
    // Build gap analysis
    let gapAnalysis: GapAnalysisResult | undefined
    if (data.gaps.length > 0) {
      const userAsin = data.asins.find(a => a.is_user_product)?.asin || data.asins[0]?.asin
      const competitorAsins = data.asins.filter(a => !a.is_user_product).map(a => a.asin)
      
      // Map database gap types back to service gap types
      const mapDatabaseGapType = (dbType: string): 'market_gap' | 'competitor_weakness' | 'user_advantage' => {
        switch (dbType) {
          case 'keyword_gap': return 'market_gap'
          case 'competition_gap': return 'competitor_weakness'
          case 'ranking_gap': return 'user_advantage'
          case 'traffic_gap': return 'user_advantage' // Map traffic_gap to user_advantage
          default: return 'market_gap' // Default fallback
        }
      }
      
      const gaps = data.gaps.map(gap => ({
        keyword: gap.keyword_research_keywords.keyword_text,
        searchVolume: gap.keyword_research_keywords.search_volume,
        avgCpc: gap.keyword_research_keywords.cpc,
        gapType: mapDatabaseGapType(gap.gap_type),
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
    
    // Build allKeywordsWithCompetition from aggregated keywords
    const allKeywordsWithCompetition: OpportunityData[] = aggregatedKeywords.map(kw => {
      // Find the first ranking entry for this keyword to get enhanced fields
      const firstRanking = data.rankings.find(r => r.keyword_research_keywords.keyword_text === kw.keyword)
      const kwData = firstRanking?.keyword_research_keywords
      
      return {
        keyword: kw.keyword,
        searchVolume: kw.searchVolume,
      competitionScore: 0, // Default since we don't have this for all keywords
        supplyDemandRatio: (kw as any).supplyDemandRatio || 0,
        avgCpc: kw.avgCpc,
      competitorPerformance: undefined,
      opportunityType: undefined,
        // Enhanced fields from keyword_research_keywords table or aggregated data
        purchases: (kw as any).purchases || kwData?.purchases,
        purchaseRate: (kw as any).purchaseRate || kwData?.purchase_rate,
        avgPrice: kwData?.avg_price,
        products: (kw as any).products || kwData?.products_count,
        adProducts: kwData?.ad_products_count,
        avgRating: kwData?.avg_rating,
        avgRatings: kwData?.avg_rating,
        bidMin: kwData?.bid_min,
        bidMax: kwData?.bid_max,
        monopolyClickRate: kwData?.monopoly_click_rate,
        relevancy: kwData?.relevancy_score,
        titleDensity: kwData?.title_density
      }
    })

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
  
  /**
   * Get aggregated keyword metrics across all ASINs in a session
   * This provides a unified view of all keywords with combined metrics
   */
  static async getAggregatedSessionKeywords(sessionId: string) {
    try {
      const { data: keywords, error } = await supabaseServer
        .from('keyword_research_keywords')
        .select('*')
        .eq('session_id', sessionId)
        .order('search_volume', { ascending: false })

      if (error) throw error

      // Group by keyword and aggregate metrics
      const aggregated = new Map<string, any>()
      
      keywords?.forEach(kw => {
        const key = kw.keyword_text.toLowerCase().trim()
        
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            ...kw,
            asins: [kw.asin],
            asin_count: 1,
            max_search_volume: kw.search_volume || 0,
            avg_cpc: kw.cpc || 0,
            best_purchase_rate: kw.purchase_rate || 0,
            min_products_count: kw.products_count || 0
          })
        } else {
          const existing = aggregated.get(key)
          existing.asins.push(kw.asin)
          existing.asin_count++
          existing.max_search_volume = Math.max(existing.max_search_volume, kw.search_volume || 0)
          existing.avg_cpc = ((existing.avg_cpc * (existing.asin_count - 1)) + (kw.cpc || 0)) / existing.asin_count
          existing.best_purchase_rate = Math.max(existing.best_purchase_rate, kw.purchase_rate || 0)
          existing.min_products_count = Math.min(existing.min_products_count, kw.products_count || Number.MAX_VALUE)
        }
      })

      return Array.from(aggregated.values()).sort((a, b) => {
        // Sort by ASIN count (keywords appearing in multiple ASINs) then by search volume
        if (a.asin_count !== b.asin_count) return b.asin_count - a.asin_count
        return b.max_search_volume - a.max_search_volume
      })
    } catch (error) {
      Logger.error('Error getting aggregated session keywords', error)
      throw error
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
    avgCpc: number,
    totalAsinsAnalyzed: number = 5
  ): number {
    // 1. Search Volume Sweet Spot (30% weight) - Tighter, more realistic bands
    let volumeScore = 0
    if (keywordData.searchVolume >= 5000 && keywordData.searchVolume <= 10000) {
      volumeScore = 10 // True sweet spot: 5K-10K searches
    } else if (keywordData.searchVolume >= 2000 && keywordData.searchVolume < 5000) {
      volumeScore = 8 // Good opportunity: 2K-5K searches
    } else if (keywordData.searchVolume >= 1000 && keywordData.searchVolume < 2000) {
      volumeScore = 6 // Moderate: 1K-2K searches
    } else if (keywordData.searchVolume >= 10000 && keywordData.searchVolume <= 25000) {
      volumeScore = 7 // Competitive but viable: 10K-25K
    } else if (keywordData.searchVolume >= 500 && keywordData.searchVolume < 1000) {
      volumeScore = 4 // Low volume: 500-1K searches
    } else if (keywordData.searchVolume > 25000) {
      volumeScore = 3 // High competition territory
    } else {
      volumeScore = 2 // Too low volume
    }
    
    // 2. Dynamic Competition Level (50% weight) - Based on search volume AND ASINs analyzed
    const totalCompetitors = keywordData.rankingAsins.length
    let competitionScore = 0
    
    // Calculate expected competition based on search volume
    let expectedCompetitors = 0
    if (keywordData.searchVolume >= 10000) {
      expectedCompetitors = Math.min(50, Math.floor(keywordData.searchVolume / 200)) // High volume = more competition
    } else if (keywordData.searchVolume >= 5000) {
      expectedCompetitors = Math.min(30, Math.floor(keywordData.searchVolume / 300))
    } else if (keywordData.searchVolume >= 1000) {
      expectedCompetitors = Math.min(20, Math.floor(keywordData.searchVolume / 400))
    } else {
      expectedCompetitors = Math.min(10, Math.floor(keywordData.searchVolume / 500))
    }
    
    // Adjust expected competition based on ASINs analyzed (more ASINs = better data)
    const analysisConfidenceFactor = Math.min(1.2, totalAsinsAnalyzed / 5) // Cap at 20% bonus
    const adjustedExpected = Math.floor(expectedCompetitors * analysisConfidenceFactor)
    
    // Score based on actual vs expected competition - much harsher scoring
    if (totalCompetitors === 0) {
      competitionScore = 10 // No competition found - extremely rare!
    } else if (totalCompetitors <= adjustedExpected * 0.2) {
      competitionScore = 8 // Much less competition than expected - very rare
    } else if (totalCompetitors <= adjustedExpected * 0.4) {
      competitionScore = 6 // Moderately less competition
    } else if (totalCompetitors <= adjustedExpected * 0.6) {
      competitionScore = 5 // Slightly less competition
    } else if (totalCompetitors <= adjustedExpected * 0.8) {
      competitionScore = 4 // Close to expected - most keywords
    } else if (totalCompetitors <= adjustedExpected) {
      competitionScore = 3 // Expected competition level
    } else if (totalCompetitors <= adjustedExpected * 1.2) {
      competitionScore = 2 // More competitive than expected
    } else {
      competitionScore = 1 // Highly saturated market
    }
    
    // 3. CPC Commercial Intent (20% weight) - Core range $0.50-$2.00, outliers $2.00-$10.00 scored 2-10
    let cpcScore = 0
    if (avgCpc >= 1.20 && avgCpc <= 1.80) {
      cpcScore = 10 // Sweet spot: $1.20-$1.80 - strong commercial intent
    } else if (avgCpc >= 0.90 && avgCpc < 1.20) {
      cpcScore = 9 // Very good: $0.90-$1.20 - good commercial intent
    } else if (avgCpc >= 1.80 && avgCpc <= 2.00) {
      cpcScore = 8 // Good but competitive: $1.80-$2.00
    } else if (avgCpc >= 0.70 && avgCpc < 0.90) {
      cpcScore = 7 // Decent: $0.70-$0.90 - moderate commercial intent
    } else if (avgCpc >= 0.50 && avgCpc < 0.70) {
      cpcScore = 6 // Lower commercial intent: $0.50-$0.70
    } else if (avgCpc > 2.00 && avgCpc <= 10.00) {
      // Outliers: Scale linearly from 10 down to 2 for $2.00-$10.00 range
      const outlierScore = Math.max(2, Math.min(10, 12 - (avgCpc * 1.25)))
      cpcScore = Math.round(outlierScore)
    } else if (avgCpc >= 0.30 && avgCpc < 0.50) {
      cpcScore = 4 // Low commercial intent: $0.30-$0.50
    } else if (avgCpc > 10.00) {
      cpcScore = 2 // Extreme outliers: >$10.00
    } else {
      cpcScore = 2 // Very low/no commercial intent: <$0.30
    }
    
    // Calculate weighted score (0-10 scale) with much more aggressive distribution
    const rawScore = (
      (volumeScore * 0.25) +
      (competitionScore * 0.60) + // Increased weight on competition
      (cpcScore * 0.15)
    )
    
    // Apply much more aggressive curve to push most scores into 3-6 range
    let adjustedScore = rawScore
    if (rawScore >= 8.0) {
      adjustedScore = rawScore * 0.65 + 2.8 // Heavily compress top scores
    } else if (rawScore >= 6.5) {
      adjustedScore = rawScore * 0.75 + 2.0 // Compress high scores
    } else if (rawScore >= 5.0) {
      adjustedScore = rawScore * 0.85 + 0.975 // Slightly compress mid scores
    }
    
    // Further compress if still too high - most keywords should be 3-6
    if (adjustedScore > 7.0) {
      adjustedScore = 7.0 + (adjustedScore - 7.0) * 0.5 // Cap high scores
    }
    
    return Math.round(Math.max(1, Math.min(10, adjustedScore)) * 100) / 100
  }

  /**
   * Build proper aggregated view of keywords across all ASINs
   * This handles the case where the same keyword exists multiple times (once per ASIN)
   */
  private static buildAggregatedKeywordsView(rankings: any[]): AggregatedKeyword[] {
    const keywordAggregation = new Map<string, {
      keyword: string
      searchVolumes: number[]
      cpcValues: number[]
      rankingAsins: Array<{
        asin: string
        position: number
        trafficPercentage: number
      }>
      // Track best values across all ASINs
      bestProducts: number
      bestPurchases: number
      bestPurchaseRate: number
      bestSupplyDemandRatio: number
      bestAdProducts: number
      bestBidMin: number
      bestBidMax: number
      bestMonopolyClickRate: number
      bestTitleDensity: number
    }>()

    // Aggregate data across all rankings
    rankings.forEach(r => {
      const keywordText = r.keyword_research_keywords.keyword_text.toLowerCase().trim()
      
      if (!keywordAggregation.has(keywordText)) {
        keywordAggregation.set(keywordText, {
          keyword: r.keyword_research_keywords.keyword_text, // Preserve original case
          searchVolumes: [],
          cpcValues: [],
          rankingAsins: [],
          bestProducts: r.keyword_research_keywords.products_count || 0,
          bestPurchases: r.keyword_research_keywords.purchases || 0,
          bestPurchaseRate: r.keyword_research_keywords.purchase_rate || 0,
          bestSupplyDemandRatio: r.keyword_research_keywords.supply_demand_ratio || 0,
          bestAdProducts: r.keyword_research_keywords.ad_products_count || 0,
          bestBidMin: r.keyword_research_keywords.bid_min || 0,
          bestBidMax: r.keyword_research_keywords.bid_max || 0,
          bestMonopolyClickRate: r.keyword_research_keywords.monopoly_click_rate || 0,
          bestTitleDensity: r.keyword_research_keywords.title_density || 0
        })
      }
      
      const agg = keywordAggregation.get(keywordText)!
      
      // Add search volume and CPC
      agg.searchVolumes.push(r.keyword_research_keywords.search_volume || 0)
      agg.cpcValues.push(r.keyword_research_keywords.cpc || 0)
      
      // Add ranking info
      agg.rankingAsins.push({
        asin: r.asin,
        position: r.ranking_position || 0,
        trafficPercentage: r.traffic_percentage || 0
      })
      
      // Track best metrics
      agg.bestProducts = Math.max(agg.bestProducts, r.keyword_research_keywords.products_count || 0)
      agg.bestPurchases = Math.max(agg.bestPurchases, r.keyword_research_keywords.purchases || 0)
      agg.bestPurchaseRate = Math.max(agg.bestPurchaseRate, r.keyword_research_keywords.purchase_rate || 0)
      agg.bestSupplyDemandRatio = Math.max(agg.bestSupplyDemandRatio, r.keyword_research_keywords.supply_demand_ratio || 0)
      agg.bestAdProducts = Math.max(agg.bestAdProducts, r.keyword_research_keywords.ad_products_count || 0)
      agg.bestBidMin = Math.max(agg.bestBidMin, r.keyword_research_keywords.bid_min || 0)
      agg.bestBidMax = Math.max(agg.bestBidMax, r.keyword_research_keywords.bid_max || 0)
      agg.bestMonopolyClickRate = Math.max(agg.bestMonopolyClickRate, r.keyword_research_keywords.monopoly_click_rate || 0)
      agg.bestTitleDensity = Math.max(agg.bestTitleDensity, r.keyword_research_keywords.title_density || 0)
    })

    // Convert to final format
    return Array.from(keywordAggregation.values()).map(agg => {
      // Use the highest search volume reported (they should be the same, but just in case)
      const searchVolume = Math.max(...agg.searchVolumes)
      const avgCpc = agg.cpcValues.reduce((sum, cpc) => sum + cpc, 0) / agg.cpcValues.length
      
      return {
        keyword: agg.keyword,
        searchVolume,
        avgCpc: Math.round(avgCpc * 100) / 100,
        rankingAsins: agg.rankingAsins,
        opportunityScore: this.calculateOpportunityScore({
          searchVolume,
          rankingAsins: agg.rankingAsins
        }, avgCpc, agg.rankingAsins.length),
        // Include best enhanced metrics for display
        products: agg.bestProducts,
        purchases: agg.bestPurchases,
        purchaseRate: agg.bestPurchaseRate,
        supplyDemandRatio: agg.bestSupplyDemandRatio,
        adProducts: agg.bestAdProducts,
        bidMin: agg.bestBidMin,
        bidMax: agg.bestBidMax,
        monopolyClickRate: agg.bestMonopolyClickRate,
        titleDensity: agg.bestTitleDensity
      } as AggregatedKeyword & {
        products?: number
        purchases?: number
        purchaseRate?: number
        supplyDemandRatio?: number
        adProducts?: number
        bidMin?: number
        bidMax?: number
        monopolyClickRate?: number
        titleDensity?: number
      }
    }).sort((a, b) => b.opportunityScore - a.opportunityScore)
  }
}

// Export for easy access
export const kwDB = KeywordResearchDB