import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json()

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      )
    }

    // Use your user ID for testing
    const testUserId = '0e955998-11ad-41e6-a270-989ab1c86788'

    // Check if supabaseAdmin is configured
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    const savedProducts = []
    
    console.log('Attempting to save', products.length, 'products for user:', testUserId)
    
    for (const product of products) {
      try {
        console.log('Processing product:', product.asin, product.title)
        // Insert/update product with user_id
        const productPayload = {
          user_id: testUserId,
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
          calculated_metrics: product.calculatedMetrics || {}
        }

        console.log('Saving product payload:', JSON.stringify(productPayload, null, 2))

        const { data: productData, error: productError } = await supabaseAdmin
          .from('products')
          .upsert(productPayload)
          .select()
          .single()

        if (productError) {
          console.error('Product save error for', product.asin, ':', productError)
          continue
        }

        console.log('Successfully saved product:', product.asin)

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

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedProducts.length} products`,
      count: savedProducts.length,
      products: savedProducts
    })

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
    // Use your user ID for testing
    const testUserId = '0e955998-11ad-41e6-a270-989ab1c86788'

    // Fetch user's products with keywords joined
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
        )
      `)
      .eq('user_id', testUserId)
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
      // Create aiAnalysis from competitive_intelligence and other fields
      aiAnalysis: product.competitive_intelligence ? {
        riskClassification: 'Electric', // Default for now
        consistencyRating: 'Consistent', // Default for now
        estimatedDimensions: product.dimensions?.length ? `${product.dimensions.length} x ${product.dimensions.width} x ${product.dimensions.height}` : 'Unknown',
        estimatedWeight: product.dimensions?.weight ? `${product.dimensions.weight}` : 'Unknown',
        opportunityScore: 7, // Default for now
        marketInsights: [],
        riskFactors: []
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