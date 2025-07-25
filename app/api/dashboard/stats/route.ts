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

    // Get aggregated stats from user's products
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('grade, monthly_revenue, profit_estimate, created_at')
      .eq('user_id', userId)

    if (productsError) {
      throw productsError
    }

    // Calculate stats
    const totalProducts = products?.length || 0
    
    // Count high-grade products (A1-B10)
    const highGradeProducts = products?.filter(product => {
      const grade = product.grade
      if (!grade) return false
      return grade.startsWith('A') || grade.startsWith('B')
    }).length || 0

    // Calculate average monthly revenue
    const totalRevenue = products?.reduce((sum, product) => sum + (product.monthly_revenue || 0), 0) || 0
    const avgMonthlyRevenue = totalProducts > 0 ? totalRevenue / totalProducts : 0

    // Calculate total profit potential
    const totalProfitPotential = products?.reduce((sum, product) => sum + (product.profit_estimate || 0), 0) || 0

    // Calculate some additional useful stats
    const recentProducts = products?.filter(product => {
      const createdDate = new Date(product.created_at)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return createdDate >= sevenDaysAgo
    }).length || 0

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        highGradeProducts,
        avgMonthlyRevenue,
        totalProfitPotential,
        recentProducts,
        // Additional calculated metrics
        highGradePercentage: totalProducts > 0 ? Math.round((highGradeProducts / totalProducts) * 100) : 0,
        avgProfitPerProduct: totalProducts > 0 ? totalProfitPotential / totalProducts : 0
      }
    })

  } catch (error) {
    console.error('Dashboard stats API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}