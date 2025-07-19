// Risk assessment utilities for A10 grading system
// Identifies products with warning signs or high-risk characteristics

interface ProductData {
  grade?: string
  price?: number
  salesData?: {
    monthlyRevenue?: number
    margin?: number
  }
  calculatedMetrics?: {
    fulfillmentFees?: number
    dailyRevenue?: number
  }
  reviews?: number
  rating?: number
  keywords?: Array<{
    cpc?: number
    [key: string]: any
  }>
}

interface RiskAssessment {
  isRisky: boolean
  hasWarnings: boolean
  riskFactors: string[]
  warningFactors: string[]
}

export function assessProductRisk(product: ProductData): RiskAssessment {
  const riskFactors: string[] = []
  const warningFactors: string[] = []
  
  // Calculate average CPC from keywords
  const keywords = product.keywords || []
  const avgCpc = keywords.length > 0
    ? keywords.reduce((sum, kw) => sum + (kw?.cpc || 0), 0) / keywords.length
    : 0
  
  // CRITICAL RISK FACTORS (Based on A10 Algorithm Disqualifiers)
  
  // A10 Instant Disqualifiers = Critical Risk
  if ((product.price || 0) < 25) {
    riskFactors.push('INSTANT DISQUALIFIER: Price below $25')
  }
  
  if ((product.salesData?.margin || 0) < 0.25) {
    riskFactors.push('INSTANT DISQUALIFIER: Margin below 25%')
  }
  
  // Major Penalty Risk Factors
  if ((product.rating || 0) < 4.0 && (product.rating || 0) > 0) {
    riskFactors.push('PENALTY: Poor rating (<4.0) = -3 penalty points')
  }
  
  if (avgCpc >= 2.50) {
    riskFactors.push('PENALTY: High CPC (≥$2.50) = -3 penalty points')
  }
  
  if ((product.reviews || 0) >= 500) {
    riskFactors.push('PENALTY: High competition (500+ reviews) = -9 penalty points')
  }
  
  // F-grade products are algorithmically risky
  if (product.grade?.toUpperCase().startsWith('F')) {
    riskFactors.push('F-GRADE: Failed A10 algorithm completely')
  }
  
  // WARNING FACTORS (Based on A10 Algorithm Penalties)
  
  // Medium penalty zones
  if ((product.reviews || 0) >= 200 && (product.reviews || 0) < 500) {
    warningFactors.push('PENALTY ZONE: 200+ reviews = -5 penalty points')
  }
  
  if ((product.salesData?.margin || 0) >= 0.25 && (product.salesData?.margin || 0) < 0.30) {
    warningFactors.push('PENALTY ZONE: Margin <30% = -2 penalty points')
  }
  
  if ((product.salesData?.margin || 0) >= 0.25 && (product.salesData?.margin || 0) < 0.28) {
    warningFactors.push('PENALTY ZONE: Margin <28% = -4 total penalty points')
  }
  
  // A10 Gate Warning (missing A10 requirements)
  if (product.grade?.toUpperCase().startsWith('A') && product.grade !== 'A10') {
    const failedA10Requirements = []
    if ((product.salesData?.monthlyRevenue || 0) < 100000) {
      failedA10Requirements.push('Monthly profit <$100k')
    }
    if ((product.reviews || 0) >= 50) {
      failedA10Requirements.push('Reviews ≥50')
    }
    if ((product.cpc || 0) >= 0.50) {
      failedA10Requirements.push('CPC ≥$0.50')
    }
    if ((product.salesData?.margin || 0) < 0.50) {
      failedA10Requirements.push('Margin <50%')
    }
    
    if (failedA10Requirements.length > 0) {
      warningFactors.push(`A10 GATE: Missing requirements (${failedA10Requirements.join(', ')})`)
    }
  }
  
  // D and E grades indicate algorithm penalties
  if (product.grade?.toUpperCase().startsWith('D') || product.grade?.toUpperCase().startsWith('E')) {
    warningFactors.push('LOW GRADE: Significant A10 algorithm penalties applied')
  }
  
  return {
    isRisky: riskFactors.length > 0,
    hasWarnings: warningFactors.length > 0,
    riskFactors,
    warningFactors
  }
}

export function getRiskLevel(product: ProductData): 'safe' | 'caution' | 'risky' {
  const assessment = assessProductRisk(product)
  
  if (assessment.isRisky) return 'risky'
  if (assessment.hasWarnings) return 'caution'
  return 'safe'
}

export function getRiskTooltip(product: ProductData): string {
  const assessment = assessProductRisk(product)
  
  if (!assessment.isRisky && !assessment.hasWarnings) {
    return 'Product meets safety criteria'
  }
  
  const allFactors = [...assessment.riskFactors, ...assessment.warningFactors]
  return allFactors.join(' • ')
}