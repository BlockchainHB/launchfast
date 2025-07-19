import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { extractMarketKeywords } from '@/lib/market-calculations'
import { Logger } from '@/lib/logger'
import { createServerClient } from '@supabase/ssr'
import { cache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const { products, marketAnalysis } = await request.json()

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      )
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

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Check if supabaseAdmin is configured
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    const savedProducts = []
    let savedMarket = null
    
    Logger.save.start(products.length, !!marketAnalysis)
    
    // If market analysis is provided, save market data first
    if (marketAnalysis) {
      console.log('Saving market analysis for keyword:', marketAnalysis.keyword)
      
      const marketPayload = {
        user_id: userId,
        keyword: marketAnalysis.keyword,
        search_filters: marketAnalysis.search_filters || {},
        
        // Market Statistics (Averaged) - Ensure proper types
        avg_price: Math.round(marketAnalysis.avg_price || 0),
        avg_monthly_sales: Math.round(marketAnalysis.avg_monthly_sales || 0),
        avg_monthly_revenue: Math.round(marketAnalysis.avg_monthly_revenue || 0),
        avg_reviews: Math.round(marketAnalysis.avg_reviews || 0),
        avg_rating: parseFloat((marketAnalysis.avg_rating || 0).toFixed(2)),
        avg_bsr: Math.round(marketAnalysis.avg_bsr || 0),
        avg_profit_margin: parseFloat((marketAnalysis.avg_profit_margin || 0).toFixed(4)),
        avg_cpc: parseFloat((marketAnalysis.avg_cpc || 0).toFixed(2)),
        avg_daily_revenue: Math.round(marketAnalysis.avg_daily_revenue || 0),
        avg_launch_budget: Math.round(marketAnalysis.avg_launch_budget || 0),
        avg_profit_per_unit: parseFloat((marketAnalysis.avg_profit_per_unit || 0).toFixed(2)),
        
        // Market-Level Analysis
        market_grade: marketAnalysis.market_grade,
        market_consistency_rating: marketAnalysis.market_consistency_rating,
        market_risk_classification: marketAnalysis.market_risk_classification,
        total_products_analyzed: marketAnalysis.total_products_analyzed,
        products_verified: marketAnalysis.products_verified,
        
        // Market Intelligence
        market_competitive_intelligence: marketAnalysis.market_competitive_intelligence,
        market_trends: marketAnalysis.market_trends || {},
        opportunity_score: marketAnalysis.opportunity_score,
        
        research_date: new Date().toISOString()
      }

      const { data: marketData, error: marketError } = await supabaseAdmin
        .from('markets')
        .insert(marketPayload)
        .select()
        .single()

      if (marketError) {
        console.error('Market save error:', marketError)
        throw new Error('Failed to save market analysis')
      }

      savedMarket = marketData
      Logger.save.marketSaved(marketData.id)
    }
    
    for (const product of products) {
      try {
        Logger.dev.trace(`Processing product: ${product.asin}`)
        // Insert/update product with user_id
        const productPayload = {
          user_id: userId,
          asin: product.asin,
          title: product.title,
          brand: product.brand || 'Unknown',
          price: product.price,
          bsr: product.bsr || null,
          reviews: product.reviews || 0,
          rating: product.rating || null,
          monthly_sales: product.salesData?.monthlySales || null,
          monthly_revenue: product.salesData?.monthlyRevenue || null,
          profit_estimate: product.salesData?.monthlyProfit || null,
          grade: product.grade ? product.grade.substring(0, 2) : null, // Truncate to 2 chars for database
          // Enhanced fields
          images: product.images || [],
          dimensions: product.dimensions || {},
          reviews_data: product.reviewsData || {},
          sales_data: product.salesData || {},
          competitive_intelligence: product.competitiveIntelligence || '',
          apify_source: product.apifySource || false,
          seller_sprite_verified: product.sellerSpriteVerified || false,
          calculated_metrics: product.calculatedMetrics || {},
          // Market relationship fields
          market_id: savedMarket?.id || null,
          is_market_representative: products.indexOf(product) === 0, // First product is representative
          analysis_rank: products.indexOf(product) + 1
        }

        Logger.dev.trace(`Saving product: ${product.asin}`)

        const { data: productData, error: productError } = await supabaseAdmin
          .from('products')
          .upsert(productPayload)
          .select()
          .single()

        if (productError) {
          console.error('Product save error for', product.asin, ':', productError)
          continue
        }

        Logger.save.productSaved(product.asin)

        // Insert AI analysis
        if (product.aiAnalysis) {
          await supabaseAdmin
            .from('ai_analysis')
            .upsert({
              product_id: productData.id,
              risk_classification: product.aiAnalysis.riskClassification,
              consistency_rating: product.aiAnalysis.consistencyRating,
              estimated_dimensions: product.aiAnalysis.estimatedDimensions,
              estimated_weight: product.aiAnalysis.estimatedWeight,
              opportunity_score: product.aiAnalysis.opportunityScore,
              market_insights: product.aiAnalysis.marketInsights,
              risk_factors: product.aiAnalysis.riskFactors
            }, {
              onConflict: 'product_id'
            })
        }

        // Insert keywords
        if (product.keywords && product.keywords.length > 0) {
          for (const keyword of product.keywords.slice(0, 10)) {
            // Insert or get existing keyword
            const { data: keywordData, error: keywordError } = await supabaseAdmin
              .from('keywords')
              .upsert({
                keyword: keyword.keyword,
                search_volume: keyword.searchVolume,
                competition_score: keyword.competitionScore,
                avg_cpc: keyword.cpc
              }, {
                onConflict: 'keyword'
              })
              .select()
              .single()

            if (keywordError) {
              console.warn('Failed to insert keyword:', keywordError)
              continue
            }

            // Insert product-keyword relationship
            await supabaseAdmin
              .from('product_keywords')
              .upsert({
                product_id: productData.id,
                keyword_id: keywordData.id,
                ranking_position: keyword.rankingPosition,
                traffic_percentage: keyword.trafficPercentage
              }, {
                onConflict: 'product_id,keyword_id'
              })
          }
        }

        savedProducts.push(productData)

      } catch (error) {
        console.error(`Error saving product ${product.asin}:`, error)
        continue
      }
    }

    // If market was saved, extract and save market keywords
    if (savedMarket && marketAnalysis) {
      try {
        const marketKeywords = extractMarketKeywords(products, savedMarket.id, marketAnalysis.keyword)
        if (marketKeywords.length > 0) {
          await supabaseAdmin
            .from('market_keywords')
            .insert(marketKeywords)
          console.log(`Saved ${marketKeywords.length} market keywords`)
        }
      } catch (error) {
        console.warn('Failed to save market keywords:', error)
        // Continue without failing the entire operation
      }
    }

    // Invalidate dashboard cache so new data shows immediately
    const dashboardCacheKey = `dashboard_data_${userId}`
    await cache.del(dashboardCacheKey)
    console.log(`🗑️ Invalidated dashboard cache for user: ${userId}`)

    const response: any = {
      success: true,
      message: savedMarket 
        ? `Successfully saved market analysis and ${savedProducts.length} products`
        : `Successfully saved ${savedProducts.length} products`,
      count: savedProducts.length,
      products: savedProducts
    }

    if (savedMarket) {
      response.market = savedMarket
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Save products API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to save products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET method to fetch user's saved products
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

    // Fetch user's products with keywords and AI analysis joined
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        product_keywords(
          ranking_position,
          traffic_percentage,
          keywords(
            keyword,
            search_volume,
            competition_score,
            avg_cpc
          )
        ),
        ai_analysis(
          risk_classification,
          consistency_rating,
          estimated_dimensions,
          estimated_weight,
          opportunity_score,
          market_insights,
          risk_factors
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (productsError) {
      throw productsError
    }

    // Transform products to match DataTable expected format
    const transformedProducts = products?.map(product => ({
      id: product.id,
      asin: product.asin,
      title: product.title,
      brand: product.brand,
      price: product.price,
      bsr: product.bsr,
      reviews: product.reviews,
      rating: product.rating,
      grade: product.grade,
      images: product.images || [],
      dimensions: product.dimensions || {},
      reviewsData: product.reviews_data || {},
      // Map database fields to expected salesData structure
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
      // Create aiAnalysis from actual database data
      aiAnalysis: product.ai_analysis ? {
        riskClassification: product.ai_analysis.risk_classification,
        consistencyRating: product.ai_analysis.consistency_rating,
        estimatedDimensions: product.ai_analysis.estimated_dimensions,
        estimatedWeight: product.ai_analysis.estimated_weight,
        opportunityScore: product.ai_analysis.opportunity_score,
        marketInsights: product.ai_analysis.market_insights || [],
        riskFactors: product.ai_analysis.risk_factors || []
      } : null,
      keywords: product.product_keywords?.map(pk => ({
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
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedProducts,
      count: transformedProducts.length
    })

  } catch (error) {
    console.error('Get products API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}