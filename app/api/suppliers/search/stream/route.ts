import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { alibabaScraper, supplierUtils } from '@/lib/alibaba-scraper'
import type { SupplierSearchOptions, SupplierSearchSession } from '@/types/supplier'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SupplierProgressEvent {
  phase: 'initializing' | 'apify_search' | 'data_processing' | 'quality_scoring' | 'database_save' | 'complete' | 'error'
  message: string
  progress: number
  data?: {
    sessionId?: string
    suppliersFound?: number
    currentSupplier?: string
    qualityAnalysis?: any
    totalDuration?: number
  }
  timestamp: string
}

export async function POST(request: NextRequest) {
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
      console.log('SSE stream cancelled by client')
      controllerClosed = true
    }
  })

  // Helper function to send SSE events
  const sendEvent = (event: SupplierProgressEvent) => {
    if (controller && !controllerClosed) {
      const data = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(new TextEncoder().encode(data))
    }
  }

  // Process the streaming search
  ;(async () => {
    try {
      const body = await request.json()
      const { userId, searchQuery, options = {} } = body

      // Validate required fields
      if (!userId || !searchQuery) {
        sendEvent({
          phase: 'error',
          message: 'Missing required fields: userId and searchQuery',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        controller?.close()
        return
      }

      sendEvent({
        phase: 'initializing',
        message: 'Setting up supplier search...',
        progress: 0,
        timestamp: new Date().toISOString()
      })

      // Check user's subscription and usage limits
      const usageCheck = await checkUsageLimits(userId)
      if (!usageCheck.allowed) {
        sendEvent({
          phase: 'error',
          message: usageCheck.error || 'Usage limit exceeded',
          progress: 0,
          timestamp: new Date().toISOString()
        })
        controller?.close()
        return
      }

      // Prepare search options with defaults
      const searchOptions: SupplierSearchOptions = {
        query: searchQuery.trim(),
        maxResults: Math.min(options.maxResults || 20, 50),
        goldSupplierOnly: options.goldSupplierOnly || false,
        tradeAssuranceOnly: options.tradeAssuranceOnly || false,
        minYearsInBusiness: options.minYearsInBusiness || 0,
        minOrderQuantity: options.minOrderQuantity,
        maxOrderQuantity: options.maxOrderQuantity,
        location: options.location,
        responseTimeHours: options.responseTimeHours
      }

      // Create initial session record
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const sessionRecord: Omit<SupplierSearchSession, 'results' | 'qualityAnalysis'> = {
        id: sessionId,
        userId,
        searchQuery,
        searchOptions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'searching'
      }

      // Insert session record
      await supabase
        .from('supplier_search_sessions')
        .insert({
          id: sessionRecord.id,
          user_id: sessionRecord.userId,
          search_query: sessionRecord.searchQuery,
          search_options: sessionRecord.searchOptions,
          results: [],
          created_at: sessionRecord.createdAt,
          updated_at: sessionRecord.updatedAt,
          status: sessionRecord.status
        })

      sendEvent({
        phase: 'initializing',
        message: 'Search session created, starting Apify search...',
        progress: 2,
        data: { sessionId },
        timestamp: new Date().toISOString()
      })

      // Perform the streaming Alibaba search
      const searchResult = await alibabaScraper.searchSuppliers(
        searchOptions,
        (phase: string, message: string, progress: number, data?: any) => {
          sendEvent({
            phase: phase as any,
            message,
            progress,
            data: { sessionId, ...data },
            timestamp: new Date().toISOString()
          })
        }
      )

      if (!searchResult.success || !searchResult.data) {
        throw new Error(searchResult.error || 'Failed to search suppliers')
      }

      const { suppliers } = searchResult.data

      // Calculate quality scores with progress updates
      sendEvent({
        phase: 'quality_scoring',
        message: 'Calculating supplier quality scores...',
        progress: 75,
        data: { sessionId, suppliersFound: suppliers.length },
        timestamp: new Date().toISOString()
      })

      const suppliersWithScores = suppliers.map((supplier, index) => {
        if (index % 3 === 0) { // Update progress every 3 suppliers
          sendEvent({
            phase: 'quality_scoring',
            message: `Scoring supplier: ${supplier.companyName}`,
            progress: 75 + (index / suppliers.length) * 10,
            data: { sessionId, currentSupplier: supplier.companyName },
            timestamp: new Date().toISOString()
          })
        }
        return {
          ...supplier,
          qualityScore: supplierUtils.calculateQualityScore(supplier)
        }
      })

      // Sort by quality score (highest first)
      const sortedSuppliers = suppliersWithScores.sort((a, b) => 
        b.qualityScore.overall - a.qualityScore.overall
      )

      // Generate quality analysis
      sendEvent({
        phase: 'quality_scoring',
        message: 'Generating quality analysis...',
        progress: 85,
        data: { sessionId },
        timestamp: new Date().toISOString()
      })

      const qualityAnalysis = generateQualityAnalysis(sortedSuppliers.slice(0, 10), searchQuery)
      const searchDurationMs = Date.now() - startTime

      // Save to database
      sendEvent({
        phase: 'database_save',
        message: 'Saving results to database...',
        progress: 90,
        data: { sessionId },
        timestamp: new Date().toISOString()
      })

      // Update session with results
      await supabase
        .from('supplier_search_sessions')
        .update({
          results: sortedSuppliers,
          quality_analysis: qualityAnalysis,
          status: 'completed',
          updated_at: new Date().toISOString(),
          total_suppliers_found: suppliers.length,
          search_duration_ms: searchDurationMs,
          apify_actor_used: 'piotrv1001~alibaba-listings-scraper',
          metadata: {
            totalScraped: suppliers.length,
            totalFiltered: sortedSuppliers.length,
            searchDurationMs
          }
        })
        .eq('id', sessionId)

      // Update usage tracking
      await updateUsageTracking(userId)

      // Send final completion event
      sendEvent({
        phase: 'complete',
        message: `Search completed! Found ${sortedSuppliers.length} high-quality suppliers.`,
        progress: 100,
        data: {
          sessionId,
          suppliers: sortedSuppliers,
          totalFound: suppliers.length,
          searchQuery,
          searchOptions,
          qualityAnalysis,
          searchDurationMs
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Streaming supplier search failed:', error)
      
      sendEvent({
        phase: 'error',
        message: error instanceof Error ? error.message : 'Supplier search failed',
        progress: 0,
        timestamp: new Date().toISOString()
      })
    } finally {
      controller?.close()
    }
  })()

  return new Response(stream, { headers })
}

/**
 * Check user's usage limits for supplier searches
 */
async function checkUsageLimits(userId: string) {
  try {
    // Get user profile and subscription info
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('subscription_tier, supplier_searches_used, supplier_searches_limit')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return {
        allowed: false,
        error: 'User not found',
        usage: { searchesUsed: 0, searchesRemaining: 0 }
      }
    }

    // Set limits based on subscription tier
    let monthlyLimit = 5 // Free tier default
    if (profile.subscription_tier === 'pro') {
      monthlyLimit = 100
    } else if (profile.subscription_tier === 'enterprise') {
      monthlyLimit = 500
    }

    const searchesUsed = profile.supplier_searches_used || 0
    const searchesRemaining = Math.max(0, monthlyLimit - searchesUsed)

    if (searchesUsed >= monthlyLimit) {
      return {
        allowed: false,
        error: 'Monthly supplier search limit reached. Upgrade your plan for more searches.',
        usage: { searchesUsed, searchesRemaining: 0 }
      }
    }

    return {
      allowed: true,
      usage: { searchesUsed, searchesRemaining }
    }

  } catch (error) {
    console.error('Error checking usage limits:', error)
    return {
      allowed: false,
      error: 'Unable to verify usage limits',
      usage: { searchesUsed: 0, searchesRemaining: 0 }
    }
  }
}

/**
 * Update user's usage tracking
 */
async function updateUsageTracking(userId: string) {
  try {
    await supabase.rpc('increment_supplier_searches', { 
      user_id: userId 
    })
  } catch (error) {
    console.error('Error updating usage tracking:', error)
  }
}

/**
 * Generate quality analysis without AI - simple script-based filtering
 */
function generateQualityAnalysis(suppliers: any[], searchQuery: string) {
  if (!suppliers.length) {
    return {
      topSuppliers: [],
      averageScore: 0,
      keyInsights: ['No suppliers found for analysis'],
      statistics: {
        goldSuppliersCount: 0,
        tradeAssuranceCount: 0,
        highRatedCount: 0,
        experiencedCount: 0,
        averageMOQ: 0,
        averageRating: 0
      }
    }
  }

  const topSuppliers = suppliers.slice(0, 5)
  const averageScore = Math.round(
    suppliers.reduce((sum, s) => sum + s.qualityScore.overall, 0) / suppliers.length
  )

  // Statistics
  const goldSuppliers = suppliers.filter(s => s.trust.goldSupplier)
  const tradeAssuranceSuppliers = suppliers.filter(s => s.metrics.tradeAssurance)
  const highRatedSuppliers = suppliers.filter(s => s.trust.rating >= 4.0)
  const experiencedSuppliers = suppliers.filter(s => s.yearsInBusiness >= 5)
  
  const moqValues = suppliers.map(s => s.metrics.minOrderQuantity).filter(moq => moq > 0)
  const averageMOQ = moqValues.length > 0 ? Math.round(moqValues.reduce((sum, moq) => sum + moq, 0) / moqValues.length) : 0
  
  const ratingValues = suppliers.map(s => s.trust.rating).filter(rating => rating > 0)
  const averageRating = ratingValues.length > 0 ? +(ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length).toFixed(1) : 0
  
  // Generate insights based on data analysis
  const keyInsights = [
    `Found ${suppliers.length} suppliers for "${searchQuery}"`,
    `Average quality score: ${averageScore}/100`,
    `${goldSuppliers.length} Gold Suppliers identified`,
    `${tradeAssuranceSuppliers.length} suppliers offer Trade Assurance`,
    `${highRatedSuppliers.length} suppliers have 4+ star ratings`,
    `${experiencedSuppliers.length} suppliers have 5+ years experience`,
    `Average MOQ: ${averageMOQ} units`,
    `Average rating: ${averageRating}/5 stars`
  ]

  // Add specific recommendations based on data
  if (goldSuppliers.length > 0) {
    keyInsights.push('Prioritize Gold Suppliers for better reliability')
  }
  if (tradeAssuranceSuppliers.length > 0) {
    keyInsights.push('Trade Assurance suppliers offer payment protection')
  }
  if (averageScore >= 70) {
    keyInsights.push('High quality supplier pool - good market to source from')
  } else if (averageScore < 50) {
    keyInsights.push('Exercise caution - consider additional vetting')
  }

  return {
    topSuppliers: topSuppliers.map(s => s.id),
    averageScore,
    keyInsights: keyInsights.slice(0, 10),
    statistics: {
      goldSuppliersCount: goldSuppliers.length,
      tradeAssuranceCount: tradeAssuranceSuppliers.length,
      highRatedCount: highRatedSuppliers.length,
      experiencedCount: experiencedSuppliers.length,
      averageMOQ,
      averageRating
    }
  }
}