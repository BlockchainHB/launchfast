import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { MarketRecalculator } from '@/lib/market-recalculator'
import { mergeProductsWithOverrides } from '@/lib/product-overrides'
import { cache } from '@/lib/cache'
import { createServerClient } from '@supabase/ssr'
import type { EnhancedProduct } from '@/types'

// Transform database product to table format (copied from dashboard API)
function transformProductForTable(product: any): EnhancedProduct {
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
    updatedAt: product.updated_at,
    
    // Legacy fields
    monthlySales: product.monthly_sales,
    monthlyRevenue: product.monthly_revenue,
    profitEstimate: product.profit_estimate
  } as EnhancedProduct
}

interface BatchOverrideRequest {
  overrides: Array<{
    product_id: string
    asin: string
    user_id: string
    title?: string
    brand?: string
    price?: number
    bsr?: number
    reviews?: number
    rating?: number
    
    // Sales Data fields
    monthly_sales?: number
    monthly_revenue?: number
    cogs?: number
    margin?: number
    
    // Calculated Metrics fields
    daily_revenue?: number
    fulfillment_fees?: number
    launch_budget?: number
    profit_per_unit_after_launch?: number
    variations?: number
    
    // CPC and Weight
    avg_cpc?: number
    weight?: number
    
    // Legacy fields
    profit_estimate?: number
    grade?: string
    
    // AI Analysis fields
    risk_classification?: string
    consistency_rating?: string
    opportunity_score?: number
    
    override_reason: string
    notes?: string
  }>
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
    const body: BatchOverrideRequest = await request.json()
    const { overrides } = body

    if (!overrides || !Array.isArray(overrides) || overrides.length === 0) {
      return NextResponse.json(
        { error: 'Invalid overrides data' },
        { status: 400 }
      )
    }

    // Validate that all overrides have required fields and set user_id from session
    const validatedOverrides = overrides.map(override => {
      if (!override.product_id || !override.asin || !override.override_reason) {
        throw new Error('Missing required fields in override data')
      }
      // Override the user_id from the request body with the authenticated user's ID
      return { ...override, user_id: userId }
    })

    // Validate and sanitize integer fields to prevent type errors
    const sanitizeInteger = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null
      const num = parseInt(String(value), 10)
      return isNaN(num) ? null : num
    }

    // Sanitize overrides to ensure proper data types
    const sanitizedOverrides = validatedOverrides.map(override => ({
      ...override,
      variations: sanitizeInteger(override.variations),
      reviews: sanitizeInteger(override.reviews),
      monthly_sales: sanitizeInteger(override.monthly_sales)
    }))

    // Check if any overrides already exist (for debugging re-override scenarios)
    const productIds = validatedOverrides.map(override => override.product_id)
    
    const { data: existingOverrides } = await supabaseAdmin
      .from('product_overrides')
      .select('product_id, consistency_rating, risk_classification')
      .eq('user_id', userId)
      .in('product_id', productIds)
    
    const existingCount = existingOverrides?.length || 0
    console.log(`🔄 Override operation: ${existingCount}/${overrides.length} products already have overrides (re-override scenario)`)
    
    // Use upsert to handle existing overrides (update) or create new ones
    const { data, error } = await supabaseAdmin
      .from('product_overrides')
      .upsert(sanitizedOverrides, {
        onConflict: 'user_id,product_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save overrides to database' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Successfully upserted ${data?.length || 0} product overrides (${existingCount} updates, ${(data?.length || 0) - existingCount} new)`)

    // Fetch original products with complete data to return merged data
    const overrideReason = validatedOverrides[0].override_reason

    const { data: originalProducts, error: productsError } = await supabaseAdmin
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
      .in('id', productIds)

    if (productsError) {
      console.error('Error fetching original products:', productsError)
    }

    // Transform and merge products with the new overrides to return updated data
    let mergedProducts: EnhancedProduct[] = []
    if (originalProducts && data) {
      // Transform database products to EnhancedProduct format first
      const transformedProducts = originalProducts.map(transformProductForTable)
      mergedProducts = mergeProductsWithOverrides(transformedProducts, data)
      console.log(`🔄 Merged ${mergedProducts.length} products with override data for immediate UI update`)
    }

    // Trigger market recalculation for affected markets
    const recalculator = new MarketRecalculator()

    try {
      console.log(`🔄 Starting market recalculation for ${productIds.length} products`)
      const recalculationResults = await recalculator.recalculateAffectedMarkets(
        productIds, 
        userId, 
        `Triggered by batch product overrides: ${overrideReason}`
      )

      console.log(`✅ Recalculated ${recalculationResults.length} markets - now invalidating cache`)

      // CRITICAL: Invalidate cache AFTER market recalculation completes
      const dashboardCacheKey = `dashboard_data_${userId}`
      
      // Check if cache exists before deletion
      const cacheExists = await cache.exists(dashboardCacheKey)
      console.log(`🔍 Dashboard cache exists before deletion (AFTER market recalc): ${cacheExists}`)
      
      // Force cache deletion after market recalculation is complete
      await cache.del(dashboardCacheKey)
      console.log(`🗑️ Cache invalidated AFTER market recalculation for user ${userId}`)
      
      // Longer delay to ensure market recalculation data is fully committed
      await new Promise(resolve => setTimeout(resolve, 250))
      
      // Verify deletion
      const stillExists = await cache.exists(dashboardCacheKey)
      console.log(`🔍 Dashboard cache still exists after deletion: ${stillExists}`)
      
      if (stillExists) {
        console.warn(`⚠️ Cache deletion failed, attempting force clear`)
        await cache.del(dashboardCacheKey)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return NextResponse.json({
        success: true,
        message: `Successfully saved ${overrides.length} product overrides`,
        marketRecalculations: recalculationResults.length,
        affectedMarkets: recalculationResults.map(r => ({
          keyword: r.keyword,
          overriddenProducts: r.overriddenProductCount
        })),
        overrides: data, // Raw override data
        updatedProducts: mergedProducts, // Products with overrides applied for immediate UI update
        debug: {
          cacheKeyUsed: dashboardCacheKey,
          cacheInvalidated: true,
          cacheInvalidatedAfterRecalc: true,
          marketRecalculationResults: recalculationResults.length,
          reOverrideCount: existingCount,
          newOverrideCount: (data?.length || 0) - existingCount,
          totalOverrides: data?.length || 0
        }
      })

    } catch (recalculationError) {
      console.error('Market recalculation error:', recalculationError)
      
      // Still invalidate cache even if market recalculation failed
      const dashboardCacheKey = `dashboard_data_${userId}`
      
      const cacheExists = await cache.exists(dashboardCacheKey)
      console.log(`🔍 Dashboard cache exists (recalc failed): ${cacheExists}`)
      
      await cache.del(dashboardCacheKey)
      console.log(`🗑️ Invalidated dashboard cache for user ${userId} (recalculation failed)`)
      
      // Even on failure, add delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const stillExists = await cache.exists(dashboardCacheKey)
      console.log(`🔍 Dashboard cache still exists after deletion (recalc failed): ${stillExists}`)
      
      // Product overrides were saved successfully, but market recalculation failed
      // This is not a critical error - return success with warning
      return NextResponse.json({
        success: true,
        message: `Successfully saved ${overrides.length} product overrides`,
        warning: 'Market recalculation failed - markets may show outdated aggregated data',
        marketRecalculations: 0,
        overrides: data,
        updatedProducts: mergedProducts
      })
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id

    const { data, error } = await supabaseAdmin
      .from('product_overrides')
      .select(`
        *,
        products!inner(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch overrides from database' },
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
    const productId = searchParams.get('product_id')

    let query = supabaseAdmin
      .from('product_overrides')
      .delete()
      .eq('user_id', userId)

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete overrides from database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: productId 
        ? 'Successfully deleted product override' 
        : 'Successfully deleted all overrides for user'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}