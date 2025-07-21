import { EnhancedProduct } from './index'

export interface MarketFilters {
  maxReviews?: number
  minRating?: number
  maxPrice?: number
  minPrice?: number
}

export interface MarketStatistics {
  // Core Averages
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
  
  // Market-Level Analysis
  market_grade: string
  market_consistency_rating: 'High' | 'Medium' | 'Low' | 'Variable'
  market_risk_classification: string
  total_products_analyzed: number
  products_verified: number
  
  // Market Intelligence
  market_competitive_intelligence?: string
  market_trends?: any
  opportunity_score?: number
}

export interface MarketAnalysis extends MarketStatistics {
  id?: string
  user_id?: string
  keyword: string
  search_filters?: MarketFilters
  research_date?: string
  created_at?: string
  updated_at?: string
}

export interface MarketWithProducts extends MarketAnalysis {
  products: EnhancedProduct[]
}

export interface MarketKeyword {
  id?: string
  market_id: string
  keyword: string
  search_volume?: number
  competition_level?: string
  avg_cpc?: number
  relevance_score?: number
  created_at?: string
}

// Re-export existing product types for convenience
export type { EnhancedProduct } from './index'