// Core data types for SellerSprite Dashboard

export interface ProductData {
  asin: string
  title: string
  brand?: string
  price: number
  bsr?: number
  reviews: number
  rating: number
  category?: string
  description?: string
  imageUrl?: string
  // Enhanced fields from Apify
  images?: string[]
  dimensions?: {
    length?: number
    width?: number  
    height?: number
    weight?: number
    unit?: string
  }
  // Sales data from SellerSprite or estimated
  monthlyUnits?: number
  monthlyRevenue?: number
  monthlyProfit?: number
  createdAt?: string
  updatedAt?: string
}

export interface SalesPrediction {
  monthlyProfit: number
  monthlyRevenue: number
  monthlySales: number
  margin: number
  ppu: number // Price Per Unit
  fbaCost: number
  cogs?: number // Cost of Goods Sold
}

export interface KeywordData {
  keyword: string
  searchVolume: number
  rankingPosition?: number
  trafficPercentage?: number
  cpc: number
  competitionScore?: number
}

export interface OpportunityData {
  keyword: string
  searchVolume: number
  competitionScore: number
  supplyDemandRatio: number
  avgCpc: number
  growthTrend?: string
}

export interface AIAnalysis {
  riskClassification: 'Electric' | 'Breakable' | 'Banned' | 'No Risk'
  consistencyRating: 'Consistent' | 'Seasonal' | 'Trendy'
  estimatedDimensions: string
  estimatedWeight: string
  opportunityScore: number
  marketInsights: string[]
  riskFactors: string[]
  // Enhanced competitive differentiation analysis
  competitiveDifferentiation?: {
    commonComplaints: string[]
    improvementOpportunities: string[]
    missingFeatures: string[]
    qualityIssues: string[]
  }
}

export interface ProcessedProduct {
  id: string
  asin: string
  title: string
  brand?: string
  price: number
  bsr?: number
  reviews: number
  rating: number
  salesData: SalesPrediction
  aiAnalysis: AIAnalysis
  keywords?: KeywordData[]
  opportunities?: OpportunityData[]
  grade: string
  createdAt: string
  updatedAt: string
}

export interface SearchFilters {
  minPrice?: number
  maxPrice?: number
  minRating?: number
  maxReviews?: number
  minBsr?: number
  maxBsr?: number
  categories?: string[]
}

export interface SearchParams {
  keyword: string
  filters?: SearchFilters
  page?: number
  limit?: number
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SellerSpriteProductResponse {
  asin: string
  title: string
  brand: string
  price: number
  bsr: number
  reviews: number
  rating: number
  category: string
  monthlySales: number
  monthlyRevenue: number
  imageUrl?: string
}

export interface SellerSpriteSalesResponse {
  asin: string
  dailySales: number
  monthlySales: number
  monthlyRevenue: number
  profit: number
  margin: number
  fbaCost: number
  ppu: number
}

export interface SellerSpriteKeywordResponse {
  keyword: string
  searchVolume: number
  rankingPosition: number
  trafficPercentage: number
  cpc: number
}

// Review interfaces for negative review analysis
export interface Review {
  text: string
  rating: number
  date?: string
  helpful?: number
}

export interface ProcessedReviews {
  positive: Review[]
  negative: Review[]
  total: number
}

// Apify Amazon Crawler Types
export interface ApifyProduct {
  title: string
  asin: string
  brand: string | null
  stars: number
  reviewsCount: number
  thumbnailImage: string
  breadCrumbs: string
  description: string | null
  price: {
    value: number
    currency: string
  }
  url: string
  // Enhanced data fields
  images?: string[]
  bestSellersRank?: number | null
  dimensions?: {
    length?: number
    width?: number  
    height?: number
    weight?: number
    unit?: string
  }
  reviews?: ProcessedReviews
}

export interface ApifySearchOptions {
  maxItems?: number
  maxReviews?: number
  minRating?: number
}

// Calculated metrics interface
export interface CalculatedMetrics {
  dailyRevenue: number
  reviewCategory: string
  variations: number
  fulfillmentFees: number
  launchBudget: number
  profitPerUnitAfterLaunch: number
  enhancedFbaCost: number
}

export interface EnhancedProduct extends ProcessedProduct {
  apifySource: boolean // Indicates if product came from Apify
  sellerSpriteVerified: boolean // Indicates if SellerSprite has sales data
  // Enhanced Apify data fields
  images?: string[]
  dimensions?: {
    length?: number
    width?: number  
    height?: number
    weight?: number
    unit?: string
    weightUnit?: string
  }
  reviewsData?: ProcessedReviews // Structured review data for competitive analysis
  // Calculated metrics for dashboard
  calculatedMetrics?: CalculatedMetrics
  competitiveIntelligence?: string // Formatted competitive insights
}