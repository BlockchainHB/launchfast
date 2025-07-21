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
  asins: string[]
  userId: string
}

// POST /api/products/batch-delete - Delete multiple products
export async function POST(request: NextRequest) {
  try {
    const body: BatchDeleteRequest = await request.json()
    const { asins, userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ASINs array is required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Batch deleting ${asins.length} products for user ${userId}`)

    // Fetch products to delete (for logging and market recalculation)
    const { data: productsToDelete, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, asin, title, market_id')
      .eq('user_id', userId)
      .in('asin', asins)

    if (fetchError) {
      console.error('Error fetching products to delete:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    if (!productsToDelete || productsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found or access denied' },
        { status: 404 }
      )
    }

    // Collect affected markets for recalculation
    const affectedMarkets = new Set(
      productsToDelete
        .map(p => p.market_id)
        .filter(marketId => marketId !== null)
    )

    console.log(`📊 Will affect ${affectedMarkets.size} markets: ${Array.from(affectedMarkets).join(', ')}`)

    // Delete products (CASCADE will handle overrides, AI analysis, keywords)
    const { error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('user_id', userId)
      .in('asin', asins)

    if (deleteError) {
      console.error('Error deleting products:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete products' },
        { status: 500 }
      )
    }

    console.log(`✅ Batch deleted ${productsToDelete.length} products`)

    // Trigger market recalculation for affected markets
    const marketRecalcResults: { [key: string]: boolean } = {}

    if (affectedMarkets.size > 0) {
      console.log(`🔄 Triggering recalculation for ${affectedMarkets.size} affected markets`)
      
      try {
        const { MarketRecalculator } = await import('@/lib/market-recalculator')
        const recalculator = new MarketRecalculator(supabaseAdmin)
        
        // Recalculate each affected market
        for (const marketId of Array.from(affectedMarkets)) {
          try {
            await recalculator.recalculateMarket(
              marketId as string, 
              userId, 
              `Batch deletion of ${productsToDelete.filter(p => p.market_id === marketId).length} products`
            )
            marketRecalcResults[marketId as string] = true
            console.log(`✅ Market ${marketId} recalculated`)
          } catch (marketError) {
            console.error(`❌ Error recalculating market ${marketId}:`, marketError)
            marketRecalcResults[marketId as string] = false
          }
        }
      } catch (importError) {
        console.error('Error importing MarketRecalculator:', importError)
      }
    }

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
      message: `Successfully deleted ${productsToDelete.length} products`,
      data: {
        deletedProducts: productsToDelete.map(p => ({
          id: p.id,
          asin: p.asin,
          title: p.title
        })),
        affectedMarkets: Array.from(affectedMarkets),
        marketRecalcResults,
        cacheCleared,
        statistics: {
          requested: asins.length,
          found: productsToDelete.length,
          deleted: productsToDelete.length,
          marketsAffected: affectedMarkets.size,
          marketsRecalculated: Object.values(marketRecalcResults).filter(Boolean).length
        }
      }
    })

  } catch (error) {
    console.error('Unexpected error in batch product deletion:', error)
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