import { NextRequest, NextResponse } from 'next/server'
import { keywordResearchService, type KeywordResearchOptions } from '@/lib/keyword-research'
import { kwSession } from '@/lib/keyword-research-session'
import { kwCache } from '@/lib/keyword-research-cache'
import { 
  ErrorHandler, 
  validateAsins, 
  validateUserId, 
  validateSessionName, 
  validateResearchOptions 
} from '@/lib/keyword-research-errors'
import { Logger } from '@/lib/logger'

// Request interface
interface KeywordResearchRequest {
  asins: string[]  // 1-10 ASINs
  options?: KeywordResearchOptions
  sessionName?: string // Optional session name
  userId: string // Required for database operations
}

// Response interface
interface KeywordResearchResponse {
  success: boolean
  data?: Awaited<ReturnType<typeof keywordResearchService.researchKeywords>>
  sessionId?: string
  error?: string
}

// POST /api/keywords/research
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body: KeywordResearchRequest = await request.json()
    
    // Validate inputs with comprehensive error handling
    const userId = validateUserId(body.userId)
    const asins = validateAsins(body.asins) 
    const sessionName = validateSessionName(body.sessionName)
    const options = validateResearchOptions(body.options)
    
    Logger.dev.trace(`Keyword research API called for ${asins.length} ASINs by user ${userId}`)

    // Perform fresh research with retry logic
    const { sessionId, results } = await ErrorHandler.withRetry(
      () => kwSession.performFreshResearch(userId, asins, options, sessionName),
      3,
      1000,
      'keyword research'
    )

    const response: KeywordResearchResponse = {
      success: true,
      data: results,
      sessionId
    }

    return NextResponse.json(response)

  } catch (error) {
    const handled = ErrorHandler.handleError(error, 'POST /api/keywords/research')
    
    return NextResponse.json(
      { 
        success: false, 
        error: handled.message,
        code: handled.code
      },
      { status: handled.statusCode }
    )
  }
}