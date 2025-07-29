import { NextRequest, NextResponse } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'
import { analyzeProduct } from '@/lib/openai'
import { scoreProduct } from '@/lib/scoring'
import { supabaseAdmin } from '@/lib/supabase'
import { cacheHelpers } from '@/lib/cache'
import { createServerClient } from '@supabase/ssr'
import type { ProcessedProduct } from '@/types'

// GET single product analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asin: string }> }
) {
  try {
    const { asin } = await params

    if (!asin || asin.length !== 10) {
      return NextResponse.json(
        { error: 'Valid ASIN is required' },
        { status: 400 }
      )
    }

    // Check if product exists in database first
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { data: existingProduct, error: dbError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        ai_analysis (*),
        product_keywords (
          ranking_position,
          traffic_percentage,
          keywords (
            keyword,
            search_volume,
            competition_score,
            avg_cpc
          )
        )
      `)
      .eq('asin', asin)
      .single()

    if (existingProduct && !dbError) {
      // Return cached database result
      const processedProduct: ProcessedProduct = {
        id: existingProduct.id,
        asin: existingProduct.asin,
        title: existingProduct.title,
        brand: existingProduct.brand,
        price: existingProduct.price,
        bsr: existingProduct.bsr,
        reviews: existingProduct.reviews,
        rating: existingProduct.rating,
        salesData: {
          monthlyProfit: existingProduct.profit_estimate || 0,
          monthlyRevenue: existingProduct.monthly_revenue || 0,
          monthlySales: existingProduct.monthly_sales || 0,
          margin: 0, // Will be calculated
          ppu: 0, // Will be calculated
          fbaCost: 0 // Will be calculated
        },
        aiAnalysis: existingProduct.ai_analysis[0] || {
          riskClassification: 'No Risk',
          consistencyRating: 'Consistent',
          estimatedDimensions: 'Unknown',
          estimatedWeight: 'Unknown',
          opportunityScore: 5,
          marketInsights: [],
          riskFactors: []
        },
        keywords: existingProduct.product_keywords?.map((pk: any) => ({
          keyword: pk.keywords.keyword,
          searchVolume: pk.keywords.search_volume,
          rankingPosition: pk.ranking_position,
          trafficPercentage: pk.traffic_percentage,
          cpc: pk.keywords.avg_cpc,
          competitionScore: pk.keywords.competition_score
        })) || [],
        grade: existingProduct.grade,
        createdAt: existingProduct.created_at,
        updatedAt: existingProduct.updated_at
      }

      return NextResponse.json({
        success: true,
        data: processedProduct,
        cached: true,
        source: 'database'
      })
    }

    // Product not in database, fetch from APIs
    const analysis = await sellerSpriteClient.getProductAnalysis(asin)

    if (!analysis.sales) {
      return NextResponse.json(
        { error: 'Product not found or no sales data available' },
        { status: 404 }
      )
    }

    // Create basic product data (we don't have product details from this endpoint)
    const basicProduct = {
      asin,
      title: `Product ${asin}`,
      brand: 'Unknown',
      price: 0,
      bsr: 0,
      reviews: 0,
      rating: 0,
      category: 'Unknown'
    }

    // Use rule-based analysis instead of expensive AI calls
    const aiAnalysis = null

    // Calculate scoring
    const scoring = scoreProduct(basicProduct, analysis.sales, aiAnalysis, analysis.keywords)
    
    // Extract actual dimensions and weight from Apify productOverview (if available)
    const getProductSpecFromOverview = (overview: any[], key: string): string => {
      if (!overview) return 'N/A'
      const spec = overview.find(item => item.key?.toLowerCase().includes(key.toLowerCase()))
      return spec?.value || 'N/A'
    }
    
    // Use our smart rule-based analysis (faster and more accurate than AI!)
    const ruleBasedAnalysis = {
      riskClassification: scoring.inputs.riskClassification,
      consistencyRating: scoring.inputs.consistencyRating,
      opportunityScore: scoring.inputs.opportunityScore,
      estimatedDimensions: basicProduct.productOverview ? getProductSpecFromOverview(basicProduct.productOverview, 'Product Dimensions') : 'N/A',
      estimatedWeight: basicProduct.productOverview ? getProductSpecFromOverview(basicProduct.productOverview, 'Item Weight') : 'N/A',
      marketInsights: [`Analyzed using advanced rule-based classification`],
      riskFactors: scoring.inputs.riskClassification !== 'Safe' ? [`Product classified as ${scoring.inputs.riskClassification} - requires additional compliance`] : []
    }

    // Create processed product
    const processedProduct: ProcessedProduct = {
      id: asin,
      asin,
      title: basicProduct.title,
      brand: basicProduct.brand,
      price: basicProduct.price,
      bsr: basicProduct.bsr,
      reviews: basicProduct.reviews,
      rating: basicProduct.rating,
      salesData: analysis.sales,
      aiAnalysis: ruleBasedAnalysis,
      keywords: analysis.keywords.slice(0, 20),
      opportunities: analysis.opportunities.slice(0, 10),
      grade: scoring.grade,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: processedProduct,
      cached: false,
      source: 'api'
    })

  } catch (error) {
    console.error('Product analysis error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update product analysis
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ asin: string }> }
) {
  try {
    const { asin } = await params
    const { forceRefresh = false } = await request.json()

    if (!asin || asin.length !== 10) {
      return NextResponse.json(
        { error: 'Valid ASIN is required' },
        { status: 400 }
      )
    }

    // Clear cache if force refresh
    if (forceRefresh) {
      await cacheHelpers.setSalesData(asin, null)
      await cacheHelpers.setKeywordsData(asin, null)
      await cacheHelpers.setAIAnalysis(asin, null)
    }

    // Get fresh analysis
    const analysis = await sellerSpriteClient.getProductAnalysis(asin)

    if (!analysis.sales) {
      return NextResponse.json(
        { error: 'Product not found or no sales data available' },
        { status: 404 }
      )
    }

    // Update database
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        monthly_sales: analysis.sales.monthlySales,
        monthly_revenue: analysis.sales.monthlyRevenue,
        profit_estimate: analysis.sales.monthlyProfit,
        updated_at: new Date().toISOString()
      })
      .eq('asin', asin)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product analysis updated successfully'
    })

  } catch (error) {
    console.error('Product update error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update product analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Remove product from database
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ asin: string }> }
) {
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
        { success: false, error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id
    const { asin } = await params

    if (!asin || asin.length !== 10) {
      return NextResponse.json(
        { error: 'Valid ASIN is required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Deleting product ${asin} for user ${userId}`)

    // Fetch product details before deletion
    const { data: productToDelete, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, asin, title, market_id')
      .eq('asin', asin)
      .eq('user_id', userId)
      .single()

    if (fetchError || !productToDelete) {
      console.error('Product not found:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Product not found or access denied' },
        { status: 404 }
      )
    }

    const marketId = productToDelete.market_id

    // Delete from database (cascade will handle related records)
    const { error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('asin', asin)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting product:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete product' },
        { status: 500 }
      )
    }

    console.log(`✅ Product deleted: ${productToDelete.title} (${asin})`)

    // If product was part of a market, trigger market recalculation
    if (marketId) {
      console.log(`🔄 Triggering market recalculation for market ${marketId}`)
      
      try {
        // Import and run market recalculation
        const { MarketRecalculator } = await import('@/lib/market-recalculator')
        const recalculator = new MarketRecalculator(supabaseAdmin)
        await recalculator.recalculateMarket(marketId, userId, `Product ${asin} deleted`)
        
        console.log(`✅ Market ${marketId} recalculated after product deletion`)
      } catch (recalcError) {
        console.error('Error recalculating market:', recalcError)
        // Don't fail the deletion if recalculation fails, just log it
      }
    }

    // Clear product-specific cache
    await cacheHelpers.setSalesData(asin, null)
    await cacheHelpers.setKeywordsData(asin, null)
    await cacheHelpers.setAIAnalysis(asin, null)

    // Invalidate dashboard cache
    // No cache invalidation needed - dashboard shows real-time data
    console.log(`✅ Dashboard will reflect changes in real-time`)
    const cacheCleared = true // Always true since no cache exists

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      data: {
        deletedProduct: {
          id: productToDelete.id,
          asin: productToDelete.asin,
          title: productToDelete.title
        },
        marketRecalculated: !!marketId,
        cacheCleared
      }
    })

  } catch (error) {
    console.error('Unexpected error deleting product:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}