import type { EnhancedProduct, KeywordData } from '@/types'
import { calculateGrade, type ScoringInputs } from '@/lib/scoring'

/**
 * Industry-Grade Calculation Engine
 * 
 * Single source of truth for all mathematical operations in the system.
 * Ensures consistency across initial grading, overrides, and recalculations.
 */

// ==================== TYPES ====================

export interface CalculationContext {
  type: 'initial' | 'override' | 'recalculation' | 'deletion'
  userId: string
  timestamp: string
  reason?: string
  debug?: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface CalculationResult<T> {
  value: T
  context: CalculationContext
  validation: ValidationResult
  metadata: {
    inputCount: number
    validInputCount: number
    calculationPath: string
    fallbacksUsed: string[]
  }
}

export interface SafeNumber {
  value: number
  isValid: boolean
  source: 'original' | 'fallback' | 'estimated'
  fallbackReason?: string
}

export interface ProductMetrics {
  // Core financial
  monthlyRevenue: SafeNumber
  monthlySales: SafeNumber
  monthlyProfit: SafeNumber
  profitPerUnit: SafeNumber
  margin: SafeNumber
  
  // Performance
  price: SafeNumber
  reviews: SafeNumber
  rating: SafeNumber
  bsr: SafeNumber
  avgCpc: SafeNumber
  
  // Metadata
  isValid: boolean
  validationErrors: string[]
  
  // AI Analysis
  riskClassification?: string
}

export interface MarketMetrics {
  // Aggregated financials
  avgPrice: SafeNumber
  avgMonthlySales: SafeNumber
  avgMonthlyRevenue: SafeNumber
  avgMonthlyProfit: SafeNumber
  avgProfitPerUnit: SafeNumber
  avgMargin: SafeNumber
  
  // Aggregated performance
  avgReviews: SafeNumber
  avgRating: SafeNumber
  avgBsr: SafeNumber
  avgCpc: SafeNumber
  avgLaunchBudget: SafeNumber
  avgDailyRevenue: SafeNumber
  
  // Market characteristics
  marketGrade: string
  marketRisk: string
  marketConsistency: string
  opportunityScore: SafeNumber
  
  // Metadata
  totalProducts: number
  validProducts: number
  isValid: boolean
  validationErrors: string[]
}

// ==================== CONSTANTS ====================

const CALCULATION_CONSTANTS = {
  // Validation bounds
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999,
  MIN_MARGIN: 0,
  MAX_MARGIN: 1,
  MIN_RATING: 0,
  MAX_RATING: 5,
  MIN_REVIEWS: 0,
  MAX_REVIEWS: 1000000,
  MIN_BSR: 1,
  MAX_BSR: 10000000,
  MIN_CPC: 0.01,
  MAX_CPC: 100,
  
  // Fallback values
  DEFAULT_PRICE: 25,
  DEFAULT_MARGIN: 0.25,
  DEFAULT_CPC: 1.5,
  DEFAULT_RATING: 4.0,
  DEFAULT_OPPORTUNITY_SCORE: 5,
  
  // Calculation thresholds
  MIN_PRODUCTS_FOR_MARKET: 1,
  DAYS_PER_MONTH: 30,
  AVERAGE_WEEKS_PER_MONTH: 4.33,
} as const

// ==================== CORE UTILITIES ====================

export class CalculationEngine {
  private context: CalculationContext

  constructor(context: CalculationContext) {
    this.context = context
  }

  /**
   * Create a safe number with validation and fallback handling
   */
  createSafeNumber(
    value: number | null | undefined,
    fallbackValue: number,
    bounds: { min: number; max: number },
    fieldName: string
  ): SafeNumber {
    // Handle null/undefined
    if (value == null || isNaN(value)) {
      return {
        value: fallbackValue,
        isValid: false,
        source: 'fallback',
        fallbackReason: `${fieldName} was null/undefined`
      }
    }

    // Handle infinite values
    if (!isFinite(value)) {
      return {
        value: fallbackValue,
        isValid: false,
        source: 'fallback',
        fallbackReason: `${fieldName} was infinite`
      }
    }

    // Handle out of bounds
    if (value < bounds.min || value > bounds.max) {
      return {
        value: Math.max(bounds.min, Math.min(bounds.max, fallbackValue)),
        isValid: false,
        source: 'fallback',
        fallbackReason: `${fieldName} (${value}) was out of bounds [${bounds.min}, ${bounds.max}]`
      }
    }

    return {
      value,
      isValid: true,
      source: 'original'
    }
  }

  /**
   * Safely divide two numbers with proper zero handling
   */
  safeDivide(
    numerator: number | null | undefined,
    denominator: number | null | undefined,
    fallbackValue: number = 0,
    context: string = 'division'
  ): SafeNumber {
    if (numerator == null || isNaN(numerator) || 
        denominator == null || isNaN(denominator) || denominator === 0) {
      return {
        value: fallbackValue,
        isValid: false,
        source: 'fallback',
        fallbackReason: `${context} failed: numerator=${numerator}, denominator=${denominator}`
      }
    }

    const result = numerator / denominator
    if (!isFinite(result)) {
      return {
        value: fallbackValue,
        isValid: false,
        source: 'fallback',
        fallbackReason: `${context} resulted in non-finite value`
      }
    }

    return {
      value: result,
      isValid: true,
      source: 'original'
    }
  }

  /**
   * Calculate safe average from array of numbers
   */
  safeAverage(
    values: (number | null | undefined)[],
    fallbackValue: number = 0,
    context: string = 'average'
  ): SafeNumber {
    const validValues = values.filter(v => v != null && !isNaN(v) && isFinite(v)) as number[]
    
    if (validValues.length === 0) {
      return {
        value: fallbackValue,
        isValid: false,
        source: 'fallback',
        fallbackReason: `${context} had no valid values from ${values.length} inputs`
      }
    }

    const sum = validValues.reduce((acc, val) => acc + val, 0)
    const result = sum / validValues.length

    return {
      value: result,
      isValid: true,
      source: 'original'
    }
  }

  /**
   * Determine if a product is valid for calculations
   */
  isValidProduct(product: EnhancedProduct): boolean {
    // Core validity checks
    if (!product.price || product.price <= 0) return false
    if (!this.hasValidSalesData(product)) return false
    
    // Additional business rules can be added here
    return true
  }

  /**
   * Check if product has valid sales data
   */
  private hasValidSalesData(product: EnhancedProduct): boolean {
    const monthlyRevenue = this.getMonthlyRevenue(product)
    const monthlySales = this.getMonthlySales(product)
    
    return monthlyRevenue > 0 || monthlySales > 0
  }

  /**
   * Safely extract monthly revenue from product
   */
  getMonthlyRevenue(product: EnhancedProduct): number {
    return product.salesData?.monthlyRevenue ?? 
           product.monthlyRevenue ?? 
           0
  }

  /**
   * Safely extract monthly sales from product
   */
  getMonthlySales(product: EnhancedProduct): number {
    return product.salesData?.monthlySales ?? 
           product.monthlySales ?? 
           0
  }

  /**
   * Calculate correct profit per unit from product data
   */
  calculateProfitPerUnit(product: EnhancedProduct): SafeNumber {
    const monthlySales = this.getMonthlySales(product)
    const monthlyProfit = product.salesData?.monthlyProfit ?? product.profitEstimate ?? 0

    // Use safe division to handle zero sales
    return this.safeDivide(
      monthlyProfit,
      monthlySales,
      0,
      'profit per unit calculation'
    )
  }

  /**
   * Calculate monthly profit from revenue and margin
   */
  calculateMonthlyProfit(product: EnhancedProduct): SafeNumber {
    const revenue = this.getMonthlyRevenue(product)
    const margin = product.salesData?.margin ?? 0

    if (revenue <= 0 || margin <= 0) {
      return {
        value: product.profitEstimate ?? 0,
        isValid: false,
        source: 'fallback',
        fallbackReason: 'Invalid revenue or margin, using stored profit estimate'
      }
    }

    return {
      value: revenue * margin,
      isValid: true,
      source: 'original'
    }
  }

  /**
   * Extract and validate all metrics from a product
   */
  extractProductMetrics(product: EnhancedProduct): ProductMetrics {
    const errors: string[] = []

    // Core financial metrics
    const monthlyRevenue = this.createSafeNumber(
      this.getMonthlyRevenue(product),
      0,
      { min: 0, max: 10000000 },
      'monthly revenue'
    )

    const monthlySales = this.createSafeNumber(
      this.getMonthlySales(product),
      0,
      { min: 0, max: 100000 },
      'monthly sales'
    )

    const monthlyProfit = this.calculateMonthlyProfit(product)
    const profitPerUnit = this.calculateProfitPerUnit(product)

    const margin = this.createSafeNumber(
      product.salesData?.margin,
      CALCULATION_CONSTANTS.DEFAULT_MARGIN,
      { min: CALCULATION_CONSTANTS.MIN_MARGIN, max: CALCULATION_CONSTANTS.MAX_MARGIN },
      'margin'
    )

    // Performance metrics
    const price = this.createSafeNumber(
      product.price,
      CALCULATION_CONSTANTS.DEFAULT_PRICE,
      { min: CALCULATION_CONSTANTS.MIN_PRICE, max: CALCULATION_CONSTANTS.MAX_PRICE },
      'price'
    )

    const reviews = this.createSafeNumber(
      product.reviews,
      0,
      { min: CALCULATION_CONSTANTS.MIN_REVIEWS, max: CALCULATION_CONSTANTS.MAX_REVIEWS },
      'reviews'
    )

    const rating = this.createSafeNumber(
      product.rating,
      CALCULATION_CONSTANTS.DEFAULT_RATING,
      { min: CALCULATION_CONSTANTS.MIN_RATING, max: CALCULATION_CONSTANTS.MAX_RATING },
      'rating'
    )

    const bsr = this.createSafeNumber(
      product.bsr,
      500000,
      { min: CALCULATION_CONSTANTS.MIN_BSR, max: CALCULATION_CONSTANTS.MAX_BSR },
      'bsr'
    )

    const avgCpc = this.calculateAverageCPC(product)

    // Collect validation errors
    const metrics = [monthlyRevenue, monthlySales, monthlyProfit, profitPerUnit, margin, price, reviews, rating, bsr, avgCpc]
    metrics.forEach(metric => {
      if (!metric.isValid && metric.fallbackReason) {
        errors.push(metric.fallbackReason)
      }
    })

    return {
      monthlyRevenue,
      monthlySales,
      monthlyProfit,
      profitPerUnit,
      margin,
      price,
      reviews,
      rating,
      bsr,
      avgCpc,
      isValid: errors.length === 0,
      validationErrors: errors
    }
  }

  /**
   * Calculate average CPC from product keywords with fallback
   */
  private calculateAverageCPC(product: EnhancedProduct): SafeNumber {
    const keywords = product.keywords || []
    
    if (keywords.length === 0) {
      return {
        value: CALCULATION_CONSTANTS.DEFAULT_CPC,
        isValid: false,
        source: 'estimated',
        fallbackReason: 'No keywords available'
      }
    }

    const validCpcs = keywords
      .map(kw => kw.cpc)
      .filter(cpc => cpc != null && cpc > 0 && isFinite(cpc))

    if (validCpcs.length === 0) {
      // Estimate based on price
      const estimatedCpc = Math.min(Math.max((product.price || 20) * 0.05, 0.5), 5.0)
      return {
        value: estimatedCpc,
        isValid: false,
        source: 'estimated',
        fallbackReason: 'No valid CPC data, estimated from price'
      }
    }

    const avgCpc = validCpcs.reduce((sum, cpc) => sum + cpc, 0) / validCpcs.length

    return this.createSafeNumber(
      avgCpc,
      CALCULATION_CONSTANTS.DEFAULT_CPC,
      { min: CALCULATION_CONSTANTS.MIN_CPC, max: CALCULATION_CONSTANTS.MAX_CPC },
      'average CPC'
    )
  }

  /**
   * Aggregate metrics from multiple products into market-level metrics
   */
  calculateMarketMetrics(products: EnhancedProduct[]): CalculationResult<MarketMetrics> {
    const validationErrors: string[] = []
    const warnings: string[] = []
    const fallbacksUsed: string[] = []

    // Filter to valid products using consistent criteria
    const validProducts = products.filter(p => this.isValidProduct(p))
    
    if (validProducts.length === 0) {
      validationErrors.push('No valid products found for market calculation')
      
      // Return empty market metrics
      const emptyMetrics: MarketMetrics = {
        avgPrice: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgMonthlySales: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgMonthlyRevenue: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgMonthlyProfit: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgProfitPerUnit: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgMargin: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgReviews: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgRating: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgBsr: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgCpc: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgLaunchBudget: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        avgDailyRevenue: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        marketGrade: 'F1',
        marketRisk: 'Unknown',
        marketConsistency: 'Unknown',
        opportunityScore: { value: 0, isValid: false, source: 'fallback', fallbackReason: 'No valid products' },
        totalProducts: products.length,
        validProducts: 0,
        isValid: false,
        validationErrors
      }

      return {
        value: emptyMetrics,
        context: this.context,
        validation: { isValid: false, errors: validationErrors, warnings },
        metadata: {
          inputCount: products.length,
          validInputCount: 0,
          calculationPath: 'empty-market-fallback',
          fallbacksUsed: ['all-metrics-fallback']
        }
      }
    }

    // Extract metrics from each valid product
    const productMetrics = validProducts.map(p => this.extractProductMetrics(p))

    // Calculate aggregated financial metrics
    const avgPrice = this.safeAverage(
      productMetrics.map(m => m.price.value),
      CALCULATION_CONSTANTS.DEFAULT_PRICE,
      'average price'
    )

    const avgMonthlySales = this.safeAverage(
      productMetrics.map(m => m.monthlySales.value),
      0,
      'average monthly sales'
    )

    const avgMonthlyRevenue = this.safeAverage(
      productMetrics.map(m => m.monthlyRevenue.value),
      0,
      'average monthly revenue'
    )

    const avgMonthlyProfit = this.safeAverage(
      productMetrics.map(m => m.monthlyProfit.value),
      0,
      'average monthly profit'
    )

    // Calculate market-level PPU using aggregated values (CRITICAL FIX)
    const avgProfitPerUnit = this.safeDivide(
      avgMonthlyProfit.value,
      avgMonthlySales.value,
      0,
      'market profit per unit'
    )

    const avgMargin = this.safeAverage(
      productMetrics.map(m => m.margin.value),
      CALCULATION_CONSTANTS.DEFAULT_MARGIN,
      'average margin'
    )

    // Calculate aggregated performance metrics
    const avgReviews = this.safeAverage(
      productMetrics.map(m => m.reviews.value),
      0,
      'average reviews'
    )

    const avgRating = this.safeAverage(
      productMetrics.map(m => m.rating.value),
      CALCULATION_CONSTANTS.DEFAULT_RATING,
      'average rating'
    )

    const avgBsr = this.safeAverage(
      productMetrics.map(m => m.bsr.value),
      500000,
      'average BSR'
    )

    const avgCpc = this.safeAverage(
      productMetrics.map(m => m.avgCpc.value),
      CALCULATION_CONSTANTS.DEFAULT_CPC,
      'average CPC'
    )

    const avgDailyRevenue = this.safeDivide(
      avgMonthlyRevenue.value,
      CALCULATION_CONSTANTS.DAYS_PER_MONTH,
      0,
      'average daily revenue'
    )

    // Estimate launch budget (10% of monthly revenue)
    const avgLaunchBudget = {
      value: avgMonthlyRevenue.value * 0.1,
      isValid: avgMonthlyRevenue.isValid,
      source: 'original' as const
    }

    // Calculate market characteristics using consistent grading
    const marketGrading = this.calculateMarketGrade(productMetrics, {
      avgPrice: avgPrice.value,
      avgMonthlyRevenue: avgMonthlyRevenue.value,
      avgMonthlyProfit: avgMonthlyProfit.value,
      avgProfitPerUnit: avgProfitPerUnit.value,
      avgMargin: avgMargin.value,
      avgReviews: avgReviews.value,
      avgRating: avgRating.value,
      avgBsr: avgBsr.value,
      avgCpc: avgCpc.value
    })

    // Collect all fallbacks used
    const allMetrics = [
      avgPrice, avgMonthlySales, avgMonthlyRevenue, avgMonthlyProfit,
      avgProfitPerUnit, avgMargin, avgReviews, avgRating, avgBsr, avgCpc,
      avgDailyRevenue
    ]

    allMetrics.forEach(metric => {
      if (!metric.isValid && metric.fallbackReason) {
        fallbacksUsed.push(metric.fallbackReason)
      }
    })

    const marketMetrics: MarketMetrics = {
      avgPrice,
      avgMonthlySales,
      avgMonthlyRevenue,
      avgMonthlyProfit,
      avgProfitPerUnit,
      avgMargin,
      avgReviews,
      avgRating,
      avgBsr,
      avgCpc,
      avgLaunchBudget,
      avgDailyRevenue,
      marketGrade: marketGrading.grade,
      marketRisk: marketGrading.risk,
      marketConsistency: marketGrading.consistency,
      opportunityScore: marketGrading.opportunityScore,
      totalProducts: products.length,
      validProducts: validProducts.length,
      isValid: validationErrors.length === 0,
      validationErrors
    }

    return {
      value: marketMetrics,
      context: this.context,
      validation: { 
        isValid: validationErrors.length === 0, 
        errors: validationErrors, 
        warnings 
      },
      metadata: {
        inputCount: products.length,
        validInputCount: validProducts.length,
        calculationPath: 'standard-market-aggregation',
        fallbacksUsed
      }
    }
  }

  /**
   * Calculate market-level grade using the same algorithm as individual products
   */
  private calculateMarketGrade(
    productMetrics: ProductMetrics[],
    aggregates: {
      avgPrice: number
      avgMonthlyRevenue: number
      avgMonthlyProfit: number
      avgProfitPerUnit: number
      avgMargin: number
      avgReviews: number
      avgRating: number
      avgBsr: number
      avgCpc: number
    }
  ) {
    // Create scoring inputs for market using aggregated values
    const scoringInputs: ScoringInputs = {
      monthlyProfit: aggregates.avgMonthlyProfit,
      price: aggregates.avgPrice,
      margin: aggregates.avgMargin,
      reviews: aggregates.avgReviews,
      avgCPC: aggregates.avgCpc,
      ppu: aggregates.avgProfitPerUnit, // Now correctly calculated
      bsr: aggregates.avgBsr,
      rating: aggregates.avgRating,
      riskClassification: this.calculateMarketRisk(productMetrics),
      consistencyRating: this.calculateMarketConsistency(productMetrics),
      opportunityScore: CALCULATION_CONSTANTS.DEFAULT_OPPORTUNITY_SCORE
    }

    // Use the same grading algorithm as individual products
    const gradingResult = calculateGrade(scoringInputs)

    return {
      grade: gradingResult.grade,
      risk: scoringInputs.riskClassification,
      consistency: scoringInputs.consistencyRating,
      opportunityScore: {
        value: gradingResult.score / 1000,
        isValid: true,
        source: 'original' as const
      }
    }
  }

  /**
   * Calculate market risk from individual product risks
   * Uses risk hierarchy: Prohibited > Medical > Breakable > Electric > Safe
   */
  private calculateMarketRisk(productMetrics: ProductMetrics[]): string {
    // Extract valid risk classifications from products
    const riskClassifications = productMetrics
      .map(p => p.riskClassification)
      .filter((risk): risk is string => Boolean(risk))
    
    if (riskClassifications.length === 0) {
      return 'Safe' // Default if no risk data available
    }
    
    // Risk hierarchy (highest risk wins)
    const riskHierarchy = ['Prohibited', 'Medical', 'Breakable', 'Electric', 'Safe']
    
    // Find the highest risk level present
    for (const risk of riskHierarchy) {
      if (riskClassifications.includes(risk)) {
        return risk
      }
    }
    
    // Fallback to most common risk classification
    const riskCounts = riskClassifications.reduce((acc, risk) => {
      acc[risk] = (acc[risk] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mostCommonRisk = Object.entries(riskCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0]
    
    return mostCommonRisk || 'Safe'
  }

  /**
   * Calculate market consistency from individual product consistency ratings
   */
  private calculateMarketConsistency(productMetrics: ProductMetrics[]): string {
    // Extract consistency ratings from products (would need to be added to ProductMetrics)
    // For now, return a default until ProductMetrics includes consistency data
    return 'Consistent'
    
    // TODO: This should be implemented when ProductMetrics includes consistencyRating:
    // const consistencyRatings = productMetrics
    //   .map(p => p.consistencyRating)
    //   .filter(Boolean)
    // 
    // if (consistencyRatings.length === 0) return 'Consistent'
    // 
    // // If any products are risky, market is risky
    // if (consistencyRatings.includes('Low') || consistencyRatings.includes('Trendy')) {
    //   return 'Low'
    // }
    // 
    // // Most common consistency rating
    // const consistencyCounts = consistencyRatings.reduce((acc, rating) => {
    //   acc[rating] = (acc[rating] || 0) + 1
    //   return acc
    // }, {} as Record<string, number>)
    // 
    // return Object.entries(consistencyCounts)
    //   .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Consistent'
  }
}

// ==================== EXPORT FACTORY FUNCTION ====================

/**
 * Create a new calculation engine instance
 */
export function createCalculationEngine(context: CalculationContext): CalculationEngine {
  return new CalculationEngine(context)
}

/**
 * Create a calculation context for different scenarios
 */
export function createCalculationContext(
  type: CalculationContext['type'],
  userId: string,
  reason?: string
): CalculationContext {
  return {
    type,
    userId,
    timestamp: new Date().toISOString(),
    reason,
    debug: process.env.NODE_ENV === 'development'
  }
}