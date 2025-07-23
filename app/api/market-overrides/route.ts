import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { MarketRecalculator } from '@/lib/market-recalculator'
// Cache removed for data accuracy
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id

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
    // Get authenticated user from session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id
    const body = await request.json()
    const { market_id, override_reason } = body

    if (!market_id) {
      return NextResponse.json(
        { error: 'market_id is required' },
        { status: 400 }
      )
    }

    // Check if market override already exists
    const { data: existingOverride } = await supabaseAdmin
      .from('market_overrides')
      .select('id, market_grade')
      .eq('user_id', userId)
      .eq('market_id', market_id)
      .single()
    
    const isReOverride = !!existingOverride
    console.log(`🔄 Market override operation: ${isReOverride ? 'Re-override' : 'New override'} for market ${market_id}`)
    
    // Manually trigger market recalculation (this creates/updates the market override)
    const recalculator = new MarketRecalculator()
    const result = await recalculator.recalculateMarket(
      market_id, 
      userId, 
      override_reason || 'Manual market recalculation'
    )

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to recalculate market' },
        { status: 500 }
      )
    }

    // No cache invalidation needed - dashboard shows real-time data
    console.log(`✅ Dashboard will reflect market ${isReOverride ? 're-override' : 'override'} in real-time`)

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
    // Get authenticated user from session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id
    const { searchParams } = new URL(request.url)
    const marketId = searchParams.get('market_id')

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

    // No cache invalidation needed - dashboard shows real-time data
    console.log(`✅ Dashboard will reflect market override deletion in real-time`)

    return NextResponse.json({
      success: true,
      message: marketId 
        ? 'Successfully deleted market override' 
        : 'Successfully deleted all market overrides for user',
      debug: {
        realTimeDashboard: true
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