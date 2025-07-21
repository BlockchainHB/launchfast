import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface BatchDeleteRequest {
  marketIds: string[]
  userId: string
}

// POST /api/markets/batch-delete - Delete multiple markets
export async function POST(request: NextRequest) {
  try {
    const body: BatchDeleteRequest = await request.json()
    const { marketIds, userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!marketIds || !Array.isArray(marketIds) || marketIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Market IDs array is required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Batch deleting ${marketIds.length} markets for user ${userId}`)

    // Fetch markets to delete (for logging and statistics)
    const { data: marketsToDelete, error: fetchError } = await supabaseAdmin
      .from('markets')
      .select('id, keyword, total_products_analyzed')
      .eq('user_id', userId)
      .in('id', marketIds)

    if (fetchError) {
      console.error('Error fetching markets to delete:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch markets' },
        { status: 500 }
      )
    }

    if (!marketsToDelete || marketsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No markets found or access denied' },
        { status: 404 }
      )
    }

    // Get count of products that will become legacy
    const { count: totalProductCount, error: countError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('market_id', marketIds)

    if (countError) {
      console.error('Error counting products:', countError)
      // Continue anyway, this is just for logging
    }

    console.log(`📊 ${marketsToDelete.length} markets will affect ${totalProductCount || 0} products (converting to legacy)`)

    // Delete all markets in batch
    // This will trigger CASCADE DELETE on market_overrides
    // and SET NULL on products.market_id (making them legacy products)
    const { error: deleteError } = await supabaseAdmin
      .from('markets')
      .delete()
      .eq('user_id', userId)
      .in('id', marketIds)

    if (deleteError) {
      console.error('Error deleting markets:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete markets' },
        { status: 500 }
      )
    }

    console.log(`✅ Batch deleted ${marketsToDelete.length} markets`)
    console.log(`🏷️ ${totalProductCount || 0} products converted to legacy status`)

    // Log each deleted market
    marketsToDelete.forEach(market => {
      console.log(`  - "${market.keyword}" (${market.total_products_analyzed || 0} products analyzed)`)
    })

    // Invalidate dashboard cache
    console.log(`🗑️ Invalidating dashboard cache for user ${userId}`)
    
    let cacheCleared = false
    const cacheKey = `dashboard_data_${userId}`

    try {
      // Try Redis first (production)
      const redis = await import('ioredis').then(Redis => new Redis.default(process.env.REDIS_URL))
      await redis.del(cacheKey)
      await redis.disconnect()
      cacheCleared = true
      console.log(`✅ Redis cache cleared: ${cacheKey}`)
    } catch (redisError) {
      // Fall back to memory cache clearing (development)
      const { memoryCache } = await import('@/lib/cache')
      if (memoryCache.has(cacheKey)) {
        memoryCache.delete(cacheKey)
        cacheCleared = true
        console.log(`✅ Memory cache cleared: ${cacheKey}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${marketsToDelete.length} markets`,
      data: {
        deletedMarkets: marketsToDelete.map(m => ({
          id: m.id,
          keyword: m.keyword,
          totalProductsAnalyzed: m.total_products_analyzed
        })),
        productsConvertedToLegacy: totalProductCount || 0,
        cacheCleared,
        statistics: {
          requested: marketIds.length,
          found: marketsToDelete.length,
          deleted: marketsToDelete.length,
          productsAffected: totalProductCount || 0
        }
      }
    })

  } catch (error) {
    console.error('Unexpected error in batch market deletion:', error)
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