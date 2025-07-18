import axios from 'axios'

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
  reviews?: {
    positive: Review[]
    negative: Review[]
    total: number
  }
}

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

export interface ApifySearchOptions {
  maxItems?: number
  maxReviews?: number
  minRating?: number
}

export class ApifyAmazonCrawler {
  private apiToken: string
  private baseURL = 'https://api.apify.com/v2/acts/junglee~amazon-crawler/run-sync-get-dataset-items'

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  /**
   * Search Amazon products using Apify crawler
   */
  async searchProducts(keyword: string, options: ApifySearchOptions = {}): Promise<ApifyProduct[]> {
    const {
      maxItems = 20,
      maxReviews = 1000,
      minRating = 3.0
    } = options

    try {
      // Generate Amazon search URL
      const searchUrl = this.generateAmazonSearchUrl(keyword)
      
      console.log(`🔍 Searching Amazon via Apify for: "${keyword}"`)
      console.log(`📍 Search URL: ${searchUrl}`)

      // Prepare Apify request payload with enhanced data extraction
      const requestPayload = {
        categoryOrProductUrls: [
          {
            url: searchUrl,
            method: "GET"
          }
        ],
        ensureLoadedProductDescriptionFields: true,  // Extract dimensions/weight
        includeReviews: true,                        // Include reviews for analysis
        maxReviews: 50,                              // Get recent reviews
        maxItemsPerStartUrl: maxItems,
        maxOffers: 0,
        proxyCountry: "AUTO_SELECT_PROXY_COUNTRY",
        scrapeProductDetails: true,
        scrapeProductVariantPrices: false,
        scrapeSellers: false,
        useCaptchaSolver: false
      }

      // Make Apify API call
      const response = await axios.post(
        `${this.baseURL}?token=${this.apiToken}`,
        requestPayload,
        {
          timeout: 120000, // 2 minutes for Apify
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      console.log(`✅ Apify returned ${response.data.length} products`)

      // Process and enhance products with additional data extraction
      const enhancedProducts = response.data.map((product: any) => this.enhanceProductData(product))

      // Filter products based on criteria
      const filteredProducts = enhancedProducts.filter((product: ApifyProduct) => {
        // Check if product has required fields
        if (!product.asin || !product.title || !product.price?.value) {
          return false
        }

        // Apply review count filter
        if (product.reviewsCount > maxReviews) {
          return false
        }

        // Apply rating filter
        if (product.stars < minRating) {
          return false
        }

        return true
      })

      console.log(`🔍 Filtered to ${filteredProducts.length} products (≤${maxReviews} reviews, ≥${minRating}⭐)`)
      console.log(`✨ Enhanced data extraction: BSR, images, dimensions, reviews`)

      // Sort by relevance (lower review count = less competition)
      const sortedProducts = filteredProducts.sort((a, b) => a.reviewsCount - b.reviewsCount)

      return sortedProducts

    } catch (error) {
      console.error('Apify Amazon Crawler error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Apify API response:', error.response?.data)
      }
      throw new Error('Failed to search Amazon products via Apify')
    }
  }

  /**
   * Generate Amazon search URL from keyword
   */
  private generateAmazonSearchUrl(keyword: string): string {
    // Clean and encode the keyword
    const cleanKeyword = keyword.trim().toLowerCase()
    const encodedKeyword = encodeURIComponent(cleanKeyword.replace(/\s+/g, '+'))
    
    // Generate Amazon search URL with proper parameters
    const baseUrl = 'https://www.amazon.com/s'
    const params = new URLSearchParams({
      k: cleanKeyword,
      ref: 'sr_pg_1'
    })

    const searchUrl = `${baseUrl}?${params.toString()}`
    
    return searchUrl
  }

  /**
   * Map Apify product to our ProductData format with enhanced fields
   */
  mapToProductData(apifyProduct: ApifyProduct) {
    return {
      asin: apifyProduct.asin,
      title: apifyProduct.title,
      brand: apifyProduct.brand || 'Unknown',
      price: apifyProduct.price.value,
      bsr: apifyProduct.bestSellersRank,  // 🆕 Now available from Apify
      reviews: apifyProduct.reviewsCount,
      rating: apifyProduct.stars,
      category: apifyProduct.breadCrumbs,
      imageUrl: apifyProduct.thumbnailImage,
      // Enhanced fields from Apify
      images: apifyProduct.images,
      dimensions: apifyProduct.dimensions,
      // These will be enhanced by SellerSprite if available
      monthlyUnits: 0,
      monthlyRevenue: 0,
      monthlyProfit: 0,
      createdAt: new Date().toISOString()
    }
  }

  /**
   * Enhanced product data extraction with BSR, dimensions, images, and reviews
   */
  private enhanceProductData(apifyProduct: any): ApifyProduct {
    return {
      ...apifyProduct,
      // Extract additional images
      images: this.extractImages(apifyProduct),
      
      // Extract BSR from rank data
      bestSellersRank: this.extractBSR(apifyProduct),
      
      // Extract dimensions and weight
      dimensions: this.extractDimensions(apifyProduct),
      
      // Process reviews for competitive analysis
      reviews: this.processReviews(apifyProduct)
    }
  }

  /**
   * Extract main product image only
   */
  private extractImages(product: any): string[] {
    // Only extract the main thumbnail image
    if (product.thumbnailImage) {
      return [product.thumbnailImage]
    }
    
    // Fallback to first high resolution image if thumbnail not available
    if (product.highResolutionImages && Array.isArray(product.highResolutionImages) && product.highResolutionImages[0]) {
      return [product.highResolutionImages[0]]
    }
    
    // Final fallback to imageUrl field
    if (product.imageUrl) {
      return [product.imageUrl]
    }
    
    return []
  }

  /**
   * Extract Best Sellers Rank from bestsellerRanks array
   */
  private extractBSR(product: any): number | null {
    // Check bestsellerRanks array (primary source)
    if (product.bestsellerRanks && Array.isArray(product.bestsellerRanks)) {
      // Get the main category rank (usually first or most general)
      const mainRank = product.bestsellerRanks.find((rank: any) => 
        rank.category && (
          rank.category.includes('Patio, Lawn & Garden') ||
          rank.category.includes('Automotive') ||
          rank.category.includes('Sports & Outdoors')
        )
      )
      
      if (mainRank && mainRank.rank) {
        return mainRank.rank
      }
      
      // Fallback to first rank if main category not found
      if (product.bestsellerRanks[0] && product.bestsellerRanks[0].rank) {
        return product.bestsellerRanks[0].rank
      }
    }
    
    // Check attributes for BSR (fallback)
    if (product.attributes && Array.isArray(product.attributes)) {
      const bsrAttribute = product.attributes.find((attr: any) => 
        attr.key && attr.key.includes('Best Sellers Rank')
      )
      
      if (bsrAttribute && bsrAttribute.value) {
        const rankMatch = bsrAttribute.value.match(/#([\d,]+)/);
        if (rankMatch) {
          return parseInt(rankMatch[1].replace(/,/g, ''), 10)
        }
      }
    }
    
    return null
  }

  /**
   * Extract product dimensions and weight from attributes
   */
  private extractDimensions(product: any): any {
    const dimensions: any = {}
    
    // Extract from attributes array (primary source for Apify)
    if (product.attributes && Array.isArray(product.attributes)) {
      product.attributes.forEach((attr: any) => {
        if (!attr.key || !attr.value) return
        
        const key = attr.key.toLowerCase()
        const value = attr.value
        
        // Extract product dimensions
        if (key.includes('product dimensions')) {
          // Parse dimensions like "1 x 1 x 1 inches" or "12.5 x 8.2 x 3.1 inches"
          const dimensionMatch = value.match(/(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*(inches?|in|cm|mm)/i)
          if (dimensionMatch) {
            dimensions.length = parseFloat(dimensionMatch[1])
            dimensions.width = parseFloat(dimensionMatch[2])
            dimensions.height = parseFloat(dimensionMatch[3])
            dimensions.unit = dimensionMatch[4].toLowerCase().includes('cm') ? 'cm' : 'inches'
          }
        }
        
        // Extract item weight
        if (key.includes('item weight') || key.includes('weight')) {
          const weightMatch = value.match(/(\d+\.?\d*)\s*(pounds?|lbs?|lb|kg|kilograms?|ounces?|oz)/i)
          if (weightMatch) {
            dimensions.weight = parseFloat(weightMatch[1])
            dimensions.weightUnit = weightMatch[2].toLowerCase().includes('kg') ? 'kg' : 'lbs'
          }
        }
      })
    }
    
    return Object.keys(dimensions).length > 0 ? dimensions : undefined
  }

  /**
   * Process reviews and categorize into positive/negative for competitive analysis
   */
  private processReviews(product: any): ProcessedReviews | undefined {
    // Extract reviews from productPageReviews array
    const reviews = product.productPageReviews
    
    if (!reviews || !Array.isArray(reviews)) {
      return undefined
    }
    
    const positive = reviews.filter(review => review.ratingScore >= 4)
    const negative = reviews.filter(review => review.ratingScore <= 3)
    
    return {
      positive: positive.map(this.normalizeReview),
      negative: negative.map(this.normalizeReview),
      total: reviews.length
    }
  }

  /**
   * Normalize review data structure for Apify format
   */
  private normalizeReview(review: any): Review {
    return {
      text: review.reviewDescription || review.reviewTitle || '',
      rating: review.ratingScore || 0,
      date: review.date,
      helpful: review.reviewReaction ? 1 : 0
    }
  }

  /**
   * Parse rank number from string (handles commas and formatting)
   */
  private parseRankNumber(rank: any): number | null {
    if (typeof rank === 'number') return rank
    if (typeof rank === 'string') {
      const cleaned = rank.replace(/[^\d]/g, '')
      const parsed = parseInt(cleaned, 10)
      return isNaN(parsed) ? null : parsed
    }
    return null
  }

  /**
   * Parse numbers from dimension/weight strings
   */
  private parseNumberFromString(value: any): number | undefined {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const match = value.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : undefined
    }
    return undefined
  }

  /**
   * Validate if a product has the minimum required data
   */
  isValidProduct(product: ApifyProduct): boolean {
    return !!(
      product.asin &&
      product.title &&
      product.price?.value &&
      product.reviewsCount !== undefined &&
      product.stars !== undefined
    )
  }
}

// Export singleton instance
export const apifyClient = new ApifyAmazonCrawler(
  process.env.APIFY_API_TOKEN || ''
)

// Export utility functions
export const apifyUtils = {
  // Extract category from breadcrumbs
  extractMainCategory: (breadCrumbs: string): string => {
    if (!breadCrumbs) return 'Unknown'
    const parts = breadCrumbs.split('>')
    return parts[0]?.trim() || 'Unknown'
  },

  // Calculate opportunity score based on Apify data
  calculateOpportunityScore: (product: ApifyProduct): number => {
    let score = 5 // Base score

    // Lower reviews = higher opportunity
    if (product.reviewsCount < 50) score += 3
    else if (product.reviewsCount < 200) score += 2
    else if (product.reviewsCount < 500) score += 1

    // Higher rating = higher quality
    if (product.stars >= 4.5) score += 2
    else if (product.stars >= 4.0) score += 1

    // Price range considerations
    if (product.price.value >= 25 && product.price.value <= 100) score += 1

    return Math.min(score, 10)
  }
}