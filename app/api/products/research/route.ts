import { NextRequest, NextResponse } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'
import { apifyClient } from '@/lib/apify'
import { analyzeProductWithReviews } from '@/lib/openai'
import { scoreProduct, scoreApifyProduct } from '@/lib/scoring'
import { supabaseAdmin } from '@/lib/supabase'
// Cache removed for data accuracy
import { calculateAllMetrics, formatCompetitiveIntelligence } from '@/lib/calculations'
import { Logger } from '@/lib/logger'
import { createServerClient } from '@supabase/ssr'
import type { SearchParams, ProcessedProduct, KeywordData, ApifyProduct, EnhancedProduct } from '@/types'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { keyword, filters, limit = 3 }: SearchParams & { limit?: number } = await request.json()

    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: 'Keyword is required' },
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id

    Logger.research.start(keyword, filters)

    // Skip cache - always fetch fresh data for market research
    Logger.cache.miss(`research_${keyword}`)

    // Validate API keys
    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json(
        { error: 'Apify API token not configured' },
        { status: 500 }
      )
    }

    if (!process.env.SELLERSPRITE_API_KEY) {
      return NextResponse.json(
        { error: 'SellerSprite API key not configured' },
        { status: 500 }
      )
    }

    // Phase 1: Apify Product Discovery & Initial Scoring
    Logger.dev.trace('Phase 1: Apify Product Discovery & Scoring')
    const apifyProducts = await apifyClient.searchProducts(keyword, {
      maxItems: 20, // Get 20 to have selection pool
      maxReviews: filters?.maxReviews || 1000,
      minRating: filters?.minRating || 3.0
    })

    if (!apifyProducts || apifyProducts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No products found on Amazon for the given keyword',
        count: 0,
        processing_time: Date.now() - startTime,
        source: 'apify'
      })
    }

    Logger.research.apifyFound(apifyProducts.length)

    // Score all Apify products using preliminary scoring
    const scoredProducts = apifyProducts.map(product => {
      const preliminaryScore = scoreApifyProduct(product)
      return {
        ...product,
        preliminaryScore: preliminaryScore.score,
        estimatedGrade: preliminaryScore.estimatedGrade,
        reasoning: preliminaryScore.reasoning
      }
    })

    // Sort by preliminary score and take top 5
    const topProducts = scoredProducts
      .sort((a, b) => b.preliminaryScore - a.preliminaryScore)
      .slice(0, 5)

    Logger.dev.trace(`Top 5 products selected for verification: ${topProducts.map(p => p.asin).join(', ')}`)

    // Phase 2: Parallel SellerSprite Verification for Top 5 🆕
    console.log('🔍 Phase 2: Parallel SellerSprite Verification (Top 5 Only)')
    
    // Create parallel verification promises for all top products
    const verificationPromises = topProducts.map(async (apifyProduct) => {
      try {
        Logger.research.sellerSpriteVerifying(apifyProduct.asin, apifyProduct.preliminaryScore)

        // Parallel API calls: SellerSprite sales + keyword data
        const [sellerSpriteSales, keywordData] = await Promise.all([
          sellerSpriteClient.salesPrediction(apifyProduct.asin).catch(error => {
            Logger.api.sellerSpriteVerificationFailed(apifyProduct.asin)
            return null
          }),
          sellerSpriteClient.reverseASIN(apifyProduct.asin, 1, 10).catch(error => {
            Logger.api.keywordDataFailed(apifyProduct.asin)
            return []
          })
        ])

        // Skip if no verified sales data (NO FALLBACKS)
        if (!sellerSpriteSales) {
          Logger.research.sellerSpriteFailed(apifyProduct.asin, 'no verified sales data')
          return null
        }

        Logger.research.sellerSpriteVerified(apifyProduct.asin)

        // Convert Apify product to our format with enhanced data
        const productData = apifyClient.mapToProductData(apifyProduct)

        // Use rule-based analysis instead of expensive AI calls
        const aiAnalysis = null

        // Calculate final A10-F1 grade with complete data
        const scoring = scoreProduct(productData, sellerSpriteSales, aiAnalysis, keywordData)
        
        // Extract actual dimensions and weight from Apify productOverview
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
          estimatedDimensions: getProductSpecFromOverview(apifyProduct.productOverview, 'Product Dimensions'),
          estimatedWeight: getProductSpecFromOverview(apifyProduct.productOverview, 'Item Weight'),
          marketInsights: [`Analyzed using advanced rule-based classification`],
          riskFactors: scoring.inputs.riskClassification !== 'Safe' ? [`Product classified as ${scoring.inputs.riskClassification} - requires additional compliance`] : []
        }

        // Calculate all enhanced metrics for dashboard display
        const calculatedMetrics = calculateAllMetrics({
          id: apifyProduct.asin,
          asin: apifyProduct.asin,
          title: apifyProduct.title,
          brand: apifyProduct.brand || 'Unknown',
          price: apifyProduct.price.value,
          bsr: apifyProduct.bestSellersRank,
          reviews: apifyProduct.reviewsCount,
          rating: apifyProduct.stars,
          images: apifyProduct.images,
          dimensions: apifyProduct.dimensions,
          reviewsData: apifyProduct.reviews,
          salesData: sellerSpriteSales,
          aiAnalysis: ruleBasedAnalysis,
          keywords: keywordData.slice(0, 10),
          grade: scoring.grade,
          apifySource: true,
          sellerSpriteVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, apifyProduct)

        // Create enhanced product with all verified data including calculated metrics
        const enhancedProduct: EnhancedProduct = {
          id: apifyProduct.asin,
          asin: apifyProduct.asin,
          title: apifyProduct.title,
          brand: apifyProduct.brand || 'Unknown',
          price: apifyProduct.price.value,
          bsr: apifyProduct.bestSellersRank, // 🆕 Enhanced BSR extraction
          reviews: apifyProduct.reviewsCount,
          rating: apifyProduct.stars,
          // 🆕 Enhanced Apify data fields
          images: apifyProduct.images,
          dimensions: apifyProduct.dimensions,
          reviewsData: apifyProduct.reviews, // Structured review data for analysis
          salesData: sellerSpriteSales,
          aiAnalysis: ruleBasedAnalysis,
          keywords: keywordData.slice(0, 10),
          grade: scoring.grade,
          apifySource: true,
          sellerSpriteVerified: true, // Only true products reach here
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // 🆕 Calculated metrics for dashboard
          calculatedMetrics,
          competitiveIntelligence: formatCompetitiveIntelligence(null)
        }

        return enhancedProduct

      } catch (error) {
        Logger.error('Product processing failed', error)
        return null
      }
    })

    // Wait for all parallel verifications to complete
    Logger.dev.trace(`Processing ${topProducts.length} products in parallel`)
    const verificationResults = await Promise.all(verificationPromises)
    
    // Filter out failed verifications (null results)
    const verifiedProducts = verificationResults.filter((product): product is EnhancedProduct => product !== null)

    Logger.dev.trace(`Verified ${verifiedProducts.length} out of 5 products`)

    // Sort by final A10-F1 grade score (highest first)
    const finalProducts = verifiedProducts.sort((a, b) => {
      const scoreA = getGradeScore(a.grade)
      const scoreB = getGradeScore(b.grade)
      return scoreB - scoreA
    })

    // Calculate market analysis from final products
    let marketAnalysis = null
    if (finalProducts.length > 0) {
      try {
        const { createMarketAnalysis } = await import('@/lib/market-calculations')
        marketAnalysis = createMarketAnalysis(keyword.trim(), finalProducts, filters)
        Logger.research.marketCalculated(marketAnalysis.market_grade, finalProducts.length)
      } catch (error) {
        Logger.error('Market analysis calculation', error)
      }
    }

    // No caching - always provide fresh market research results

    // Log search session
    try {
      await supabaseAdmin
        .from('search_sessions')
        .insert({
          user_id: userId,
          keyword,
          filters: filters || {},
          results_count: finalProducts.length
        })
    } catch (error) {
      Logger.error('Search session logging', error)
    }

    const processingTime = Date.now() - startTime
    Logger.research.completed(finalProducts.length, processingTime)

    return NextResponse.json({
      success: true,
      data: finalProducts,
      marketAnalysis: marketAnalysis,
      cached: false,
      count: finalProducts.length,
      processing_time: processingTime,
      source: 'apify+sellersprite',
      filters_applied: filters || {},
      stats: {
        apify_products_found: apifyProducts.length,
        top_products_selected: topProducts.length,
        sellersprite_verified: finalProducts.length,
        verification_rate: `${Math.round((finalProducts.length / topProducts.length) * 100)}%`
      }
    })

  } catch (error) {
    Logger.error('Product research API', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to research products',
        details: error instanceof Error ? error.message : 'Unknown error',
        processing_time: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// Helper function to store product in database
async function storeProductInDatabase(product: ProcessedProduct, scoring: any, userId: string) {
  try {
    // Insert product
    const { data: productData, error: productError } = await supabaseAdmin
      .from('products')
      .upsert({
        user_id: userId,
        asin: product.asin,
        title: product.title,
        brand: product.brand,
        price: product.price,
        bsr: product.bsr,
        reviews: product.reviews,
        rating: product.rating,
        monthly_sales: product.salesData.monthlySales,
        monthly_revenue: product.salesData.monthlyRevenue,
        profit_estimate: product.salesData.monthlyProfit,
        grade: product.grade,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (productError) {
      throw productError
    }

    // Insert AI analysis
    await supabaseAdmin
      .from('ai_analysis')
      .upsert({
        user_id: userId,
        product_id: productData.id,
        risk_classification: product.aiAnalysis.riskClassification,
        consistency_rating: product.aiAnalysis.consistencyRating,
        estimated_dimensions: product.aiAnalysis.estimatedDimensions,
        estimated_weight: product.aiAnalysis.estimatedWeight,
        opportunity_score: product.aiAnalysis.opportunityScore,
        market_insights: product.aiAnalysis.marketInsights,
        risk_factors: product.aiAnalysis.riskFactors
      })

    // Insert keywords
    if (product.keywords && product.keywords.length > 0) {
      for (const keyword of product.keywords) {
        // Insert or get existing keyword
        const { data: keywordData, error: keywordError } = await supabaseAdmin
          .from('keywords')
          .upsert({
            user_id: userId,
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
          Logger.warn('Keyword insert failed')
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
          })
      }
    }

  } catch (error) {
    Logger.error('Database storage', error)
    throw error
  }
}

// Helper function to get numerical score for grade
function getGradeScore(grade: string): number {
  const gradeValues: { [key: string]: number } = {
    'A10': 100, 'A9': 95, 'A8': 90, 'A7': 85, 'A6': 80, 'A5': 75,
    'A4': 70, 'A3': 65, 'A2': 60, 'A1': 55,
    'B10': 50, 'B9': 48, 'B8': 46, 'B7': 44, 'B6': 42, 'B5': 40,
    'B4': 38, 'B3': 36, 'B2': 34, 'B1': 32,
    'C10': 30, 'C9': 28, 'C8': 26, 'C7': 24, 'C6': 22, 'C5': 20,
    'C4': 18, 'C3': 16, 'C2': 14, 'C1': 12,
    'D10': 10, 'D9': 9, 'D8': 8, 'D7': 7, 'D6': 6, 'D5': 5,
    'D4': 4, 'D3': 3, 'D2': 2, 'D1': 1,
    'F1': 0
  }
  
  return gradeValues[grade] || 0
}

// GET method for health check
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    endpoint: 'Product Research API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
}