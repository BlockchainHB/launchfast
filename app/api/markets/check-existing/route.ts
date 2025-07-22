import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword')

    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json({
        existingMarket: null
      })
    }

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

    // Check for existing market with exact or similar keyword
    const { data: existingMarket, error } = await supabaseAdmin
      .from('markets')
      .select('id, keyword, total_products_analyzed, products_verified, created_at, updated_at')
      .eq('user_id', userId)
      .ilike('keyword', keyword.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error checking existing market:', error)
      return NextResponse.json(
        { error: 'Failed to check existing markets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      existingMarket: existingMarket ? {
        id: existingMarket.id,
        keyword: existingMarket.keyword,
        productCount: existingMarket.total_products_analyzed,
        verifiedCount: existingMarket.products_verified,
        createdAt: existingMarket.created_at,
        updatedAt: existingMarket.updated_at
      } : null
    })

  } catch (error) {
    console.error('Market existence check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}