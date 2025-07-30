import axios from 'axios'
import type { 
  AlibabaSupplier, 
  SupplierSearchOptions, 
  SupplierSearchResult,
  SupplierQualityScore 
} from '@/types/supplier'

interface ApifyProduct {
  title: string
  price: string
  promotionPrice: string
  discount: number | null
  moq: string
  companyName: string
  countryCode: string
  productUrl: string
  mainImage: string
  reviewScore: string
  reviewCount: number
  deliveryEstimate: string | null
  goldSupplierYears: string
}

export class AlibabaScraper {
  private apifyApiUrl = 'https://api.apify.com/v2/acts/piotrv1001~alibaba-listings-scraper/run-sync-get-dataset-items'
  private apifyToken: string
  
  constructor() {
    this.apifyToken = process.env.APIFY_API_TOKEN || ''
    if (!this.apifyToken) {
      console.warn('⚠️ APIFY_API_TOKEN not found in environment variables')
    }
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
  }

  private getAntiDetectionHeaders(): Record<string, string> {
    return {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Convert Apify product data to our supplier format
   */
  private convertApifyToSupplier(product: ApifyProduct, searchQuery: string): AlibabaSupplier {
    // Parse price range
    const priceMatch = product.price.match(/\$(\d+)-(\d+)/) || product.price.match(/\$(\d+)/)
    const minPrice = priceMatch ? parseFloat(priceMatch[1]) : 0
    const maxPrice = priceMatch && priceMatch[2] ? parseFloat(priceMatch[2]) : minPrice

    // Parse MOQ
    const moqMatch = product.moq.match(/(\d+)/)
    const minOrderQuantity = moqMatch ? parseInt(moqMatch[1]) : 1

    // Parse years in business
    const yearsMatch = product.goldSupplierYears.match(/(\d+)/)
    const yearsInBusiness = yearsMatch ? parseInt(yearsMatch[1]) : 0

    // Parse review score
    const reviewScore = parseFloat(product.reviewScore) || 0

    return {
      id: this.generateSupplierId(),
      companyName: product.companyName,
      location: {
        country: product.countryCode,
        city: undefined,
        province: undefined
      },
      businessType: 'Other', // We don't have this data from Apify
      yearsInBusiness,
      
      contact: {
        // We don't have contact details from Apify, would need to scrape product page
        website: product.productUrl
      },
      
      products: {
        mainProducts: [this.cleanText(product.title)],
        totalProducts: 1, // We only have one product per supplier from this search
        categories: []
      },
      
      metrics: {
        minOrderQuantity,
        averageLeadTime: 15, // Default estimate
        responseRate: undefined,
        tradeAssurance: product.goldSupplierYears !== null // Gold suppliers typically have trade assurance
      },
      
      quality: {
        certifications: [], // Not available from Apify
        qualityAssurance: reviewScore >= 4.0,
        onSiteCheck: undefined,
        supplierAssessment: undefined
      },
      
      trust: {
        goldSupplier: product.goldSupplierYears !== null,
        verified: product.goldSupplierYears !== null,
        tradeAssurance: product.goldSupplierYears !== null,
        tradeAssuranceAmount: undefined,
        rating: reviewScore,
        customerReviews: product.reviewCount
      },
      
      pricing: minPrice > 0 ? {
        priceRange: {
          min: minPrice,
          max: maxPrice,
          currency: 'USD'
        },
        paymentTerms: undefined,
        priceValidityDays: undefined
      } : undefined,
      
      // Additional data
      companyProfile: `${product.companyName} is a supplier from ${product.countryCode} with ${yearsInBusiness} years of experience.`,
      establishedYear: undefined,
      employees: undefined,
      annualRevenue: undefined,
      exportPercentage: undefined,
      
      // Metadata
      scrapedAt: new Date().toISOString(),
      sourceUrl: product.productUrl,
      searchQuery
    }
  }

  /**
   * Search for suppliers on Alibaba using Apify actor
   */
  async searchSuppliers(options: SupplierSearchOptions): Promise<SupplierSearchResult> {
    try {
      console.log(`🔍 Starting Alibaba supplier search via Apify for: "${options.query}"`)
      
      if (!this.apifyToken) {
        throw new Error('Apify API token not configured')
      }

      // Prepare Apify actor input
      const apifyInput = {
        limit: Math.min(options.maxResults || 30, 100), // Apify actor limit
        search: options.query
      }

      console.log(`📋 Apify input:`, apifyInput)

      // Call Apify actor
      const response = await axios.post(
        `${this.apifyApiUrl}?token=${this.apifyToken}`,
        apifyInput,
        {
          timeout: 120000, // 2 minutes for Apify processing
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      console.log(`📡 Apify response status: ${response.status}`)
      console.log(`📊 Apify returned ${response.data?.length || 0} products`)

      if (!response.data || !Array.isArray(response.data)) {
        console.log(`❌ Invalid Apify response:`, response.data)
        throw new Error('Invalid response from Apify actor')
      }

      // Convert Apify products to our supplier format
      const suppliers = response.data.map((product: ApifyProduct) => this.convertApifyToSupplier(product, options.query))
      
      // Filter based on options
      const filteredSuppliers = this.filterSuppliers(suppliers, options)
      
      // Limit results
      const maxResults = options.maxResults || 20
      const limitedSuppliers = filteredSuppliers.slice(0, maxResults)

      console.log(`🎯 Converted ${suppliers.length} products to suppliers, filtered to ${filteredSuppliers.length}, returning ${limitedSuppliers.length}`)

      return {
        success: true,
        data: {
          suppliers: limitedSuppliers,
          totalFound: suppliers.length,
          searchQuery: options.query,
          searchOptions: options,
          searchId: this.generateSearchId()
        }
      }

    } catch (error) {
      console.error('❌ Apify Alibaba supplier search failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Generate unique supplier ID
   */
  private generateSupplierId(): string {
    return `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique search ID
   */
  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean text by removing HTML and extra whitespace
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
  }

  /**
   * Parse supplier data from HTML response
   */
  private parseSuppliers(html: string, searchQuery: string): AlibabaSupplier[] {
    const suppliers: AlibabaSupplier[] = []
    
    try {
      // Extract supplier cards using regex patterns
      // This mimics the JavaScript scraper's approach
      const supplierMatches = this.extractSupplierCards(html)
      
      for (const match of supplierMatches) {
        const supplier = this.extractSupplierData(match, searchQuery)
        if (supplier && this.isValidSupplier(supplier)) {
          suppliers.push(supplier)
        }
      }
      
    } catch (error) {
      console.error('Error parsing suppliers from HTML:', error)
    }
    
    return suppliers
  }

  /**
   * Extract supplier card HTML sections
   */
  private extractSupplierCards(html: string): string[] {
    // Look for supplier card containers based on actual Alibaba structure
    // Pattern 1: Product cards with supplier info (from landing page structure)
    const cardPattern1 = /<div[^>]*style="[^"]*display:flex[^"]*"[^>]*>[\s\S]*?alt="gold supplier"[\s\S]*?<\/div>/gi
    
    // Pattern 2: Company/supplier specific sections
    const cardPattern2 = /<div[^>]*data-company-id="[^"]*"[^>]*>[\s\S]*?<\/div>/gi
    
    // Pattern 3: Product offer items with supplier data
    const cardPattern3 = /<a[^>]*href="[^"]*product-detail[^"]*"[^>]*>[\s\S]*?yrs[\s\S]*?CN[\s\S]*?<\/a>/gi
    
    const matches1 = html.match(cardPattern1) || []
    const matches2 = html.match(cardPattern2) || []
    const matches3 = html.match(cardPattern3) || []
    
    return [...matches1, ...matches2, ...matches3]
  }

  /**
   * Extract supplier data from individual card HTML
   */
  private extractSupplierData(cardHtml: string, searchQuery: string): AlibabaSupplier | null {
    try {
      const supplier: AlibabaSupplier = {
        id: this.generateSupplierId(),
        companyName: this.extractCompanyName(cardHtml),
        location: this.extractLocation(cardHtml),
        businessType: this.extractBusinessType(cardHtml),
        yearsInBusiness: this.extractYearsInBusiness(cardHtml),
        contact: this.extractContactInfo(cardHtml),
        products: this.extractProductInfo(cardHtml),
        metrics: this.extractMetrics(cardHtml),
        quality: this.extractQualityInfo(cardHtml),
        trust: this.extractTrustInfo(cardHtml),
        pricing: this.extractPricingInfo(cardHtml),
        companyProfile: this.extractCompanyProfile(cardHtml),
        scrapedAt: new Date().toISOString(),
        sourceUrl: this.extractSourceUrl(cardHtml),
        searchQuery
      }

      return supplier

    } catch (error) {
      console.error('Error extracting supplier data:', error)
      return null
    }
  }

  /**
   * Extract company name from card HTML
   */
  private extractCompanyName(html: string): string {
    // Based on actual Alibaba structure patterns
    const patterns = [
      // Pattern from item details: company link
      /href="[^"]*\.m\.en\.alibaba\.com[^"]*"[^>]*>([^<]+)</i,
      // Pattern from product cards with company names
      /<a[^>]*target="_blank"[^>]*rel="noreferrer"[^>]*>([^<]+)<\/a>/i,
      // Fallback pattern for any company-like text
      /([A-Za-z0-9\s&.,Ltd]+(?:Co\.|Ltd\.|Inc\.|Corp\.|Company)[^<]*)/i
    ]
    
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const name = this.cleanText(match[1])
        // Filter out common non-company text
        if (name.length > 5 && !name.toLowerCase().includes('view more') && !name.toLowerCase().includes('company profile')) {
          return name
        }
      }
    }
    
    return 'Unknown Company'
  }

  /**
   * Extract location information
   */
  private extractLocation(html: string): AlibabaSupplier['location'] {
    const locationPattern = /<span[^>]*class="[^"]*country[^"]*"[^>]*>(.*?)<\/span>/i
    const match = html.match(locationPattern)
    
    if (match && match[1]) {
      const locationText = this.cleanText(match[1])
      const parts = locationText.split(',').map(p => p.trim())
      
      return {
        country: parts[parts.length - 1] || 'Unknown',
        city: parts.length > 1 ? parts[0] : undefined,
        province: parts.length > 2 ? parts[1] : undefined
      }
    }
    
    return { country: 'Unknown' }
  }

  /**
   * Extract business type
   */
  private extractBusinessType(html: string): AlibabaSupplier['businessType'] {
    const typePattern = /<span[^>]*class="[^"]*business-type[^"]*"[^>]*>(.*?)<\/span>/i
    const match = html.match(typePattern)
    
    if (match && match[1]) {
      const type = this.cleanText(match[1]).toLowerCase()
      if (type.includes('manufacturer')) return 'Manufacturer'
      if (type.includes('trading')) return 'Trading Company'
    }
    
    return 'Other'
  }

  /**
   * Extract years in business
   */
  private extractYearsInBusiness(html: string): number {
    // Based on actual patterns like "11 yrs", "3 yrs", etc.
    const patterns = [
      /(\d+)\s*yrs?/i,
      /(\d+)\s*years?/i
    ]
    
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return parseInt(match[1])
      }
    }
    
    return 0
  }

  /**
   * Extract contact information
   */
  private extractContactInfo(html: string): AlibabaSupplier['contact'] {
    return {
      email: this.extractPattern(html, /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/),
      phone: this.extractPattern(html, /(\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})/),
      website: this.extractPattern(html, /(https?:\/\/[^\s<>"]+)/i)
    }
  }

  /**
   * Extract product information
   */
  private extractProductInfo(html: string): AlibabaSupplier['products'] {
    const productPattern = /<span[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/span>/gi
    const matches = html.match(productPattern) || []
    
    return {
      mainProducts: matches.map(m => this.cleanText(m)).slice(0, 5),
      totalProducts: this.extractNumberPattern(html, /(\d+)\s*products?/i) || 0,
      categories: []
    }
  }

  /**
   * Extract business metrics
   */
  private extractMetrics(html: string): AlibabaSupplier['metrics'] {
    return {
      minOrderQuantity: this.extractNumberPattern(html, /MOQ:?\s*(\d+)/i) || 1,
      averageLeadTime: this.extractNumberPattern(html, /(\d+)\s*days?/i) || 15,
      responseRate: this.extractNumberPattern(html, /(\d+)%\s*response/i),
      tradeAssurance: html.toLowerCase().includes('trade assurance') || html.toLowerCase().includes('trade-assurance')
    }
  }

  /**
   * Extract quality information
   */
  private extractQualityInfo(html: string): AlibabaSupplier['quality'] {
    const certifications = this.extractCertifications(html)
    
    return {
      certifications,
      qualityAssurance: certifications.length > 0,
      onSiteCheck: html.toLowerCase().includes('onsite check'),
      supplierAssessment: this.extractNumberPattern(html, /assessment[^>]*>(\d+)/i)
    }
  }

  /**
   * Extract trust indicators
   */
  private extractTrustInfo(html: string): AlibabaSupplier['trust'] {
    return {
      goldSupplier: html.includes('alt="gold supplier"') || html.toLowerCase().includes('gold supplier'),
      verified: html.toLowerCase().includes('verified'),
      tradeAssurance: html.toLowerCase().includes('trade assurance') || html.toLowerCase().includes('trade-assurance'),
      tradeAssuranceAmount: this.extractNumberPattern(html, /\$([0-9,]+)/),
      rating: this.extractNumberPattern(html, /(\d+\.?\d*)\s*\/\s*5/) || this.extractNumberPattern(html, /(\d+\.?\d*)%/),
      customerReviews: this.extractNumberPattern(html, /(\d+)\s*reviews?/i)
    }
  }

  /**
   * Extract pricing information
   */
  private extractPricingInfo(html: string): AlibabaSupplier['pricing'] | undefined {
    const priceMatch = html.match(/\$(\d+\.?\d*)\s*-\s*\$(\d+\.?\d*)/i)
    
    if (priceMatch) {
      return {
        priceRange: {
          min: parseFloat(priceMatch[1]),
          max: parseFloat(priceMatch[2]),
          currency: 'USD'
        }
      }
    }
    
    return undefined
  }

  /**
   * Extract company profile text
   */
  private extractCompanyProfile(html: string): string | undefined {
    const profilePattern = /<div[^>]*class="[^"]*profile[^"]*"[^>]*>(.*?)<\/div>/i
    const match = html.match(profilePattern)
    return match ? this.cleanText(match[1]) : undefined
  }

  /**
   * Extract source URL
   */
  private extractSourceUrl(html: string): string {
    const urlPattern = /href="([^"]*alibaba[^"]*)"/i
    const match = html.match(urlPattern)
    return match ? match[1] : ''
  }

  /**
   * Extract certifications from HTML
   */
  private extractCertifications(html: string): string[] {
    const certPatterns = [
      /ISO\s*\d+/gi,
      /CE\b/gi,
      /FDA\b/gi,
      /RoHS\b/gi,
      /FCC\b/gi,
      /UL\b/gi
    ]
    
    const certifications = new Set<string>()
    
    for (const pattern of certPatterns) {
      const matches = html.match(pattern) || []
      matches.forEach(cert => certifications.add(cert.toUpperCase()))
    }
    
    return Array.from(certifications)
  }

  /**
   * Filter suppliers based on search options
   */
  private filterSuppliers(suppliers: AlibabaSupplier[], options: SupplierSearchOptions): AlibabaSupplier[] {
    return suppliers.filter(supplier => {
      // Years in business filter
      if (options.minYearsInBusiness && supplier.yearsInBusiness < options.minYearsInBusiness) {
        return false
      }
      
      // Gold supplier filter
      if (options.goldSupplierOnly && !supplier.trust.goldSupplier) {
        return false
      }
      
      // Trade assurance filter
      if (options.tradeAssuranceOnly && !supplier.metrics.tradeAssurance) {
        return false
      }
      
      // MOQ filters
      if (options.minOrderQuantity && supplier.metrics.minOrderQuantity < options.minOrderQuantity) {
        return false
      }
      
      if (options.maxOrderQuantity && supplier.metrics.minOrderQuantity > options.maxOrderQuantity) {
        return false
      }
      
      return true
    })
  }

  /**
   * Check if supplier has minimum required data
   */
  private isValidSupplier(supplier: AlibabaSupplier): boolean {
    return !!(
      supplier.companyName &&
      supplier.companyName !== 'Unknown Company' &&
      supplier.location.country &&
      supplier.location.country !== 'Unknown'
    )
  }

  /**
   * Utility functions
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
  }

  private extractPattern(html: string, pattern: RegExp): string | undefined {
    const match = html.match(pattern)
    return match ? match[1] : undefined
  }

  private extractNumberPattern(html: string, pattern: RegExp): number | undefined {
    const match = html.match(pattern)
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''))
      return isNaN(num) ? undefined : num
    }
    return undefined
  }

  private generateSupplierId(): string {
    return `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const alibabaScraper = new AlibabaScraper()

// Utility functions for supplier analysis
export const supplierUtils = {
  /**
   * Calculate supplier quality score based on various factors
   */
  calculateQualityScore(supplier: AlibabaSupplier): SupplierQualityScore {
    let score = 0
    const reasoning: string[] = []
    const recommendations: string[] = []

    // Years in business (0-25 points)
    const yearsScore = Math.min(supplier.yearsInBusiness * 2.5, 25)
    score += yearsScore
    if (supplier.yearsInBusiness >= 10) {
      reasoning.push(`Established business (${supplier.yearsInBusiness} years)`)
    } else if (supplier.yearsInBusiness < 3) {
      reasoning.push(`Relatively new business (${supplier.yearsInBusiness} years)`)
      recommendations.push('Verify business stability and track record')
    }

    // Trust indicators (0-25 points)
    let trustScore = 0
    if (supplier.trust.goldSupplier) {
      trustScore += 10
      reasoning.push('Gold Supplier verified')
    }
    if (supplier.trust.verified) {
      trustScore += 8
      reasoning.push('Company verification completed')
    }
    if (supplier.metrics.tradeAssurance) {
      trustScore += 7
      reasoning.push('Trade Assurance available')
    }
    score += trustScore

    // Quality certifications (0-20 points)
    const certScore = Math.min(supplier.quality.certifications.length * 4, 20)
    score += certScore
    if (supplier.quality.certifications.length > 0) {
      reasoning.push(`${supplier.quality.certifications.length} certifications: ${supplier.quality.certifications.join(', ')}`)
    } else {
      recommendations.push('Request product certifications for your market')
    }

    // Response rate (0-15 points)
    if (supplier.metrics.responseRate) {
      const responseScore = (supplier.metrics.responseRate / 100) * 15
      score += responseScore
      reasoning.push(`${supplier.metrics.responseRate}% response rate`)
    }

    // Customer feedback (0-15 points)
    if (supplier.trust.rating && supplier.trust.customerReviews) {
      const feedbackScore = (supplier.trust.rating / 5) * 15
      score += feedbackScore
      reasoning.push(`${supplier.trust.rating}/5 rating from ${supplier.trust.customerReviews} reviews`)
    } else {
      recommendations.push('Check customer reviews and ratings')
    }

    // Normalize to 0-100 scale
    const finalScore = Math.min(Math.round(score), 100)

    // Generate recommendations based on score
    if (finalScore < 60) {
      recommendations.push('Consider additional due diligence before proceeding')
      recommendations.push('Request samples and verify product quality')
    } else if (finalScore < 80) {
      recommendations.push('Good candidate but verify key details')
      recommendations.push('Check recent customer feedback')
    }

    return {
      overall: finalScore,
      breakdown: {
        communication: supplier.metrics.responseRate || 0,
        reliability: trustScore * 4, // Scale to 0-100
        experience: yearsScore * 4, // Scale to 0-100
        certifications: certScore * 5, // Scale to 0-100
        customerFeedback: supplier.trust.rating ? (supplier.trust.rating / 5) * 100 : 0
      },
      reasoning,
      recommendations
    }
  },

  /**
   * Extract contact preferences from supplier data
   */
  getPreferredContact(supplier: AlibabaSupplier): string[] {
    const contacts = []
    if (supplier.contact.email) contacts.push(`Email: ${supplier.contact.email}`)
    if (supplier.contact.whatsapp) contacts.push(`WhatsApp: ${supplier.contact.whatsapp}`)
    if (supplier.contact.phone) contacts.push(`Phone: ${supplier.contact.phone}`)
    if (supplier.contact.tradeManager) contacts.push('Trade Manager available')
    return contacts
  },

  /**
   * Format supplier for export
   */
  formatForExport(supplier: AlibabaSupplier) {
    return {
      'Company Name': supplier.companyName,
      'Location': `${supplier.location.city || ''} ${supplier.location.country}`.trim(),
      'Business Type': supplier.businessType,
      'Years in Business': supplier.yearsInBusiness,
      'Main Products': supplier.products.mainProducts.join('; '),
      'Min Order Quantity': supplier.metrics.minOrderQuantity,
      'Gold Supplier': supplier.trust.goldSupplier ? 'Yes' : 'No',
      'Trade Assurance': supplier.metrics.tradeAssurance ? 'Yes' : 'No',
      'Response Rate': supplier.metrics.responseRate ? `${supplier.metrics.responseRate}%` : 'N/A',
      'Certifications': supplier.quality.certifications.join('; '),
      'Email': supplier.contact.email || '',
      'Phone': supplier.contact.phone || '',
      'Website': supplier.contact.website || '',
      'Quality Score': supplierUtils.calculateQualityScore(supplier).overall
    }
  }
}