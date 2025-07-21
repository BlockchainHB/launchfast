import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { MarketRecalculator } from '@/lib/market-recalculator'
import { cache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('market_overrides')
      .select(`
        *,
        markets!inner(id, keyword, user_id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch market overrides from database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { market_id, user_id, override_reason } = body

    if (!market_id || !user_id) {
      return NextResponse.json(
        { error: 'market_id and user_id are required' },
        { status: 400 }
      )
    }

    // Check if market override already exists
    const { data: existingOverride } = await supabaseAdmin
      .from('market_overrides')
      .select('id, market_grade')
      .eq('user_id', user_id)
      .eq('market_id', market_id)
      .single()
    
    const isReOverride = !!existingOverride
    console.log(`🔄 Market override operation: ${isReOverride ? 'Re-override' : 'New override'} for market ${market_id}`)
    
    // Manually trigger market recalculation (this creates/updates the market override)
    const recalculator = new MarketRecalculator()
    const result = await recalculator.recalculateMarket(
      market_id, 
      user_id, 
      override_reason || 'Manual market recalculation'
    )

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to recalculate market' },
        { status: 500 }
      )
    }

    // Force invalidate dashboard cache to update stats cards (especially for re-overrides)
    const dashboardCacheKey = `dashboard_data_${user_id}`
    
    console.log(`🔍 Invalidating cache for ${isReOverride ? 're-override' : 'new override'}: ${dashboardCacheKey}`)
    await cache.del(dashboardCacheKey)
    
    // Add delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const cacheStillExists = await cache.exists(dashboardCacheKey)
    console.log(`🗑️ Invalidated dashboard cache after market ${isReOverride ? 're-override' : 'override'}: ${dashboardCacheKey} (still exists: ${cacheStillExists})`)

    return NextResponse.json({
      success: true,
      message: 'Market recalculated successfully',
      data: result,
      debug: {
        cacheInvalidated: true,
        cacheKey: dashboardCacheKey,
        isReOverride,
        previousGrade: existingOverride?.market_grade,
        newGrade: result.recalculatedData.market_grade
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const marketId = searchParams.get('market_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('market_overrides')
      .delete()
      .eq('user_id', userId)

    if (marketId) {
      query = query.eq('market_id', marketId)
    }

    const { error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete market overrides from database' },
        { status: 500 }
      )
    }

    // Invalidate dashboard cache to update stats cards after deletion
    const dashboardCacheKey = `dashboard_data_${userId}`
    await cache.del(dashboardCacheKey)
    console.log(`🗑️ Invalidated dashboard cache after market override deletion: ${dashboardCacheKey}`)

    return NextResponse.json({
      success: true,
      message: marketId 
        ? 'Successfully deleted market override' 
        : 'Successfully deleted all market overrides for user',
      debug: {
        cacheInvalidated: true,
        cacheKey: dashboardCacheKey
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}