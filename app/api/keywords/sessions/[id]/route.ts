import { NextRequest, NextResponse } from 'next/server'
import { kwSession } from '@/lib/keyword-research-session'
import { Logger } from '@/lib/logger'

// GET /api/keywords/sessions/[id] - Load specific session data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = params.id
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    Logger.dev.trace(`Loading session ${sessionId} for user ${userId}`)
    
    const results = await kwSession.loadCachedResults(userId, sessionId)
    
    if (!results) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        results
      }
    })
    
  } catch (error) {
    Logger.error('Failed to load session', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load session'
      },
      { status: 500 }
    )
  }
}

// PATCH /api/keywords/sessions/[id] - Update session metadata (rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId, name } = body
    const sessionId = params.id
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid session name is required' },
        { status: 400 }
      )
    }
    
    Logger.dev.trace(`Renaming session ${sessionId} to "${name}" for user ${userId}`)
    
    await kwSession.renameSession(userId, sessionId, name.trim())
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        name: name.trim()
      }
    })
    
  } catch (error) {
    Logger.error('Failed to update session', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update session'
    const statusCode = errorMessage.includes('not found') || 
                      errorMessage.includes('access denied') ? 404 : 500
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

// DELETE /api/keywords/sessions/[id] - Delete session and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = params.id
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    Logger.dev.trace(`Deleting session ${sessionId} for user ${userId}`)
    
    await kwSession.deleteSession(userId, sessionId)
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        deleted: true
      }
    })
    
  } catch (error) {
    Logger.error('Failed to delete session', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete session'
    const statusCode = errorMessage.includes('not found') || 
                      errorMessage.includes('access denied') ? 404 : 500
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}