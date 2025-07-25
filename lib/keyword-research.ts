import { sellerSpriteClient } from './sellersprite'
import { Logger } from './logger'
import type { KeywordData, OpportunityData, GapAnalysisResult, GapOpportunity, AsinComparisonData } from '@/types'

// Service-layer interfaces
export interface KeywordResearchOptions {
  maxKeywordsPerAsin?: number      // Default: 50
  minSearchVolume?: number         // Default: 100
  includeOpportunities?: boolean   // Default: true
  includeGapAnalysis?: boolean     // Default: true
  opportunityFilters?: {
    minSearchVolume?: number       // Default: 500 (for targeted opportunities)
    maxCompetitorsInTop15?: number // Default: 2 (max competitors ranking 1-15)
    minCompetitorsRanking?: number // Default: 1 (min competitors ranking)
    maxCompetitorStrength?: number // Default: 5 (max avg competitor performance 1-10)
  }
  gapAnalysisOptions?: {
    minGapVolume?: number          // Default: 1000
    maxGapPosition?: number        // Default: 50 (competitors must rank below this)
    focusVolumeThreshold?: number  // Default: 5000 (high volume threshold)
  }
}

export interface AsinKeywordResult {
  asin: string
  productTitle?: string
  keywordCount: number
  keywords: KeywordData[]
  status: 'success' | 'failed' | 'no_data'
  error?: string
}

export interface AggregatedKeyword {
  keyword: string
  searchVolume: number
  avgCpc: number
  rankingAsins: Array<{
    asin: string
    position: number
    trafficPercentage: number
  }>
  opportunityScore: number
}

export interface KeywordResearchResult {
  overview: {
    totalAsins: number
    totalKeywords: number
    avgSearchVolume: number
    processingTime: number
  }
  asinResults: AsinKeywordResult[]
  aggregatedKeywords: AggregatedKeyword[]
  opportunities: OpportunityData[]
}

export class KeywordResearchService {
  private defaultOptions: Required<KeywordResearchOptions> = {
    maxKeywordsPerAsin: 50,
    minSearchVolume: 100,
    includeOpportunities: true,
    includeGapAnalysis: true,
    opportunityFilters: {
      minSearchVolume: 500,
      maxCompetitorsInTop15: 2,
      minCompetitorsRanking: 1,
      maxCompetitorStrength: 5
    },
    gapAnalysisOptions: {
      minGapVolume: 1000,
      maxGapPosition: 50,
      focusVolumeThreshold: 5000
    }
  }

  // Expose sellerSpriteClient for streaming API
  public get sellerSpriteClient() {
    return sellerSpriteClient
  }

  /**
   * Main keyword research method
   * @param asins Array of ASINs to research (1-10)
   * @param options Research options
   * @returns Complete keyword research results
   */
  async researchKeywords(
    asins: string[], 
    options: KeywordResearchOptions = {}
  ): Promise<KeywordResearchResult> {
    const startTime = Date.now()
    const opts = { ...this.defaultOptions, ...options }
    
    this.validateAsins(asins)
    Logger.dev.trace(`Starting keyword research for ${asins.length} ASINs`)

    // Process each ASIN for keyword data
    const asinResults = await this.processAsins(asins, opts)
    
    // Aggregate keywords across all ASINs (for market analysis)
    const aggregatedKeywords = this.aggregateKeywords(asinResults)
    
    // Create comparison view (individual ASIN performance)
    const comparisonView = this.createComparisonView(asinResults)
    
    // Get opportunity keywords with enhanced filtering
    const opportunities = opts.includeOpportunities 
      ? await this.findTargetedOpportunities(asinResults, opts)
      : []

    // Perform GAP analysis if requested and we have multiple ASINs
    const gapAnalysis = opts.includeGapAnalysis && asins.length >= 2
      ? this.performGapAnalysis(asinResults, opts)
      : undefined

    // Calculate overview statistics
    const overview = this.calculateOverview(asins, asinResults, aggregatedKeywords, startTime)

    Logger.dev.trace(`Keyword research completed in ${overview.processingTime}ms`)

    return {
      overview,
      asinResults,
      aggregatedKeywords,
      comparisonView,
      opportunities,
      gapAnalysis
    }
  }

  /**
   * Validate ASIN inputs (made public for streaming API)
   */
  public validateAsins(asins: string[]): void {
    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      throw new Error('ASINs array is required and must not be empty')
    }

    if (asins.length > 10) {
      throw new Error('Maximum 10 ASINs allowed per request')
    }

    // Validate ASIN format (Amazon ASINs are 10 characters, alphanumeric)
    const invalidAsins = asins.filter(asin => !/^[A-Z0-9]{10}$/i.test(asin))
    if (invalidAsins.length > 0) {
      throw new Error(`Invalid ASIN format: ${invalidAsins.join(', ')}`)
    }
  }

  /**
   * Process keywords for each ASIN
   */
  private async processAsins(
    asins: string[], 
    options: Required<KeywordResearchOptions>
  ): Promise<AsinKeywordResult[]> {
    const results = await Promise.allSettled(
      asins.map(async (asin): Promise<AsinKeywordResult> => {
        try {
          // Get keywords for this ASIN
          const keywords = await sellerSpriteClient.reverseASIN(
            asin, 
            1, 
            options.maxKeywordsPerAsin
          )
          
          // Filter by minimum search volume
          const filteredKeywords = keywords.filter(
            keyword => keyword.searchVolume >= options.minSearchVolume
          )

          // Try to get product title (optional, don't fail if unavailable)
          const productTitle = await this.getProductTitle(asin)

          return {
            asin,
            productTitle,
            keywordCount: filteredKeywords.length,
            keywords: filteredKeywords,
            status: 'success'
          }
        } catch (error) {
          Logger.dev.error(`Failed to get keywords for ASIN ${asin}:`, error)
          return {
            asin,
            productTitle: undefined,
            keywordCount: 0,
            keywords: [],
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )

    // Process settled results
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          asin: asins[index],
          productTitle: undefined,
          keywordCount: 0,
          keywords: [],
          status: 'failed' as const,
          error: result.reason?.message || 'Processing failed'
        }
      }
    })
  }

  /**
   * Aggregate keywords across all ASINs
   */
  private aggregateKeywords(asinResults: AsinKeywordResult[]): AggregatedKeyword[] {
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

    // Collect all keywords from successful results
    asinResults.forEach(result => {
      if (result.status === 'success') {
        result.keywords.forEach(keyword => {
          if (keywordMap.has(keyword.keyword)) {
            const existing = keywordMap.get(keyword.keyword)!
            existing.cpcValues.push(keyword.cpc)
            existing.rankingAsins.push({
              asin: result.asin,
              position: keyword.rankingPosition || 0,
              trafficPercentage: keyword.trafficPercentage || 0
            })
          } else {
            keywordMap.set(keyword.keyword, {
              keyword: keyword.keyword,
              searchVolume: keyword.searchVolume,
              cpcValues: [keyword.cpc],
              rankingAsins: [{
                asin: result.asin,
                position: keyword.rankingPosition || 0,
                trafficPercentage: keyword.trafficPercentage || 0
              }]
            })
          }
        })
      }
    })

    // Calculate aggregated keywords with opportunity scores
    return Array.from(keywordMap.values())
      .map(keywordData => {
        const avgCpc = keywordData.cpcValues.reduce((sum, cpc) => sum + cpc, 0) / keywordData.cpcValues.length
        const opportunityScore = this.calculateOpportunityScore(keywordData, avgCpc)

        return {
          keyword: keywordData.keyword,
          searchVolume: keywordData.searchVolume,
          avgCpc: Math.round(avgCpc * 100) / 100,
          rankingAsins: keywordData.rankingAsins,
          opportunityScore
        }
      })
      .sort((a, b) => b.opportunityScore - a.opportunityScore) // Sort by opportunity score descending
  }

  /**
   * Calculate opportunity score for a keyword
   */
  private calculateOpportunityScore(
    keywordData: { searchVolume: number; rankingAsins: any[] }, 
    avgCpc: number
  ): number {
    // Calculate opportunity score based on:
    // - Search volume (higher is better)
    // - Number of ASINs ranking for this keyword (lower competition is better)
    // - Average CPC (moderate CPC is best - not too high, not too low)
    const searchVolumeScore = Math.min(keywordData.searchVolume / 10000, 10) // Max 10 points
    const competitionScore = Math.max(0, 10 - keywordData.rankingAsins.length) // Fewer ranking ASINs = higher score
    const cpcScore = avgCpc > 0.5 && avgCpc < 3.0 ? 5 : Math.max(0, 5 - Math.abs(avgCpc - 1.5)) // Sweet spot around $1.50
    
    return Math.round((searchVolumeScore + competitionScore + cpcScore) / 3 * 100) / 100
  }

  /**
   * Create comparison view showing individual ASIN performance
   */
  private createComparisonView(asinResults: AsinKeywordResult[]): AsinComparisonData[] {
    return asinResults.map(result => {
      if (result.status !== 'success') {
        return {
          asin: result.asin,
          productTitle: result.productTitle,
          totalKeywords: 0,
          avgSearchVolume: 0,
          topKeywords: [],
          strongKeywords: [],
          weakKeywords: [],
          status: result.status,
          error: result.error
        }
      }

      // Sort keywords by search volume for this ASIN
      const sortedKeywords = [...result.keywords].sort((a, b) => b.searchVolume - a.searchVolume)
      
      // Categorize keywords by ranking performance
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
        topKeywords: sortedKeywords.slice(0, 20), // Top 20 by volume
        strongKeywords: strongKeywords.slice(0, 15), // Top ranking keywords
        weakKeywords: weakKeywords.slice(0, 15), // Poor ranking keywords
        status: 'success'
      }
    })
  }

  /**
   * Find targeted opportunity keywords based on specific competitor criteria
   */
  private async findTargetedOpportunities(
    asinResults: AsinKeywordResult[],
    options: Required<KeywordResearchOptions>
  ): Promise<OpportunityData[]> {
    const successfulResults = asinResults.filter(r => r.status === 'success')
    if (successfulResults.length === 0) return []

    // Build keyword universe with competitor analysis
    const keywordUniverse = new Map<string, {
      keyword: string
      searchVolume: number
      avgCpc: number
      competitorRankings: Array<{ asin: string; position: number; traffic: number }>
    }>()

    // Collect all keywords and their competitor positions
    successfulResults.forEach(result => {
      result.keywords.forEach(keyword => {
        if (keyword.searchVolume < options.opportunityFilters.minSearchVolume) return

        if (!keywordUniverse.has(keyword.keyword)) {
          keywordUniverse.set(keyword.keyword, {
            keyword: keyword.keyword,
            searchVolume: keyword.searchVolume,
            avgCpc: keyword.cpc,
            competitorRankings: []
          })
        }

        const kwData = keywordUniverse.get(keyword.keyword)!
        kwData.competitorRankings.push({
          asin: result.asin,
          position: keyword.rankingPosition || 999,
          traffic: keyword.trafficPercentage || 0
        })

        // Update average CPC
        if (kwData.avgCpc !== keyword.cpc) {
          kwData.avgCpc = (kwData.avgCpc + keyword.cpc) / 2
        }
      })
    })

    // Filter opportunities based on your criteria
    const opportunities: OpportunityData[] = []
    const filters = options.opportunityFilters

    keywordUniverse.forEach(kwData => {
      // Apply your specific filtering criteria
      const competitorsInTop15 = kwData.competitorRankings.filter(c => c.position <= 15).length
      const competitorsRanking = kwData.competitorRankings.filter(c => c.position <= 50).length
      
      // Calculate competitor strength (1-10 scale, lower is weaker competition)
      const avgCompetitorRank = kwData.competitorRankings.length > 0
        ? kwData.competitorRankings.reduce((sum, c) => sum + c.position, 0) / kwData.competitorRankings.length
        : 999
      
      const competitorStrength = Math.max(1, Math.min(10, 11 - (avgCompetitorRank / 10)))

      // Your filtering criteria:
      // - Min search volume: 500+
      // - Max competitors in top 15: 2
      // - Min competitors ranking (1-50): 1
      // - Max competitor strength: 5
      if (
        kwData.searchVolume >= filters.minSearchVolume &&
        competitorsInTop15 <= filters.maxCompetitorsInTop15 &&
        competitorsRanking >= filters.minCompetitorsRanking &&
        competitorsRanking <= filters.maxCompetitorsInTop15 + 1 && // Max 2 competitors total
        competitorStrength <= filters.maxCompetitorStrength
      ) {
        opportunities.push({
          keyword: kwData.keyword,
          searchVolume: kwData.searchVolume,
          competitionScore: competitorStrength,
          supplyDemandRatio: competitorsRanking, // Repurpose this field
          avgCpc: Math.round(kwData.avgCpc * 100) / 100,
          growthTrend: 'stable',
          competitorPerformance: {
            avgCompetitorRank: Math.round(avgCompetitorRank),
            competitorsRanking: competitorsRanking,
            competitorsInTop15: competitorsInTop15,
            competitorStrength: Math.round(competitorStrength * 100) / 100
          },
          opportunityType: competitorsInTop15 === 0 ? 'market_gap' : 
                          competitorStrength <= 3 ? 'weak_competitors' : 'low_competition'
        })
      }
    })

    // Also get traditional keyword mining opportunities
    try {
      const topAggregatedKeywords = this.aggregateKeywords(asinResults).slice(0, 3)
      const miningPromises = topAggregatedKeywords.map(kw => 
        sellerSpriteClient.keywordMining(kw.keyword, {
          minSearch: filters.minSearchVolume,
          maxSupplyDemandRatio: 8,
          size: 15
        })
      )
      
      const miningResults = await Promise.allSettled(miningPromises)
      const minedOpportunities = miningResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .filter(opp => opp.searchVolume >= filters.minSearchVolume)
        .map(opp => ({
          ...opp,
          opportunityType: 'keyword_mining' as const
        }))

      opportunities.push(...minedOpportunities)
    } catch (error) {
      Logger.error('Failed to get keyword mining opportunities', error)
    }

    // Sort by search volume and limit results
    return opportunities
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 50)
  }

  /**
   * Find opportunity keywords based on aggregated results (legacy method - kept for compatibility)
   */
  private async findOpportunities(
    aggregatedKeywords: AggregatedKeyword[], 
    options: Required<KeywordResearchOptions>
  ): Promise<OpportunityData[]> {
    if (aggregatedKeywords.length === 0) {
      return []
    }

    try {
      // Get top 5 keywords for opportunity mining
      const topKeywords = aggregatedKeywords.slice(0, 5)
      const opportunityPromises = topKeywords.map(kw => 
        sellerSpriteClient.keywordMining(kw.keyword, {
          minSearch: options.minSearchVolume,
          maxSupplyDemandRatio: 10,
          size: 20
        })
      )
      
      const opportunityResults = await Promise.allSettled(opportunityPromises)
      return opportunityResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .filter(opp => opp.searchVolume >= options.minSearchVolume)
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 50) // Limit to top 50 opportunities
    } catch (error) {
      Logger.error('Failed to get opportunity keywords', error)
      return [] // Return empty array rather than failing the entire request
    }
  }

  /**
   * Get product title for an ASIN (optional)
   */
  private async getProductTitle(asin: string): Promise<string | undefined> {
    try {
      // For now, we'll leave this undefined to avoid extra API calls
      // This could be implemented later if product title is needed
      return undefined
    } catch (error) {
      // Ignore errors when fetching product title
      return undefined
    }
  }

  /**
   * Perform GAP analysis to find market opportunities
   */
  private performGapAnalysis(
    asinResults: AsinKeywordResult[],
    options: Required<KeywordResearchOptions>
  ): GapAnalysisResult | undefined {
    const successfulResults = asinResults.filter(r => r.status === 'success')
    
    if (successfulResults.length < 2) {
      Logger.dev.trace('Insufficient data for GAP analysis - need at least 2 successful ASINs')
      return undefined
    }

    const userAsin = successfulResults[0].asin // First ASIN is user's product
    const competitorAsins = successfulResults.slice(1).map(r => r.asin)
    
    Logger.dev.trace(`Performing GAP analysis: User=${userAsin}, Competitors=[${competitorAsins.join(', ')}]`)

    // Build keyword universe from all ASINs
    const keywordUniverse = new Map<string, {
      keyword: string
      searchVolume: number
      avgCpc: number
      rankings: Map<string, { position: number; trafficPercentage: number }>
    }>()

    // Collect all keywords and their rankings per ASIN
    successfulResults.forEach(result => {
      result.keywords.forEach(keyword => {
        if (keyword.searchVolume < options.gapAnalysisOptions.minGapVolume) return

        if (!keywordUniverse.has(keyword.keyword)) {
          keywordUniverse.set(keyword.keyword, {
            keyword: keyword.keyword,
            searchVolume: keyword.searchVolume,
            avgCpc: keyword.cpc,
            rankings: new Map()
          })
        }

        const kwData = keywordUniverse.get(keyword.keyword)!
        kwData.rankings.set(result.asin, {
          position: keyword.rankingPosition || 999,
          trafficPercentage: keyword.trafficPercentage || 0
        })

        // Update average CPC if we have multiple data points
        if (kwData.avgCpc !== keyword.cpc) {
          kwData.avgCpc = (kwData.avgCpc + keyword.cpc) / 2
        }
      })
    })

    // Analyze gaps
    const gaps: GapOpportunity[] = []
    const gapOptions = options.gapAnalysisOptions

    keywordUniverse.forEach(kwData => {
      const userRanking = kwData.rankings.get(userAsin)
      const competitorRankings = competitorAsins.map(asin => ({
        asin,
        ranking: kwData.rankings.get(asin)
      }))

      // Analyze different gap scenarios
      const gapOpportunity = this.analyzeKeywordGap(
        kwData,
        userAsin,
        userRanking,
        competitorRankings,
        gapOptions
      )

      if (gapOpportunity) {
        gaps.push(gapOpportunity)
      }
    })

    // Sort gaps by score (highest first)
    gaps.sort((a, b) => b.gapScore - a.gapScore)

    // Calculate analysis summary
    const highVolumeGaps = gaps.filter(g => g.searchVolume >= gapOptions.focusVolumeThreshold).length
    const mediumVolumeGaps = gaps.filter(g => 
      g.searchVolume >= 1000 && g.searchVolume < gapOptions.focusVolumeThreshold
    ).length
    const totalGapPotential = gaps.reduce((sum, g) => sum + g.searchVolume, 0)
    const avgGapVolume = gaps.length > 0 ? Math.round(totalGapPotential / gaps.length) : 0

    const result: GapAnalysisResult = {
      userAsin,
      competitorAsins,
      analysis: {
        totalGapsFound: gaps.length,
        highVolumeGaps,
        mediumVolumeGaps,
        avgGapVolume,
        totalGapPotential
      },
      gaps: gaps.slice(0, 50) // Limit to top 50 gaps
    }

    Logger.dev.trace(`GAP analysis completed: ${gaps.length} gaps found, ${highVolumeGaps} high-volume`)
    return result
  }

  /**
   * Analyze individual keyword for gap opportunities
   */
  private analyzeKeywordGap(
    kwData: { keyword: string; searchVolume: number; avgCpc: number; rankings: Map<string, any> },
    userAsin: string,
    userRanking: { position: number; trafficPercentage: number } | undefined,
    competitorRankings: Array<{ asin: string; ranking: any }>,
    options: Required<KeywordResearchOptions>['gapAnalysisOptions']
  ): GapOpportunity | null {
    
    const userPosition = userRanking?.position || null
    const userTraffic = userRanking?.trafficPercentage || 0

    // Build competitor ranking data
    const competitorData = competitorRankings.map(({ asin, ranking }) => ({
      asin,
      position: ranking?.position || null,
      trafficPercentage: ranking?.trafficPercentage || 0
    }))

    // Scenario analysis
    let gapType: GapOpportunity['gapType']
    let gapScore = 0
    let recommendation = ''
    let potentialImpact: GapOpportunity['potentialImpact'] = 'low'

    // Count competitors ranking well (top 20 positions)
    const competitorsRankingWell = competitorData.filter(c => c.position && c.position <= 20).length
    const competitorsRankingPoorly = competitorData.filter(c => !c.position || c.position > options.maxGapPosition).length

    // SCENARIO 1: Market Gap - Nobody is ranking well for this keyword
    if ((!userPosition || userPosition > 20) && competitorsRankingWell === 0) {
      gapType = 'market_gap'
      gapScore = Math.min(10, (kwData.searchVolume / 1000) * 2) // Higher score for higher volume
      recommendation = `Market opportunity: No competitors ranking well. Consider optimizing for "${kwData.keyword}"`
      potentialImpact = kwData.searchVolume >= options.focusVolumeThreshold ? 'high' : 'medium'
    }
    // SCENARIO 2: Competitor Weakness - User ranks better than most competitors
    else if (userPosition && userPosition <= 20 && competitorsRankingPoorly >= competitorData.length * 0.7) {
      gapType = 'user_advantage'
      gapScore = 7 + (userTraffic / 10) // Bonus for higher traffic percentage
      recommendation = `Competitive advantage: You rank better than competitors. Double down on "${kwData.keyword}"`
      potentialImpact = 'medium'
    }
    // SCENARIO 3: Competitor Weakness - Most competitors rank poorly, user could improve
    else if ((!userPosition || userPosition > options.maxGapPosition) && competitorsRankingPoorly >= competitorData.length * 0.6) {
      gapType = 'competitor_weakness'
      gapScore = 6 + Math.min(3, kwData.searchVolume / 2000) // Bonus for volume
      recommendation = `Competitor weakness: Most competitors rank poorly for "${kwData.keyword}". Opportunity to rank higher`
      potentialImpact = kwData.searchVolume >= options.focusVolumeThreshold ? 'high' : 'medium'
    }
    else {
      // No significant gap identified
      return null
    }

    // Apply volume and CPC modifiers to score
    if (kwData.searchVolume >= options.focusVolumeThreshold) {
      gapScore += 2 // Bonus for high volume
    }
    if (kwData.avgCpc < 1.0) {
      gapScore += 1 // Bonus for low competition (low CPC)
    }

    gapScore = Math.min(10, Math.max(1, Math.round(gapScore)))

    return {
      keyword: kwData.keyword,
      searchVolume: kwData.searchVolume,
      avgCpc: Math.round(kwData.avgCpc * 100) / 100,
      gapType,
      gapScore,
      competitorRankings: competitorData,
      userRanking: {
        asin: userAsin,
        position: userPosition,
        trafficPercentage: userTraffic
      },
      recommendation,
      potentialImpact
    }
  }

  /**
   * Calculate overview statistics
   */
  private calculateOverview(
    asins: string[],
    asinResults: AsinKeywordResult[],
    aggregatedKeywords: AggregatedKeyword[],
    startTime: number
  ) {
    const successfulResults = asinResults.filter(r => r.status === 'success')
    const totalKeywords = successfulResults.reduce((sum, r) => sum + r.keywordCount, 0)
    const avgSearchVolume = aggregatedKeywords.length > 0 
      ? Math.round(aggregatedKeywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / aggregatedKeywords.length)
      : 0

    return {
      totalAsins: asins.length,
      totalKeywords,
      avgSearchVolume,
      processingTime: Date.now() - startTime
    }
  }
}

// Export singleton instance
export const keywordResearchService = new KeywordResearchService()

// Export utility functions for keyword analysis
export const keywordUtils = {
  /**
   * Get top keywords by search volume
   */
  getTopKeywordsByVolume: (keywords: KeywordData[], limit: number = 10): KeywordData[] => {
    return keywords
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, limit)
  },

  /**
   * Get top keywords by opportunity score
   */
  getTopKeywordsByOpportunity: (keywords: AggregatedKeyword[], limit: number = 10): AggregatedKeyword[] => {
    return keywords
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, limit)
  },

  /**
   * Filter keywords by CPC range
   */
  filterKeywordsByCpc: (keywords: KeywordData[], minCpc: number, maxCpc: number): KeywordData[] => {
    return keywords.filter(kw => kw.cpc >= minCpc && kw.cpc <= maxCpc)
  },

  /**
   * Calculate total search volume for a set of keywords
   */
  calculateTotalSearchVolume: (keywords: KeywordData[]): number => {
    return keywords.reduce((sum, kw) => sum + kw.searchVolume, 0)
  },

  /**
   * Get gaps by type
   */
  getGapsByType: (gaps: GapOpportunity[], type: GapOpportunity['gapType']): GapOpportunity[] => {
    return gaps.filter(gap => gap.gapType === type)
  },

  /**
   * Get high-impact gaps
   */
  getHighImpactGaps: (gaps: GapOpportunity[]): GapOpportunity[] => {
    return gaps.filter(gap => gap.potentialImpact === 'high').sort((a, b) => b.gapScore - a.gapScore)
  },

  /**
   * Calculate gap analysis summary
   */
  summarizeGapAnalysis: (gapAnalysis: GapAnalysisResult): string => {
    const { analysis, gaps } = gapAnalysis
    const topGaps = gaps.slice(0, 3).map(g => g.keyword).join(', ')
    
    return `Found ${analysis.totalGapsFound} opportunities (${analysis.highVolumeGaps} high-volume). ` +
           `Total potential: ${analysis.totalGapPotential.toLocaleString()} search volume. ` +
           `Top gaps: ${topGaps}`
  }
}