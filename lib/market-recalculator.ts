import { supabaseAdmin } from '@/lib/supabase'
import type { EnhancedProduct } from '@/types'
import { mergeProductsWithOverrides, type ProductOverride } from '@/lib/product-overrides'
import { calculateMarketMetrics, convertToOverrideData, type MarketOverrideData } from '@/lib/shared-market-calculator'

// Transform database product to EnhancedProduct format (copied from dashboard API)
function transformProductForTable(product: any): EnhancedProduct {
  return {
    id: product.id,
    asin: product.asin,
    title: product.title,
    brand: product.brand || 'Unknown',
    price: product.price,
    bsr: product.bsr,
    reviews: product.reviews,
    rating: product.rating,
    grade: product.grade,
    images: product.images || [],
    dimensions: product.dimensions || {},
    reviewsData: product.reviews_data || {},
    
    // Sales data structure
    salesData: {
      monthlyRevenue: product.monthly_revenue,
      monthlySales: product.monthly_sales,
      monthlyProfit: product.profit_estimate,
      margin: product.sales_data?.margin || 0,
      ppu: product.sales_data?.ppu || 0,
      fbaCost: product.sales_data?.fbaCost || 0,
      cogs: product.sales_data?.cogs || 0,
      ...(product.sales_data || {})
    },
    
    // AI analysis from actual database data
    aiAnalysis: product.ai_analysis ? {
      riskClassification: product.ai_analysis.risk_classification || 'Safe',
      consistencyRating: product.ai_analysis.consistency_rating || 'Consistent',
      estimatedDimensions: product.ai_analysis.estimated_dimensions || '',
      estimatedWeight: product.ai_analysis.estimated_weight || '',
      opportunityScore: product.ai_analysis.opportunity_score || 0,
      marketInsights: product.ai_analysis.market_insights || [],
      riskFactors: product.ai_analysis.risk_factors || []
    } : {
      riskClassification: 'Safe',
      consistencyRating: 'Consistent',
      estimatedDimensions: '',
      estimatedWeight: '',
      opportunityScore: 0,
      marketInsights: [],
      riskFactors: []
    },
    
    // Keywords
    keywords: product.product_keywords?.map((pk: any) => ({
      keyword: pk.keywords?.keyword || '',
      searchVolume: pk.keywords?.search_volume || 0,
      rankingPosition: pk.ranking_position || 0,
      trafficPercentage: pk.traffic_percentage || 0,
      cpc: pk.keywords?.avg_cpc || 0,
      competitionScore: pk.keywords?.competition_score || 0
    })) || [],
    
    calculatedMetrics: product.calculated_metrics || {},
    competitiveIntelligence: product.competitive_intelligence || '',
    apifySource: product.apify_source || false,
    sellerSpriteVerified: product.seller_sprite_verified || false, // CRITICAL: Boolean field
    
    // Legacy fields for backward compatibility
    monthlyRevenue: product.monthly_revenue || 0,
    monthlySales: product.monthly_sales || 0,
    profitEstimate: product.profit_estimate || 0,
    
    createdAt: product.created_at,
    updatedAt: product.updated_at
  } as EnhancedProduct
}

export interface MarketRecalculationResult {
  marketId: string
  keyword: string
  overriddenProductCount: number
  recalculatedData: MarketOverrideData
}

// MarketOverrideData interface now imported from shared-market-calculator

export class MarketRecalculator {
  /**
   * Recalculate a single market using override-adjusted product data
   */
  async recalculateMarket(marketId: string, userId: string, overrideReason?: string): Promise<MarketRecalculationResult | null> {
    try {
      console.log(`🔄 Recalculating market ${marketId} for user ${userId}`)
      
      // Get market and its products with complete data
      const { data: market, error: marketError } = await supabaseAdmin
        .from('markets')
        .select(`
          id,
          keyword,
          products(
            *,
            ai_analysis(
              risk_classification,
              consistency_rating,
              estimated_dimensions,
              estimated_weight,
              opportunity_score,
              market_insights,
              risk_factors
            ),
            product_keywords(
              ranking_position,
              traffic_percentage,
              keywords(
                keyword,
                search_volume,
                competition_score,
                avg_cpc
              )
            )
          )
        `)
        .eq('id', marketId)
        .eq('user_id', userId)
        .single()

      if (marketError || !market) {
        console.error('Market fetch error:', marketError)
        return null
      }

      // Transform database products to proper format with boolean fields
      const transformedProducts = (market.products || []).map(transformProductForTable)
      
      // Get product overrides for this user
      const productOverrides = await this.fetchProductOverridesForMarket(marketId, userId)
      
      // Apply overrides to get "effective" product data
      const effectiveProducts = mergeProductsWithOverrides(transformedProducts, productOverrides)
      const overriddenProductCount = effectiveProducts.filter(p => p.hasOverrides).length

      console.log(`📊 Market ${market.keyword}: ${effectiveProducts.length} products, ${overriddenProductCount} with overrides`)

      // Calculate aggregated metrics from effective product data using shared calculator
      const calculationResult = calculateMarketMetrics(effectiveProducts)
      const recalculatedData = convertToOverrideData(calculationResult.marketStats)

      // Save to market_overrides table
      await this.saveMarketOverride(marketId, userId, market.keyword, recalculatedData, overrideReason)

      return {
        marketId,
        keyword: market.keyword,
        overriddenProductCount,
        recalculatedData
      }

    } catch (error) {
      console.error(`❌ Error recalculating market ${marketId}:`, error)
      return null
    }
  }

  /**
   * Recalculate all markets affected by product overrides
   */
  async recalculateAffectedMarkets(productIds: string[], userId: string, overrideReason?: string): Promise<MarketRecalculationResult[]> {
    try {
      // Find all markets containing these products by checking products that belong to markets
      const { data: productsWithMarkets, error } = await supabaseAdmin
        .from('products')
        .select(`
          id,
          market_id,
          markets(id, keyword)
        `)
        .in('id', productIds)
        .eq('user_id', userId)
        .not('market_id', 'is', null)

      if (error) {
        console.error('Error finding products with markets:', error)
        return []
      }

      // Extract unique market IDs
      const marketIds = new Set<string>()
      const marketKeywords = new Map<string, string>()

      productsWithMarkets?.forEach(product => {
        if (product.market_id && product.markets) {
          marketIds.add(product.market_id)
          marketKeywords.set(product.market_id, product.markets.keyword)
        }
      })

      console.log(`🎯 Recalculating ${marketIds.size} affected markets:`, Array.from(marketKeywords.values()))

      // Recalculate each affected market
      const results: MarketRecalculationResult[] = []
      for (const marketId of marketIds) {
        const result = await this.recalculateMarket(marketId, userId, overrideReason)
        if (result) {
          results.push(result)
        }
      }

      return results

    } catch (error) {
      console.error('❌ Error recalculating affected markets:', error)
      return []
    }
  }

  // All market calculations now use shared-market-calculator.ts for consistency

  /**
   * Fetch product overrides that affect this market
   */
  private async fetchProductOverridesForMarket(marketId: string, userId: string): Promise<ProductOverride[]> {
    try {
      // Get product IDs for this market
      const { data: market, error } = await supabaseAdmin
        .from('markets')
        .select('products(id)')
        .eq('id', marketId)
        .eq('user_id', userId)
        .single()

      if (error || !market?.products) {
        return []
      }

      const productIds = market.products.map((p: any) => p.id)

      // Fetch overrides for these products
      const { data: overrides, error: overridesError } = await supabaseAdmin
        .from('product_overrides')
        .select('*')
        .eq('user_id', userId)
        .in('product_id', productIds)

      return overrides || []

    } catch (error) {
      console.error('Error fetching product overrides for market:', error)
      return []
    }
  }

  /**
   * Save recalculated data to market_overrides table
   */
  private async saveMarketOverride(
    marketId: string, 
    userId: string, 
    keyword: string, 
    data: MarketOverrideData, 
    overrideReason?: string
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('market_overrides')
        .upsert({
          user_id: userId,
          market_id: marketId,
          keyword,
          override_reason: overrideReason || 'Recalculated from product overrides',
          recalculation_date: new Date().toISOString(),
          ...data
        }, {
          onConflict: 'user_id,market_id'
        })

      if (error) {
        throw error
      }

      console.log(`✅ Saved market override for ${keyword}`)

    } catch (error) {
      console.error('Error saving market override:', error)
      throw error
    }
  }
}