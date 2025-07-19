import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cache, CACHE_TTL } from '@/lib/cache'
import { createServerClient } from '@supabase/ssr'

// TypeScript interfaces for the response
interface DashboardStats {
  marketsAnalyzed: number
  totalProducts: number
  highGradeMarkets: number
  avgMarketRevenue: number
  // Legacy stats for backward compatibility
  highGradeProducts: number
  highGradePercentage: number
  avgMonthlyRevenue: number
  totalProfitPotential: number
  recentActivity: number
}

interface UserProfile {
  id: string
  name: string
  email: string
  company?: string
}

interface MarketWithProducts {
  id: string
  keyword: string
  market_grade: string
  avg_monthly_revenue: number
  avg_profit_margin: number
  products_verified: number
  total_products_analyzed: number
  market_consistency_rating: string
  market_risk_classification: string
  opportunity_score: number
  research_date: string
  // All other market metrics...
  avg_price: number
  avg_monthly_sales: number
  avg_reviews: number
  avg_rating: number
  avg_bsr: number
  avg_cpc: number
  avg_daily_revenue: number
  avg_launch_budget: number
  avg_profit_per_unit: number
  market_competitive_intelligence: string
  products: EnhancedProduct[]
}

interface LegacyProduct {
  id: string
  asin: string
  title: string
  brand: string
  grade: string
  // ... all product fields
}

interface DashboardData {
  user: UserProfile
  stats: DashboardStats
  markets: MarketWithProducts[]
  legacyProducts: LegacyProduct[]
}

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

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Check cache first for performance
    const cacheKey = `dashboard_data_${userId}`
    const cached = await cache.get<DashboardData>(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true
      })
    }

    console.log('🏃‍♂️ Fetching complete dashboard data for user:', userId)

    // Fetch user profile, markets, and legacy products first
    const [userProfile, marketsWithProducts, legacyProducts] = await Promise.all([
      fetchUserProfile(userId),
      fetchMarketsWithProducts(userId), 
      fetchLegacyProducts(userId)
    ])

    // Calculate market-centric stats using the fetched markets data
    const marketStats = await calculateMarketStats(userId, marketsWithProducts)

    const dashboardData: DashboardData = {
      user: userProfile,
      stats: marketStats,
      markets: marketsWithProducts,
      legacyProducts: legacyProducts
    }

    // Cache for 5 minutes to improve performance
    await cache.set(cacheKey, dashboardData, 300) // 5 minutes

    console.log(`✅ Dashboard data loaded: ${marketsWithProducts.length} markets, ${legacyProducts.length} legacy products`)

    return NextResponse.json({
      success: true,
      data: dashboardData,
      cached: false,
      stats: {
        markets_count: marketsWithProducts.length,
        legacy_products_count: legacyProducts.length,
        total_products: marketStats.totalProducts
      }
    })

  } catch (error) {
    console.error('❌ Dashboard data API error:', error)
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : typeof error
      },
      { status: 500 }
    )
  }
}

/**
 * Fetch user profile information
 */
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, email, company')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.warn('Profile fetch failed, using fallback')
      return {
        id: userId,
        name: 'Launch Fast User',
        email: 'user@launchfast.com',
        company: 'LegacyX FBA'
      }
    }

    return {
      id: profile.id,
      name: profile.name || 'Launch Fast User',
      email: profile.email || 'user@launchfast.com', 
      company: profile.company || 'LegacyX FBA'
    }
  } catch (error) {
    console.error('User profile fetch error:', error)
    return {
      id: userId,
      name: 'Launch Fast User',
      email: 'user@launchfast.com',
      company: 'LegacyX FBA'
    }
  }
}

/**
 * Fetch markets with all linked products in a single optimized query
 */
async function fetchMarketsWithProducts(userId: string): Promise<MarketWithProducts[]> {
  try {
    console.log('🔍 Fetching markets for user:', userId)
    
    const { data: markets, error: marketsError } = await supabaseAdmin
      .from('markets')
      .select(`
        *,
        products(
          *,
          ai_analysis(
            risk_classification,
            consistency_rating,
            estimated_dimensions,
            estimated_weight,
            opportunity_score,
            market_insights,
            risk_factors
          ),
          product_keywords(
            ranking_position,
            traffic_percentage,
            keywords(
              keyword,
              search_volume,
              competition_score,
              avg_cpc
            )
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (marketsError) {
      console.error('❌ Markets fetch error:', marketsError)
      throw new Error(`Failed to fetch markets: ${marketsError.message}`)
    }
    
    console.log('✅ Markets fetched successfully:', markets?.length || 0)

  // Transform database structure to frontend format
  return (markets || []).map(market => ({
    id: market.id,
    keyword: market.keyword,
    market_grade: market.market_grade,
    avg_monthly_revenue: market.avg_monthly_revenue || 0,
    avg_profit_margin: market.avg_profit_margin || 0,
    products_verified: market.products_verified || 0,
    total_products_analyzed: market.total_products_analyzed || 0,
    market_consistency_rating: market.market_consistency_rating,
    market_risk_classification: market.market_risk_classification,
    opportunity_score: market.opportunity_score || 0,
    research_date: market.research_date,
    
    // All averaged market metrics
    avg_price: market.avg_price || 0,
    avg_monthly_sales: market.avg_monthly_sales || 0,
    avg_reviews: market.avg_reviews || 0,
    avg_rating: market.avg_rating || 0,
    avg_bsr: market.avg_bsr || 0,
    avg_cpc: market.avg_cpc || 0,
    avg_daily_revenue: market.avg_daily_revenue || 0,
    avg_launch_budget: market.avg_launch_budget || 0,
    avg_profit_per_unit: market.avg_profit_per_unit || 0,
    market_competitive_intelligence: market.market_competitive_intelligence || '',

    // Transform linked products
    products: (market.products || []).map(transformProductForTable)
  }))
  
  } catch (error) {
    console.error('❌ fetchMarketsWithProducts error:', error)
    return []
  }
}

/**
 * Fetch legacy products (products without market_id)
 */
async function fetchLegacyProducts(userId: string): Promise<LegacyProduct[]> {
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      ai_analysis(
        risk_classification,
        consistency_rating,
        estimated_dimensions,
        estimated_weight,
        opportunity_score,
        market_insights,
        risk_factors
      ),
      product_keywords(
        ranking_position,
        traffic_percentage,
        keywords(
          keyword,
          search_volume,
          competition_score,
          avg_cpc
        )
      )
    `)
    .eq('user_id', userId)
    .is('market_id', null) // Only products without market association
    .order('created_at', { ascending: false })

  if (productsError) {
    console.error('Legacy products fetch error:', productsError)
    return []
  }

  return (products || []).map(transformProductForTable)
}

/**
 * Transform database product to table format (shared utility)
 */
function transformProductForTable(product: any) {
  return {
    id: product.id,
    asin: product.asin,
    title: product.title,
    brand: product.brand || 'Unknown',
    price: product.price,
    bsr: product.bsr,
    reviews: product.reviews,
    rating: product.rating,
    grade: product.grade,
    images: product.images || [],
    dimensions: product.dimensions || {},
    reviewsData: product.reviews_data || {},
    
    // Sales data structure
    salesData: {
      monthlyRevenue: product.monthly_revenue,
      monthlySales: product.monthly_sales,
      monthlyProfit: product.profit_estimate,
      margin: product.sales_data?.margin || 0,
      ppu: product.sales_data?.ppu || 0,
      fbaCost: product.sales_data?.fbaCost || 0,
      cogs: product.sales_data?.cogs || 0,
      ...(product.sales_data || {})
    },
    
    // AI analysis from actual database data
    aiAnalysis: product.ai_analysis ? {
      riskClassification: product.ai_analysis.risk_classification,
      consistencyRating: product.ai_analysis.consistency_rating,
      estimatedDimensions: product.ai_analysis.estimated_dimensions,
      estimatedWeight: product.ai_analysis.estimated_weight,
      opportunityScore: product.ai_analysis.opportunity_score,
      marketInsights: product.ai_analysis.market_insights || [],
      riskFactors: product.ai_analysis.risk_factors || []
    } : null,
    
    // Keywords
    keywords: product.product_keywords?.map((pk: any) => ({
      keyword: pk.keywords?.keyword || '',
      searchVolume: pk.keywords?.search_volume || 0,
      rankingPosition: pk.ranking_position || 0,
      trafficPercentage: pk.traffic_percentage || 0,
      cpc: pk.keywords?.avg_cpc || 0,
      competitionScore: pk.keywords?.competition_score || 0
    })) || [],
    
    calculatedMetrics: product.calculated_metrics || {},
    competitiveIntelligence: product.competitive_intelligence || '',
    apifySource: product.apify_source || false,
    sellerSpriteVerified: product.seller_sprite_verified || false,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  }
}

/**
 * Calculate comprehensive user statistics
 */
async function calculateMarketStats(userId: string, marketsData: MarketWithProducts[]): Promise<DashboardStats> {
  try {
    // Market-centric calculations
    const marketsAnalyzed = marketsData.length
    
    // Count all products across all markets + legacy products
    const { data: allProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .select('grade, monthly_revenue, profit_estimate, created_at, market_id')
      .eq('user_id', userId)
    
    if (productsError) {
      console.error('Products count error:', productsError)
    }
    
    const totalProducts = (allProducts || []).length
    
    // High-grade markets (markets with grade A1-B10)
    const highGradeMarkets = marketsData.filter(market => {
      const grade = market.market_grade?.toUpperCase()
      return grade?.startsWith('A') || grade?.startsWith('B')
    }).length
    
    // Average market revenue (calculated from market averages)
    const avgMarketRevenue = marketsData.length > 0
      ? marketsData.reduce((sum, market) => sum + (market.avg_monthly_revenue || 0), 0) / marketsData.length
      : 0
    
    // Legacy stats for backward compatibility
    const products = allProducts || []
    const highGradeProducts = products.filter(p => {
      const grade = p.grade?.toUpperCase()
      return grade?.startsWith('A') || grade?.startsWith('B')
    }).length
    
    const revenueValues = products
      .map(p => p.monthly_revenue || 0)
      .filter(revenue => revenue > 0)
    const avgMonthlyRevenue = revenueValues.length > 0 
      ? revenueValues.reduce((sum, revenue) => sum + revenue, 0) / revenueValues.length
      : 0
    
    const totalProfitPotential = products
      .reduce((sum, p) => sum + (p.profit_estimate || 0), 0)
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentActivity = products.filter(p => 
      new Date(p.created_at) > sevenDaysAgo
    ).length
    
    return {
      marketsAnalyzed,
      totalProducts,
      highGradeMarkets,
      avgMarketRevenue: Math.round(avgMarketRevenue),
      // Legacy stats
      highGradeProducts,
      highGradePercentage: totalProducts > 0 ? Math.round((highGradeProducts / totalProducts) * 100) : 0,
      avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
      totalProfitPotential: Math.round(totalProfitPotential),
      recentActivity
    }
  } catch (error) {
    console.error('Market stats calculation error:', error)
    return {
      marketsAnalyzed: 0,
      totalProducts: 0,
      highGradeMarkets: 0,
      avgMarketRevenue: 0,
      highGradeProducts: 0,
      highGradePercentage: 0,
      avgMonthlyRevenue: 0,
      totalProfitPotential: 0,
      recentActivity: 0
    }
  }
}

async function calculateUserStats(userId: string): Promise<DashboardStats> {
  try {
    // Get all user products for stats calculation
    const { data: allProducts, error } = await supabaseAdmin
      .from('products')
      .select('grade, monthly_revenue, profit_estimate, created_at')
      .eq('user_id', userId)

    if (error) {
      console.error('Stats calculation error:', error)
      return {
        marketsAnalyzed: 0,
        totalProducts: 0,
        highGradeMarkets: 0,
        avgMarketRevenue: 0,
        highGradeProducts: 0,
        highGradePercentage: 0,
        avgMonthlyRevenue: 0,
        totalProfitPotential: 0,
        recentActivity: 0
      }
    }

    const products = allProducts || []
    const totalProducts = products.length

    // High-grade products (A1-B10)
    const highGradeProducts = products.filter(p => {
      const grade = p.grade?.toUpperCase()
      return grade?.startsWith('A') || grade?.startsWith('B')
    }).length

    // Average monthly revenue calculation
    const revenueValues = products
      .map(p => p.monthly_revenue || 0)
      .filter(revenue => revenue > 0)
    const avgMonthlyRevenue = revenueValues.length > 0 
      ? revenueValues.reduce((sum, revenue) => sum + revenue, 0) / revenueValues.length
      : 0

    // Total profit potential
    const totalProfitPotential = products
      .reduce((sum, p) => sum + (p.profit_estimate || 0), 0)

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentActivity = products.filter(p => 
      new Date(p.created_at) > sevenDaysAgo
    ).length

    return {
      marketsAnalyzed: 0, // Legacy function doesn't have market data
      totalProducts,
      highGradeMarkets: 0, // Legacy function doesn't have market data
      avgMarketRevenue: 0, // Legacy function doesn't have market data
      highGradeProducts,
      highGradePercentage: totalProducts > 0 ? Math.round((highGradeProducts / totalProducts) * 100) : 0,
      avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
      totalProfitPotential: Math.round(totalProfitPotential),
      recentActivity
    }
  } catch (error) {
    console.error('User stats calculation error:', error)
    return {
      marketsAnalyzed: 0,
      totalProducts: 0,
      highGradeMarkets: 0,
      avgMarketRevenue: 0,
      highGradeProducts: 0,
      highGradePercentage: 0,
      avgMonthlyRevenue: 0,
      totalProfitPotential: 0,
      recentActivity: 0
    }
  }
}