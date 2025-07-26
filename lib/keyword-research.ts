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
    maxSearchVolume?: number       // Default: 10000 (max search volume for opportunities)
    maxCompetitorsInTop15?: number // Default: 2 (max competitors ranking 1-15)
    minCompetitorsRanking?: number // Default: 15 (min ranking position for competitors)
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
  comparisonView: AsinComparisonData[]
  opportunities: OpportunityData[]
  gapAnalysis?: GapAnalysisResult
  allKeywordsWithCompetition?: OpportunityData[] // Complete keyword universe with competition data
}

export class KeywordResearchService {
  private defaultOptions: Required<KeywordResearchOptions> = {
    maxKeywordsPerAsin: 50,
    minSearchVolume: 100,
    includeOpportunities: true,
    includeGapAnalysis: true,
    opportunityFilters: {
      minSearchVolume: 500,
      maxSearchVolume: 10000,
      maxCompetitorsInTop15: 2,
      minCompetitorsRanking: 15,
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
   * @param progressCallback Optional progress callback for streaming updates
   * @returns Complete keyword research results
   */
  async researchKeywords(
    asins: string[], 
    options: KeywordResearchOptions = {},
    progressCallback?: (phase: string, message: string, progress: number, data?: any) => void
  ): Promise<KeywordResearchResult> {
    const startTime = Date.now()
    const opts = { ...this.defaultOptions, ...options }
    
    this.validateAsins(asins)
    Logger.dev.trace(`Starting keyword research for ${asins.length} ASINs`)

    progressCallback?.('keyword_extraction', 'Starting keyword extraction...', 0)

    // Process each ASIN for keyword data
    const asinResults = await this.processAsins(asins, opts, progressCallback)
    
    progressCallback?.('keyword_aggregation', 'Aggregating keywords and creating comparison views...', 50)
    
    // Aggregate keywords across all ASINs (for market analysis)
    const aggregatedKeywords = this.aggregateKeywords(asinResults)
    
    // Create comparison view (individual ASIN performance)
    const comparisonView = this.createComparisonView(asinResults)
    
    progressCallback?.('opportunity_mining', 'Mining targeted opportunities...', 70)
    
    // Initialize the complete keyword universe for Overview analysis (declare outside scopes)
    let allKeywordsWithCompetition: OpportunityData[] = []
    
    // Get opportunity keywords with enhanced filtering and complete keyword universe
    let opportunities: OpportunityData[] = []
    
    if (opts.includeOpportunities) {
      const opportunityResults = await this.findTargetedOpportunities(asinResults, opts)
      opportunities = opportunityResults.opportunities
      allKeywordsWithCompetition = opportunityResults.allKeywordsWithCompetition
    } else {
      // Still build the complete keyword universe for Overview analysis even if opportunities are disabled
      allKeywordsWithCompetition = this.buildKeywordUniverseForOverview(asinResults, opts)
    }

    progressCallback?.('gap_analysis', 'Performing gap analysis...', 85)

    // Perform GAP analysis if requested and we have multiple ASINs
    const gapAnalysis = opts.includeGapAnalysis && asins.length >= 2
      ? this.performGapAnalysis(asinResults, opts)
      : undefined

    progressCallback?.('keyword_enhancement', 'Enhancing opportunity and gap analysis keywords with detailed mining data...', 90)

    // Phase 4: Enhance opportunity and gap analysis keywords with keyword mining
    let enhancedOpportunities = opportunities
    let enhancedGapAnalysis = gapAnalysis
    
    try {
      // Collect all keywords that need enhancement and deduplicate
      const allKeywordsForEnhancement: Array<{ 
        keyword: any; 
        source: 'opportunity' | 'gap'; 
        originalIndex: number 
      }> = []
      
      if (opportunities.length > 0) {
        const topOpportunities = this.selectTopKeywordsForEnhancement(opportunities, 5)
        topOpportunities.forEach((keyword, index) => {
          allKeywordsForEnhancement.push({
            keyword,
            source: 'opportunity',
            originalIndex: opportunities.findIndex(opp => opp.keyword === keyword.keyword)
          })
        })
        Logger.dev.trace(`Selected ${topOpportunities.length} top opportunity keywords from ${opportunities.length} total for enhancement`)
      }
      
      if (gapAnalysis && gapAnalysis.gaps.length > 0) {
        const topGaps = this.selectTopKeywordsForEnhancement(gapAnalysis.gaps, 5)
        topGaps.forEach((keyword, index) => {
          // Only add if not already in the enhancement list (avoid duplicates)
          const existingKeyword = allKeywordsForEnhancement.find(item => item.keyword.keyword === keyword.keyword)
          if (!existingKeyword) {
            allKeywordsForEnhancement.push({
              keyword,
              source: 'gap',
              originalIndex: gapAnalysis.gaps.findIndex(gap => gap.keyword === keyword.keyword)
            })
          } else {
            // Mark that this keyword is also needed for gaps
            existingKeyword.source = 'both'
          }
        })
        Logger.dev.trace(`Selected ${topGaps.length} top gap keywords from ${gapAnalysis.gaps.length} total for enhancement`)
      }
      
      // Deduplicate and enhance keywords only once
      const uniqueKeywordsToEnhance = allKeywordsForEnhancement.map(item => item.keyword)
      const duplicatesAvoided = (opportunities.length > 0 ? Math.min(5, opportunities.length) : 0) + 
                                (gapAnalysis?.gaps && gapAnalysis.gaps.length > 0 ? Math.min(5, gapAnalysis.gaps.length) : 0) - 
                                uniqueKeywordsToEnhance.length
      
      if (uniqueKeywordsToEnhance.length > 0) {
        Logger.dev.trace(`Enhancing ${uniqueKeywordsToEnhance.length} unique keywords (avoided ${duplicatesAvoided} duplicate API calls)`)
        
        const enhancedKeywords = await this.enhanceKeywordsWithMining(uniqueKeywordsToEnhance, 'combined')
        
        // Create a map for quick lookup of enhanced keywords
        const enhancedMap = new Map<string, any>()
        enhancedKeywords.forEach(keyword => enhancedMap.set(keyword.keyword, keyword))
        
        // Apply enhanced data back to opportunities
        if (opportunities.length > 0) {
          enhancedOpportunities = opportunities.map(opp => 
            enhancedMap.get(opp.keyword) || opp
          )
          const enhancedCount = enhancedOpportunities.filter(opp => enhancedMap.has(opp.keyword)).length
          Logger.dev.trace(`Applied enhancements to ${enhancedCount} opportunity keywords`)
        }
        
        // Apply enhanced data back to gap analysis
        if (gapAnalysis && gapAnalysis.gaps.length > 0) {
          const enhancedGaps = gapAnalysis.gaps.map(gap => {
            const enhanced = enhancedMap.get(gap.keyword)
            // Only use enhanced version if it preserves gap-specific fields
            if (enhanced && enhanced.gapScore !== undefined && enhanced.gapType !== undefined) {
              return enhanced
            }
            return gap // Keep original gap data if enhancement doesn't preserve gap fields
          })
          enhancedGapAnalysis = {
            ...gapAnalysis,
            gaps: enhancedGaps
          }
          const enhancedCount = enhancedGaps.filter(gap => enhancedMap.has(gap.keyword) && enhancedMap.get(gap.keyword)?.gapScore !== undefined).length
          Logger.dev.trace(`Applied enhancements to ${enhancedCount} gap analysis keywords`)
        }
      }
      
      progressCallback?.('keyword_enhancement', 'Keyword enhancement completed successfully', 95)
      
    } catch (enhancementError) {
      Logger.error('Keyword enhancement failed, continuing with unenhanced data', enhancementError)
      progressCallback?.('keyword_enhancement', 'Keyword enhancement failed, using basic data', 95)
      // Continue with original data if enhancement fails
    }

    // Calculate overview statistics
    const overview = this.calculateOverview(asins, asinResults, aggregatedKeywords, startTime)

    Logger.dev.trace(`Keyword research completed in ${overview.processingTime}ms`)

    return {
      overview,
      asinResults,
      aggregatedKeywords,
      comparisonView,
      opportunities: enhancedOpportunities,
      gapAnalysis: enhancedGapAnalysis,
      // Include ALL keywords with competition data for Overview analysis
      allKeywordsWithCompetition: allKeywordsWithCompetition
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
    options: Required<KeywordResearchOptions>,
    progressCallback?: (phase: string, message: string, progress: number, data?: any) => void
  ): Promise<AsinKeywordResult[]> {
    const results: AsinKeywordResult[] = []
    
    for (let i = 0; i < asins.length; i++) {
      const asin = asins[i]
      const progress = Math.round((i / asins.length) * 40) + 5 // 5-45% range
      
      progressCallback?.('keyword_extraction', `Processing ${asin}...`, progress, {
        currentAsin: i + 1,
        totalAsins: asins.length,
        asin
      })
      
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

        const result: AsinKeywordResult = {
          asin,
          productTitle,
          keywordCount: filteredKeywords.length,
          keywords: filteredKeywords,
          status: 'success'
        }
        
        results.push(result)
        
        progressCallback?.('keyword_extraction', `Found ${filteredKeywords.length} keywords for ${asin}`, progress + 2, {
          currentAsin: i + 1,
          totalAsins: asins.length,
          asin,
          keywordsFound: filteredKeywords.length
        })
        
      } catch (error) {
        Logger.dev.error(`Failed to get keywords for ASIN ${asin}:`, error)
        results.push({
          asin,
          productTitle: undefined,
          keywordCount: 0,
          keywords: [],
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      
      // Small delay between ASINs to avoid rate limiting
      if (i < asins.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return results
  }

  /**
   * Aggregate keywords across all ASINs
   */
  public aggregateKeywords(asinResults: AsinKeywordResult[]): AggregatedKeyword[] {
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
  public createComparisonView(asinResults: AsinKeywordResult[]): AsinComparisonData[] {
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
   * Build keyword universe for Overview analysis (used when opportunities are disabled)
   */
  private buildKeywordUniverseForOverview(
    asinResults: AsinKeywordResult[],
    options: Required<KeywordResearchOptions>
  ): OpportunityData[] {
    const successfulResults = asinResults.filter(r => r.status === 'success')
    if (successfulResults.length === 0) return []

    // Build keyword universe with enhanced competitor analysis (simplified version)
    const keywordUniverse = new Map<string, {
      keyword: string
      searchVolume: number
      avgCpc: number
      competitorRankings: Array<{ asin: string; position: number; traffic: number }>
      // Enhanced fields from reverse ASIN data
      avgSupplyDemandRatio: number
      totalProducts: number
      avgAdvertisingCompetition: number
      bidRange: { min: number; max: number }
      marketTrend: string
      purchaseRate?: number
      avgPrice?: number
    }>()

    // Collect all keywords and their enhanced competitor positions
    successfulResults.forEach(result => {
      result.keywords.forEach(keyword => {
        if (!keywordUniverse.has(keyword.keyword)) {
          keywordUniverse.set(keyword.keyword, {
            keyword: keyword.keyword,
            searchVolume: keyword.searchVolume,
            avgCpc: keyword.cpc,
            competitorRankings: [],
            // Enhanced fields from reverse ASIN data
            avgSupplyDemandRatio: keyword.supplyDemandRatio || 0,
            totalProducts: keyword.products || 0,
            avgAdvertisingCompetition: keyword.products || 0,
            bidRange: { 
              min: keyword.bidMin || keyword.cpc, 
              max: keyword.bidMax || keyword.cpc 
            },
            marketTrend: keyword.trafficKeywordType || 'unknown',
            purchaseRate: keyword.purchaseRate,
            avgPrice: keyword.avgPrice
          })
        }

        const kwData = keywordUniverse.get(keyword.keyword)!
        if (keyword.rankingPosition && keyword.rankingPosition > 0 && keyword.rankingPosition <= 100) {
          kwData.competitorRankings.push({
            asin: result.asin,
            position: keyword.rankingPosition,
            traffic: keyword.trafficPercentage || 0
          })
        }
        
        // Update averages with enhanced data if we have multiple data points
        if (kwData.avgCpc !== keyword.cpc) {
          kwData.avgCpc = (kwData.avgCpc + keyword.cpc) / 2
        }
        if (keyword.supplyDemandRatio && kwData.avgSupplyDemandRatio !== keyword.supplyDemandRatio) {
          kwData.avgSupplyDemandRatio = (kwData.avgSupplyDemandRatio + keyword.supplyDemandRatio) / 2
        }
        const advertisingCompetition = keyword.products || 0
        if (advertisingCompetition && kwData.avgAdvertisingCompetition !== advertisingCompetition) {
          kwData.avgAdvertisingCompetition = (kwData.avgAdvertisingCompetition + advertisingCompetition) / 2
        }
      })
    })

    // Calculate competition metrics for ALL keywords
    const allKeywordsWithCompetition: OpportunityData[] = []
    
    keywordUniverse.forEach(kwData => {
      const competitorsInTop15 = kwData.competitorRankings.filter(c => c.position <= 15).length
      const competitorsRanking = kwData.competitorRankings.filter(c => c.position <= 50).length
      
      const avgCompetitorRank = kwData.competitorRankings.length > 0
        ? kwData.competitorRankings.reduce((sum, c) => sum + c.position, 0) / kwData.competitorRankings.length
        : 0
      
      const competitorStrength = kwData.competitorRankings.length > 0
        ? Math.max(1, Math.min(10, 11 - (avgCompetitorRank / 10)))
        : 1
      
      allKeywordsWithCompetition.push({
        keyword: kwData.keyword,
        searchVolume: kwData.searchVolume,
        competitionScore: competitorStrength,
        supplyDemandRatio: kwData.avgSupplyDemandRatio,
        avgCpc: Math.round(kwData.avgCpc * 100) / 100,
        growthTrend: kwData.marketTrend === 'traffic' ? 'growing' : kwData.marketTrend === 'conversion' ? 'stable' : 'unknown',
        competitorPerformance: {
          avgCompetitorRank: Math.round(avgCompetitorRank),
          competitorsRanking: competitorsRanking,
          competitorsInTop15: competitorsInTop15,
          competitorStrength: Math.round(competitorStrength * 100) / 100
        },
        opportunityType: competitorsInTop15 === 0 ? 'market_gap' : 
                        competitorStrength <= 3 ? 'weak_competitors' : 'low_competition',
        // Enhanced data from reverse ASIN
        products: kwData.totalProducts,
        adProducts: kwData.avgAdvertisingCompetition,
        bidMin: kwData.bidRange.min,
        bidMax: kwData.bidRange.max,
        purchaseRate: kwData.purchaseRate,
        avgPrice: kwData.avgPrice
      })
    })

    return allKeywordsWithCompetition
  }

  /**
   * Find targeted opportunity keywords based on specific competitor criteria
   */
  public async findTargetedOpportunities(
    asinResults: AsinKeywordResult[],
    options: Required<KeywordResearchOptions>
  ): Promise<{ opportunities: OpportunityData[]; allKeywordsWithCompetition: OpportunityData[] }> {
    const successfulResults = asinResults.filter(r => r.status === 'success')
    if (successfulResults.length === 0) return { opportunities: [], allKeywordsWithCompetition: [] }

    // Build keyword universe with enhanced competitor analysis
    const keywordUniverse = new Map<string, {
      keyword: string
      searchVolume: number
      avgCpc: number
      competitorRankings: Array<{ asin: string; position: number; traffic: number }>
      // Enhanced market intelligence from reverse ASIN
      avgSupplyDemandRatio: number
      totalProducts: number
      avgAdvertisingCompetition: number
      bidRange: { min: number; max: number }
      marketTrend: string
      purchaseRate?: number
      avgPrice?: number
    }>()

    // Collect all keywords and their enhanced competitor positions
    successfulResults.forEach(result => {
      result.keywords.forEach(keyword => {
        if (keyword.searchVolume < options.opportunityFilters.minSearchVolume) return

        if (!keywordUniverse.has(keyword.keyword)) {
          keywordUniverse.set(keyword.keyword, {
            keyword: keyword.keyword,
            searchVolume: keyword.searchVolume,
            avgCpc: keyword.cpc,
            competitorRankings: [],
            // Enhanced fields from reverse ASIN data
            avgSupplyDemandRatio: keyword.supplyDemandRatio || 0,
            totalProducts: keyword.products || 0,
            avgAdvertisingCompetition: keyword.products || 0,
            bidRange: { 
              min: keyword.bidMin || keyword.cpc, 
              max: keyword.bidMax || keyword.cpc 
            },
            marketTrend: keyword.trafficKeywordType || 'unknown',
            purchaseRate: keyword.purchaseRate,
            avgPrice: keyword.avgPrice
          })
        }

        const kwData = keywordUniverse.get(keyword.keyword)!
        // Only add to competitor rankings if we have valid ranking position data
        if (keyword.rankingPosition && keyword.rankingPosition > 0 && keyword.rankingPosition <= 100) {
          kwData.competitorRankings.push({
            asin: result.asin,
            position: keyword.rankingPosition,
            traffic: keyword.trafficPercentage || 0
          })
        }

        // Update averages with enhanced data
        if (kwData.avgCpc !== keyword.cpc) {
          kwData.avgCpc = (kwData.avgCpc + keyword.cpc) / 2
        }
        if (keyword.supplyDemandRatio && kwData.avgSupplyDemandRatio !== keyword.supplyDemandRatio) {
          kwData.avgSupplyDemandRatio = (kwData.avgSupplyDemandRatio + keyword.supplyDemandRatio) / 2
        }
        const advertisingCompetition = keyword.products || 0
        if (advertisingCompetition && kwData.avgAdvertisingCompetition !== advertisingCompetition) {
          kwData.avgAdvertisingCompetition = (kwData.avgAdvertisingCompetition + advertisingCompetition) / 2
        }
      })
    })

    // Calculate competition metrics for ALL keywords (no filtering)
    const allKeywordsWithCompetition: OpportunityData[] = []
    
    keywordUniverse.forEach(kwData => {
      // Calculate competition metrics for ALL keywords from reverse ASIN
      const competitorsInTop15 = kwData.competitorRankings.filter(c => c.position <= 15).length
      const competitorsRanking = kwData.competitorRankings.filter(c => c.position <= 50).length
      
      // Calculate competitor strength (1-10 scale, lower is weaker competition)
      const avgCompetitorRank = kwData.competitorRankings.length > 0
        ? kwData.competitorRankings.reduce((sum, c) => sum + c.position, 0) / kwData.competitorRankings.length
        : 0 // If no rankings, treat as no competition (best case)
      
      const competitorStrength = kwData.competitorRankings.length > 0
        ? Math.max(1, Math.min(10, 11 - (avgCompetitorRank / 10)))
        : 1 // If no competitor rankings, lowest competition score (best opportunity)
      
      // Add ALL keywords to the competition analysis (no filtering)
      allKeywordsWithCompetition.push({
        keyword: kwData.keyword,
        searchVolume: kwData.searchVolume,
        competitionScore: competitorStrength,
        supplyDemandRatio: kwData.avgSupplyDemandRatio,
        avgCpc: Math.round(kwData.avgCpc * 100) / 100,
        growthTrend: kwData.marketTrend === 'traffic' ? 'growing' : kwData.marketTrend === 'conversion' ? 'stable' : 'unknown',
        competitorPerformance: {
          avgCompetitorRank: Math.round(avgCompetitorRank),
          competitorsRanking: competitorsRanking,
          competitorsInTop15: competitorsInTop15,
          competitorStrength: Math.round(competitorStrength * 100) / 100
        },
        opportunityType: competitorsInTop15 === 0 ? 'market_gap' : 
                        competitorStrength <= 3 ? 'weak_competitors' : 'low_competition',
        // Enhanced data from reverse ASIN
        products: kwData.totalProducts,
        adProducts: kwData.avgAdvertisingCompetition,
        bidMin: kwData.bidRange.min,
        bidMax: kwData.bidRange.max,
        purchaseRate: kwData.purchaseRate,
        avgPrice: kwData.avgPrice
      })
    })

    // NOW apply opportunity filters to create a filtered subset
    const opportunities: OpportunityData[] = []
    const filters = options.opportunityFilters

    allKeywordsWithCompetition.forEach(kwData => {
      // Enhanced filtering criteria for opportunities only:
      const hasLowAdvertisingCompetition = (kwData.adProducts || 0) <= 20 // Max 20 ads
      const hasReasonableSupplyDemand = (kwData.supplyDemandRatio || 999) <= 15 // Lower ratio = better
      const hasManageableCompetition = (kwData.products || 999) <= 100 // Max 100 competing products
      
      if (
        kwData.searchVolume >= filters.minSearchVolume &&
        kwData.searchVolume <= filters.maxSearchVolume &&
        (kwData.competitorPerformance?.competitorsInTop15 || 0) <= filters.maxCompetitorsInTop15 &&
        (kwData.competitorPerformance?.competitorsRanking || 0) >= filters.minCompetitorsRanking &&
        kwData.competitionScore <= filters.maxCompetitorStrength &&
        // Enhanced filters using reverse ASIN data
        hasLowAdvertisingCompetition &&
        hasReasonableSupplyDemand &&
        hasManageableCompetition
      ) {
        opportunities.push(kwData)
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
        .filter(opp => 
          opp.searchVolume >= filters.minSearchVolume && 
          opp.searchVolume <= filters.maxSearchVolume
        )
        .map(opp => ({
          ...opp,
          opportunityType: 'keyword_mining' as const
        }))

      opportunities.push(...minedOpportunities)
    } catch (error) {
      Logger.error('Failed to get keyword mining opportunities', error)
    }

    // Sort by search volume and limit results
    const sortedOpportunities = opportunities
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 50)
    
    return { 
      opportunities: sortedOpportunities,
      allKeywordsWithCompetition: allKeywordsWithCompetition
    }
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
  public performGapAnalysis(
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
      gapScore = Math.min(10, ((kwData.searchVolume || 0) / 1000) * 2) // Higher score for higher volume
      recommendation = `Market opportunity: No competitors ranking well. Consider optimizing for "${kwData.keyword}"`
      potentialImpact = (kwData.searchVolume || 0) >= options.focusVolumeThreshold ? 'high' : 'medium'
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
      gapScore = 6 + Math.min(3, (kwData.searchVolume || 0) / 2000) // Bonus for volume
      recommendation = `Competitor weakness: Most competitors rank poorly for "${kwData.keyword}". Opportunity to rank higher`
      potentialImpact = (kwData.searchVolume || 0) >= options.focusVolumeThreshold ? 'high' : 'medium'
    }
    else {
      // No significant gap identified
      return null
    }

    // Apply volume and CPC modifiers to score
    if ((kwData.searchVolume || 0) >= options.focusVolumeThreshold) {
      gapScore += 2 // Bonus for high volume
    }
    if ((kwData.avgCpc || 0) < 1.0) {
      gapScore += 1 // Bonus for low competition (low CPC)
    }

    // Ensure gap score is always a valid number between 1 and 10
    gapScore = Math.min(10, Math.max(1, Math.round(gapScore || 1)))
    
    // Additional safety check - if still not a valid number, default to 1
    if (isNaN(gapScore) || !isFinite(gapScore)) {
      gapScore = 1
    }

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

  /**
   * Select top keywords for enhancement based on ranking position and relevancy scoring
   */
  private selectTopKeywordsForEnhancement<T extends { 
    keyword: string; 
    searchVolume: number;
    competitionScore?: number;
    gapScore?: number;
    avgCpc?: number;
  }>(keywords: T[], limit: number): T[] {
    return keywords
      .map(keyword => ({
        ...keyword,
        // Calculate enhancement priority score
        enhancementScore: this.calculateEnhancementScore(keyword)
      }))
      .sort((a, b) => b.enhancementScore - a.enhancementScore)
      .slice(0, limit)
      .map(({ enhancementScore, ...keyword }) => keyword as unknown as T) // Remove the temporary score
  }

  /**
   * Calculate enhancement priority score for keyword selection
   */
  private calculateEnhancementScore(keyword: { 
    searchVolume: number;
    competitionScore?: number;
    gapScore?: number;
    avgCpc?: number;
  }): number {
    let score = 0
    
    // Search volume component (30% weight) - higher is better
    const volumeScore = Math.min(keyword.searchVolume / 10000, 1) * 3
    score += volumeScore
    
    // Competition/Gap score component (40% weight) - depends on context
    if (keyword.gapScore) {
      // For gap analysis: higher gap score is better
      score += (keyword.gapScore / 10) * 4
    } else if (keyword.competitionScore) {
      // For opportunities: lower competition is better
      score += (1 - (keyword.competitionScore / 10)) * 4
    }
    
    // CPC component (20% weight) - moderate CPC is best (not too high, not too low)
    if (keyword.avgCpc) {
      const idealCpc = 1.5
      const cpcDiff = Math.abs(keyword.avgCpc - idealCpc)
      const cpcScore = Math.max(0, 1 - (cpcDiff / idealCpc)) * 2
      score += cpcScore
    }
    
    // Relevancy bonus (10% weight) - keywords with good fundamentals
    if (keyword.searchVolume > 1000 && (keyword.competitionScore || 0) < 7) {
      score += 1
    }
    
    return Math.round(score * 100) / 100
  }

  /**
   * Merge enhanced top keywords back with original unenhanced keywords
   */
  private mergeEnhancedWithOriginal<T extends { keyword: string }>(
    originalKeywords: T[], 
    enhancedKeywords: T[]
  ): T[] {
    const enhancedMap = new Map<string, T>()
    enhancedKeywords.forEach(kw => enhancedMap.set(kw.keyword, kw))
    
    // Return original keywords but replace with enhanced versions where available
    return originalKeywords.map(original => 
      enhancedMap.get(original.keyword) || original
    )
  }

  /**
   * Enhance keywords with detailed mining data
   */
  private async enhanceKeywordsWithMining<T extends { keyword: string }>(
    keywords: T[], 
    type: 'opportunity' | 'gap' | 'combined'
  ): Promise<T[]> {
    if (keywords.length === 0) return keywords

    Logger.dev.trace(`Enhancing ${keywords.length} ${type} keywords with mining data`)

    const enhancedKeywords: T[] = []
    const batchSize = 3 // Process in smaller batches to avoid rate limiting

    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize)
      
      try {
        // Process keywords sequentially instead of in parallel to avoid rate limiting
        const batchResults: T[] = []
        
        for (let j = 0; j < batch.length; j++) {
          const keyword = batch[j]
          try {
            // Add delay before each request (except first)
            if (j > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second between each request
            }
            
            const miningResults = await sellerSpriteClient.keywordMining(keyword.keyword, {
              minSearch: 100,
              maxSupplyDemandRatio: 20,
              size: 1 // We only need the data for this specific keyword
            })

            // Find the exact match for this keyword
            const exactMatch = miningResults.find(result => 
              result.keyword.toLowerCase() === keyword.keyword.toLowerCase()
            )

            if (exactMatch) {
              // Merge the enhanced mining data with the existing keyword data
              // Use spread operator to preserve ALL original fields first, then add enhancements
              const enhancedKeyword = {
                ...keyword, // Preserve ALL original fields (including gapScore, gapType, etc.)
                // Override with enhanced data from keyword mining (only add new fields)
                keywordCn: exactMatch.keywordCn,
                keywordJp: exactMatch.keywordJp,
                departments: exactMatch.departments,
                month: exactMatch.month,
                supplement: exactMatch.supplement,
                purchases: exactMatch.purchases,
                purchaseRate: exactMatch.purchaseRate,
                monopolyClickRate: exactMatch.monopolyClickRate,
                products: exactMatch.products || keyword.products,
                adProducts: exactMatch.adProducts || keyword.adProducts,
                avgPrice: exactMatch.avgPrice,
                avgRatings: exactMatch.avgRatings,
                avgRating: exactMatch.avgRating,
                bidMin: exactMatch.bidMin || keyword.bidMin,
                bidMax: exactMatch.bidMax || keyword.bidMax,
                bid: exactMatch.bid,
                cvsShareRate: exactMatch.cvsShareRate,
                wordCount: exactMatch.wordCount,
                titleDensity: exactMatch.titleDensity,
                spr: exactMatch.spr,
                relevancy: exactMatch.relevancy,
                amazonChoice: exactMatch.amazonChoice,
                searchRank: exactMatch.searchRank
              } as T
              batchResults.push(enhancedKeyword)
            } else {
              batchResults.push(keyword) // Return original if no exact match found
            }
            
          } catch (error) {
            Logger.dev.trace(`Failed to enhance keyword ${keyword.keyword} with mining data:`, error)
            batchResults.push(keyword) // Return original on error
          }
        }

        enhancedKeywords.push(...batchResults)

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < keywords.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds between batches
        }

      } catch (error) {
        Logger.error(`Failed to enhance batch of ${type} keywords`, error)
        // Add original keywords if batch fails
        enhancedKeywords.push(...batch)
      }
    }

    Logger.dev.trace(`Successfully enhanced ${enhancedKeywords.length}/${keywords.length} ${type} keywords`)
    return enhancedKeywords
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