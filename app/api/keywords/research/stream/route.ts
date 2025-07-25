import { NextRequest } from 'next/server'
import { kwSession } from '@/lib/keyword-research-session'
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

      // Validate ASINs using service method
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

      // Create progress callback for the service
      const progressCallback = (phase: string, message: string, progress: number, data?: any) => {
        sendEvent(controller, {
          phase: phase as any,
          message,
          progress,
          data,
          timestamp: new Date().toISOString()
        })
      }

      // Use the service layer for all business logic
      const options: KeywordResearchOptions = {
        maxKeywordsPerAsin,
        minSearchVolume,
        includeOpportunities,
        includeGapAnalysis,
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

      // Perform research using service layer
      const finalResult = await keywordResearchService.researchKeywords(asins, options, progressCallback)

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
        message: `Keyword research complete! Found ${finalResult.overview.totalKeywords} keywords and ${finalResult.opportunities.length} opportunities`,
        progress: 100,
        data: {
          sessionId
        },
        timestamp: new Date().toISOString()
      })

      Logger.dev.trace(`Streaming keyword research completed in ${finalResult.overview.processingTime}ms${sessionId ? ` (saved as ${sessionId})` : ''}`)
      
      // Close the stream
      controller.close()

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