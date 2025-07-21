import { EnhancedProduct } from './index'

/**
 * Dashboard user profile interface
 */
export interface DashboardUserProfile {
  id: string
  name: string
  email: string
  company?: string
}

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
  marketsAnalyzed: number
  totalProducts: number
  highGradeMarkets: number
  avgMarketRevenue: number
  // Legacy stats for backward compatibility
  highGradeProducts: number
  highGradePercentage: number
  avgMonthlyRevenue: number
  totalProfitPotential: number
  recentActivity: number
}

/**
 * Market with linked products for dashboard display
 */
export interface MarketWithProducts {
  // Market identification
  id: string
  keyword: string
  research_date: string
  
  // Market-level grading and analysis
  market_grade: string
  market_consistency_rating: string
  market_risk_classification: string
  opportunity_score: number
  
  // Product counts
  products_verified: number
  total_products_analyzed: number
  
  // Averaged market statistics (all metrics from individual products)
  avg_price: number
  avg_monthly_sales: number
  avg_monthly_revenue: number
  avg_reviews: number
  avg_rating: number
  avg_bsr: number
  avg_profit_margin: number
  avg_cpc: number
  avg_daily_revenue: number
  avg_launch_budget: number
  avg_profit_per_unit: number
  
  // Market intelligence
  market_competitive_intelligence: string
  
  // Linked individual products (expandable in UI)
  products: EnhancedProduct[]
}

/**
 * Complete dashboard data response
 */
export interface DashboardData {
  user: DashboardUserProfile
  stats: DashboardStats
  markets: MarketWithProducts[]
  legacyProducts: EnhancedProduct[] // Products without market_id
}

/**
 * API response wrapper
 */
export interface DashboardDataResponse {
  success: boolean
  data: DashboardData
  cached: boolean
  stats?: {
    markets_count: number
    legacy_products_count: number
    total_products: number
  }
  error?: string
  details?: string
}

/**
 * Market row for table display (flattened for TanStack Table)
 */
export interface MarketTableRow {
  // Core identification
  id: string
  keyword: string
  market_grade: string
  
  // For table column compatibility (same as products)
  title: string // = keyword (for search/filter compatibility)
  asin: string // = market ID (for consistency)
  brand: string // = "Market Analysis" 
  
  // All averaged metrics (same column names as product table)
  price: number // = avg_price
  monthlyRevenue: number // = avg_monthly_revenue
  monthlySales: number // = avg_monthly_sales
  reviews: number // = avg_reviews
  rating: number // = avg_rating
  bsr: number // = avg_bsr
  profitMargin: number // = avg_profit_margin
  cpc: number // = avg_cpc
  dailyRevenue: number // = avg_daily_revenue
  launchBudget: number // = avg_launch_budget
  profitPerUnit: number // = avg_profit_per_unit
  
  // Market-specific fields
  consistency: string // = market_consistency_rating
  riskType: string // = market_risk_classification
  opportunityScore: number
  productsAnalyzed: number // = products_verified
  
  // Expandable products
  products: EnhancedProduct[]
  isExpanded?: boolean // UI state
}

/**
 * Transform market data to table row format
 */
export function transformMarketToTableRow(market: MarketWithProducts): MarketTableRow {
  // Calculate actual averages from individual products
  const products = market.products || []
  const productCount = products.length
  
  // Calculate consistency mode (most common)
  const consistencies = products.map(p => p.aiAnalysis?.consistencyRating || 'Unknown')
  const consistencyMode = consistencies.reduce((a, b, i, arr) => 
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  )
  
  // Calculate risk mode (most common)
  const risks = products.map(p => p.aiAnalysis?.riskClassification || 'Unknown')
  const riskMode = risks.reduce((a, b, i, arr) => 
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  )
  
  // Calculate actual averages from products
  const avgPrice = productCount > 0 ? products.reduce((sum, p) => sum + (p.price || 0), 0) / productCount : 0
  const avgMonthlyRevenue = productCount > 0 ? products.reduce((sum, p) => sum + (p.salesData?.monthlyRevenue || 0), 0) / productCount : 0
  const avgMonthlySales = productCount > 0 ? products.reduce((sum, p) => sum + (p.salesData?.monthlySales || 0), 0) / productCount : 0
  const avgReviews = productCount > 0 ? products.reduce((sum, p) => sum + (p.reviews || 0), 0) / productCount : 0
  const avgRating = productCount > 0 ? products.reduce((sum, p) => sum + (p.rating || 0), 0) / productCount : 0
  const avgDailyRevenue = productCount > 0 ? products.reduce((sum, p) => sum + (p.calculatedMetrics?.dailyRevenue || 0), 0) / productCount : 0
  const avgProfitMargin = productCount > 0 ? products.reduce((sum, p) => sum + (p.salesData?.margin || 0), 0) / productCount : 0
  const avgCpc = productCount > 0 ? products.reduce((sum, p) => {
    const keywords = p.keywords || []
    const productCpc = keywords.length > 0 ? keywords.reduce((sum, kw) => sum + (kw?.cpc || 0), 0) / keywords.length : 0
    return sum + productCpc
  }, 0) / productCount : 0
  const avgLaunchBudget = productCount > 0 ? products.reduce((sum, p) => sum + (p.calculatedMetrics?.launchBudget || 0), 0) / productCount : 0
  const avgProfitPerUnit = productCount > 0 ? products.reduce((sum, p) => sum + (p.calculatedMetrics?.profitPerUnitAfterLaunch || 0), 0) / productCount : 0

  return {
    // Core identification
    id: market.id,
    keyword: market.keyword,
    market_grade: market.market_grade,
    
    // Table compatibility fields
    title: market.keyword, // For search/filter
    asin: market.id, // For consistency
    brand: 'Market Analysis',
    
    // Calculated averages from actual products
    price: avgPrice,
    monthlyRevenue: avgMonthlyRevenue,
    monthlySales: avgMonthlySales,
    reviews: avgReviews,
    rating: avgRating,
    bsr: market.avg_bsr, // Keep database value for BSR
    profitMargin: avgProfitMargin,
    cpc: avgCpc,
    dailyRevenue: avgDailyRevenue,
    launchBudget: avgLaunchBudget,
    profitPerUnit: avgProfitPerUnit,
    
    // Market-specific (use most common values from products)
    consistency: consistencyMode,
    riskType: riskMode,
    opportunityScore: market.opportunity_score,
    productsAnalyzed: productCount, // Use actual product count
    
    // Expandable products
    products: market.products,
    isExpanded: false
  }
}