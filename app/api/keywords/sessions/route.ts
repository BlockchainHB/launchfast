import { NextRequest, NextResponse } from 'next/server'
import { kwSession } from '@/lib/keyword-research-session'
import { Logger } from '@/lib/logger'

// GET /api/keywords/sessions - List user's keyword research sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    Logger.dev.trace(`Loading sessions for user ${userId}`)
    
    const sessions = await kwSession.getUserSessions(userId)
    
    return NextResponse.json({
      success: true,
      data: {
        sessions,
        total: sessions.length
      }
    })
    
  } catch (error) {
    Logger.error('Failed to load user sessions', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load sessions'
      },
      { status: 500 }
    )
  }
}

// POST /api/keywords/sessions - Create a new session (for manual session creation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, asins, options, sessionName } = body
    
    if (!userId || !asins?.length) {
      return NextResponse.json(
        { success: false, error: 'User ID and ASINs are required' },
        { status: 400 }
      )
    }
    
    Logger.dev.trace(`Creating new session for user ${userId}`)
    
    // Perform fresh research and save
    const { sessionId, results } = await kwSession.performFreshResearch(
      userId,
      asins,
      options || {},
      sessionName
    )
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        results
      }
    })
    
  } catch (error) {
    Logger.error('Failed to create new session', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create session'
    const statusCode = errorMessage.includes('ASINs array is required') || 
                      errorMessage.includes('Maximum 10 ASINs') || 
                      errorMessage.includes('Invalid ASIN format') ? 400 : 500
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}