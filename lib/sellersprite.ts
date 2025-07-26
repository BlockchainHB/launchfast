import axios from 'axios'
// Cache removed for data accuracy in multi-API flows
import { calculateReferralFeeFromApify } from './amazon-fees'
import { calculateEnhancedFbaCost } from './calculations'
import { Logger } from './logger'
import type { 
  ProductData, 
  SalesPrediction, 
  KeywordData, 
  OpportunityData,
  SearchParams,
  SellerSpriteProductResponse,
  SellerSpriteSalesResponse,
  SellerSpriteKeywordResponse
} from '@/types'

export class SellerSpriteClient {
  private baseURL = 'https://api.sellersprite.com'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  // Product Research - Primary discovery endpoint
  async productResearch(params: SearchParams): Promise<ProductData[]> {
    // No caching - always fetch fresh product research data

    try {
      const requestPayload: any = {
        keyword: params.keyword,
        marketplace: 'US',
        page: 1,
        size: params.limit || 5
      }

      // Apply restrictive filters to get quality products from the start
      if (params.filters) {
        // Primary filter: Limit reviews (maxReviews -> maxRatings in SellerSprite API)
        if (params.filters.maxReviews) {
          requestPayload.maxRatings = params.filters.maxReviews
        }
        
        // Secondary filter: Ensure good sales volume
        if (params.filters.minUnits) {
          requestPayload.minUnits = params.filters.minUnits
        }
        
        // Optional filters (available for future frontend use)
        if (params.filters.minPrice) requestPayload.minPrice = params.filters.minPrice
        if (params.filters.maxPrice) requestPayload.maxPrice = params.filters.maxPrice
        if (params.filters.minRating) requestPayload.minRating = params.filters.minRating
        if (params.filters.maxRating) requestPayload.maxRating = params.filters.maxRating
        if (params.filters.minRevenue) requestPayload.minRevenue = params.filters.minRevenue
        if (params.filters.maxRevenue) requestPayload.maxRevenue = params.filters.maxRevenue
      }

      // Add default restrictive filters to reduce API response size
      if (!requestPayload.maxRatings && !params.filters?.maxReviews) {
        requestPayload.maxRatings = 1000 // Default max reviews
      }
      if (!requestPayload.minUnits && !params.filters?.minUnits) {
        requestPayload.minUnits = 5 // Lower minimum for niche products
      }
      if (!requestPayload.maxUnits && !params.filters?.maxUnits) {
        requestPayload.maxUnits = 1000 // Max units to avoid super competitive products
      }
      if (!requestPayload.minRating && !params.filters?.minRating) {
        requestPayload.minRating = 3.0 // Lower rating threshold for niche products
      }
      if (!requestPayload.maxSellers && !params.filters?.maxSellers) {
        requestPayload.maxSellers = 50 // Limit competition level
      }
      
      // Add ordering to find less competitive products
      if (!requestPayload.order) {
        requestPayload.order = {
          field: "units",
          desc: false // Sort by lowest sales first to find opportunities
        }
      }
      
      const response = await axios.post(`${this.baseURL}/v1/product/research`, requestPayload, {
        timeout: 45000,
        headers: {
          'secret-key': this.apiKey,
          'Content-Type': 'application/json;charset=utf-8',
          'User-Agent': 'SellerSprite-Dashboard/1.0'
        }
      })


      // SellerSprite API returns data in response.data.data.items format
      const items = response.data.data.items || []
      
      // Check if results are relevant to the search keyword (temporarily disabled for debugging)
      // if (items.length > 0 && !this.isSearchRelevant(params.keyword, items)) {
      //   console.warn('⚠️  SellerSprite API returned irrelevant results for keyword:', params.keyword)
      //   console.warn('⚠️  This is a limitation of SellerSprite\'s search algorithm for niche keywords')
      //   // Return empty results if search is not relevant
      //   return []
      // }
      
      const products = items.map((item: any): ProductData => ({
        asin: item.asin,
        title: item.title,
        brand: item.brand,
        price: item.price,
        bsr: item.bsr,
        reviews: item.ratings,
        rating: item.rating,
        category: item.nodeLabelPath,
        imageUrl: item.imageUrl,
        // Include sales data from product research response
        monthlyUnits: item.units || 0,
        monthlyRevenue: item.revenue || 0,
        monthlyProfit: item.profit || 0,
        createdAt: new Date().toISOString()
      }))

      // No caching - fresh data ensures accuracy
      return products
      
    } catch (error) {
      console.error('SellerSprite Product Research API error:', error)
      throw new Error('Failed to fetch product research data')
    }
  }

  // Sales Prediction - Profit calculation endpoint
  async salesPrediction(asin: string): Promise<SalesPrediction | null> {
    // No caching - always fetch fresh sales predictions as SalesPrediction

    try {
      const response = await axios.get(`${this.baseURL}/v1/sales/prediction/asin`, {
        params: {
          asin,
          marketplace: 'US'
        },
        timeout: 45000,
        headers: {
          'secret-key': this.apiKey,
          'User-Agent': 'SellerSprite-Dashboard/1.0'
        }
      })

      Logger.dev.trace(`Sales prediction response code: ${response.data.code}`)
      
      if (response.data.code !== 'OK') {
        // Log the error but don't throw - some ASINs may not have prediction data
        console.warn(`SellerSprite Sales Prediction unavailable for ASIN ${asin}:`, response.data.message)
        return null // Return null to indicate no prediction available
      }
      
      const data = response.data.data
      const dailyItems: Array<{sales: number, amount: number}> = data.dailyItemList || []
      
      // Calculate monthly averages from daily data
      const recentDays = dailyItems.slice(-30) // Last 30 days
      const validDays = recentDays.filter((day: {sales: number}) => day.sales > 0)
      
      const totalSales = validDays.reduce((sum: number, day: {sales: number}) => sum + day.sales, 0)
      const totalRevenue = validDays.reduce((sum: number, day: {amount: number}) => sum + day.amount, 0)
      const avgPrice = validDays.length > 0 ? totalRevenue / totalSales : data.asinDetail?.price || 0
      
      // Estimate monthly values
      const monthlySales = Math.round(totalSales * (30 / Math.max(validDays.length, 1)))
      const monthlyRevenue = Math.round(totalRevenue * (30 / Math.max(validDays.length, 1)))
      
      // Enhanced margin calculation using real SellerSprite data and Amazon fees
      const dimensions = data.asinDetail?.dimensions || data.asinDetail?.packageDimensions
      const enhancedMargin = this.calculateEnhancedMargin(data, avgPrice, dimensions)
      const monthlyProfit = monthlyRevenue * Math.max(enhancedMargin.margin, 0)
      
      const salesData: SalesPrediction = {
        monthlyProfit: Math.round(monthlyProfit),
        monthlyRevenue: monthlyRevenue,
        monthlySales: monthlySales,
        margin: Math.round(enhancedMargin.margin * 100) / 100,
        ppu: avgPrice > 0 ? Math.round((enhancedMargin.margin * avgPrice * 100)) / 100 : 0,
        fbaCost: enhancedMargin.fbaCost,
        cogs: enhancedMargin.cogs,
        // Add new enhanced fields
        referralFee: enhancedMargin.referralFee,
        referralCategory: enhancedMargin.referralCategory
      }

      // No caching - fresh sales data for accurate analysis
      return salesData
      
    } catch (error) {
      console.error('SellerSprite Sales Prediction API error:', error)
      throw new Error('Failed to fetch sales prediction data')
    }
  }

  // Reverse ASIN - Keyword intelligence endpoint
  async reverseASIN(asin: string, page: number = 1, size: number = 200): Promise<KeywordData[]> {
    // No caching - always fetch fresh keyword data

    try {
      const response = await axios.post(`${this.baseURL}/v1/traffic/keyword`, {
        asin,
        marketplace: 'US',
        page,
        size
      }, {
        timeout: 45000,
        headers: {
          'secret-key': this.apiKey,
          'Content-Type': 'application/json;charset=utf-8',
          'User-Agent': 'SellerSprite-Dashboard/1.0'
        }
      })

      // SellerSprite API returns data in response.data.data.items format
      const items = response.data.data.items || []
      const keywords = items.map((item: any): KeywordData => ({
        keyword: item.keyword,
        searchVolume: item.searches,
        rankingPosition: item.rankPosition?.position || null,
        trafficPercentage: item.purchaseRate * 100, // Convert to percentage
        cpc: item.bid,
        competitionScore: 0, // Will be calculated based on other factors
        // Enhanced reverse ASIN fields
        products: item.products,
        purchaseRate: item.purchaseRate,
        // PPC/Advertising metrics
        bidMax: item.bid,
        bidMin: item.bidMin,
        badges: item.badges ? (Array.isArray(item.badges) ? item.badges : [item.badges]) : undefined,
        // Ranking data
        rank: item.rank,
        position: item.position,
        page: item.page,
        // Advertising competition
        latest1DaysAds: item.Latest_1_days_Ads,
        latest7DaysAds: item.Latest_7_days_Ads,
        latest30DaysAds: item.Latest_30_days_Ads,
        // Market analysis
        supplyDemandRatio: item.supplyDemandRatio,
        trafficKeywordType: item.trafficKeywordType,
        conversionKeywordType: item.conversionKeywordType,
        // Time-based metrics
        calculatedWeeklySearches: item.calculatedWeeklySearches,
        updatedTime: item.updatedTime || item.updated_time
      }))

      // No caching - fresh keyword data ensures accuracy
      return keywords
      
    } catch (error) {
      console.error('SellerSprite Reverse ASIN API error:', error)
      throw new Error('Failed to fetch keyword data')
    }
  }

  // Keyword Mining - Market opportunity endpoint
  async keywordMining(keyword: string, options: {
    minSearch?: number
    maxSupplyDemandRatio?: number
    page?: number
    size?: number
  } = {}): Promise<OpportunityData[]> {
    const params = {
      keyword,
      minSearch: options.minSearch || 1000,
      maxSupplyDemandRatio: options.maxSupplyDemandRatio || 10,
      page: options.page || 1,
      size: options.size || 50,
      marketplace: 'US',
      amazonChoice: false
    }

    // No caching - always fetch fresh keyword mining data

    try {
      const response = await axios.post(`${this.baseURL}/v1/keyword/miner`, params, {
        timeout: 45000,
        headers: {
          'secret-key': this.apiKey,
          'Content-Type': 'application/json;charset=utf-8',
          'User-Agent': 'SellerSprite-Dashboard/1.0'
        }
      })

      Logger.dev.trace(`Keyword mining response code: ${response.data.code}`)
      
      // Handle API errors (rate limiting, etc.)
      if (response.data.code !== 'OK' || !response.data.data) {
        Logger.dev.trace(`Keyword mining API error: ${response.data.code}`)
        return []
      }
      
      // SellerSprite API returns data in response.data.data.items format
      const items = response.data.data.items || []
      if (!Array.isArray(items)) {
        console.error('Keyword mining response items is not an array:', items)
        return []
      }

      const opportunities = items.map((item: any): OpportunityData => ({
        keyword: item.keyword,
        searchVolume: item.searches,
        competitionScore: item.competitionScore || 0,
        supplyDemandRatio: item.supplyDemandRatio,
        avgCpc: item.avgCpc || item.bid,
        growthTrend: item.growthTrend || 'stable',
        // Enhanced keyword mining fields
        keywordCn: item.keywordCn,
        keywordJp: item.keywordJp,
        departments: item.departments,
        month: item.month,
        supplement: item.supplement,
        purchases: item.purchases,
        purchaseRate: item.purchaseRate,
        monopolyClickRate: item.monopolyClickRate,
        products: item.products,
        adProducts: item.adProducts,
        avgPrice: item.avgPrice,
        avgRatings: item.avgRatings,
        avgRating: item.avgRating,
        bidMin: item.bidMin,
        bidMax: item.bidMax,
        bid: item.bid,
        cvsShareRate: item.cvsShareRate,
        wordCount: item.wordCount,
        titleDensity: item.titleDensity,
        spr: item.spr,
        relevancy: item.relevancy,
        amazonChoice: item.amazonChoice,
        searchRank: item.searchRank
      }))

      // No caching - fresh keyword mining for accurate results
      return opportunities
      
    } catch (error) {
      console.error('SellerSprite Keyword Mining API error:', error)
      throw new Error('Failed to fetch keyword opportunities')
    }
  }

  // Utility method to get comprehensive product data
  async getProductAnalysis(asin: string): Promise<{
    product: ProductData | null
    sales: SalesPrediction | null
    keywords: KeywordData[]
    opportunities: OpportunityData[]
  }> {
    try {
      // Get cached product data first
      // No caching - always fetch fresh comprehensive analysis

      // Fetch missing data in parallel
      const [salesData, keywordData] = await Promise.all([
        cachedSales || this.salesPrediction(asin),
        cachedKeywords || this.reverseASIN(asin)
      ])

      // Get opportunities based on top keywords
      const topKeywords = (keywordData as KeywordData[]).slice(0, 5)
      const opportunities = await Promise.all(
        topKeywords.map(kw => this.keywordMining(kw.keyword, { minSearch: 500 }))
      )

      return {
        product: cachedProduct as ProductData | null,
        sales: salesData as SalesPrediction | null,
        keywords: keywordData as KeywordData[],
        opportunities: opportunities.flat()
      }
      
    } catch (error) {
      console.error('Error fetching comprehensive product analysis:', error)
      throw new Error('Failed to analyze product')
    }
  }

  // Enhanced margin calculation using real SellerSprite data and Amazon referral/FBA fees
  private calculateEnhancedMargin(
    data: { 
      asinDetail?: { 
        estimatedCost?: number; 
        cogs?: number; 
        fbaFee?: number; 
        estimatedFbaFee?: number; 
        category?: string; 
        nodeLabelPath?: string; 
      } 
    }, 
    avgPrice: number, 
    dimensions?: { length?: number; width?: number; height?: number; weight?: number }
  ): {
    margin: number;
    cogs: number;
    fbaCost: number;
    referralFee: number;
    referralCategory: string;
  } {
    // Extract real COGS and FBA estimates from SellerSprite data if available
    const asinDetail = data.asinDetail || {}
    const sellerSpriteCOGS = asinDetail.estimatedCost || asinDetail.cogs
    const sellerSpriteFBA = asinDetail.fbaFee || asinDetail.estimatedFbaFee
    const category = asinDetail.category || asinDetail.nodeLabelPath || ''
    
    // Use SellerSprite COGS if available, otherwise fall back to improved estimate
    const cogs = sellerSpriteCOGS || (avgPrice * 0.35) // Reduced from 40% to 35%
    
    // Use SellerSprite FBA if available, otherwise use enhanced FBA calculator
    const fbaCost = sellerSpriteFBA || calculateEnhancedFbaCost(avgPrice, dimensions)
    
    // Calculate Amazon referral fee using our new system
    const referralFeeData = calculateReferralFeeFromApify(category, avgPrice)
    const referralFee = referralFeeData.fee
    
    // Calculate total costs and margin
    const totalCosts = cogs + fbaCost + referralFee
    const margin = avgPrice > 0 ? Math.max(0, (avgPrice - totalCosts) / avgPrice) : 0
    
    return {
      margin,
      cogs: Math.round(cogs * 100) / 100,
      fbaCost: Math.round(fbaCost * 100) / 100,
      referralFee: Math.round(referralFee * 100) / 100,
      referralCategory: referralFeeData.category
    }
  }

  // Rate limiting helper
  private async rateLimitedRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = 3
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await requestFn()
      } catch (error: unknown) {
        const errorObj = error as { response?: { status?: number } }
        if (errorObj.response?.status === 429 && i < retries - 1) {
          // Rate limited, wait and retry
          const delay = Math.pow(2, i) * 1000 // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }
    throw new Error('Max retries exceeded')
  }
}

// Export singleton instance
export const sellerSpriteClient = new SellerSpriteClient(
  process.env.SELLERSPRITE_API_KEY || ''
)

// Export utility functions
export const sellerSpriteUtils = {
  // Calculate average CPC from keyword data
  calculateAvgCPC: (keywords: KeywordData[]): number => {
    if (!keywords.length) return 0
    const totalCPC = keywords.reduce((sum, kw) => sum + kw.cpc, 0)
    return totalCPC / keywords.length
  },

  // Get top traffic keywords
  getTopTrafficKeywords: (keywords: KeywordData[], limit: number = 10): KeywordData[] => {
    return keywords
      .sort((a, b) => (b.trafficPercentage || 0) - (a.trafficPercentage || 0))
      .slice(0, limit)
  },

  // Calculate competition score
  calculateCompetitionScore: (keywords: KeywordData[]): number => {
    if (!keywords.length) return 0
    
    const avgCPC = sellerSpriteUtils.calculateAvgCPC(keywords)
    const avgSearchVolume = keywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / keywords.length
    
    // Higher CPC and search volume = higher competition
    return Math.min(10, (avgCPC * 2) + (avgSearchVolume / 10000))
  }
}