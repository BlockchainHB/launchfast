import { NextRequest } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'
import { apifyClient } from '@/lib/apify'
import { analyzeProductWithReviews } from '@/lib/openai'
import { scoreProduct } from '@/lib/scoring'
import { supabaseAdmin } from '@/lib/supabase'
// Cache removed for data accuracy
import { calculateAllMetrics, formatCompetitiveIntelligence } from '@/lib/calculations'
import { Logger } from '@/lib/logger'
import { createServerClient } from '@supabase/ssr'
import type { EnhancedProduct } from '@/types'

interface ProgressEvent {
  phase: 'product_analysis' | 'validating_data' | 'applying_grading' | 'complete' | 'error'
  message: string
  progress: number
  data?: any
  timestamp: string
}

const ASIN_REGEX = /^[A-Z0-9]{10}$/
const TIMEOUT = 60000 // 60 seconds for single product

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Set up SSE headers (same as keyword endpoint)
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  let controller: ReadableStreamDefaultController<Uint8Array> | null = null
  let controllerClosed = false
  
  const stream = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg
    },
    cancel() {
      Logger.dev.trace('ASIN SSE stream cancelled by client')
    }
  })

  const sendEvent = (event: ProgressEvent) => {
    if (controller && !controllerClosed) {
      const data = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(new TextEncoder().encode(data))
    }
  }
  
  const closeController = () => {
    if (controller && !controllerClosed) {
      controller.close()
      controllerClosed = true
    }
  }

  // Start the ASIN research process
  ;(async () => {
    try {
      const { searchParams } = new URL(request.url)
      const asin = searchParams.get('asin')?.trim().toUpperCase()
      
      // Validate ASIN format
      if (!asin || !ASIN_REGEX.test(asin)) {
        sendEvent({
          phase: 'error',
          message: 'Valid ASIN is required (10 characters, alphanumeric)',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        closeController()
        return
      }

      // Get authenticated user (same pattern as keyword endpoint)
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
        closeController()
        return
      }

      const userId = user.id

      Logger.dev.trace(`Starting ASIN research for ${asin}`)

      // Check if product already exists in database
      const { data: existingProduct } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('asin', asin)
        .eq('user_id', userId)
        .single()

      if (existingProduct) {
        sendEvent({
          phase: 'complete',
          message: 'Product already analyzed',
          progress: 100,
          data: { 
            products: [existingProduct], 
            cached: true,
            message: 'This ASIN has already been analyzed'
          },
          timestamp: new Date().toISOString()
        })
        closeController()
        return
      }

      // Skip cache - always fetch fresh data for user-initiated ASIN research

      // Phase 1: Product Analysis
      sendEvent({
        phase: 'product_analysis',
        message: `Analyzing product ${asin}`,
        progress: 10,
        data: {
          asin,
          stepType: 'indeterminate',
          currentStep: 'fetching_product_data'
        },
        timestamp: new Date().toISOString()
      })

      // Create Amazon product URL for Apify scraping
      const amazonUrl = `https://www.amazon.com/dp/${asin}`
      
      // Fetch product data from Apify using direct URL
      const apifyProduct = await Promise.race([
        apifyClient.scrapeProductByUrl(amazonUrl),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Product scraping timeout')), TIMEOUT)
        )
      ]) as any

      if (!apifyProduct) {
        sendEvent({
          phase: 'error',
          message: 'Product not found on Amazon',
          progress: 0,
          data: { 
            suggestion: 'Check that the ASIN exists and is available on Amazon',
            canRetry: true 
          },
          timestamp: new Date().toISOString()
        })
        closeController()
        return
      }

      // Phase 2: Validating Data
      sendEvent({
        phase: 'validating_data',
        message: 'Validating product data with SellerSprite',
        progress: 40,
        data: {
          asin,
          stepType: 'determinate',
          productFound: true
        },
        timestamp: new Date().toISOString()
      })

      // Get SellerSprite data
      const [sellerSpriteSales, keywordData] = await Promise.all([
        sellerSpriteClient.salesPrediction(asin).catch(() => null),
        sellerSpriteClient.reverseASIN(asin, 1, 10).catch(() => [])
      ])

      if (!sellerSpriteSales) {
        sendEvent({
          phase: 'error',
          message: 'Unable to validate product sales data',
          progress: 0,
          data: { 
            suggestion: 'Product may not have sufficient sales history',
            canRetry: true 
          },
          timestamp: new Date().toISOString()
        })
        closeController()
        return
      }

      // Phase 3: Applying Grading
      sendEvent({
        phase: 'applying_grading',
        message: 'Applying A10 Grading Algorithm',
        progress: 70,
        data: {
          asin,
          stepType: 'final'
        },
        timestamp: new Date().toISOString()
      })

      // Process product data (same logic as keyword research)
      const productData = apifyClient.mapToProductData(apifyProduct)
      const aiAnalysis = await analyzeProductWithReviews(productData, apifyProduct.reviews)
      const scoring = scoreProduct(productData, sellerSpriteSales, aiAnalysis, keywordData)
      const calculatedMetrics = calculateAllMetrics({
        id: asin,
        asin,
        title: apifyProduct.title,
        brand: apifyProduct.brand || 'Unknown',
        price: apifyProduct.price?.value || 0,
        bsr: apifyProduct.bestSellersRank,
        reviews: apifyProduct.reviewsCount || 0,
        rating: apifyProduct.stars || 0,
        images: apifyProduct.images || [],
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

      const enhancedProduct: EnhancedProduct = {
        id: asin,
        asin,
        title: apifyProduct.title,
        brand: apifyProduct.brand || 'Unknown',
        price: apifyProduct.price?.value || 0,
        bsr: apifyProduct.bestSellersRank,
        reviews: apifyProduct.reviewsCount || 0,
        rating: apifyProduct.stars || 0,
        images: apifyProduct.images || [],
        dimensions: apifyProduct.dimensions,
        reviewsData: apifyProduct.reviews,
        salesData: sellerSpriteSales,
        aiAnalysis,
        keywords: keywordData.slice(0, 10),
        grade: scoring.grade,
        apifySource: true,
        sellerSpriteVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        calculatedMetrics,
        competitiveIntelligence: formatCompetitiveIntelligence(aiAnalysis.competitiveDifferentiation),
        // ASIN products have no market association
        marketId: null,
        market: null
      }

      // No caching - always provide fresh analysis results

      const processingTime = Date.now() - startTime
      Logger.dev.trace(`ASIN research completed for ${asin} in ${processingTime}ms`)

      // Complete
      sendEvent({
        phase: 'complete',
        message: `Analysis complete for ${asin}`,
        progress: 100,
        data: {
          products: [enhancedProduct],
          processingTime,
          stats: {
            asin_analyzed: asin,
            grade_assigned: scoring.grade,
            keywords_found: keywordData.length,
            reviews_analyzed: apifyProduct.reviews?.length || 0
          }
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      Logger.error('ASIN SSE Research stream error', error)
      
      let userMessage = 'ASIN analysis failed'
      let suggestion = ''
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          userMessage = 'Analysis timed out'
          suggestion = 'Try again or check if the ASIN exists on Amazon'
        } else if (error.message.includes('not found')) {
          userMessage = 'Product not found'
          suggestion = 'Verify the ASIN is correct and the product exists on Amazon'
        } else if (error.message.includes('network')) {
          userMessage = 'Network connection issue'
          suggestion = 'Check your internet connection and try again'
        } else {
          userMessage = error.message
        }
      }
      
      sendEvent({
        phase: 'error',
        message: userMessage,
        progress: 0,
        data: {
          suggestion,
          canRetry: true,
          errorType: error instanceof Error && error.message.includes('timeout') ? 'timeout' : 'general'
        },
        timestamp: new Date().toISOString()
      })
    } finally {
      closeController()
    }
  })()

  return new Response(stream, { headers })
}