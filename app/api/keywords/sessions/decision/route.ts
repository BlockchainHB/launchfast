import { NextRequest, NextResponse } from 'next/server'
import { kwSession } from '@/lib/keyword-research-session'
import { kwUI } from '@/lib/keyword-research-ui-helper'
import { Logger } from '@/lib/logger'

// GET /api/keywords/sessions/decision - General research decision (no specific session)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const asins = searchParams.get('asins')?.split(',') || []
    
    if (!userId || !asins.length) {
      return NextResponse.json(
        { success: false, error: 'User ID and ASINs are required' },
        { status: 400 }
      )
    }
    
    // Validate ASINs format
    const validation = kwUI.validateResearchInput(asins)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      )
    }
    
    Logger.dev.trace(`Getting general research decision for user ${userId} with ${asins.length} ASINs`)
    
    // Parse options from query params
    const options = {
      maxKeywordsPerAsin: parseInt(searchParams.get('maxKeywordsPerAsin') || '50'),
      minSearchVolume: parseInt(searchParams.get('minSearchVolume') || '100'),
      includeOpportunities: searchParams.get('includeOpportunities') !== 'false',
      includeGapAnalysis: searchParams.get('includeGapAnalysis') !== 'false'
    }
    
    // Get decision recommendation
    const { uiState, decision } = await kwUI.handleResearchIntent(userId, asins, options)
    
    // Get user-friendly messaging
    const decisionMessage = kwUI.getDecisionMessage(decision)
    
    // Get research steps for UI
    const researchSteps = kwUI.getResearchSteps(asins.length, options.includeGapAnalysis)
    
    return NextResponse.json({
      success: true,
      data: {
        decision,
        uiState,
        message: decisionMessage,
        validation: {
          warnings: validation.warnings
        },
        researchSteps,
        optionsFormatted: kwUI.formatResearchOptions(options)
      }
    })
    
  } catch (error) {
    Logger.error('Failed to get general research decision', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze research decision'
      },
      { status: 500 }
    )
  }
}

// POST /api/keywords/sessions/decision - Make research decision with body data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, asins, options, action } = body
    
    if (!userId || !asins?.length) {
      return NextResponse.json(
        { success: false, error: 'User ID and ASINs are required' },
        { status: 400 }
      )
    }
    
    // Validate ASINs format
    const validation = kwUI.validateResearchInput(asins)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      )
    }
    
    Logger.dev.trace(`Processing research decision for user ${userId}: action=${action}`)
    
    // If user wants to proceed with research
    if (action === 'research') {
      const { sessionId, results } = await kwSession.performFreshResearch(
        userId,
        asins,
        options || {},
        body.sessionName
      )
      
      return NextResponse.json({
        success: true,
        data: {
          action: 'research',
          sessionId,
          results
        }
      })
    }
    
    // If user wants to reload existing session
    if (action === 'reload' && body.sessionId) {
      const results = await kwSession.loadCachedResults(userId, body.sessionId)
      
      if (!results) {
        return NextResponse.json(
          { success: false, error: 'Session not found or expired' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: {
          action: 'reload',
          sessionId: body.sessionId,
          results
        }
      })
    }
    
    // Default: Get decision recommendation
    const { uiState, decision } = await kwUI.handleResearchIntent(userId, asins, options)
    const decisionMessage = kwUI.getDecisionMessage(decision)
    
    return NextResponse.json({
      success: true,
      data: {
        decision,
        uiState,
        message: decisionMessage,
        validation: {
          warnings: validation.warnings
        }
      }
    })
    
  } catch (error) {
    Logger.error('Failed to process research decision', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to process research decision'
    const statusCode = errorMessage.includes('not found') || 
                      errorMessage.includes('expired') ? 404 : 500
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}