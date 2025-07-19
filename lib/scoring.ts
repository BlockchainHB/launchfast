import type { SalesPrediction, AIAnalysis, KeywordData } from '@/types'

// Core scoring inputs interface
export interface ScoringInputs {
  monthlyProfit: number
  price: number
  margin: number
  reviews: number
  avgCPC: number
  riskClassification: string
  consistencyRating: string
  ppu: number // Price Per Unit
  bsr?: number
  rating?: number
  opportunityScore?: number
}

// Grade system mapping
const GRADE_MAPPING = {
  'A10': 100000, 'A9': 74000, 'A8': 62000, 'A7': 50000, 'A6': 40000, 'A5': 32000,
  'A4': 26000, 'A3': 20000, 'A2': 16000, 'A1': 12000,
  'B10': 10000, 'B9': 8500, 'B8': 7000, 'B7': 6000, 'B6': 5000, 'B5': 4200,
  'B4': 3500, 'B3': 3000, 'B2': 2500, 'B1': 2000,
  'C10': 1700, 'C9': 1400, 'C8': 1200, 'C7': 1000, 'C6': 850, 'C5': 700,
  'C4': 600, 'C3': 500, 'C2': 400, 'C1': 300,
  'D10': 250, 'D9': 200, 'D8': 170, 'D7': 140, 'D6': 120, 'D5': 100,
  'D4': 85, 'D3': 70, 'D2': 60, 'D1': 50,
  'F1': 0
}

// Reverse mapping for grade calculation
const PROFIT_TO_GRADE = Object.entries(GRADE_MAPPING)
  .sort(([, a], [, b]) => b - a)
  .map(([grade, profit]) => ({ grade, profit }))

// Main scoring function
export function calculateGrade(inputs: ScoringInputs): {
  grade: string
  score: number
  breakdown: ScoreBreakdown
} {
  const breakdown: ScoreBreakdown = {
    baseGrade: '',
    penaltyPoints: 0,
    boostPoints: 0,
    disqualifiers: [],
    finalGrade: '',
    details: []
  }

  // Get base grade from monthly profit
  const baseGrade = getBaseGrade(inputs.monthlyProfit)
  breakdown.baseGrade = baseGrade
  breakdown.details.push(`Base grade from $${inputs.monthlyProfit}/month profit: ${baseGrade}`)

  // Check instant disqualifiers
  const disqualifiers = checkDisqualifiers(inputs)
  if (disqualifiers.length > 0) {
    breakdown.disqualifiers = disqualifiers
    breakdown.finalGrade = disqualifiers.includes('Banned Product') ? 'F1' : 'D1'
    breakdown.details.push(`Instant disqualifier: ${disqualifiers.join(', ')}`)
    
    return {
      grade: breakdown.finalGrade,
      score: 0,
      breakdown
    }
  }

  // Calculate penalty points
  const penalties = calculatePenalties(inputs)
  breakdown.penaltyPoints = penalties.total
  breakdown.details.push(...penalties.details)

  // Calculate boost points
  const boosts = calculateBoosts(inputs)
  breakdown.boostPoints = boosts.total
  breakdown.details.push(...boosts.details)

  // Apply grade adjustments
  const netAdjustment = breakdown.boostPoints - breakdown.penaltyPoints
  const adjustedGrade = adjustGrade(baseGrade, netAdjustment)
  breakdown.details.push(`Net adjustment: ${netAdjustment} points`)

  // Apply A10 gate restrictions
  const finalGrade = applyA10Gate(adjustedGrade, inputs)
  breakdown.finalGrade = finalGrade

  if (finalGrade !== adjustedGrade) {
    breakdown.details.push(`A10 gate applied: ${adjustedGrade} → ${finalGrade}`)
  }

  // Calculate numerical score for sorting
  const score = calculateNumericalScore(finalGrade, netAdjustment)

  return {
    grade: finalGrade,
    score,
    breakdown
  }
}

// Get base grade from monthly profit
function getBaseGrade(monthlyProfit: number): string {
  for (const { grade, profit } of PROFIT_TO_GRADE) {
    if (monthlyProfit >= profit) {
      return grade
    }
  }
  return 'F1'
}

// Check for instant disqualifiers
function checkDisqualifiers(inputs: ScoringInputs): string[] {
  const disqualifiers: string[] = []

  if (inputs.price < 25) {
    disqualifiers.push('Price below $25')
  }

  if (inputs.margin < 0.15) {
    disqualifiers.push('Margin below 15%')
  }

  if (inputs.riskClassification === 'Banned') {
    disqualifiers.push('Banned Product')
  }

  if (inputs.consistencyRating === 'Trendy') {
    disqualifiers.push('Trendy Product')
  }

  return disqualifiers
}

// Calculate penalty points
function calculatePenalties(inputs: ScoringInputs): { total: number; details: string[] } {
  let total = 0
  const details: string[] = []

  // Review penalties
  if (inputs.reviews >= 500) {
    total += 9
    details.push('High competition: 500+ reviews (-9 pts)')
  } else if (inputs.reviews >= 200) {
    total += 5
    details.push('Medium competition: 200+ reviews (-5 pts)')
  } else if (inputs.reviews >= 50) {
    total += 1
    details.push('Low competition: 50+ reviews (-1 pt)')
  }

  // CPC penalties
  if (inputs.avgCPC >= 2.50) {
    total += 3
    details.push('High advertising cost: $2.50+ CPC (-3 pts)')
  }

  // Risk penalties
  if (inputs.riskClassification === 'Electric') {
    total += 4
    details.push('Electric product risk (-4 pts)')
  } else if (inputs.riskClassification === 'Breakable') {
    total += 5
    details.push('Breakable product risk (-5 pts)')
  }

  // Margin penalties - Recalibrated for dynamic Amazon fee structure
  if (inputs.margin < 0.25) {
    total += 3
    details.push('Low margin: <25% (-3 pts)')
  }
  if (inputs.margin < 0.20) {
    total += 3
    details.push('Very low margin: <20% (-3 pts)')
  }

  // BSR penalties (if available)
  if (inputs.bsr && inputs.bsr > 100000) {
    total += 2
    details.push('Poor BSR: >100,000 (-2 pts)')
  }

  // Rating penalties
  if (inputs.rating && inputs.rating < 4.0) {
    total += 3
    details.push('Low rating: <4.0 stars (-3 pts)')
  }

  return { total, details }
}

// Calculate boost points
function calculateBoosts(inputs: ScoringInputs): { total: number; details: string[] } {
  let total = 0
  const details: string[] = []

  // Low CPC boost
  if (inputs.avgCPC < 0.50) {
    total += 2
    details.push('Low advertising cost: <$0.50 CPC (+2 pts)')
  } else if (inputs.avgCPC < 1.00) {
    total += 1
    details.push('Moderate advertising cost: <$1.00 CPC (+1 pt)')
  }

  // High margin + good PPU boost - Recalibrated for dynamic Amazon fees
  if (inputs.margin >= 0.45 && inputs.ppu >= 0.20) {
    total += 4
    details.push('Excellent margins: 45%+ margin + 20%+ PPU (+4 pts)')
  } else if (inputs.margin >= 0.35) {
    total += 2
    details.push('Good margin: 35%+ (+2 pts)')
  } else if (inputs.margin >= 0.30) {
    total += 1
    details.push('Decent margin: 30%+ (+1 pt)')
  }

  // Low competition boost
  if (inputs.reviews < 20) {
    total += 2
    details.push('Very low competition: <20 reviews (+2 pts)')
  }

  // High opportunity score boost
  if (inputs.opportunityScore && inputs.opportunityScore >= 8) {
    total += 2
    details.push('High AI opportunity score: 8+ (+2 pts)')
  }

  // Good BSR boost
  if (inputs.bsr && inputs.bsr < 10000) {
    total += 1
    details.push('Good BSR: <10,000 (+1 pt)')
  }

  return { total, details }
}

// Adjust grade based on points
function adjustGrade(baseGrade: string, adjustment: number): string {
  const grades = Object.keys(GRADE_MAPPING)
  const currentIndex = grades.indexOf(baseGrade)
  
  if (currentIndex === -1) return baseGrade

  // Each point roughly equals one grade step
  const newIndex = Math.max(0, Math.min(grades.length - 1, currentIndex - adjustment))
  return grades[newIndex]
}

// Apply A10 gate restrictions
function applyA10Gate(grade: string, inputs: ScoringInputs): string {
  if (grade !== 'A10') return grade

  // Strict A10 requirements
  const requirements = [
    inputs.monthlyProfit >= 100000,
    inputs.reviews < 50,
    inputs.avgCPC < 0.50,
    inputs.margin >= 0.50,
    inputs.ppu >= 0.20
  ]

  if (requirements.every(req => req)) {
    return 'A10'
  }

  return 'A9'
}

// Calculate numerical score for sorting
function calculateNumericalScore(grade: string, adjustment: number): number {
  const baseScore = GRADE_MAPPING[grade as keyof typeof GRADE_MAPPING] || 0
  return baseScore + (adjustment * 1000) // Adjustment boost for tie-breaking
}

// Score breakdown interface
export interface ScoreBreakdown {
  baseGrade: string
  penaltyPoints: number
  boostPoints: number
  disqualifiers: string[]
  finalGrade: string
  details: string[]
}

// Comprehensive product scoring function
export function scoreProduct(
  product: any,
  salesData: SalesPrediction,
  aiAnalysis: AIAnalysis,
  keywordData: KeywordData[] = []
): {
  grade: string
  score: number
  breakdown: ScoreBreakdown
  inputs: ScoringInputs
} {
  // Calculate average CPC from keywords
  const avgCPC = keywordData.length > 0 
    ? keywordData.reduce((sum, kw) => sum + kw.cpc, 0) / keywordData.length
    : 0

  const inputs: ScoringInputs = {
    monthlyProfit: salesData.monthlyProfit,
    price: product.price,
    margin: salesData.margin,
    reviews: product.reviews,
    avgCPC,
    riskClassification: aiAnalysis.riskClassification,
    consistencyRating: aiAnalysis.consistencyRating,
    ppu: salesData.ppu,
    bsr: product.bsr,
    rating: product.rating,
    opportunityScore: aiAnalysis.opportunityScore
  }

  const result = calculateGrade(inputs)

  return {
    ...result,
    inputs
  }
}

// Preliminary scoring for Apify data only (before SellerSprite verification)
export function scoreApifyProduct(apifyProduct: any): {
  score: number
  estimatedGrade: string
  reasoning: string[]
} {
  let score = 50 // Base score
  const reasoning: string[] = []

  // Price scoring (higher prices often = better margins)
  if (apifyProduct.price.value >= 25) {
    if (apifyProduct.price.value >= 50) {
      score += 15
      reasoning.push(`Good price point: $${apifyProduct.price.value} (+15 pts)`)
    } else {
      score += 8
      reasoning.push(`Acceptable price: $${apifyProduct.price.value} (+8 pts)`)
    }
  } else {
    score -= 20
    reasoning.push(`Price too low: $${apifyProduct.price.value} (-20 pts)`)
  }

  // Competition scoring (fewer reviews = less competition)
  if (apifyProduct.reviewsCount < 20) {
    score += 25
    reasoning.push(`Very low competition: ${apifyProduct.reviewsCount} reviews (+25 pts)`)
  } else if (apifyProduct.reviewsCount < 50) {
    score += 15
    reasoning.push(`Low competition: ${apifyProduct.reviewsCount} reviews (+15 pts)`)
  } else if (apifyProduct.reviewsCount < 200) {
    score += 5
    reasoning.push(`Medium competition: ${apifyProduct.reviewsCount} reviews (+5 pts)`)
  } else if (apifyProduct.reviewsCount < 500) {
    score -= 5
    reasoning.push(`High competition: ${apifyProduct.reviewsCount} reviews (-5 pts)`)
  } else {
    score -= 15
    reasoning.push(`Very high competition: ${apifyProduct.reviewsCount} reviews (-15 pts)`)
  }

  // Rating scoring (quality indicator)
  if (apifyProduct.stars >= 4.5) {
    score += 10
    reasoning.push(`Excellent rating: ${apifyProduct.stars} stars (+10 pts)`)
  } else if (apifyProduct.stars >= 4.0) {
    score += 5
    reasoning.push(`Good rating: ${apifyProduct.stars} stars (+5 pts)`)
  } else if (apifyProduct.stars < 3.5) {
    score -= 10
    reasoning.push(`Poor rating: ${apifyProduct.stars} stars (-10 pts)`)
  }

  // Category opportunity scoring (basic risk assessment)
  const category = apifyProduct.breadCrumbs?.toLowerCase() || ''
  if (category.includes('automotive') || category.includes('truck') || category.includes('vehicle')) {
    score += 10
    reasoning.push(`Niche automotive category (+10 pts)`)
  }
  if (category.includes('electronics') && !category.includes('accessories')) {
    score -= 10
    reasoning.push(`High-risk electronics category (-10 pts)`)
  }

  // Title relevance (does title match what we're looking for?)
  const title = apifyProduct.title.toLowerCase()
  if (title.includes('truck') && title.includes('flag')) {
    score += 15
    reasoning.push(`Highly relevant product title (+15 pts)`)
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score))

  // Convert score to estimated grade
  let estimatedGrade = 'F1'
  if (score >= 85) estimatedGrade = 'A1-A5'
  else if (score >= 70) estimatedGrade = 'B1-B5'
  else if (score >= 55) estimatedGrade = 'C1-C5'
  else if (score >= 40) estimatedGrade = 'D1-D5'

  return {
    score,
    estimatedGrade,
    reasoning
  }
}

// Utility functions
export const scoringUtils = {
  // Get grade color for UI
  getGradeColor: (grade: string): string => {
    if (grade.startsWith('A')) return 'text-green-600'
    if (grade.startsWith('B')) return 'text-blue-600'
    if (grade.startsWith('C')) return 'text-yellow-600'
    if (grade.startsWith('D')) return 'text-orange-600'
    return 'text-red-600'
  },

  // Get grade description
  getGradeDescription: (grade: string): string => {
    if (grade.startsWith('A')) return 'Excellent Opportunity'
    if (grade.startsWith('B')) return 'Good Opportunity'
    if (grade.startsWith('C')) return 'Fair Opportunity'
    if (grade.startsWith('D')) return 'Poor Opportunity'
    return 'Not Recommended'
  },

  // Sort products by score
  sortProductsByScore: (products: any[]): any[] => {
    return products.sort((a, b) => (b.score || 0) - (a.score || 0))
  },

  // Filter products by grade
  filterProductsByGrade: (products: any[], minGrade: string): any[] => {
    const gradeOrder = Object.keys(GRADE_MAPPING)
    const minIndex = gradeOrder.indexOf(minGrade)
    
    return products.filter(product => {
      const productIndex = gradeOrder.indexOf(product.grade)
      return productIndex <= minIndex
    })
  },

  // Calculate profit per hour based on time investment
  calculateProfitPerHour: (monthlyProfit: number, hoursPerWeek: number = 10): number => {
    const monthlyHours = hoursPerWeek * 4.33 // Average weeks per month
    return monthlyHours > 0 ? monthlyProfit / monthlyHours : 0
  }
}