import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
}

// POST /api/products/batch-delete - Delete multiple products
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Note: We can't set cookies in API routes, but this prevents the warning
          },
          remove(name: string, options: any) {
            // Note: We can't remove cookies in API routes, but this prevents the warning
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id
    
    const body: BatchDeleteRequest = await request.json()
    const { asins } = body

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

    // Check for empty markets and delete them
    const emptyMarkets = []
    for (const marketId of Array.from(affectedMarkets)) {
      const { data: remainingProducts, error: countError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('market_id', marketId)
        .eq('user_id', userId)
      
      if (!countError && remainingProducts && remainingProducts.length === 0) {
        // Delete the empty market
        const { error: deleteMarketError } = await supabaseAdmin
          .from('markets')
          .delete()
          .eq('id', marketId)
          .eq('user_id', userId)
        
        if (!deleteMarketError) {
          emptyMarkets.push(marketId)
          console.log(`🗑️ Deleted empty market: ${marketId}`)
        }
      }
    }
    
    // Remove deleted markets from affected markets list for recalculation
    const marketsToRecalculate = Array.from(affectedMarkets).filter(marketId => 
      !emptyMarkets.includes(marketId)
    )

    // Trigger market recalculation for remaining affected markets
    const marketRecalcResults: { [key: string]: boolean } = {}

    if (marketsToRecalculate.length > 0) {
      console.log(`🔄 Triggering recalculation for ${marketsToRecalculate.length} remaining markets`)
      
      try {
        const { MarketRecalculator } = await import('@/lib/market-recalculator')
        const recalculator = new MarketRecalculator(supabaseAdmin)
        
        // Recalculate each remaining market
        for (const marketId of marketsToRecalculate) {
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
    // No cache invalidation needed - dashboard shows real-time data
    console.log(`✅ Dashboard will reflect batch deletions in real-time`)
    const cacheCleared = true // Always true since no cache exists

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
        emptyMarketsDeleted: emptyMarkets,
        marketRecalcResults,
        cacheCleared,
        statistics: {
          requested: asins.length,
          found: productsToDelete.length,
          deleted: productsToDelete.length,
          marketsAffected: affectedMarkets.size,
          emptyMarketsDeleted: emptyMarkets.length,
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