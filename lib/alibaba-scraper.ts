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

  /**
   * Search for suppliers on Alibaba using Apify actor
   */
  async searchSuppliers(
    options: SupplierSearchOptions, 
    progressCallback?: (phase: string, message: string, progress: number, data?: any) => void
  ): Promise<SupplierSearchResult> {
    try {
      console.log(`🔍 Starting Alibaba supplier search via Apify for: "${options.query}"`)
      progressCallback?.('apify_search', 'Initializing Apify search...', 5)
      
      if (!this.apifyToken) {
        throw new Error('Apify API token not configured')
      }

      // Prepare Apify actor input - always get 30 suppliers for better filtering
      const apifyInput = {
        limit: 30, // Fixed at 30 to provide good data for filtering/grading
        search: options.query
      }

      console.log(`📋 Apify input:`, apifyInput)
      progressCallback?.('apify_search', 'Calling Apify actor...', 10)

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
      progressCallback?.('apify_search', `Received ${response.data?.length || 0} suppliers from Apify`, 40)

      if (!response.data || !Array.isArray(response.data)) {
        console.log(`❌ Invalid Apify response:`, response.data)
        throw new Error('Invalid response from Apify actor')
      }

      // Convert Apify products to our supplier format
      progressCallback?.('data_processing', 'Converting supplier data...', 50)
      const suppliers = response.data.map((product: ApifyProduct) => this.convertApifyToSupplier(product, options.query))
      console.log(`📊 Raw supplier data sample:`, suppliers.slice(0, 2).map(s => ({
        name: s.companyName,
        title: s.title,
        price: s.price,
        mainImage: s.mainImage,
        productUrl: s.productUrl,
        reviewScore: s.reviewScore,
        reviewCount: s.reviewCount,
        years: s.yearsInBusiness,
        goldSupplier: s.trust?.goldSupplier,
        tradeAssurance: s.trust?.tradeAssurance,
        moq: s.moq
      })))
      
      // Filter based on options
      progressCallback?.('data_processing', 'Applying filters and quality checks...', 65)
      const filteredSuppliers = this.filterSuppliers(suppliers, options)
      console.log(`🔍 Filtering results: ${suppliers.length} → ${filteredSuppliers.length} (removed ${suppliers.length - filteredSuppliers.length})`)
      
      // Return all filtered suppliers - let the API handle final limiting after quality scoring
      progressCallback?.('data_processing', `Processed ${filteredSuppliers.length} suppliers`, 70, {
        suppliersFound: filteredSuppliers.length,
        totalProcessed: suppliers.length
      })

      console.log(`🎯 Final results: ${filteredSuppliers.length} suppliers (from ${suppliers.length} scraped)`)

      return {
        success: true,
        data: {
          suppliers: filteredSuppliers, // Return all filtered suppliers
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
   * Convert Apify product data to our supplier format
   */
  private convertApifyToSupplier(product: ApifyProduct, searchQuery: string): AlibabaSupplier {
    // Parse price range
    const priceMatch = product.price.match(/\$(\d+)-(\d+)/) || product.price.match(/\$(\d+)/)
    const minPrice = priceMatch ? parseFloat(priceMatch[1]) : 0
    const maxPrice = priceMatch && priceMatch[2] ? parseFloat(priceMatch[2]) : minPrice

    // Parse MOQ
    const moqMatch = product.moq ? product.moq.match(/(\d+)/) : null
    const minOrderQuantity = moqMatch ? parseInt(moqMatch[1]) : 1

    // Parse years in business
    const yearsMatch = product.goldSupplierYears ? product.goldSupplierYears.match(/(\d+)/) : null
    const yearsInBusiness = yearsMatch ? parseInt(yearsMatch[1]) : 0

    // Parse review score
    const reviewScore = parseFloat(product.reviewScore) || 0

    return {
      id: this.generateSupplierId(),
      companyName: product.companyName,
      
      // Preserve all raw Apify data at top level for easy frontend access
      title: product.title,
      price: product.price,
      promotionPrice: product.promotionPrice,
      discount: product.discount,
      moq: minOrderQuantity,
      productUrl: product.productUrl,
      mainImage: product.mainImage,
      reviewScore: reviewScore,
      reviewCount: product.reviewCount,
      deliveryEstimate: product.deliveryEstimate,
      goldSupplierYears: product.goldSupplierYears,
      
      location: {
        country: product.countryCode ? product.countryCode.replace(/^,\s*/, '').trim() || undefined : undefined,
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
        tradeAssurance: Boolean(product.goldSupplierYears) // Gold suppliers typically have trade assurance
      },
      
      quality: {
        certifications: [], // Not available from Apify
        qualityAssurance: reviewScore >= 4.0,
        onSiteCheck: undefined,
        supplierAssessment: undefined
      },
      
      trust: {
        goldSupplier: Boolean(product.goldSupplierYears),
        verified: Boolean(product.goldSupplierYears),
        tradeAssurance: Boolean(product.goldSupplierYears), // Gold suppliers typically have trade assurance
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
   * Filter suppliers based on search options - prioritize Trade Assurance
   */
  private filterSuppliers(suppliers: AlibabaSupplier[], options: SupplierSearchOptions): AlibabaSupplier[] {
    return suppliers.filter(supplier => {
      // PRIORITY: Trade Assurance is highly preferred (filter out non-trade assurance unless explicitly requested)
      if (!options.tradeAssuranceOnly && !supplier.metrics.tradeAssurance) {
        // Only allow non-trade assurance if they're Gold Suppliers with good metrics
        if (!supplier.trust.goldSupplier || supplier.metrics.minOrderQuantity > 500) {
          return false
        }
      }
      
      // MOQ limits - max 500, prefer lower
      if (supplier.metrics.minOrderQuantity > 500) {
        return false
      }
      
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
      
      // Custom MOQ filters
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
}

// Export singleton instance
export const alibabaScraper = new AlibabaScraper()

// Utility functions for supplier analysis
export const supplierUtils = {
  /**
   * Calculate supplier quality score with balanced weighting (Gold Supplier +2, others +1)
   */
  calculateQualityScore(supplier: AlibabaSupplier): SupplierQualityScore {
    let score = 0
    const reasoning: string[] = []
    const recommendations: string[] = []

    // 1. Gold Supplier Status (+2 weight = 0-20 points)
    if (supplier.trust.goldSupplier) {
      score += 20
      reasoning.push('Gold Supplier verified (+2 weight)')
    }

    // 2. Trade Assurance (+1 weight = 0-10 points)  
    if (supplier.metrics.tradeAssurance) {
      score += 10
      reasoning.push('Trade Assurance available')
    } else {
      recommendations.push('Trade Assurance preferred for payment protection')
    }

    // 3. MOQ Score (+1 weight = 0-10 points)
    let moqScore = 0
    const moq = supplier.metrics.minOrderQuantity
    if (moq <= 100) {
      moqScore = 10 // Ideal
      reasoning.push(`Excellent MOQ: ${moq} units (ideal ≤100)`)
    } else if (moq <= 300) {
      moqScore = 7 // Good
      reasoning.push(`Good MOQ: ${moq} units (acceptable ≤300)`)
    } else if (moq <= 500) {
      moqScore = 4 // Acceptable
      reasoning.push(`Acceptable MOQ: ${moq} units (max ≤500)`)
    } else {
      moqScore = 0 // Too high
      reasoning.push(`High MOQ: ${moq} units (above preferred range)`)
      recommendations.push('Consider negotiating lower MOQ')
    }
    score += moqScore

    // 4. Pricing Score (+1 weight = 0-10 points)
    let pricingScore = 5 // Default middle score if no pricing
    if (supplier.pricing?.priceRange) {
      const avgPrice = (supplier.pricing.priceRange.min + supplier.pricing.priceRange.max) / 2
      if (avgPrice <= 5) {
        pricingScore = 10
        reasoning.push(`Competitive pricing: $${avgPrice.toFixed(2)} average`)
      } else if (avgPrice <= 15) {
        pricingScore = 7
        reasoning.push(`Reasonable pricing: $${avgPrice.toFixed(2)} average`)
      } else if (avgPrice <= 30) {
        pricingScore = 4
        reasoning.push(`Higher pricing: $${avgPrice.toFixed(2)} average`)
      } else {
        pricingScore = 1
        reasoning.push(`Premium pricing: $${avgPrice.toFixed(2)} average`)
        recommendations.push('Evaluate if premium pricing justifies quality')
      }
    }
    score += pricingScore

    // 5. Reviews & Rating (+1 weight = 0-10 points)
    let reviewScore = 0
    if (supplier.trust.rating && supplier.trust.customerReviews) {
      const ratingScore = (supplier.trust.rating / 5) * 8 // Up to 8 points for rating
      const volumeScore = Math.min(supplier.trust.customerReviews / 50, 1) * 2 // Up to 2 points for review volume
      reviewScore = ratingScore + volumeScore
      reasoning.push(`${supplier.trust.rating}/5 rating from ${supplier.trust.customerReviews} reviews`)
    } else {
      recommendations.push('Check customer reviews and ratings')
    }
    score += reviewScore

    // 6. Years in Business (+1 weight = 0-10 points)
    let experienceScore = 0
    if (supplier.yearsInBusiness >= 10) {
      experienceScore = 10
      reasoning.push(`Established business (${supplier.yearsInBusiness} years)`)
    } else if (supplier.yearsInBusiness >= 5) {
      experienceScore = 7
      reasoning.push(`Experienced business (${supplier.yearsInBusiness} years)`)
    } else if (supplier.yearsInBusiness >= 2) {
      experienceScore = 4
      reasoning.push(`Developing business (${supplier.yearsInBusiness} years)`)
    } else {
      experienceScore = 1
      reasoning.push(`New business (${supplier.yearsInBusiness} years)`)
      recommendations.push('Verify business stability and track record')
    }
    score += experienceScore

    // 7. Response Rate (+1 weight = 0-10 points)
    if (supplier.metrics.responseRate) {
      const responseScore = (supplier.metrics.responseRate / 100) * 10
      score += responseScore
      reasoning.push(`${supplier.metrics.responseRate}% response rate`)
    }

    // 8. Certifications (+1 weight = 0-10 points)
    const certScore = Math.min(supplier.quality.certifications.length * 2, 10)
    score += certScore
    if (supplier.quality.certifications.length > 0) {
      reasoning.push(`${supplier.quality.certifications.length} certifications: ${supplier.quality.certifications.join(', ')}`)
    } else {
      recommendations.push('Request product certifications for your market')
    }

    // Final score out of 100 (max possible: 20+10+10+10+10+10+10+10 = 100)
    const finalScore = Math.min(Math.round(score), 100)

    // Generate recommendations based on score
    if (finalScore >= 80) {
      recommendations.push('Excellent supplier candidate - highly recommended')
    } else if (finalScore >= 65) {
      recommendations.push('Good supplier candidate - verify key details')
    } else if (finalScore >= 50) {
      recommendations.push('Acceptable supplier - additional due diligence recommended')
    } else {
      recommendations.push('Exercise caution - thorough vetting required')
      recommendations.push('Request samples and verify all claims')
    }

    return {
      overall: finalScore,
      breakdown: {
        goldSupplier: supplier.trust.goldSupplier ? 20 : 0,
        tradeAssurance: supplier.metrics.tradeAssurance ? 10 : 0,
        moq: moqScore,
        pricing: pricingScore,
        reviews: reviewScore,
        experience: experienceScore,
        communication: supplier.metrics.responseRate ? (supplier.metrics.responseRate / 100) * 10 : 0,
        certifications: certScore
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