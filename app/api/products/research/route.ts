import { NextRequest, NextResponse } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'
import { apifyClient } from '@/lib/apify'
import { analyzeProductWithReviews } from '@/lib/openai'
import { scoreProduct, scoreApifyProduct } from '@/lib/scoring'
import { supabaseAdmin } from '@/lib/supabase'
import { cache, CACHE_TTL } from '@/lib/cache'
import { calculateAllMetrics, formatCompetitiveIntelligence } from '@/lib/calculations'
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

    console.log(`🚀 Starting new Apify + SellerSprite research for: "${keyword}"`)

    // Check cache first
    const cacheKey = cache.generateKey('apify_product_research', { keyword, filters, limit })
    const cached = await cache.get<EnhancedProduct[]>(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        count: cached.length,
        processing_time: Date.now() - startTime,
        source: 'cache'
      })
    }

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
    console.log('📍 Phase 1: Apify Product Discovery & Scoring')
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

    console.log(`✅ Apify found ${apifyProducts.length} relevant products`)

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

    console.log(`🏆 Top 5 products selected for SellerSprite verification:`)
    topProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.asin} - Score: ${product.preliminaryScore} (${product.estimatedGrade})`)
    })

    // Phase 2: Parallel SellerSprite Verification for Top 5 🆕
    console.log('🔍 Phase 2: Parallel SellerSprite Verification (Top 5 Only)')
    
    // Create parallel verification promises for all top products
    const verificationPromises = topProducts.map(async (apifyProduct) => {
      try {
        console.log(`🔍 Verifying top product: ${apifyProduct.asin} (Score: ${apifyProduct.preliminaryScore})`)

        // Parallel API calls: SellerSprite sales + keyword data
        const [sellerSpriteSales, keywordData] = await Promise.all([
          sellerSpriteClient.salesPrediction(apifyProduct.asin).catch(error => {
            console.warn(`❌ SellerSprite sales failed for ${apifyProduct.asin}: ${error.message}`)
            return null
          }),
          sellerSpriteClient.reverseASIN(apifyProduct.asin, 1, 10).catch(error => {
            console.warn(`❌ Keyword data failed for ${apifyProduct.asin}: ${error.message}`)
            return []
          })
        ])

        // Skip if no verified sales data (NO FALLBACKS)
        if (!sellerSpriteSales) {
          console.warn(`⚠️ Skipping ${apifyProduct.asin} - no verified sales data`)
          return null
        }

        console.log(`✅ SellerSprite verified: ${apifyProduct.asin}`)

        // Convert Apify product to our format with enhanced data
        const productData = apifyClient.mapToProductData(apifyProduct)

        // Get AI analysis with negative review insights for competitive differentiation
        const aiAnalysis = await analyzeProductWithReviews(productData, apifyProduct.reviews)

        // Calculate final A10-F1 grade with complete data
        const scoring = scoreProduct(productData, sellerSpriteSales, aiAnalysis, keywordData)

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
          aiAnalysis,
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
          aiAnalysis,
          keywords: keywordData.slice(0, 10),
          grade: scoring.grade,
          apifySource: true,
          sellerSpriteVerified: true, // Only true products reach here
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // 🆕 Calculated metrics for dashboard
          calculatedMetrics,
          competitiveIntelligence: formatCompetitiveIntelligence(aiAnalysis.competitiveDifferentiation)
        }

        return enhancedProduct

      } catch (error) {
        console.error(`Error processing product ${apifyProduct.asin}:`, error)
        return null
      }
    })

    // Wait for all parallel verifications to complete
    console.log(`⚡ Processing ${topProducts.length} products in parallel...`)
    const verificationResults = await Promise.all(verificationPromises)
    
    // Filter out failed verifications (null results)
    const verifiedProducts = verificationResults.filter((product): product is EnhancedProduct => product !== null)

    console.log(`✅ Successfully verified ${verifiedProducts.length} out of 5 top products`)

    // Sort by final A10-F1 grade score (highest first)
    const finalProducts = verifiedProducts.sort((a, b) => {
      const scoreA = getGradeScore(a.grade)
      const scoreB = getGradeScore(b.grade)
      return scoreB - scoreA
    })

    // Cache results
    await cache.set(cacheKey, finalProducts, CACHE_TTL.SEARCH_RESULTS)

    // Log search session
    try {
      await supabaseAdmin
        .from('search_sessions')
        .insert({
          keyword,
          filters: filters || {},
          results_count: finalProducts.length
        })
    } catch (error) {
      console.error('Failed to log search session:', error)
    }

    const processingTime = Date.now() - startTime
    console.log(`🎉 Research completed in ${processingTime}ms - Found ${finalProducts.length} verified products`)

    return NextResponse.json({
      success: true,
      data: finalProducts,
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
    console.error('Product research API error:', error)
    
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
async function storeProductInDatabase(product: ProcessedProduct, scoring: any) {
  try {
    // Insert product
    const { data: productData, error: productError } = await supabaseAdmin
      .from('products')
      .upsert({
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
          })
      }
    }

  } catch (error) {
    console.error('Database storage error:', error)
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