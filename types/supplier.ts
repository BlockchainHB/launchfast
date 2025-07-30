export interface AlibabaSupplieBtr {
  id: string
  companyName: string
  location: {
    country: string
    city?: string
    province?: string
  }
  businessType: 'Manufacturer' | 'Trading Company' | 'Other'
  yearsInBusiness: number
  
  // Contact Information
  contact: {
    email?: string
    phone?: string
    whatsapp?: string
    tradeManager?: string
    website?: string
  }
  
  // Product Information
  products: {
    mainProducts: string[]
    totalProducts: number
    categories: string[]
  }
  
  // Business Metrics
  metrics: {
    minOrderQuantity: number
    averageLeadTime: number
    responseRate?: number
    transactionLevel?: string
    tradeAssurance?: boolean
  }
  
  // Quality Indicators
  quality: {
    certifications: string[]
    qualityAssurance: boolean
    onSiteCheck?: boolean
    supplierAssessment?: number
  }
  
  // Financial & Trust
  trust: {
    tradeAssuranceAmount?: number
    goldSupplier?: boolean
    verified?: boolean
    customerReviews?: number
    rating?: number
  }
  
  // Pricing (if available)
  pricing?: {
    priceRange?: {
      min: number
      max: number
      currency: string
    }
    paymentTerms?: string[]
    priceValidityDays?: number
  }
  
  // Additional Data
  companyProfile?: string
  establishedYear?: number
  employees?: string
  annualRevenue?: string
  exportPercentage?: number
  
  // Metadata
  scrapedAt: string
  sourceUrl: string
  searchQuery: string
}

export interface SupplierSearchOptions {
  query: string
  location?: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  goldSupplierOnly?: boolean
  tradeAssuranceOnly?: boolean
  responseTimeHours?: number
  minYearsInBusiness?: number
  maxResults?: number
}

export interface SupplierSearchResult {
  success: boolean
  data?: {
    suppliers: AlibabaSupplier[]
    totalFound: number
    searchQuery: string
    searchOptions: SupplierSearchOptions
    searchId: string
  }
  error?: string
  usage?: {
    searchesUsed: number
    searchesRemaining: number
  }
}

export interface SupplierQualityScore {
  overall: number
  breakdown: {
    communication: number
    reliability: number
    experience: number
    certifications: number
    customerFeedback: number
  }
  reasoning: string[]
  recommendations: string[]
}

export interface SupplierSearchSession {
  id: string
  userId: string
  searchQuery: string
  searchOptions: SupplierSearchOptions
  results: AlibabaSupplier[]
  qualityAnalysis?: {
    topSuppliers: string[]
    averageScore: number
    keyInsights: string[]
  }
  createdAt: string
  updatedAt: string
  status: 'searching' | 'completed' | 'failed'
  metadata?: {
    totalScraped: number
    totalFiltered: number
    searchDurationMs: number
  }
}

// Database types for Supabase
export interface SupplierSearchSessionDB {
  id: string
  user_id: string
  search_query: string
  search_options: SupplierSearchOptions
  results: AlibabaSupplier[]
  quality_analysis?: SupplierSearchSession['qualityAnalysis']
  created_at: string
  updated_at: string
  status: SupplierSearchSession['status']
  metadata?: SupplierSearchSession['metadata']
}

export type AlibabaSupplier = AlibabaSupplieBtr