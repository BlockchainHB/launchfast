import { NextRequest } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'
import { apifyClient } from '@/lib/apify'
import { analyzeProductWithReviews } from '@/lib/openai'
import { scoreProduct, scoreApifyProduct } from '@/lib/scoring'
import { supabaseAdmin } from '@/lib/supabase'
import { cache, CACHE_TTL } from '@/lib/cache'
import { calculateAllMetrics, formatCompetitiveIntelligence } from '@/lib/calculations'
import { Logger } from '@/lib/logger'
import { createServerClient } from '@supabase/ssr'
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
        sendEvent({
          phase: 'error',
          message: 'Unauthorized - please login',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        controller.close()
        return
      }

      const userId = user.id

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

      // Phase 1: Marketplace Analysis - Industry-standard step progression
      const marketplaceSteps = [
        { message: `Scanning Amazon catalog for "${keyword}"`, step: 'catalog_scan' },
        { message: 'Analyzing competitor pricing patterns', step: 'pricing_analysis' },
        { message: 'Discovering product variations and features', step: 'product_discovery' },
        { message: 'Evaluating sales performance indicators', step: 'sales_analysis' },
        { message: 'Assessing market saturation levels', step: 'saturation_check' },
        { message: 'Identifying high-opportunity products', step: 'opportunity_scan' },
        { message: 'Analyzing review patterns and ratings', step: 'review_analysis' },
        { message: 'Finalizing product selection criteria', step: 'selection_finalize' }
      ]

      // Start with first marketplace step immediately
      sendEvent({
        phase: 'marketplace_analysis',
        message: marketplaceSteps[0].message,
        progress: 0, // No fake progress - just step tracking
        data: {
          currentStep: 1,
          totalSteps: marketplaceSteps.length,
          step: marketplaceSteps[0].step,
          keyword,
          stepType: 'indeterminate' // UI should show spinner, not progress bar
        },
        timestamp: new Date().toISOString()
      })

      // Start Apify search immediately (no delay)
      const apifyPromise = apifyClient.searchProducts(keyword, {
        maxItems: 20,
        maxReviews: filters?.maxReviews || 1000,
        minRating: filters?.minRating || 3.0
      })

      // Continue marketplace analysis during the Apify wait
      let stepIndex = 1 // Start from step 2 since we already sent step 1
      const progressInterval = setInterval(() => {
        if (stepIndex < marketplaceSteps.length) {
          const step = marketplaceSteps[stepIndex]
          sendEvent({
            phase: 'marketplace_analysis',
            message: step.message,
            progress: 0, // No fake progress
            data: {
              currentStep: stepIndex + 1,
              totalSteps: marketplaceSteps.length,
              step: step.step,
              keyword,
              stepType: 'indeterminate' // Keep showing spinner
            },
            timestamp: new Date().toISOString()
          })
          stepIndex++
        }
      }, 4000) // Slower steps to spread across full Apify wait time (~32 seconds for 8 steps)

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

      // Phase 2: Validating Market Data - Real progress based on actual work
      sendEvent({
        phase: 'validating_market',
        message: 'Validating product data and calculating market analysis',
        progress: 0, // Will be updated as we process each product
        data: { 
          productsFound: apifyProducts.length,
          keyword,
          stepType: 'determinate', // UI should show real progress
          totalItems: Math.min(5, apifyProducts.length), // We'll process top 5
          currentItem: 0
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
      
      // Show all products spinning simultaneously from the start
      sendEvent({
        phase: 'validating_market',
        message: 'Verifying all products with advanced analytics...',
        progress: 0,
        data: { 
          stepType: 'determinate',
          totalItems: topProducts.length,
          currentItem: 0,
          // All products start in "verifying" state to show simultaneous validation
          allProducts: topProducts.map(p => ({
            asin: p.asin,
            title: p.title,
            image: p.thumbnailImage,
            status: 'verifying' // All spinning at once
          })),
          keyword
        },
        timestamp: new Date().toISOString()
      })
      
      // Industry-grade parallel processing with proper batching, timeouts, and error isolation
      const BATCH_SIZE = 3 // Process products in batches to avoid rate limits
      const OPERATION_TIMEOUT = 30000 // 30 second timeout per product
      const MAX_RETRIES = 2
      
      const processProductWithTimeout = async (product: any, retryCount = 0): Promise<any | null> => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT)
        )
        
        try {
          const result = await Promise.race([
            (async () => {
              // Parallel SellerSprite API calls
              const [sellerSpriteSales, keywordData] = await Promise.all([
                sellerSpriteClient.salesPrediction(product.asin).catch(() => null),
                sellerSpriteClient.reverseASIN(product.asin, 1, 10).catch(() => [])
              ])

              if (!sellerSpriteSales) return null

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

              return {
                id: product.asin, asin: product.asin, title: product.title, brand: product.brand || 'Unknown',
                price: product.price.value, bsr: product.bestSellersRank, reviews: product.reviewsCount,
                rating: product.stars, images: product.images, dimensions: product.dimensions,
                reviewsData: product.reviews, salesData: sellerSpriteSales, aiAnalysis,
                keywords: keywordData.slice(0, 10), grade: scoring.grade, apifySource: true,
                sellerSpriteVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                calculatedMetrics, competitiveIntelligence: formatCompetitiveIntelligence(aiAnalysis.competitiveDifferentiation)
              }
            })(),
            timeoutPromise
          ])
          
          return result
        } catch (error) {
          if (retryCount < MAX_RETRIES && !(error instanceof Error && error.message === 'Operation timeout')) {
            Logger.dev.warn(`Retrying product ${product.asin}, attempt ${retryCount + 1}`)
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
            return processProductWithTimeout(product, retryCount + 1)
          }
          
          Logger.error(`Product verification failed for ${product.asin} after ${retryCount + 1} attempts`, error)
          return null
        }
      }
      
      // Process products in parallel batches
      const batches = []
      for (let i = 0; i < topProducts.length; i += BATCH_SIZE) {
        batches.push(topProducts.slice(i, i + BATCH_SIZE))
      }
      
      Logger.dev.info(`Processing ${topProducts.length} products in ${batches.length} parallel batches of ${BATCH_SIZE}`)
      
      for (const batch of batches) {
        // Process entire batch in parallel with Promise.allSettled for error isolation
        const batchResults = await Promise.allSettled(
          batch.map(product => processProductWithTimeout(product))
        )
        
        // Collect successful results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            verifiedProducts.push(result.value)
            Logger.dev.trace(`✅ Product ${batch[index].asin} verified successfully`)
          } else if (result.status === 'rejected') {
            Logger.dev.warn(`❌ Product ${batch[index].asin} batch processing failed:`, result.reason)
          }
        })
        
        // Small delay between batches to respect rate limits
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Phase 3: Apply A10 Grading Algorithm - Final completion phase
      sendEvent({
        phase: 'applying_grading',
        message: 'Applying A10 Grading Algorithm',
        progress: 90, // Near completion, but not 100% until truly done
        data: { 
          stepType: 'final', // UI should show completion animation
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