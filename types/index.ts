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
  // Enhanced Amazon fee calculation fields
  referralFee?: number // Amazon referral fee amount
  referralCategory?: string // Amazon fee category name
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
  // Enhanced for targeted opportunity filtering
  competitorPerformance?: {
    avgCompetitorRank: number // Average rank of competitors (1-100)
    competitorsRanking: number // Number of competitors ranking (1-50+)
    competitorsInTop15: number // Number of competitors in positions 1-15
    competitorStrength: number // 1-10 score of how strong competitors are
  }
  opportunityType?: 'low_competition' | 'market_gap' | 'weak_competitors' | 'keyword_mining'
}

export interface AIAnalysis {
  riskClassification: 'Electric' | 'Breakable' | 'Medical' | 'Prohibited' | 'Safe'
  consistencyRating: 'Consistent' | 'Low' | 'Trendy'
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
  // Legacy fields for backward compatibility
  monthlyRevenue?: number
  monthlySales?: number
  profitEstimate?: number
  // Override tracking
  hasOverrides?: boolean
  overrideInfo?: {
    id: string
    override_reason: string
    notes?: string
    created_at: string
    updated_at: string
  }
}

// Keyword Research Types
export interface KeywordResearchOptions {
  maxKeywordsPerAsin?: number      // Default: 50
  minSearchVolume?: number         // Default: 100
  includeOpportunities?: boolean   // Default: true
}

export interface AsinKeywordResult {
  asin: string
  productTitle?: string
  keywordCount: number
  keywords: KeywordData[]
  status: 'success' | 'failed' | 'no_data'
  error?: string
}

export interface AggregatedKeyword {
  keyword: string
  searchVolume: number
  avgCpc: number
  rankingAsins: Array<{
    asin: string
    position: number
    trafficPercentage: number
  }>
  opportunityScore: number
}

export interface KeywordResearchResult {
  overview: {
    totalAsins: number
    totalKeywords: number
    avgSearchVolume: number
    processingTime: number
  }
  asinResults: AsinKeywordResult[]
  aggregatedKeywords: AggregatedKeyword[] // Market-wide keyword analysis
  comparisonView: AsinComparisonData[] // Individual ASIN performance comparison
  opportunities: OpportunityData[]
  gapAnalysis?: GapAnalysisResult
}

// New interface for ASIN comparison view
export interface AsinComparisonData {
  asin: string
  productTitle?: string
  totalKeywords: number
  avgSearchVolume: number
  topKeywords: KeywordData[] // Top 10-20 keywords for this specific ASIN
  strongKeywords: KeywordData[] // Keywords where this ASIN ranks well (position 1-15)
  weakKeywords: KeywordData[] // Keywords where this ASIN ranks poorly (position 16+)
  status: 'success' | 'failed' | 'no_data'
  error?: string
}

// GAP Analysis Types
export interface GapAnalysisResult {
  userAsin: string // First ASIN in the list (user's product)
  competitorAsins: string[] // Remaining ASINs (competitors)
  analysis: {
    totalGapsFound: number
    highVolumeGaps: number // >10k search volume
    mediumVolumeGaps: number // 1k-10k search volume
    avgGapVolume: number
    totalGapPotential: number // Sum of all gap search volumes
  }
  gaps: GapOpportunity[]
}

export interface GapOpportunity {
  keyword: string
  searchVolume: number
  avgCpc: number
  gapType: 'market_gap' | 'competitor_weakness' | 'user_advantage'
  gapScore: number // 1-10 score indicating opportunity strength
  competitorRankings: Array<{
    asin: string
    position: number | null // null means not ranking
    trafficPercentage: number
  }>
  userRanking: {
    asin: string
    position: number | null // null means not ranking
    trafficPercentage: number
  }
  recommendation: string
  potentialImpact: 'high' | 'medium' | 'low'
}