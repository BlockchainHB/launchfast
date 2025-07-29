import { NextRequest } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'
import { apifyClient } from '@/lib/apify'
import { analyzeProductWithReviews } from '@/lib/openai'
import { scoreProduct } from '@/lib/scoring'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateAllMetrics, formatCompetitiveIntelligence } from '@/lib/calculations'
import { Logger } from '@/lib/logger'
import { createServerClient } from '@supabase/ssr'
import type { EnhancedProduct } from '@/types'

interface ProgressEvent {
  phase: 'multi_asin_analysis' | 'batch_processing' | 'market_integration' | 'complete' | 'error'
  message: string
  progress: number
  data?: any
  timestamp: string
}

const ASIN_REGEX = /^[A-Z0-9]{10}$/
const TIMEOUT = 90000 // 90 seconds for multiple ASINs
const MAX_ASINS = 10

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

  let controller: ReadableStreamDefaultController<Uint8Array> | null = null
  let controllerClosed = false
  
  const stream = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg
    },
    cancel() {
      Logger.dev.trace('Multi-ASIN SSE stream cancelled by client')
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

  // Start the multi-ASIN research process
  ;(async () => {
    try {
      const { searchParams } = new URL(request.url)
      const asinsParam = searchParams.get('asins')
      const marketId = searchParams.get('marketId')
      const mode = searchParams.get('mode') // 'add-to-market' or null
      
      if (!asinsParam) {
        sendEvent({
          phase: 'error',
          message: 'ASINs parameter is required',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        closeController()
        return
      }

      // Parse and validate ASINs
      const asins = asinsParam.split(',').map(asin => asin.trim().toUpperCase())
      const invalidAsins = asins.filter(asin => !ASIN_REGEX.test(asin))
      
      if (invalidAsins.length > 0) {
        sendEvent({
          phase: 'error',
          message: `Invalid ASIN format: ${invalidAsins.join(', ')}`,
          progress: 0,
          timestamp: new Date().toISOString()
        })
        closeController()
        return
      }
      
      if (asins.length === 0 || asins.length > MAX_ASINS) {
        sendEvent({
          phase: 'error',
          message: `Must provide 1-${MAX_ASINS} ASINs`,
          progress: 0,
          timestamp: new Date().toISOString()
        })
        closeController()
        return
      }

      // Get authenticated user
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

      // Validate market if adding to existing market
      let targetMarket = null
      if (mode === 'add-to-market' && marketId) {
        const { data: market, error: marketError } = await supabaseAdmin
          .from('markets')
          .select('id, keyword, user_id')
          .eq('id', marketId)
          .eq('user_id', userId)
          .single()

        if (marketError || !market) {
          sendEvent({
            phase: 'error',
            message: 'Market not found or access denied',
            progress: 0,
            timestamp: new Date().toISOString()
          })
          closeController()
          return
        }
        targetMarket = market
      }

      Logger.dev.trace(`Starting multi-ASIN research for ${asins.length} ASINs: ${asins.join(', ')}`)

      // Phase 1: Multi-ASIN Analysis Setup
      sendEvent({
        phase: 'multi_asin_analysis',
        message: `Initializing analysis for ${asins.length} ASINs`,
        progress: 5,
        data: {
          totalAsins: asins.length,
          mode: mode || 'new',
          targetMarket: targetMarket?.keyword
        },
        timestamp: new Date().toISOString()
      })

      // Phase 2: Batch Processing - Check for existing products first
      sendEvent({
        phase: 'batch_processing',
        message: `Checking for existing products and preparing batch scrape`,
        progress: 15,
        data: {
          totalAsins: asins.length,
          mode: mode || 'new'
        },
        timestamp: new Date().toISOString()
      })

      // Check which products already exist
      const { data: existingProducts } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .in('asin', asins)

      const existingAsins = new Set(existingProducts?.map(p => p.asin) || [])
      const newAsins = asins.filter(asin => !existingAsins.has(asin))
      const results: EnhancedProduct[] = [...(existingProducts || [])] as EnhancedProduct[]
      const errors: string[] = []

      Logger.dev.trace(`Found ${existingProducts?.length || 0} existing products, ${newAsins.length} new ASINs to scrape`)

      if (newAsins.length > 0) {
        // Phase 2a: Batch scraping new ASINs
        sendEvent({
          phase: 'batch_processing',
          message: `Batch scraping ${newAsins.length} new ASINs from Amazon`,
          progress: 25,
          data: {
            newAsins: newAsins.length,
            existingAsins: existingAsins.size,
            totalAsins: asins.length
          },
          timestamp: new Date().toISOString()
        })

        try {
          // Create Amazon URLs for batch scraping
          const amazonUrls = newAsins.map(asin => `https://www.amazon.com/dp/${asin}`)
          
          // Batch scrape all new ASINs at once
          const apifyProducts = await Promise.race([
            apifyClient.scrapeProductsByUrls(amazonUrls),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Batch scraping timeout')), TIMEOUT)
            )
          ]) as any[]

          Logger.dev.trace(`Apify batch scraping returned ${apifyProducts.length} products`)

          // Phase 2b: Process scraped products
          sendEvent({
            phase: 'batch_processing',
            message: `Processing ${apifyProducts.length} scraped products`,
            progress: 50,
            data: {
              scrapedProducts: apifyProducts.length,
              expectedProducts: newAsins.length
            },
            timestamp: new Date().toISOString()
          })

          for (const apifyProduct of apifyProducts) {
            if (!apifyProduct || !apifyProduct.asin) continue

            const currentAsin = apifyProduct.asin

            try {
              // Get SellerSprite data
              const [sellerSpriteSales, keywordData] = await Promise.all([
                sellerSpriteClient.salesPrediction(currentAsin).catch(() => null),
                sellerSpriteClient.reverseASIN(currentAsin, 1, 10).catch(() => [])
              ])

              if (!sellerSpriteSales) {
                Logger.dev.trace(`Skipping ${currentAsin} - no SellerSprite sales data`)
                continue
              }

              // Process product data
              const productData = apifyClient.mapToProductData(apifyProduct)
              // Use rule-based analysis instead of expensive AI calls
              const aiAnalysis = null
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
              const calculatedMetrics = calculateAllMetrics({
                id: currentAsin,
                asin: currentAsin,
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
                aiAnalysis: ruleBasedAnalysis,
                keywords: keywordData.slice(0, 10),
                grade: scoring.grade,
                apifySource: true,
                sellerSpriteVerified: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, apifyProduct)

              const enhancedProduct: EnhancedProduct = {
                id: currentAsin,
                asin: currentAsin,
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
                aiAnalysis: ruleBasedAnalysis,
                keywords: keywordData.slice(0, 10),
                grade: scoring.grade,
                apifySource: true,
                sellerSpriteVerified: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                calculatedMetrics,
                competitiveIntelligence: formatCompetitiveIntelligence(aiAnalysis.competitiveDifferentiation),
                marketId: targetMarket?.id || null,
                market: targetMarket || null
              }

              results.push(enhancedProduct)
              Logger.dev.trace(`Successfully processed ASIN ${currentAsin}`)

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : `Failed to process ${currentAsin}`
              Logger.error(`Error processing ASIN ${currentAsin}:`, error)
              // Continue processing other products instead of failing the whole batch
            }
          }

        } catch (error) {
          Logger.error('Batch scraping failed:', error)
          throw new Error(`Batch scraping failed: ${error.message}`)
        }
      }

      // Phase 3: Market Integration (if applicable)
      if (mode === 'add-to-market' && targetMarket && results.length > 0) {
        sendEvent({
          phase: 'market_integration',
          message: `Integrating ${results.length} products into market "${targetMarket.keyword}"`,
          progress: 85,
          data: {
            marketKeyword: targetMarket.keyword,
            productsToAdd: results.length,
            successfulAsins: results.map(p => p.asin)
          },
          timestamp: new Date().toISOString()
        })
      }

      const processingTime = Date.now() - startTime
      Logger.dev.trace(`Multi-ASIN research completed: ${results.length} products, ${errors.length} errors in ${processingTime}ms`)

      // Complete
      sendEvent({
        phase: 'complete',
        message: `Analysis complete: ${results.length} products analyzed`,
        progress: 100,
        data: {
          products: results,
          processingTime,
          stats: {
            total_asins: asins.length,
            successful_asins: results.length,
            failed_asins: errors.length,
            errors: errors.length > 0 ? errors : undefined,
            target_market: targetMarket?.keyword,
            mode: mode
          }
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      Logger.error('Multi-ASIN SSE Research stream error', error)
      
      let userMessage = 'Multi-ASIN analysis failed'
      let suggestion = ''
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          userMessage = 'Analysis timed out'
          suggestion = 'Try analyzing fewer ASINs or try again later'
        } else if (error.message.includes('not found')) {
          userMessage = 'One or more products not found'
          suggestion = 'Verify all ASINs are correct and products exist on Amazon'
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