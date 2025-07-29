import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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

    // Fetch user's markets
    const { data: markets, error } = await supabaseAdmin
      .from('markets')
      .select(`
        id,
        keyword,
        total_products_analyzed,
        products_verified,
        market_grade,
        avg_monthly_revenue,
        avg_profit_margin,
        opportunity_score,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching markets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch markets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      markets: markets || []
    })

  } catch (error) {
    console.error('Markets API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}