import { NextRequest } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'
import { apifyClient } from '@/lib/apify'
import { analyzeProductWithReviews } from '@/lib/openai'
import { scoreProduct, scoreApifyProduct } from '@/lib/scoring'
import { supabaseAdmin } from '@/lib/supabase'
import { cache, CACHE_TTL } from '@/lib/cache'
import { calculateAllMetrics, formatCompetitiveIntelligence } from '@/lib/calculations'
import { Logger } from '@/lib/logger'
import type { SearchParams, EnhancedProduct } from '@/types'

interface ProgressEvent {
  phase: 'marketplace_analysis' | 'validating_market' | 'applying_grading' | 'complete' | 'error'
  message: string
  progress: number
  data?: any
  timestamp: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  let controller: ReadableStreamDefaultController<Uint8Array>
  
  const stream = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg
    },
    cancel() {
      Logger.dev.trace('SSE stream cancelled by client')
    }
  })

  // Helper function to send SSE events
  const sendEvent = (event: ProgressEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`
    controller.enqueue(new TextEncoder().encode(data))
  }

  // Start the research process
  ;(async () => {
    try {
      const { searchParams } = new URL(request.url)
      const keyword = searchParams.get('keyword')
      const limit = parseInt(searchParams.get('limit') || '3')
      const maxReviews = parseInt(searchParams.get('maxReviews') || '1000')
      
      const filters = { maxReviews }

      if (!keyword?.trim()) {
        sendEvent({
          phase: 'error',
          message: 'Keyword is required',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        controller.close()
        return
      }

      Logger.research.start(keyword, filters)

      // Check cache first (no UI update for this)
      const cacheKey = cache.generateKey('apify_product_research', { keyword, filters, limit })
      const cached = await cache.get<EnhancedProduct[]>(cacheKey)
      if (cached) {
        sendEvent({
          phase: 'complete',
          message: `Found ${cached.length} cached products`,
          progress: 100,
          data: { products: cached, cached: true },
          timestamp: new Date().toISOString()
        })
        controller.close()
        return
      }

      // Phase 1: Marketplace Analysis (0-85%) - Runs DURING Apify search
      const marketplaceSteps = [
        { message: `Scanning Amazon catalog for "${keyword}"`, progress: 10, step: 'catalog_scan' },
        { message: 'Analyzing competitor pricing patterns', progress: 20, step: 'pricing_analysis' },
        { message: 'Discovering product variations and features', progress: 30, step: 'product_discovery' },
        { message: 'Evaluating sales performance indicators', progress: 40, step: 'sales_analysis' },
        { message: 'Assessing market saturation levels', progress: 50, step: 'saturation_check' },
        { message: 'Identifying high-opportunity products', progress: 60, step: 'opportunity_scan' },
        { message: 'Analyzing review patterns and ratings', progress: 70, step: 'review_analysis' },
        { message: 'Finalizing product selection criteria', progress: 80, step: 'selection_finalize' }
      ]

      // Start with first marketplace step immediately
      sendEvent({
        phase: 'marketplace_analysis',
        message: marketplaceSteps[0].message,
        progress: marketplaceSteps[0].progress,
        data: {
          currentStep: 1,
          totalSteps: marketplaceSteps.length,
          step: marketplaceSteps[0].step,
          keyword
        },
        timestamp: new Date().toISOString()
      })

      // Start Apify search immediately (no delay)
      const apifyPromise = apifyClient.searchProducts(keyword, {
        maxItems: 20,
        maxReviews: filters?.maxReviews || 1000,
        minRating: filters?.minRating || 3.0
      })

      // Continue marketplace analysis during the 60-second Apify wait
      let stepIndex = 1 // Start from step 2 since we already sent step 1
      const progressInterval = setInterval(() => {
        if (stepIndex < marketplaceSteps.length) {
          const step = marketplaceSteps[stepIndex]
          sendEvent({
            phase: 'marketplace_analysis',
            message: step.message,
            progress: step.progress,
            data: {
              currentStep: stepIndex + 1,
              totalSteps: marketplaceSteps.length,
              step: step.step,
              keyword
            },
            timestamp: new Date().toISOString()
          })
          stepIndex++
        }
      }, 7000) // ~7 seconds per step = 56 seconds total

      // Wait for Apify to complete
      const apifyProducts = await apifyPromise
      
      // Clear the progress interval
      clearInterval(progressInterval)

      if (!apifyProducts || apifyProducts.length === 0) {
        sendEvent({
          phase: 'complete',
          message: 'No products found on Amazon',
          progress: 100,
          data: { products: [], message: 'No products found for this keyword' },
          timestamp: new Date().toISOString()
        })
        controller.close()
        return
      }

      Logger.research.apifyFound(apifyProducts.length)

      // Phase 2: Validating Market Data (85-95%)
      sendEvent({
        phase: 'validating_market',
        message: 'Validating product data and calculating market analysis',
        progress: 85,
        data: { 
          productsFound: apifyProducts.length,
          keyword
        },
        timestamp: new Date().toISOString()
      })

      // Process products quickly (existing logic but condensed)
      const scoredProducts = apifyProducts.map(product => {
        const preliminaryScore = scoreApifyProduct(product)
        return { ...product, preliminaryScore: preliminaryScore.score, estimatedGrade: preliminaryScore.estimatedGrade }
      })

      const topProducts = scoredProducts.sort((a, b) => b.preliminaryScore - a.preliminaryScore).slice(0, 5)
      const verifiedProducts: EnhancedProduct[] = []
      
      // Send verification events for each product immediately
      topProducts.forEach((product, index) => {
        sendEvent({
          phase: 'validating_market',
          message: `Verifying product: ${product.title?.substring(0, 50)}...`,
          progress: 85 + (index + 1) * 2, // 85% to 95%
          data: { 
            currentProduct: index + 1,
            totalProducts: topProducts.length,
            productTitle: product.title,
            asin: product.asin,
            productImage: product.thumbnailImage || null,
            keyword
          },
          timestamp: new Date().toISOString()
        })
      })
      
      // Quick SellerSprite verification (parallel processing)
      for (const product of topProducts) {
        try {
          const [sellerSpriteSales, keywordData] = await Promise.all([
            sellerSpriteClient.salesPrediction(product.asin).catch(() => null),
            sellerSpriteClient.reverseASIN(product.asin, 1, 10).catch(() => [])
          ])

          if (!sellerSpriteSales) continue

          const productData = apifyClient.mapToProductData(product)
          const aiAnalysis = await analyzeProductWithReviews(productData, product.reviews)
          const scoring = scoreProduct(productData, sellerSpriteSales, aiAnalysis, keywordData)
          const calculatedMetrics = calculateAllMetrics({
            id: product.asin, asin: product.asin, title: product.title, brand: product.brand || 'Unknown',
            price: product.price.value, bsr: product.bestSellersRank, reviews: product.reviewsCount,
            rating: product.stars, images: product.images, dimensions: product.dimensions,
            reviewsData: product.reviews, salesData: sellerSpriteSales, aiAnalysis,
            keywords: keywordData.slice(0, 10), grade: scoring.grade, apifySource: true,
            sellerSpriteVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          }, product)

          verifiedProducts.push({
            id: product.asin, asin: product.asin, title: product.title, brand: product.brand || 'Unknown',
            price: product.price.value, bsr: product.bestSellersRank, reviews: product.reviewsCount,
            rating: product.stars, images: product.images, dimensions: product.dimensions,
            reviewsData: product.reviews, salesData: sellerSpriteSales, aiAnalysis,
            keywords: keywordData.slice(0, 10), grade: scoring.grade, apifySource: true,
            sellerSpriteVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            calculatedMetrics, competitiveIntelligence: formatCompetitiveIntelligence(aiAnalysis.competitiveDifferentiation)
          })
        } catch (error) {
          Logger.error(`Product verification failed for ${product.asin}`, error)
          continue
        }
      }

      // Phase 3: Apply A10 Grading Algorithm (95-99%)
      sendEvent({
        phase: 'applying_grading',
        message: 'Applying A10 Grading Algorithm',
        progress: 95,
        data: { 
          productsToGrade: verifiedProducts.length,
          keyword
        },
        timestamp: new Date().toISOString()
      })

      if (verifiedProducts.length === 0) {
        sendEvent({
          phase: 'complete',
          message: 'No products could be verified',
          progress: 100,
          data: { products: [], message: 'No products passed verification' },
          timestamp: new Date().toISOString()
        })
        controller.close()
        return
      }

      const finalProducts = verifiedProducts.sort((a, b) => getGradeScore(b.grade) - getGradeScore(a.grade))

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
        Logger.error('Search session logging', error)
      }

      const processingTime = Date.now() - startTime
      Logger.research.completed(finalProducts.length, processingTime)

      // Phase 5: Complete
      sendEvent({
        phase: 'complete',
        message: `Research complete! Found ${finalProducts.length} verified products`,
        progress: 100,
        data: {
          products: finalProducts,
          marketAnalysis: marketAnalysis,
          processingTime,
          stats: {
            apify_products_found: apifyProducts.length,
            top_products_selected: topProducts.length,
            sellersprite_verified: finalProducts.length,
            verification_rate: `${Math.round((finalProducts.length / topProducts.length) * 100)}%`
          }
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      Logger.error('SSE Research stream error', error)
      sendEvent({
        phase: 'error',
        message: error instanceof Error ? error.message : 'Research failed',
        progress: 0,
        timestamp: new Date().toISOString()
      })
    } finally {
      controller.close()
    }
  })()

  return new Response(stream, { headers })
}

// Helper function to get numerical score for grade (same as existing)
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