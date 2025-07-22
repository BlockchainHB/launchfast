import { supabaseAdmin } from '@/lib/supabase'
import type { EnhancedProduct } from '@/types'
import { mergeProductsWithOverrides, type ProductOverride } from '@/lib/product-overrides'
import { calculateMarketMetrics, convertToOverrideData, type MarketOverrideData } from '@/lib/shared-market-calculator'

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
      
      // Get market and its products
      const { data: market, error: marketError } = await supabaseAdmin
        .from('markets')
        .select(`
          id,
          keyword,
          products(*)
        `)
        .eq('id', marketId)
        .eq('user_id', userId)
        .single()

      if (marketError || !market) {
        console.error('Market fetch error:', marketError)
        return null
      }

      // Get product overrides for this user
      const productOverrides = await this.fetchProductOverridesForMarket(marketId, userId)
      
      // Apply overrides to get "effective" product data
      const effectiveProducts = mergeProductsWithOverrides(market.products, productOverrides)
      const overriddenProductCount = effectiveProducts.filter(p => p.hasOverrides).length

      console.log(`📊 Market ${market.keyword}: ${effectiveProducts.length} products, ${overriddenProductCount} with overrides`)

      // Calculate aggregated metrics from effective product data
      const recalculatedData = this.calculateMarketMetrics(effectiveProducts)

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

  /**
   * Calculate market metrics using EXACT SAME algorithm as original research
   * This ensures algorithm consistency between initial research and recalculation
   */
  private calculateMarketMetrics(products: EnhancedProduct[]): MarketOverrideData {
    console.log(`🔄 Recalculating market metrics using shared algorithm for ${products.length} products`)
    
    // Use the shared market calculator to ensure algorithm consistency
    const calculationResult = calculateMarketMetrics(products)
    
    console.log(`📊 Shared calculator result: ${calculationResult.validProductCount}/${calculationResult.totalProductCount} valid products, grade: ${calculationResult.marketStats.market_grade}`)
    
    // Convert to override data format
    return convertToOverrideData(calculationResult.marketStats)
  }

  // Market scoring methods removed - now using shared market calculator for consistency

  /**
   * Helper methods
   */
  private calculateAverage(values: number[]): number {
    const validValues = values.filter(v => v && !isNaN(v))
    return validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0
  }

  private estimateAverageCPC(products: EnhancedProduct[]): number {
    // Try to get CPC from overrides first, then from keywords, then estimate
    const cpcValues: number[] = []
    
    products.forEach(product => {
      // Check if product has an average CPC override
      if (product.hasOverrides && product.overrideInfo?.avg_cpc) {
        cpcValues.push(product.overrideInfo.avg_cpc)
        return
      }
      
      // Check if product has keywords with CPC data
      if (product.keywords && product.keywords.length > 0) {
        const validCpcs = product.keywords
          .map(kw => kw.cpc)
          .filter(cpc => cpc && cpc > 0)
        
        if (validCpcs.length > 0) {
          const avgCpc = validCpcs.reduce((sum, cpc) => sum + cpc, 0) / validCpcs.length
          cpcValues.push(avgCpc)
          return
        }
      }
      
      // Fallback: estimate based on category or price
      // This is a simple estimation - you might have better logic
      const price = product.price || 20
      const estimatedCpc = Math.min(Math.max(price * 0.05, 0.5), 5.0) // 5% of price, between $0.50 and $5.00
      cpcValues.push(estimatedCpc)
    })
    
    return cpcValues.length > 0 ? this.calculateAverage(cpcValues) : 1.50
  }

  private estimateLaunchBudget(monthlyRevenue: number, cpc: number): number {
    // Placeholder - implement your launch budget calculation
    // Typically based on competition level, CPC, and target market share
    return monthlyRevenue * 0.1 // 10% of monthly revenue as launch budget estimate
  }

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