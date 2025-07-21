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

// DELETE /api/markets/[id] - Delete a single market
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!marketId) {
      return NextResponse.json(
        { success: false, error: 'Market ID is required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Deleting market ${marketId} for user ${userId}`)

    // Fetch market details before deletion
    const { data: marketToDelete, error: fetchError } = await supabaseAdmin
      .from('markets')
      .select('id, keyword, total_products_analyzed')
      .eq('id', marketId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !marketToDelete) {
      console.error('Market not found:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Market not found or access denied' },
        { status: 404 }
      )
    }

    // Get count of products that will become legacy
    const { count: productCount, error: countError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('market_id', marketId)
      .eq('user_id', userId)

    if (countError) {
      console.error('Error counting products:', countError)
      // Continue anyway, this is just for logging
    }

    console.log(`📊 Market "${marketToDelete.keyword}" has ${productCount || 0} products that will become legacy`)

    // Delete the market
    // This will trigger CASCADE DELETE on market_overrides
    // and SET NULL on products.market_id (making them legacy products)
    const { error: deleteError } = await supabaseAdmin
      .from('markets')
      .delete()
      .eq('id', marketId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting market:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete market' },
        { status: 500 }
      )
    }

    console.log(`✅ Market deleted: "${marketToDelete.keyword}"`)
    console.log(`🏷️ ${productCount || 0} products converted to legacy status`)

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
      message: 'Market deleted successfully',
      data: {
        deletedMarket: {
          id: marketToDelete.id,
          keyword: marketToDelete.keyword,
          totalProductsAnalyzed: marketToDelete.total_products_analyzed
        },
        productsConvertedToLegacy: productCount || 0,
        cacheCleared
      }
    })

  } catch (error) {
    console.error('Unexpected error deleting market:', error)
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