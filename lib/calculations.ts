import type { EnhancedProduct, KeywordData, ProcessedReviews } from '@/types'

/**
 * Calculation utilities for enhanced product metrics
 */

export interface CalculatedMetrics {
  dailyRevenue: number
  reviewCategory: string
  variations: number
  fulfillmentFees: number
  launchBudget: number
  profitPerUnitAfterLaunch: number
  enhancedFbaCost: number
}

/**
 * Calculate daily revenue from monthly revenue
 */
export function calculateDailyRevenue(monthlyRevenue: number): number {
  return Math.round((monthlyRevenue / 30) * 100) / 100
}

/**
 * Categorize review count into buckets
 */
export function categorizeReviewCount(reviewCount: number): string {
  if (reviewCount < 50) return '<50'
  if (reviewCount < 200) return '<200'
  if (reviewCount < 500) return '<500'
  return '500+'
}

/**
 * Extract variation count from Apify data
 */
export function extractVariationCount(apifyProduct: any): number {
  if (apifyProduct.variantAsins && Array.isArray(apifyProduct.variantAsins)) {
    return apifyProduct.variantAsins.length
  }
  if (apifyProduct.variantDetails && Array.isArray(apifyProduct.variantDetails)) {
    return apifyProduct.variantDetails.length
  }
  return 1 // Default to 1 if no variants
}

/**
 * Calculate enhanced FBA cost using actual dimensions and weight
 */
export function calculateEnhancedFbaCost(
  price: number,
  dimensions?: { length?: number; width?: number; height?: number; weight?: number }
): number {
  // Base FBA cost calculation (fallback to 15% if no dimensions)
  let fbaCost = price * 0.15

  if (dimensions && dimensions.length && dimensions.width && dimensions.height && dimensions.weight) {
    // Calculate dimensional weight
    const dimensionalWeight = (dimensions.length * dimensions.width * dimensions.height) / 166
    const actualWeight = dimensions.weight
    const billingWeight = Math.max(dimensionalWeight, actualWeight)

    // FBA fees based on size and weight tiers
    if (billingWeight <= 1 && price <= 10) {
      fbaCost = 2.50 + (price * 0.15) // Small and light
    } else if (billingWeight <= 1) {
      fbaCost = 3.22 + (price * 0.15) // Standard size, light weight
    } else if (billingWeight <= 2) {
      fbaCost = 4.75 + (price * 0.15) // Standard size, medium weight
    } else if (billingWeight <= 3) {
      fbaCost = 5.40 + (price * 0.15) // Standard size, heavy weight
    } else {
      // Large/oversized items
      fbaCost = 8.00 + (billingWeight * 0.50) + (price * 0.15)
    }
  }

  return Math.round(fbaCost * 100) / 100
}

/**
 * Calculate 20-click launch budget from keyword CPC data
 */
export function calculateLaunchBudget(keywords: KeywordData[]): number {
  if (!keywords || keywords.length === 0) return 0

  // Calculate average CPC from top keywords
  const validKeywords = keywords.filter(kw => kw.cpc && kw.cpc > 0)
  if (validKeywords.length === 0) return 0

  const avgCpc = validKeywords.reduce((sum, kw) => sum + kw.cpc, 0) / validKeywords.length
  return Number((avgCpc * 20).toFixed(2))
}

/**
 * Calculate profit per unit after launch budget consideration
 */
export function calculateProfitPerUnitAfterLaunch(
  ppu: number,
  launchBudget: number,
  expectedUnitsInLaunchPeriod: number = 20
): number {
  const launchCostPerUnit = launchBudget / expectedUnitsInLaunchPeriod
  const profitAfterLaunch = ppu - launchCostPerUnit
  return Math.round(profitAfterLaunch * 100) / 100
}

/**
 * Format competitive intelligence for display
 */
export function formatCompetitiveIntelligence(competitiveDifferentiation?: any): string {
  if (!competitiveDifferentiation) return 'No competitive analysis available'

  const parts = []
  
  if (competitiveDifferentiation.commonComplaints?.length > 0) {
    parts.push(`Issues: ${competitiveDifferentiation.commonComplaints.join(', ')}`)
  }
  
  if (competitiveDifferentiation.improvementOpportunities?.length > 0) {
    parts.push(`Opportunities: ${competitiveDifferentiation.improvementOpportunities.join(', ')}`)
  }

  if (competitiveDifferentiation.missingFeatures?.length > 0) {
    parts.push(`Missing: ${competitiveDifferentiation.missingFeatures.join(', ')}`)
  }

  return parts.length > 0 ? parts.join(' | ') : 'Good product quality'
}

/**
 * Calculate all enhanced metrics for a product
 */
export function calculateAllMetrics(
  product: EnhancedProduct,
  apifyProduct?: any
): CalculatedMetrics {
  const dailyRevenue = calculateDailyRevenue(product.salesData.monthlyRevenue)
  const reviewCategory = categorizeReviewCount(product.reviews)
  const variations = apifyProduct ? extractVariationCount(apifyProduct) : 1
  const enhancedFbaCost = calculateEnhancedFbaCost(product.price, product.dimensions)
  const launchBudget = calculateLaunchBudget(product.keywords || [])
  const profitPerUnitAfterLaunch = calculateProfitPerUnitAfterLaunch(
    product.salesData.ppu, 
    launchBudget
  )

  return {
    dailyRevenue,
    reviewCategory,
    variations,
    fulfillmentFees: enhancedFbaCost,
    launchBudget,
    profitPerUnitAfterLaunch,
    enhancedFbaCost
  }
}

/**
 * Format dimensions for display
 */
export function formatDimensions(dimensions?: any): string {
  if (!dimensions) return 'Unknown'
  
  const { length, width, height, weight, unit, weightUnit } = dimensions
  
  let result = ''
  if (length && width && height) {
    result += `${length}"×${width}"×${height}"`
    if (unit && unit !== 'inches') result += ` (${unit})`
  }
  
  if (weight) {
    if (result) result += ', '
    result += `${weight}${weightUnit || 'lbs'}`
  }
  
  return result || 'Unknown'
}

/**
 * Format only weight from dimensions JSONB
 */
export function formatWeight(dimensions?: any): string {
  if (!dimensions) return 'Unknown'
  
  const { weight, weightUnit } = dimensions
  
  if (weight) {
    return `${weight}${weightUnit || 'lbs'}`
  }
  
  return 'Unknown'
}

/**
 * Get risk color for UI display
 */
export function getRiskColor(riskClassification: string): string {
  switch (riskClassification) {
    case 'Safe': 
    case 'No Risk': return 'text-green-600' // Backward compatibility
    case 'Electric': return 'text-yellow-600' 
    case 'Breakable': return 'text-orange-600'
    case 'Medical': return 'text-blue-600'
    case 'Prohibited':
    case 'Banned': return 'text-red-600' // Backward compatibility
    default: return 'text-gray-600'
  }
}

/**
 * Get consistency color for UI display
 */
export function getConsistencyColor(consistencyRating: string): string {
  switch (consistencyRating) {
    case 'Consistent': return 'text-green-600'
    case 'Low': return 'text-red-600' // Risky for private label
    case 'Trendy': return 'text-red-600' // Risky for private label  
    case 'Seasonal': return 'text-blue-600' // Backward compatibility
    default: return 'text-gray-600'
  }
}

/**
 * Export utility object for easy imports
 */
export const calculationUtils = {
  calculateDailyRevenue,
  categorizeReviewCount,
  extractVariationCount,
  calculateEnhancedFbaCost,
  calculateLaunchBudget,
  calculateProfitPerUnitAfterLaunch,
  formatCompetitiveIntelligence,
  calculateAllMetrics,
  formatDimensions,
  formatWeight,
  getRiskColor,
  getConsistencyColor
}