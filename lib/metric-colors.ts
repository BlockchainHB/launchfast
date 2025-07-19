/**
 * Metric-specific color functions based on A10 grading algorithm thresholds
 * These functions return Tailwind CSS classes for consistent styling across the dashboard
 */

// Price coloring based on A10 algorithm thresholds
export const getPriceColor = (price: number): string => {
  // INSTANT DISQUALIFIER: Below $25 = F1 grade 
  if (price < 25) return 'text-red-600 font-bold border-l-4 border-red-500 pl-2 bg-red-50/50 dark:bg-red-900/30' 
  
  // Safe zones (no penalties)
  if (price >= 75) return 'text-emerald-600 font-bold' // Premium range
  if (price >= 50) return 'text-emerald-600 font-semibold' // Excellent range  
  if (price >= 35) return 'text-blue-600 font-medium' // Good range
  if (price >= 25) return 'text-green-600' // Minimum acceptable (safe)
  
  return 'text-red-600 font-semibold' // Fallback
}

// Monthly Revenue coloring with profit thresholds from GRADE_MAPPING
export const getMonthlyRevenueColor = (revenue: number): string => {
  if (revenue >= 100000) return 'text-emerald-600 font-bold' // A10 level ($100k+)
  if (revenue >= 50000) return 'text-emerald-600 font-semibold' // High A-tier ($50k+)
  if (revenue >= 20000) return 'text-emerald-500 font-medium' // Mid A-tier ($20k+)
  if (revenue >= 10000) return 'text-blue-600 font-semibold' // B10 level ($10k+)
  if (revenue >= 5000) return 'text-blue-500' // Mid B-tier ($5k+)
  if (revenue >= 2000) return 'text-blue-400' // Low B-tier ($2k+)
  if (revenue >= 1000) return 'text-amber-600' // C-tier range ($1k+)
  if (revenue >= 300) return 'text-orange-600' // D-tier range ($300+)
  return 'text-red-600' // Below D-tier minimum
}

// Daily Revenue coloring (Monthly Revenue / 30)
export const getDailyRevenueColor = (dailyRevenue: number): string => {
  const monthlyEquivalent = dailyRevenue * 30
  return getMonthlyRevenueColor(monthlyEquivalent)
}

// Profit Margin coloring based on A10 algorithm penalties/boosts
export const getProfitMarginColor = (margin: number): string => {
  // INSTANT DISQUALIFIER: Below 15% = F1 grade (Recalibrated for dynamic Amazon fees)
  if (margin < 15) return 'text-red-600 font-bold border-l-4 border-red-500 pl-2 bg-red-50/50 dark:bg-red-900/30'
  
  // A10 GATE REQUIREMENT: 45%+ = excellent margins + A10 gate requirement
  if (margin >= 45) return 'text-emerald-600 font-bold ring-1 ring-emerald-400/30 px-1 rounded'
  
  // BOOST POINTS: 35%+ = good margins boost points
  if (margin >= 35) return 'text-emerald-600 font-semibold'
  
  // SAFE ZONE: 30%+ = decent margin boost, no penalty
  if (margin >= 30) return 'text-emerald-500'
  
  // SAFE ZONE: 25%+ = no penalty
  if (margin >= 25) return 'text-blue-600'
  
  // PENALTY ZONES: Major penalties for very low margins
  if (margin >= 20) return 'text-amber-600 border-l-2 border-amber-400 pl-1' // 20-25% = -3 penalty points
  if (margin >= 15) return 'text-orange-600 border-l-2 border-orange-400 pl-1' // 15-20% = -6 total penalty points
  
  return 'text-red-600 font-semibold' // Fallback
}

// Fulfillment Fees coloring (lower is better - inverse logic)
export const getFulfillmentFeesColor = (fees: number): string => {
  if (fees <= 2) return 'text-emerald-600 font-semibold' // Excellent - very low fees
  if (fees <= 3) return 'text-emerald-500' // Good - low fees
  if (fees <= 4) return 'text-blue-600' // Acceptable fees
  if (fees <= 5) return 'text-blue-400' // Higher but manageable
  if (fees <= 6) return 'text-amber-600' // Warning - getting expensive
  if (fees <= 8) return 'text-orange-600' // Poor - high fees
  return 'text-red-600' // Very poor - excessive fees
}

// BSR (Best Seller Rank) coloring (lower is better)
export const getBSRColor = (bsr: number): string => {
  if (bsr <= 1000) return 'text-emerald-600 font-bold' // Excellent ranking
  if (bsr <= 5000) return 'text-emerald-600' // Very good ranking
  if (bsr <= 10000) return 'text-blue-600' // Good ranking (boost point threshold)
  if (bsr <= 25000) return 'text-blue-400' // Decent ranking
  if (bsr <= 50000) return 'text-amber-600' // Average ranking
  if (bsr <= 100000) return 'text-orange-600' // Poor ranking (penalty threshold)
  return 'text-red-600' // Very poor ranking
}

// Rating coloring based on A10 algorithm penalties
export const getRatingColor = (rating: number): string => {
  if (rating === 0) return 'text-gray-400' // No rating yet
  
  // PENALTY: Below 4.0 = -3 penalty points
  if (rating < 4.0) return 'text-red-600 font-bold border-l-2 border-red-400 pl-1 bg-red-50/30 dark:bg-red-900/20'
  
  // SAFE ZONES: No penalties
  if (rating >= 4.5) return 'text-emerald-600 font-semibold' // Excellent rating
  if (rating >= 4.2) return 'text-emerald-500' // Very good rating
  if (rating >= 4.0) return 'text-blue-600' // Good rating (no penalty threshold)
  
  return 'text-blue-600' // Fallback
}

// Review Count coloring (competition analysis - lower is better for opportunity)
export const getReviewCountColor = (reviews: number): string => {
  // BOOST POINTS: Very low competition
  if (reviews < 20) return 'text-emerald-600 font-bold ring-1 ring-emerald-400/30 px-1 rounded' // +2 boost points
  
  // A10 GATE REQUIREMENT: Low competition
  if (reviews < 50) return 'text-emerald-600 font-semibold' // A10 gate requirement
  
  // SAFE ZONES: No penalties yet
  if (reviews < 200) return 'text-blue-600' // Safe zone
  
  // PENALTY ZONES: Competition penalties
  if (reviews < 500) return 'text-amber-600 border-l-2 border-amber-400 pl-1' // -5 penalty points
  
  // MAJOR PENALTIES: High competition
  return 'text-red-600 font-bold border-l-2 border-red-400 pl-1 bg-red-50/30 dark:bg-red-900/20' // -9 penalty points
}

// CPC (Cost Per Click) coloring based on A10 algorithm thresholds
export const getCPCColor = (cpc: number): string => {
  // A10 GATE REQUIREMENT + BOOST: <$0.50 = +2 boost points + A10 gate requirement
  if (cpc < 0.50) return 'text-emerald-600 font-bold ring-1 ring-emerald-400/30 px-1 rounded'
  
  // BOOST POINTS: <$1.00 = +1 boost point
  if (cpc < 1.00) return 'text-emerald-600 font-semibold'
  
  // SAFE ZONES: No penalties
  if (cpc < 2.50) return 'text-blue-600' // Safe zone
  
  // PENALTY: ≥$2.50 = -3 penalty points
  return 'text-red-600 font-bold border-l-2 border-red-400 pl-1 bg-red-50/30 dark:bg-red-900/20'
}

// Launch Budget coloring (based on calculated CPC averages)
export const getLaunchBudgetColor = (budget: number): string => {
  if (budget <= 500) return 'text-emerald-600 font-semibold' // Low launch cost
  if (budget <= 1000) return 'text-emerald-500' // Reasonable launch cost
  if (budget <= 2000) return 'text-blue-600' // Moderate launch cost
  if (budget <= 3000) return 'text-blue-400' // Higher launch cost
  if (budget <= 5000) return 'text-amber-600' // Expensive launch
  if (budget <= 8000) return 'text-orange-600' // Very expensive launch
  return 'text-red-600' // Extremely expensive launch
}

// Generic percentage coloring (for profit per unit, margins, etc.)
export const getPercentageColor = (percentage: number, goodThreshold: number = 30, excellentThreshold: number = 50): string => {
  if (percentage >= excellentThreshold) return 'text-emerald-600 font-semibold'
  if (percentage >= goodThreshold) return 'text-blue-600'
  if (percentage >= goodThreshold * 0.8) return 'text-amber-600'
  if (percentage >= goodThreshold * 0.6) return 'text-orange-600'
  return 'text-red-600'
}

// Currency formatting with color (for revenue, profit, etc.)
export const formatCurrencyWithColor = (amount: number, colorFunction: (amount: number) => string): string => {
  const color = colorFunction(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  
  return `<span class="${color}">${formatted}</span>`
}

// Number formatting with color and suffix (for review counts, BSR, etc.)
export const formatNumberWithColor = (number: number, colorFunction: (number: number) => string, suffix: string = ''): string => {
  const color = colorFunction(number)
  const formatted = new Intl.NumberFormat('en-US').format(number)
  
  return `<span class="${color}">${formatted}${suffix}</span>`
}