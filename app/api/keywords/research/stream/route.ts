import { NextRequest } from 'next/server'
import { keywordResearchService, type KeywordResearchOptions } from '@/lib/keyword-research'
import { kwDB } from '@/lib/keyword-research-db'
import { kwCache } from '@/lib/keyword-research-cache'
import { Logger } from '@/lib/logger'

// Progress event matching existing pattern
interface ProgressEvent {
  phase: 'keyword_extraction' | 'keyword_aggregation' | 'opportunity_mining' | 'gap_analysis' | 'complete' | 'error'
  message: string
  progress: number
  data?: any
  timestamp: string
}

interface StreamingKeywordResearchRequest {
  asins: string[]
  options?: KeywordResearchOptions
}

// Helper to create SSE response
function createSSEResponse() {
  const stream = new ReadableStream({
    start(controller) {
      return controller
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Helper to send SSE event (matching existing pattern)
function sendEvent(controller: ReadableStreamDefaultController, event: ProgressEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`
  controller.enqueue(new TextEncoder().encode(data))
}

// GET /api/keywords/research/stream
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Set up SSE headers (matching existing pattern)
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  let controller: ReadableStreamDefaultController<Uint8Array>
  
  const stream = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg
    },
    cancel() {
      Logger.dev.trace('Keyword research SSE stream cancelled by client')
    }
  })

  // Start the research process
  ;(async () => {
    try {
      const { searchParams } = new URL(request.url)
      const asins = searchParams.get('asins')?.split(',') || []
      const userId = searchParams.get('userId') || ''
      const sessionName = searchParams.get('sessionName') || undefined
      const maxKeywordsPerAsin = parseInt(searchParams.get('maxKeywordsPerAsin') || '50')
      const minSearchVolume = parseInt(searchParams.get('minSearchVolume') || '100')
      const includeOpportunities = searchParams.get('includeOpportunities') !== 'false'
      const includeGapAnalysis = searchParams.get('includeGapAnalysis') !== 'false'

      // Validate userId
      if (!userId) {
        sendEvent(controller, {
          phase: 'error',
          message: 'User ID is required for streaming research',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        controller.close()
        return
      }

      if (!asins.length || asins.length > 10) {
        sendEvent(controller, {
          phase: 'error',
          message: 'Invalid ASINs: provide 1-10 ASINs',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        controller.close()
        return
      }

      // Validate ASINs
      try {
        keywordResearchService.validateAsins(asins)
      } catch (error) {
        sendEvent(controller, {
          phase: 'error',
          message: error instanceof Error ? error.message : 'Invalid ASINs',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        controller.close()
        return
      }

      Logger.dev.trace(`Streaming keyword research for ${asins.length} ASINs: ${asins.join(', ')}`)

      // Phase 1: Keyword Extraction
      sendEvent(controller, {
        phase: 'keyword_extraction',
        message: `Extracting keywords from ${asins.length} products...`,
        progress: 0,
        data: {
          totalAsins: asins.length,
          currentAsin: 0,
          stepType: 'determinate'
        },
        timestamp: new Date().toISOString()
      })

      // Process ASINs one by one with progress updates
      const asinResults = []
      for (let i = 0; i < asins.length; i++) {
        const asin = asins[i]
        const progress = Math.round(((i + 1) / asins.length) * 50) // 50% for extraction phase

        try {
          sendEvent(controller, {
            phase: 'keyword_extraction',
            message: `Analyzing keywords for ${asin}...`,
            progress: Math.round((i / asins.length) * 50),
            data: {
              totalAsins: asins.length,
              currentAsin: i + 1,
              processingAsin: asin,
              stepType: 'determinate'
            },
            timestamp: new Date().toISOString()
          })

          const keywords = await keywordResearchService.sellerSpriteClient.reverseASIN(asin, 1, maxKeywordsPerAsin)
          const filteredKeywords = keywords.filter(kw => kw.searchVolume >= minSearchVolume)

          const result = {
            asin,
            productTitle: undefined,
            keywordCount: filteredKeywords.length,
            keywords: filteredKeywords,
            status: 'success' as const
          }

          asinResults.push(result)

          sendEvent(controller, {
            phase: 'keyword_extraction',
            message: `Found ${filteredKeywords.length} keywords for ${asin}`,
            progress,
            data: {
              totalAsins: asins.length,
              currentAsin: i + 1,
              completedAsin: asin,
              keywordsFound: filteredKeywords.length,
              stepType: 'determinate'
            },
            timestamp: new Date().toISOString()
          })

        } catch (error) {
          const failedResult = {
            asin,
            productTitle: undefined,
            keywordCount: 0,
            keywords: [],
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          }

          asinResults.push(failedResult)
          Logger.error(`Failed to process ASIN ${asin}`, error)
        }

        // Small delay between ASINs
        if (i < asins.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Phase 2: Keyword Aggregation & Comparison View
      sendEvent(controller, {
        phase: 'keyword_aggregation',
        message: 'Aggregating keywords and creating comparison views...',
        progress: 50,
        data: {
          totalKeywords: asinResults.reduce((sum, r) => sum + (r.keywordCount || 0), 0),
          stepType: 'indeterminate'
        },
        timestamp: new Date().toISOString()
      })

      // Aggregate keywords (reuse existing logic) 
      const aggregatedKeywords = aggregateKeywords(asinResults)
      
      // Create comparison view using service method
      const comparisonView = createComparisonView(asinResults)

      sendEvent(controller, {
        phase: 'keyword_aggregation',
        message: `Identified ${aggregatedKeywords.length} unique keywords across ${comparisonView.length} products`,
        progress: 70,
        data: {
          uniqueKeywords: aggregatedKeywords.length,
          topKeywords: aggregatedKeywords.slice(0, 5).map(kw => kw.keyword),
          comparisonView: comparisonView.map(cv => ({
            asin: cv.asin,
            totalKeywords: cv.totalKeywords,
            strongKeywords: cv.strongKeywords.length,
            weakKeywords: cv.weakKeywords.length
          })),
          stepType: 'determinate'
        },
        timestamp: new Date().toISOString()
      })

      // Phase 3: Targeted Opportunity Mining
      let opportunities: any[] = []
      if (includeOpportunities && asinResults.length > 0) {
        sendEvent(controller, {
          phase: 'opportunity_mining',
          message: 'Mining targeted opportunities with competitor analysis...',
          progress: 70,
          data: {
            criteriaApplied: {
              minSearchVolume: 500,
              maxCompetitorsInTop15: 2,
              maxCompetitorStrength: 5
            },
            stepType: 'indeterminate'
          },
          timestamp: new Date().toISOString()
        })

        try {
          // Use the enhanced targeted opportunity finder
          const options = {
            maxKeywordsPerAsin,
            minSearchVolume,
            includeOpportunities,
            includeGapAnalysis,
            opportunityFilters: {
              minSearchVolume: 500,  // Higher threshold for quality opportunities
              maxCompetitorsInTop15: 2,
              minCompetitorsRanking: 1,
              maxCompetitorStrength: 5
            }
          }

          opportunities = await findTargetedOpportunities(asinResults, options)

          sendEvent(controller, {
            phase: 'opportunity_mining',
            message: `Found ${opportunities.length} high-quality opportunities using targeted filtering`,
            progress: 85,
            data: {
              totalOpportunities: opportunities.length,
              opportunityTypes: {
                market_gap: opportunities.filter(o => o.opportunityType === 'market_gap').length,
                weak_competitors: opportunities.filter(o => o.opportunityType === 'weak_competitors').length,
                low_competition: opportunities.filter(o => o.opportunityType === 'low_competition').length,
                keyword_mining: opportunities.filter(o => o.opportunityType === 'keyword_mining').length
              },
              avgSearchVolume: opportunities.length > 0 
                ? Math.round(opportunities.reduce((sum, o) => sum + o.searchVolume, 0) / opportunities.length)
                : 0,
              stepType: 'determinate'
            },
            timestamp: new Date().toISOString()
          })

        } catch (error) {
          Logger.error('Targeted opportunity mining failed', error)
          // Fallback to basic opportunity mining
          opportunities = []
        }
      }

      // Phase 4: GAP Analysis
      let gapAnalysis: any = undefined
      if (includeGapAnalysis && asins.length >= 2) {
        sendEvent(controller, {
          phase: 'gap_analysis',
          message: 'Analyzing market gaps and opportunities...',
          progress: 90,
          data: {
            userAsin: asins[0],
            competitorCount: asins.length - 1,
            stepType: 'indeterminate'
          },
          timestamp: new Date().toISOString()
        })

        try {
          // Use service method to perform GAP analysis
          const options = {
            maxKeywordsPerAsin,
            minSearchVolume,
            includeOpportunities,
            includeGapAnalysis,
            gapAnalysisOptions: {
              minGapVolume: 1000,
              maxGapPosition: 50,
              focusVolumeThreshold: 5000
            }
          }

          // Use the service's GAP analysis method (access private method)
          gapAnalysis = keywordResearchService['performGapAnalysis'](asinResults, options)

          if (gapAnalysis) {
            sendEvent(controller, {
              phase: 'gap_analysis',
              message: `Found ${gapAnalysis.analysis.totalGapsFound} market gaps (${gapAnalysis.analysis.highVolumeGaps} high-volume)`,
              progress: 95,
              data: {
                totalGaps: gapAnalysis.analysis.totalGapsFound,
                highVolumeGaps: gapAnalysis.analysis.highVolumeGaps,
                totalPotential: gapAnalysis.analysis.totalGapPotential,
                stepType: 'determinate'
              },
              timestamp: new Date().toISOString()
            })
          }
        } catch (error) {
          Logger.error('GAP analysis failed', error)
          // Continue without GAP analysis rather than failing entire request
        }
      }

      // Calculate final results
      const successfulResults = asinResults.filter(r => r.status === 'success')
      const totalKeywords = successfulResults.reduce((sum, r) => sum + r.keywordCount, 0)
      const avgSearchVolume = aggregatedKeywords.length > 0 
        ? Math.round(aggregatedKeywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / aggregatedKeywords.length)
        : 0

      const finalResult = {
        overview: {
          totalAsins: asins.length,
          totalKeywords,
          avgSearchVolume,
          processingTime: Date.now() - startTime
        },
        asinResults,
        aggregatedKeywords,
        comparisonView,
        opportunities,
        gapAnalysis
      }

      // Save to database in background
      let sessionId: string | undefined
      try {
        sendEvent(controller, {
          phase: 'complete',
          message: 'Research complete - saving session...',
          progress: 98,
          data: { saving: true },
          timestamp: new Date().toISOString()
        })

        const options: KeywordResearchOptions = {
          maxKeywordsPerAsin,
          minSearchVolume,
          includeOpportunities,
          includeGapAnalysis,
          opportunityFilters: {
            minSearchVolume: 500,
            maxCompetitorsInTop15: 2,
            minCompetitorsRanking: 1,
            maxCompetitorStrength: 5
          }
        }

        sessionId = await kwDB.saveResearchSession(userId, asins, finalResult, options, sessionName)
        
        // Cache the results
        await kwCache.cacheSessionResult(userId, sessionId, finalResult)

        Logger.dev.trace(`Streaming research saved as session ${sessionId}`)
      } catch (saveError) {
        Logger.error('Failed to save streaming research session', saveError)
        // Continue anyway - don't fail the stream for save errors
      }

      // Phase 5: Complete with session info
      sendEvent(controller, {
        phase: 'complete',  
        message: `Keyword research complete! Found ${totalKeywords} keywords and ${opportunities.length} opportunities`,
        progress: 100,
        data: {
          ...finalResult,
          sessionId
        },
        timestamp: new Date().toISOString()
      })

      Logger.dev.trace(`Streaming keyword research completed in ${Date.now() - startTime}ms${sessionId ? ` (saved as ${sessionId})` : ''}`)

    } catch (error) {
      Logger.error('Keyword research stream error', error)
      
      sendEvent(controller, {
        phase: 'error',
        message: error instanceof Error ? error.message : 'Research failed',
        progress: 0,
        data: {
          canRetry: true,
          errorType: 'processing_error'
        },
        timestamp: new Date().toISOString()
      })
    } finally {
      controller.close()
    }
  })()

  return new Response(stream, { headers })
}

// Helper function to create comparison view
function createComparisonView(asinResults: any[]) {
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

// Helper function to find targeted opportunities
async function findTargetedOpportunities(asinResults: any[], options: any) {
  const successfulResults = asinResults.filter(r => r.status === 'success')
  if (successfulResults.length === 0) return []

  // Build keyword universe with competitor analysis
  const keywordUniverse = new Map()

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

      const kwData = keywordUniverse.get(keyword.keyword)
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

  // Filter opportunities based on criteria
  const opportunities = []
  const filters = options.opportunityFilters

  keywordUniverse.forEach(kwData => {
    // Apply filtering criteria
    const competitorsInTop15 = kwData.competitorRankings.filter(c => c.position <= 15).length
    const competitorsRanking = kwData.competitorRankings.filter(c => c.position <= 50).length
    
    // Calculate competitor strength (1-10 scale, lower is weaker competition)
    const avgCompetitorRank = kwData.competitorRankings.length > 0
      ? kwData.competitorRankings.reduce((sum, c) => sum + c.position, 0) / kwData.competitorRankings.length
      : 999
    
    const competitorStrength = Math.max(1, Math.min(10, 11 - (avgCompetitorRank / 10)))

    // Apply filtering criteria
    if (
      kwData.searchVolume >= filters.minSearchVolume &&
      competitorsInTop15 <= filters.maxCompetitorsInTop15 &&
      competitorsRanking >= filters.minCompetitorsRanking &&
      competitorsRanking <= filters.maxCompetitorsInTop15 + 1 &&
      competitorStrength <= filters.maxCompetitorStrength
    ) {
      opportunities.push({
        keyword: kwData.keyword,
        searchVolume: kwData.searchVolume,
        competitionScore: competitorStrength,
        supplyDemandRatio: competitorsRanking,
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
    const topAggregatedKeywords = aggregateKeywords(asinResults).slice(0, 3)
    const miningPromises = topAggregatedKeywords.map(kw => 
      keywordResearchService.sellerSpriteClient.keywordMining(kw.keyword, {
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

// Helper function to aggregate keywords
function aggregateKeywords(asinResults: any[]) {
  const keywordMap = new Map()

  // Collect all keywords from successful results
  asinResults.forEach(result => {
    if (result.status === 'success') {
      result.keywords.forEach(keyword => {
        if (keywordMap.has(keyword.keyword)) {
          const existing = keywordMap.get(keyword.keyword)
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
      
      // Calculate opportunity score
      const searchVolumeScore = Math.min(keywordData.searchVolume / 10000, 10)
      const competitionScore = Math.max(0, 10 - keywordData.rankingAsins.length)
      const cpcScore = avgCpc > 0.5 && avgCpc < 3.0 ? 5 : Math.max(0, 5 - Math.abs(avgCpc - 1.5))
      const opportunityScore = Math.round((searchVolumeScore + competitionScore + cpcScore) / 3 * 100) / 100

      return {
        keyword: keywordData.keyword,
        searchVolume: keywordData.searchVolume,
        avgCpc: Math.round(avgCpc * 100) / 100,
        rankingAsins: keywordData.rankingAsins,
        opportunityScore
      }
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}