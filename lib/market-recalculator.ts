import { supabaseAdmin } from '@/lib/supabase'
import type { EnhancedProduct } from '@/types'
import { mergeProductsWithOverrides, type ProductOverride } from '@/lib/product-overrides'
import { calculateGrade, type ScoringInputs } from '@/lib/scoring'

export interface MarketRecalculationResult {
  marketId: string
  keyword: string
  overriddenProductCount: number
  recalculatedData: MarketOverrideData
}

export interface MarketOverrideData {
  // Aggregated financial metrics
  avg_price: number
  avg_monthly_sales: number
  avg_monthly_revenue: number
  avg_daily_revenue: number
  avg_profit_margin: number
  avg_profit_per_unit: number
  
  // Performance metrics
  avg_reviews: number
  avg_rating: number
  avg_bsr: number
  avg_cpc: number
  avg_launch_budget: number
  
  // Market scoring/classification
  market_grade: string
  market_consistency_rating: string
  market_risk_classification: string
  opportunity_score: number
  
  // Metadata
  total_products_analyzed: number
  products_verified: number
}

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
   * Calculate market metrics from effective (override-adjusted) product data
   */
  private calculateMarketMetrics(products: EnhancedProduct[]): MarketOverrideData {
    if (products.length === 0) {
      throw new Error('Cannot calculate metrics for empty product set')
    }

    // Helper function to safely get nested values
    const getMonthlyRevenue = (p: EnhancedProduct) => 
      p.salesData?.monthlyRevenue ?? p.monthlyRevenue ?? 0
    const getMonthlySales = (p: EnhancedProduct) => 
      p.salesData?.monthlySales ?? p.monthlySales ?? 0
    const getDailyRevenue = (p: EnhancedProduct) =>
      p.calculatedMetrics?.dailyRevenue ?? (getMonthlyRevenue(p) / 30)
    const getCogs = (p: EnhancedProduct) =>
      p.salesData?.cogs ?? 0
    const getMargin = (p: EnhancedProduct) =>
      p.salesData?.margin ?? 0
    const getProfitPerUnit = (p: EnhancedProduct) =>
      p.calculatedMetrics?.profitPerUnitAfterLaunch ?? 0
    const getLaunchBudget = (p: EnhancedProduct) =>
      p.calculatedMetrics?.launchBudget ?? 0

    const validProducts = products.filter(p => p.price && getMonthlyRevenue(p) > 0)

    // Financial metrics (averages)
    const avg_price = this.calculateAverage(validProducts.map(p => p.price))
    const avg_monthly_sales = Math.round(this.calculateAverage(validProducts.map(p => getMonthlySales(p))))
    const avg_monthly_revenue = this.calculateAverage(validProducts.map(p => getMonthlyRevenue(p)))
    const avg_daily_revenue = this.calculateAverage(validProducts.map(p => getDailyRevenue(p)))
    
    // Calculate profit margin from salesData or fallback to profitEstimate
    const profitMargins = validProducts
      .map(p => {
        const margin = getMargin(p)
        if (margin > 0) return margin
        // Fallback to estimate from profitEstimate
        const revenue = getMonthlyRevenue(p)
        return p.profitEstimate && revenue ? p.profitEstimate / revenue : 0
      })
      .filter(margin => margin > 0)
    const avg_profit_margin = profitMargins.length > 0 ? this.calculateAverage(profitMargins) : 0
    
    const avg_profit_per_unit = this.calculateAverage(
      validProducts.map(p => {
        const ppu = getProfitPerUnit(p)
        if (ppu > 0) return ppu
        // Fallback calculation
        const sales = getMonthlySales(p)
        return p.profitEstimate && sales ? p.profitEstimate / sales : 0
      })
    )

    // Performance metrics
    const avg_reviews = Math.round(this.calculateAverage(validProducts.map(p => p.reviews || 0)))
    const avg_rating = this.calculateAverage(validProducts.map(p => p.rating || 0))
    const avg_bsr = Math.round(this.calculateAverage(validProducts.map(p => p.bsr || 0)))
    
    // CPC and launch budget
    const avg_cpc = this.estimateAverageCPC(validProducts)
    const avg_launch_budget = this.calculateAverage(
      validProducts.map(p => {
        const budget = getLaunchBudget(p)
        return budget > 0 ? budget : this.estimateLaunchBudget(getMonthlyRevenue(p), avg_cpc)
      })
    )

    // Market scoring using your custom algorithm
    const marketScoring = this.calculateMarketScoring(validProducts, {
      avg_monthly_revenue,
      avg_profit_margin,
      avg_reviews,
      avg_rating,
      avg_bsr
    })

    return {
      avg_price: Math.round(avg_price * 100) / 100,
      avg_monthly_sales,
      avg_monthly_revenue: Math.round(avg_monthly_revenue * 100) / 100,
      avg_daily_revenue: Math.round(avg_daily_revenue * 100) / 100,
      avg_profit_margin: Math.round(avg_profit_margin * 10000) / 10000, // 4 decimal places
      avg_profit_per_unit: Math.round(avg_profit_per_unit * 100) / 100,
      avg_reviews,
      avg_rating: Math.round(avg_rating * 100) / 100,
      avg_bsr,
      avg_cpc: Math.round(avg_cpc * 100) / 100,
      avg_launch_budget: Math.round(avg_launch_budget * 100) / 100,
      market_grade: marketScoring.grade,
      market_consistency_rating: marketScoring.consistencyRating,
      market_risk_classification: marketScoring.riskClassification,
      opportunity_score: marketScoring.opportunityScore,
      total_products_analyzed: products.length,
      products_verified: products.length // All products are considered verified for override calculation
    }
  }

  /**
   * Market scoring algorithm using your actual grading system
   */
  private calculateMarketScoring(products: EnhancedProduct[], aggregates: any) {
    const { avg_monthly_revenue, avg_profit_margin, avg_reviews, avg_rating, avg_price } = aggregates
    
    // Use your real grading algorithm for market-level scoring
    // Calculate market-level profit estimate
    const monthlyProfit = avg_monthly_revenue * avg_profit_margin
    
    // Get average CPC from products
    const avgCpc = this.estimateAverageCPC(products)
    
    // Create scoring inputs for market-level grading
    const marketScoringInputs: ScoringInputs = {
      monthlyProfit: monthlyProfit,
      price: avg_price,
      margin: avg_profit_margin,
      reviews: avg_reviews,
      avgCPC: avgCpc,
      riskClassification: this.calculateMarketRiskClassification(products),
      consistencyRating: this.calculateMarketConsistencyRating(products),
      ppu: monthlyProfit / (avg_monthly_revenue || 1), // PPU approximation
      bsr: aggregates.avg_bsr,
      rating: avg_rating,
      opportunityScore: 7 // Default market opportunity score
    }
    
    // Use your actual grading algorithm
    const gradingResult = calculateGrade(marketScoringInputs)
    
    return {
      grade: gradingResult.grade,
      consistencyRating: marketScoringInputs.consistencyRating,
      riskClassification: marketScoringInputs.riskClassification,
      opportunityScore: gradingResult.score / 1000 // Convert to 0-100 scale
    }
  }
  
  /**
   * Calculate market-level risk classification from products
   */
  private calculateMarketRiskClassification(products: EnhancedProduct[]): string {
    const riskCounts = { 'No Risk': 0, 'Electric': 0, 'Breakable': 0, 'Banned': 0 }
    
    products.forEach(product => {
      const risk = product.aiAnalysis?.riskClassification || 'No Risk'
      if (risk in riskCounts) {
        riskCounts[risk as keyof typeof riskCounts]++
      }
    })
    
    // Return the most common risk classification
    return Object.entries(riskCounts)
      .reduce((a, b) => riskCounts[a[0] as keyof typeof riskCounts] > riskCounts[b[0] as keyof typeof riskCounts] ? a : b)[0]
  }
  
  /**
   * Calculate market-level consistency rating from products
   */
  private calculateMarketConsistencyRating(products: EnhancedProduct[]): string {
    const consistencyCounts = { 'Consistent': 0, 'Seasonal': 0, 'Trendy': 0 }
    
    products.forEach(product => {
      const consistency = product.aiAnalysis?.consistencyRating || 'Consistent'
      if (consistency in consistencyCounts) {
        consistencyCounts[consistency as keyof typeof consistencyCounts]++
      }
    })
    
    // Return the most common consistency rating
    return Object.entries(consistencyCounts)
      .reduce((a, b) => consistencyCounts[a[0] as keyof typeof consistencyCounts] > consistencyCounts[b[0] as keyof typeof consistencyCounts] ? a : b)[0]
  }

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