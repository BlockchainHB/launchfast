import { EnhancedProduct } from '@/types/product'
import { MarketStatistics, MarketAnalysis } from '@/types/market'
import { calculateGrade, type ScoringInputs } from '@/lib/scoring'

/**
 * Calculate simple average of numeric array
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const validNumbers = numbers.filter(n => !isNaN(n) && n !== null && n !== undefined)
  if (validNumbers.length === 0) return 0
  return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length
}

/**
 * Get most common value from array
 */
function getMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  
  const counts = arr.reduce((acc, item) => {
    acc[String(item)] = (acc[String(item)] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  let maxCount = 0
  let mostCommon: T | null = null
  
  for (const [item, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = arr.find(i => String(i) === item) || null
    }
  }
  
  return mostCommon
}

/**
 * Calculate market consistency rating based on product variance
 */
function calculateMarketConsistency(products: EnhancedProduct[]): MarketStatistics['market_consistency_rating'] {
  if (products.length <= 1) return 'High'
  
  const grades = products.map(p => p.grade).filter(Boolean)
  const uniqueGrades = [...new Set(grades)]
  
  // Calculate grade distribution
  if (uniqueGrades.length === 1) {
    return 'High' // All products have same grade
  } else if (uniqueGrades.length === 2) {
    return 'Medium' // Two different grades
  } else if (uniqueGrades.length === 3) {
    return 'Low' // Three different grades
  } else {
    return 'Variable' // High variance in grades
  }
}

/**
 * Calculate market risk classification based on product risk patterns
 */
function calculateMarketRisk(products: EnhancedProduct[]): string {
  const riskClassifications = products
    .map(p => p.aiAnalysis?.riskClassification)
    .filter(Boolean)
  
  if (riskClassifications.length === 0) return 'Unknown'
  
  // Return most common risk classification
  return getMostCommon(riskClassifications) || 'Unknown'
}

/**
 * Calculate opportunity score based on market metrics (1-100)
 */
function calculateOpportunityScore(marketStats: MarketStatistics): number {
  // Base score from profit margin (40% weight)
  const marginScore = Math.min(40, marketStats.avg_profit_margin * 100)
  
  // Revenue potential (30% weight)
  const revenueScore = Math.min(30, (marketStats.avg_monthly_revenue / 10000) * 30)
  
  // Competition level (20% weight) - inverse of review count
  const competitionScore = Math.max(0, 20 - (marketStats.avg_reviews / 1000) * 20)
  
  // Consistency bonus (10% weight)
  const consistencyScore = marketStats.market_consistency_rating === 'High' ? 10 :
                          marketStats.market_consistency_rating === 'Medium' ? 7 :
                          marketStats.market_consistency_rating === 'Low' ? 4 : 2
  
  return Math.min(100, Math.max(1, Math.round(
    marginScore + revenueScore + competitionScore + consistencyScore
  )))
}

/**
 * Main function to calculate market statistics from products
 */
export function calculateMarketStatistics(products: EnhancedProduct[]): MarketStatistics {
  // Filter to only verified products for calculations
  const validProducts = products.filter(p => p.sellerSpriteVerified && p.price > 0)
  
  if (validProducts.length === 0) {
    throw new Error('No valid products found for market analysis')
  }
  
  // Calculate simple averages
  const marketStats: MarketStatistics = {
    avg_price: average(validProducts.map(p => p.price || 0)),
    avg_monthly_sales: average(validProducts.map(p => p.salesData?.monthlySales || 0)),
    avg_monthly_revenue: average(validProducts.map(p => p.salesData?.monthlyRevenue || 0)),
    avg_reviews: average(validProducts.map(p => p.reviews || 0)),
    avg_rating: average(validProducts.map(p => p.rating || 0)),
    avg_bsr: average(validProducts.map(p => p.bsr || 0)),
    avg_profit_margin: average(validProducts.map(p => p.salesData?.margin || 0)),
    avg_cpc: average(validProducts.map(p => {
      const keywords = p.keywords || []
      if (keywords.length === 0) return 0
      return keywords.reduce((sum, kw) => sum + (kw.cpc || 0), 0) / keywords.length
    })),
    avg_daily_revenue: average(validProducts.map(p => p.calculatedMetrics?.dailyRevenue || 0)),
    avg_launch_budget: average(validProducts.map(p => p.calculatedMetrics?.launchBudget || 0)),
    avg_profit_per_unit: average(validProducts.map(p => p.calculatedMetrics?.profitPerUnitAfterLaunch || 0)),
    
    // Market-level analysis
    market_consistency_rating: calculateMarketConsistency(validProducts),
    market_risk_classification: calculateMarketRisk(validProducts),
    total_products_analyzed: products.length,
    products_verified: validProducts.length,
    
    // Will be calculated after we have the stats
    market_grade: '', // Calculated below
    opportunity_score: 0 // Calculated below
  }
  
  // Calculate market grade using existing grading logic on averaged stats
  const gradeInputs: ScoringInputs = {
    monthlyProfit: (marketStats.avg_monthly_revenue || 0) * (marketStats.avg_profit_margin || 0),
    price: marketStats.avg_price || 0,
    margin: marketStats.avg_profit_margin || 0,
    reviews: marketStats.avg_reviews || 0,
    avgCPC: marketStats.avg_cpc || 0,
    riskClassification: marketStats.market_risk_classification || 'Unknown',
    consistencyRating: marketStats.market_consistency_rating || 'Unknown',
    ppu: marketStats.avg_profit_per_unit || 0,
    bsr: marketStats.avg_bsr,
    rating: marketStats.avg_rating,
    opportunityScore: marketStats.opportunity_score
  }
  
  marketStats.market_grade = calculateGrade(gradeInputs).grade
  marketStats.opportunity_score = calculateOpportunityScore(marketStats)
  
  return marketStats
}

/**
 * Create a complete market analysis from keyword and products
 */
export function createMarketAnalysis(
  keyword: string,
  products: EnhancedProduct[],
  searchFilters?: any
): MarketAnalysis {
  const marketStats = calculateMarketStatistics(products)
  
  // Use the most representative product's AI analysis (first product)
  const representativeProduct = products.find(p => p.sellerSpriteVerified) || products[0]
  const marketIntelligence = representativeProduct?.aiAnalysis ? 
    `Market Analysis for "${keyword}": Based on analysis of ${products.length} products. ${representativeProduct.competitiveIntelligence || representativeProduct.aiAnalysis.marketInsights?.join(' ') || 'Market shows varied opportunities across analyzed products.'}` :
    `Market Analysis for "${keyword}": Analysis of ${products.length} products with averaged metrics. Consider market entry strategy based on competitive landscape.`
  
  return {
    ...marketStats,
    keyword,
    search_filters: searchFilters,
    market_competitive_intelligence: marketIntelligence,
    research_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

/**
 * Create single market keyword entry for the user's search term with averaged metrics
 */
export function extractMarketKeywords(products: EnhancedProduct[], marketId: string, searchKeyword: string) {
  // Calculate averaged keyword metrics from all products
  const allKeywords = products.flatMap(product => product.keywords || [])
  
  if (allKeywords.length === 0) {
    // Return single entry with just the search keyword if no keyword data
    return [{
      market_id: marketId,
      keyword: searchKeyword,
      search_volume: 0,
      avg_cpc: 0,
      competition_level: 'Unknown',
      relevance_score: 100 // User's search term is 100% relevant
    }]
  }
  
  // Calculate averages across all keywords from all products
  const totalCpc = allKeywords.reduce((sum, kw) => sum + (kw.cpc || 0), 0)
  const totalVolume = allKeywords.reduce((sum, kw) => sum + (kw.searchVolume || 0), 0)
  
  const avgCpc = allKeywords.length > 0 ? totalCpc / allKeywords.length : 0
  const avgVolume = allKeywords.length > 0 ? totalVolume / allKeywords.length : 0
  
  // Return single entry for the user's search keyword with averaged metrics
  return [{
    market_id: marketId,
    keyword: searchKeyword,
    search_volume: Math.round(avgVolume),
    avg_cpc: Number(avgCpc.toFixed(2)),
    competition_level: products.length > 3 ? 'High' : products.length > 1 ? 'Medium' : 'Low',
    relevance_score: 100 // User's search term is 100% relevant
  }]
}