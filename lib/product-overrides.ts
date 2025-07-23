import type { EnhancedProduct } from '@/types'
import { calculateGrade, type ScoringInputs } from '@/lib/scoring'

/**
 * Calculate profit dynamically from revenue and margin
 * This ensures profit estimates update when input fields are overridden
 */
function calculateDynamicProfit(
  monthlyRevenue?: number | null,
  margin?: number | null,
  fallbackProfit?: number | null
): number {
  // If we have both revenue and margin, calculate dynamically
  if (monthlyRevenue && monthlyRevenue > 0 && margin && margin > 0) {
    return Math.round(monthlyRevenue * Math.max(margin, 0))
  }
  
  // Otherwise use stored profit estimate or 0
  return fallbackProfit || 0
}

/**
 * Recalculate product grade from merged override data
 * This ensures grades reflect the overridden field values
 */
function calculateDynamicGrade(
  mergedProduct: EnhancedProduct,
  override: ProductOverride,
  originalGrade?: string | null
): string {
  // If manual grade override is provided, use that
  if (override.grade) {
    return override.grade
  }
  
  // Always recalculate grade from merged values (same as market calculation)
  const scoringInputs: ScoringInputs = {
    monthlyProfit: mergedProduct.salesData?.monthlyProfit || mergedProduct.profitEstimate || 0,
    price: mergedProduct.price || 0,
    margin: mergedProduct.salesData?.margin || 0,
    reviews: mergedProduct.reviews || 0,
    avgCPC: mergedProduct.keywords?.length > 0 
      ? mergedProduct.keywords.reduce((sum, kw) => sum + (kw.cpc || 0), 0) / mergedProduct.keywords.length
      : 0,
    riskClassification: mergedProduct.aiAnalysis?.riskClassification || 'Safe',
    consistencyRating: mergedProduct.aiAnalysis?.consistencyRating || 'Consistent',
    ppu: mergedProduct.salesData?.ppu || 0,
    bsr: mergedProduct.bsr,
    rating: mergedProduct.rating,
    opportunityScore: mergedProduct.aiAnalysis?.opportunityScore || 0
  }
  
  return calculateGrade(scoringInputs).grade
}

export interface ProductOverride {
  id: string
  user_id: string
  product_id: string
  asin: string
  title?: string
  brand?: string
  price?: number
  bsr?: number
  reviews?: number
  rating?: number
  
  // Sales Data fields
  monthly_sales?: number
  monthly_revenue?: number
  cogs?: number
  margin?: number
  
  // Calculated Metrics fields
  daily_revenue?: number
  fulfillment_fees?: number
  launch_budget?: number
  profit_per_unit_after_launch?: number
  variations?: number
  
  // CPC and Weight
  avg_cpc?: number
  weight?: number
  
  // Legacy fields
  profit_estimate?: number
  grade?: string
  
  // AI Analysis fields
  risk_classification?: string
  consistency_rating?: string
  opportunity_score?: number
  
  override_reason: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface MarketOverride {
  id: string
  user_id: string
  market_id: string
  keyword: string
  
  // Recalculated aggregated fields
  avg_price?: number
  avg_monthly_sales?: number
  avg_monthly_revenue?: number
  avg_daily_revenue?: number
  avg_profit_margin?: number
  avg_profit_per_unit?: number
  avg_reviews?: number
  avg_rating?: number
  avg_bsr?: number
  avg_cpc?: number
  avg_launch_budget?: number
  
  // Recalculated scoring fields
  market_grade?: string
  market_consistency_rating?: string
  market_risk_classification?: string
  opportunity_score?: number
  
  // Metadata
  override_reason: string
  recalculation_date: string
  created_at: string
  updated_at: string
}

/**
 * Merge original product data with user overrides
 * @param product Original product data
 * @param override User override data (optional)
 * @returns Enhanced product with override values applied
 */
export function mergeProductWithOverrides(
  product: EnhancedProduct,
  override?: ProductOverride
): EnhancedProduct & { hasOverrides?: boolean; overrideInfo?: ProductOverride } {
  if (!override) {
    return product
  }

  // Create merged product with override values taking precedence
  const mergedProduct: EnhancedProduct & { hasOverrides?: boolean; overrideInfo?: ProductOverride } = {
    ...product,
    
    // Override direct product fields
    title: override.title ?? product.title,
    brand: override.brand ?? product.brand,
    price: override.price ?? product.price,
    bsr: override.bsr ?? product.bsr,
    reviews: override.reviews ?? product.reviews,
    rating: override.rating ?? product.rating,
    grade: override.grade ?? product.grade,
    
    // Override AI analysis fields if they exist, but preserve existing values for null overrides
    ...(product.aiAnalysis && {
      aiAnalysis: {
        ...product.aiAnalysis,
        riskClassification: override.risk_classification !== undefined && override.risk_classification !== null ? override.risk_classification : product.aiAnalysis.riskClassification,
        consistencyRating: override.consistency_rating !== undefined && override.consistency_rating !== null ? override.consistency_rating : product.aiAnalysis.consistencyRating,
        opportunityScore: override.opportunity_score ?? product.aiAnalysis.opportunityScore,
      }
    }),
    
    // Override sales data fields
    salesData: {
      ...product.salesData,
      monthlySales: override.monthly_sales ?? product.salesData?.monthlySales,
      monthlyRevenue: override.monthly_revenue ?? product.salesData?.monthlyRevenue,
      monthlyProfit: calculateDynamicProfit(
        override.monthly_revenue ?? product.salesData?.monthlyRevenue,
        override.margin ?? product.salesData?.margin,
        product.salesData?.monthlyProfit
      ),
      cogs: override.cogs ?? product.salesData?.cogs,
      margin: override.margin ?? product.salesData?.margin,
    },
    
    // Override calculated metrics fields
    calculatedMetrics: {
      ...product.calculatedMetrics,
      dailyRevenue: override.daily_revenue ?? product.calculatedMetrics?.dailyRevenue,
      fulfillmentFees: override.fulfillment_fees ?? product.calculatedMetrics?.fulfillmentFees,
      launchBudget: override.launch_budget ?? product.calculatedMetrics?.launchBudget,
      profitPerUnitAfterLaunch: override.profit_per_unit_after_launch ?? product.calculatedMetrics?.profitPerUnitAfterLaunch,
      variations: override.variations ?? product.calculatedMetrics?.variations,
    },
    
    // Handle CPC override while preserving original keywords
    ...(override.avg_cpc !== undefined && override.avg_cpc !== null && {
      // If CPC is overridden, we create a synthetic representation
      avgCpc: override.avg_cpc,
      keywords: product.keywords || [] // Preserve original keywords
    }),
    
    // If no CPC override, preserve original keyword-based CPC calculation
    ...((override.avg_cpc === undefined || override.avg_cpc === null) && {
      keywords: product.keywords || []
    }),
    
    // Override dimensions (weight)
    ...(product.dimensions && {
      dimensions: {
        ...product.dimensions,
        weight: override.weight ?? product.dimensions.weight,
      }
    }),
    
    // Legacy fields for backward compatibility
    monthlySales: override.monthly_sales ?? product.monthlySales,
    monthlyRevenue: override.monthly_revenue ?? product.monthlyRevenue,
    profitEstimate: calculateDynamicProfit(
      override.monthly_revenue ?? product.monthlyRevenue,
      override.margin ?? product.salesData?.margin,
      override.profit_estimate ?? product.profitEstimate
    ),
    
    // Ensure keywords are always preserved
    keywords: product.keywords || [],
    
    // CRITICAL: Preserve fields required for market calculations
    sellerSpriteVerified: product.sellerSpriteVerified,
    apifySource: product.apifySource,
    
    // Add override metadata
    hasOverrides: true,
    overrideInfo: override
  }

  // Calculate dynamic grade based on merged values (do this after all fields are merged)
  mergedProduct.grade = calculateDynamicGrade(mergedProduct, override, product.grade)

  return mergedProduct
}

/**
 * Merge multiple products with their respective overrides
 * @param products Array of original products
 * @param overrides Array of overrides (can be empty)
 * @returns Array of products with overrides applied
 */
export function mergeProductsWithOverrides(
  products: EnhancedProduct[],
  overrides: ProductOverride[] = []
): (EnhancedProduct & { hasOverrides?: boolean; overrideInfo?: ProductOverride })[] {
  // Create a map for quick override lookup
  const overrideMap = new Map<string, ProductOverride>()
  overrides.forEach(override => {
    overrideMap.set(override.product_id, override)
  })

  // Merge each product with its override
  return products.map(product => {
    const override = overrideMap.get(product.id)
    return mergeProductWithOverrides(product, override)
  })
}

/**
 * Fetch user's product overrides from the API
 * @param userId User ID to fetch overrides for
 * @returns Promise resolving to array of overrides
 */
export async function fetchUserOverrides(userId: string): Promise<ProductOverride[]> {
  try {
    const response = await fetch('/api/product-overrides/batch', {
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch overrides')
    }
    
    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Error fetching overrides:', error)
    return []
  }
}

/**
 * Check if a product has any overrides applied
 * @param product Product to check
 * @returns Boolean indicating if product has overrides
 */
export function hasProductOverrides(product: EnhancedProduct & { hasOverrides?: boolean }): boolean {
  return !!product.hasOverrides
}

/**
 * Get a list of which fields have been overridden for a product
 * @param product Original product
 * @param override Override data
 * @returns Array of field names that have been overridden
 */
export function getOverriddenFields(product: EnhancedProduct, override: ProductOverride): string[] {
  const overriddenFields: string[] = []
  
  if (override.title && override.title !== product.title) overriddenFields.push('title')
  if (override.brand && override.brand !== product.brand) overriddenFields.push('brand')
  if (override.price && override.price !== product.price) overriddenFields.push('price')
  if (override.bsr && override.bsr !== product.bsr) overriddenFields.push('bsr')
  if (override.reviews && override.reviews !== product.reviews) overriddenFields.push('reviews')
  if (override.rating && override.rating !== product.rating) overriddenFields.push('rating')
  if (override.monthly_sales && override.monthly_sales !== product.monthlySales) overriddenFields.push('monthly_sales')
  if (override.monthly_revenue && override.monthly_revenue !== product.monthlyRevenue) overriddenFields.push('monthly_revenue')
  if (override.profit_estimate && override.profit_estimate !== product.profitEstimate) overriddenFields.push('profit_estimate')
  if (override.grade && override.grade !== product.grade) overriddenFields.push('grade')
  
  if (product.aiAnalysis) {
    if (override.risk_classification && override.risk_classification !== product.aiAnalysis.riskClassification) {
      overriddenFields.push('risk_classification')
    }
    if (override.consistency_rating && override.consistency_rating !== product.aiAnalysis.consistencyRating) {
      overriddenFields.push('consistency_rating')
    }
    if (override.opportunity_score && override.opportunity_score !== product.aiAnalysis.opportunityScore) {
      overriddenFields.push('opportunity_score')
    }
  }
  
  return overriddenFields
}

/**
 * Merge original market data with market overrides
 * @param market Original market data
 * @param override Market override data (optional)
 * @returns Enhanced market with override values applied
 */
export function mergeMarketWithOverrides(market: any, override?: MarketOverride): any & { hasOverrides?: boolean; overrideInfo?: MarketOverride } {
  if (!override) {
    return market
  }

  // Create merged market with override values taking precedence
  const mergedMarket = {
    ...market,
    // Override aggregated fields
    avg_price: override.avg_price ?? market.avg_price,
    avg_monthly_sales: override.avg_monthly_sales ?? market.avg_monthly_sales,
    avg_monthly_revenue: override.avg_monthly_revenue ?? market.avg_monthly_revenue,
    avg_daily_revenue: override.avg_daily_revenue ?? market.avg_daily_revenue,
    avg_profit_margin: override.avg_profit_margin ?? market.avg_profit_margin,
    avg_profit_per_unit: override.avg_profit_per_unit ?? market.avg_profit_per_unit,
    avg_reviews: override.avg_reviews ?? market.avg_reviews,
    avg_rating: override.avg_rating ?? market.avg_rating,
    avg_bsr: override.avg_bsr ?? market.avg_bsr,
    avg_cpc: override.avg_cpc ?? market.avg_cpc,
    avg_launch_budget: override.avg_launch_budget ?? market.avg_launch_budget,
    avg_cogs: override.avg_cogs ?? market.avg_cogs,
    
    // Override scoring fields
    market_grade: override.market_grade ?? market.market_grade,
    market_consistency_rating: override.market_consistency_rating ?? market.market_consistency_rating,
    market_risk_classification: override.market_risk_classification ?? market.market_risk_classification,
    opportunity_score: override.opportunity_score ?? market.opportunity_score,
    
    // Add override metadata
    hasOverrides: true,
    overrideInfo: override
  }

  return mergedMarket
}

/**
 * Merge multiple markets with their respective overrides
 * @param markets Array of original markets
 * @param overrides Array of market overrides (can be empty)
 * @returns Array of markets with overrides applied
 */
export function mergeMarketsWithOverrides(markets: any[], overrides: MarketOverride[] = []): any[] {
  // Create a map for quick override lookup
  const overrideMap = new Map<string, MarketOverride>()
  overrides.forEach(override => {
    overrideMap.set(override.market_id, override)
  })

  // Merge each market with its override
  return markets.map(market => {
    const override = overrideMap.get(market.id)
    return mergeMarketWithOverrides(market, override)
  })
}

/**
 * Fetch user's market overrides from the API
 * @param userId User ID to fetch overrides for
 * @returns Promise resolving to array of market overrides
 */
export async function fetchUserMarketOverrides(userId: string): Promise<MarketOverride[]> {
  try {
    const response = await fetch('/api/market-overrides', {
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch market overrides')
    }
    
    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Error fetching market overrides:', error)
    return []
  }
}