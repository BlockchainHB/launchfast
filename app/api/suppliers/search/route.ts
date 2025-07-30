import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { alibabaScraper, supplierUtils } from '@/lib/alibaba-scraper'
import type { SupplierSearchOptions, SupplierSearchSession } from '@/types/supplier'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, searchQuery, options = {} } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    if (!searchQuery || typeof searchQuery !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Search query is required' 
      }, { status: 400 })
    }

    console.log(`🔍 Starting supplier search for user ${userId}: "${searchQuery}"`)

    // Check user's subscription and usage limits
    const usageCheck = await checkUsageLimits(userId)
    if (!usageCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: usageCheck.error,
        usage: usageCheck.usage
      }, { status: 429 })
    }

    // Prepare search options with defaults - map frontend params to API params
    const searchOptions: SupplierSearchOptions = {
      query: searchQuery.trim(),
      maxResults: Math.min(options.maxResults || 20, 50), // Limit to max 50
      goldSupplierOnly: options.goldSupplierOnly || false,
      tradeAssuranceOnly: options.tradeAssuranceOnly || false,
      minYearsInBusiness: options.minYearsInBusiness || 0,
      minOrderQuantity: options.minOrderQuantity || options.minMoq,
      maxOrderQuantity: options.maxOrderQuantity || options.maxMoq,
      location: options.location,
      responseTimeHours: options.responseTimeHours
    }

    // Create initial session record
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const searchStartTime = Date.now()

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

    try {
      // Perform the Alibaba search
      const searchResult = await alibabaScraper.searchSuppliers(searchOptions)

      if (!searchResult.success || !searchResult.data) {
        throw new Error(searchResult.error || 'Failed to search suppliers')
      }

      const { suppliers } = searchResult.data
      console.log(`✅ Found ${suppliers.length} suppliers`)

      // Calculate quality scores for all suppliers
      const suppliersWithScores = suppliers.map(supplier => ({
        ...supplier,
        qualityScore: supplierUtils.calculateQualityScore(supplier)
      }))

      // Sort by quality score (highest first) and take top 10
      const sortedSuppliers = suppliersWithScores.sort((a, b) => 
        b.qualityScore.overall - a.qualityScore.overall
      )
      
      // Take only top 10 for frontend display
      const topSuppliers = sortedSuppliers.slice(0, Math.min(options.maxResults || 10, 10))

      // Generate quality analysis of top suppliers (no AI needed)
      const qualityAnalysis = generateQualityAnalysis(topSuppliers, searchQuery)

      const searchDurationMs = Date.now() - searchStartTime

      // Update session with results
      const updatedSession: SupplierSearchSession = {
        ...sessionRecord,
        results: topSuppliers,
        qualityAnalysis,
        status: 'completed',
        updatedAt: new Date().toISOString(),
        metadata: {
          totalScraped: suppliers.length,
          totalFiltered: sortedSuppliers.length,
          totalReturned: topSuppliers.length,
          searchDurationMs
        }
      }

      // Save complete session to database with enhanced schema
      await supabase
        .from('supplier_search_sessions')
        .update({
          results: topSuppliers,
          quality_analysis: qualityAnalysis,
          status: 'completed',
          updated_at: updatedSession.updatedAt,
          total_suppliers_found: suppliers.length,
          search_duration_ms: searchDurationMs,
          apify_actor_used: 'piotrv1001~alibaba-listings-scraper',
          metadata: updatedSession.metadata
        })
        .eq('id', sessionId)

      // Update usage tracking
      await updateUsageTracking(userId)

      console.log(`🎯 Supplier search completed in ${searchDurationMs}ms`)
      console.log(`📊 Pipeline: ${suppliers.length} scraped → ${sortedSuppliers.length} filtered → ${topSuppliers.length} returned`)

      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          suppliers: topSuppliers,
          totalFound: suppliers.length,
          searchQuery,
          searchOptions,
          qualityAnalysis,
          searchDurationMs
        },
        usage: {
          searchesUsed: usageCheck.usage.searchesUsed + 1,
          searchesRemaining: usageCheck.usage.searchesRemaining - 1
        }
      })

    } catch (searchError) {
      console.error('❌ Supplier search failed:', searchError)

      // Update session status to failed
      await supabase
        .from('supplier_search_sessions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      return NextResponse.json({
        success: false,
        error: searchError instanceof Error ? searchError.message : 'Supplier search failed',
        sessionId
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Supplier search API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('sessionId')

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // If sessionId provided, return specific session
    if (sessionId) {
      const { data: session, error } = await supabase
        .from('supplier_search_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (error || !session) {
        return NextResponse.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: {
          id: session.id,
          searchQuery: session.search_query,
          searchOptions: session.search_options,
          suppliers: session.results || [],
          qualityAnalysis: session.quality_analysis,
          status: session.status,
          createdAt: session.created_at,
          metadata: session.metadata
        }
      })
    }

    // Otherwise, return user's recent sessions
    const { data: sessions, error } = await supabase
      .from('supplier_search_sessions')
      .select('id, search_query, status, created_at, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions || []
      }
    })

  } catch (error) {
    console.error('❌ Get supplier sessions error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sessions'
    }, { status: 500 })
  }
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
      keyInsights: ['No suppliers found for analysis']
    }
  }

  const topSuppliers = suppliers.slice(0, 5)
  const averageScore = Math.round(
    suppliers.reduce((sum, s) => sum + s.qualityScore.overall, 0) / suppliers.length
  )

  // Script-based analysis - no AI needed
  const goldSuppliers = suppliers.filter(s => s.trust?.goldSupplier || s.goldSupplier)
  const tradeAssuranceSuppliers = suppliers.filter(s => s.trust?.tradeAssurance || s.metrics?.tradeAssurance || s.tradeAssurance)
  const highRatedSuppliers = suppliers.filter(s => s.trust?.rating >= 4.0 || s.reviewScore >= 4.0)
  const experiencedSuppliers = suppliers.filter(s => s.yearsInBusiness >= 5)
  
  // Generate insights based on data analysis
  const keyInsights = [
    `Found ${suppliers.length} suppliers for "${searchQuery}"`,
    `Average quality score: ${averageScore}/100`,
    `${goldSuppliers.length} Gold Suppliers identified`,
    `${tradeAssuranceSuppliers.length} suppliers offer Trade Assurance`,
    `${highRatedSuppliers.length} suppliers have 4+ star ratings`,
    `${experiencedSuppliers.length} suppliers have 5+ years experience`
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
    goldSuppliers: goldSuppliers.length,
    tradeAssurance: tradeAssuranceSuppliers.length,
    keyInsights: keyInsights.slice(0, 8) // Limit to 8 insights
  }
}