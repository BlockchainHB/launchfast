import OpenAI from 'openai'
import { cache, CACHE_TTL, cacheHelpers } from './cache'
import type { ProductData, AIAnalysis, ProcessedReviews } from '@/types'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// Enhanced AI Analysis interface with additional fields
export interface EnhancedAIAnalysis extends AIAnalysis {
  confidence: number
  processingTime: number
  modelUsed: string
}

// Enhanced product analysis function with negative review insights
export async function analyzeProductWithReviews(
  productData: ProductData, 
  reviewsData?: ProcessedReviews
): Promise<AIAnalysis> {
  // Check cache first (use reviews in cache key if available)
  const cacheKey = reviewsData ? `${productData.asin}_with_reviews` : productData.asin
  const cached = await cacheHelpers.getAIAnalysis(cacheKey)
  if (cached) return cached as AIAnalysis

  const startTime = Date.now()

  try {
    // Build enhanced prompt with negative review analysis
    let prompt = `Analyze this Amazon product for FBA business opportunity with competitive differentiation insights:

Product Details:
- Title: ${productData.title}
- Brand: ${productData.brand || 'Unknown'}
- Price: $${productData.price}
- Category: ${productData.category || 'Unknown'}
- BSR: ${productData.bsr || 'Unknown'}
- Reviews: ${productData.reviews}
- Rating: ${productData.rating}/5`

    // Add negative review analysis for competitive differentiation
    if (reviewsData && reviewsData.negative.length > 0) {
      prompt += `

NEGATIVE CUSTOMER FEEDBACK (1-3 star reviews):
${reviewsData.negative.slice(0, 10).map(review => 
  `"${review.text}" (${review.rating}⭐)`
).join('\n')}

Focus on competitive differentiation opportunities:
1. What common complaints could be solved with product improvements?
2. What features are customers demanding but missing?
3. What quality issues create opportunities for better products?
4. What design flaws could competitors improve upon?`
    }

    prompt += `

Please provide a comprehensive analysis focusing on:
1. Risk classification for Amazon selling
2. Market demand consistency
3. Physical product characteristics
4. Business opportunity scoring
5. Market insights and competitive differentiation opportunities
6. Potential risk factors

Be specific and practical in your analysis.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Amazon FBA business analyst specializing in product sourcing, competitive analysis, and market differentiation. Analyze customer feedback to identify improvement opportunities that competitors could exploit.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      functions: [{
        name: 'analyzeProductOpportunity',
        description: 'Analyze Amazon product for comprehensive business opportunity with competitive insights',
        parameters: {
          type: 'object',
          properties: {
            riskClassification: {
              type: 'string',
              enum: ['Electric', 'Breakable', 'Banned', 'No Risk'],
              description: 'Primary risk category for Amazon selling'
            },
            consistencyRating: {
              type: 'string',
              enum: ['Consistent', 'Seasonal', 'Trendy'],
              description: 'Market demand consistency pattern'
            },
            estimatedDimensions: {
              type: 'string',
              description: 'Estimated package dimensions in inches (L x W x H)'
            },
            estimatedWeight: {
              type: 'string',
              description: 'Estimated product weight in pounds'
            },
            opportunityScore: {
              type: 'number',
              minimum: 0,
              maximum: 10,
              description: 'Overall business opportunity score (0-10)'
            },
            marketInsights: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key market insights and trends'
            },
            riskFactors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific risk factors to consider'
            },
            competitiveDifferentiation: {
              type: 'object',
              description: 'Competitive differentiation opportunities from customer feedback',
              properties: {
                commonComplaints: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Common customer complaints that could be addressed'
                },
                improvementOpportunities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific product improvement opportunities'
                },
                missingFeatures: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Features customers want but are missing'
                },
                qualityIssues: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Quality issues that create competitive opportunities'
                }
              }
            }
          },
          required: ['riskClassification', 'consistencyRating', 'opportunityScore', 'marketInsights', 'riskFactors']
        }
      }],
      function_call: { name: 'analyzeProductOpportunity' },
      temperature: 0.3,
      max_tokens: 1500
    })

    const processingTime = Date.now() - startTime
    const functionCall = response.choices[0].message.function_call

    if (!functionCall || !functionCall.arguments) {
      throw new Error('Invalid OpenAI response format')
    }

    const analysis = JSON.parse(functionCall.arguments) as AIAnalysis

    // Validate the analysis
    if (!analysis.riskClassification || !analysis.consistencyRating || typeof analysis.opportunityScore !== 'number') {
      throw new Error('Incomplete analysis from OpenAI')
    }

    // Ensure arrays are properly formatted
    analysis.marketInsights = analysis.marketInsights || []
    analysis.riskFactors = analysis.riskFactors || []

    // Set defaults for optional fields
    analysis.estimatedDimensions = analysis.estimatedDimensions || 'Unknown'
    analysis.estimatedWeight = analysis.estimatedWeight || 'Unknown'

    // Cache the result
    await cacheHelpers.setAIAnalysis(cacheKey, analysis)

    return analysis

  } catch (error) {
    console.error('OpenAI enhanced analysis error:', error)
    
    // Return fallback analysis
    return {
      riskClassification: 'No Risk',
      consistencyRating: 'Consistent',
      estimatedDimensions: 'Unknown',
      estimatedWeight: 'Unknown',
      opportunityScore: 5,
      marketInsights: ['Analysis unavailable - using fallback data'],
      riskFactors: ['Unable to perform detailed risk analysis']
    }
  }
}

// Main product analysis function (backward compatibility)
export async function analyzeProduct(productData: ProductData): Promise<AIAnalysis> {
  // Check cache first
  const cached = await cacheHelpers.getAIAnalysis(productData.asin)
  if (cached) return cached as AIAnalysis

  const startTime = Date.now()

  try {
    const prompt = `Analyze this Amazon product for business opportunity assessment:

Product Details:
- Title: ${productData.title}
- Brand: ${productData.brand || 'Unknown'}
- Price: $${productData.price}
- Category: ${productData.category || 'Unknown'}
- BSR: ${productData.bsr || 'Unknown'}
- Reviews: ${productData.reviews}
- Rating: ${productData.rating}/5

Please provide a comprehensive analysis focusing on:
1. Risk classification for Amazon selling
2. Market demand consistency
3. Physical product characteristics
4. Business opportunity scoring
5. Market insights and trends
6. Potential risk factors

Be specific and practical in your analysis.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Amazon FBA business analyst with deep knowledge of product sourcing, market analysis, and e-commerce risk assessment. Provide accurate, actionable insights based on the product data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      functions: [{
        name: 'analyzeProduct',
        description: 'Analyze Amazon product for comprehensive business opportunity assessment',
        parameters: {
          type: 'object',
          properties: {
            riskClassification: {
              type: 'string',
              enum: ['Electric', 'Breakable', 'Banned', 'No Risk'],
              description: 'Primary risk category for Amazon selling'
            },
            consistencyRating: {
              type: 'string',
              enum: ['Consistent', 'Seasonal', 'Trendy'],
              description: 'Market demand consistency pattern'
            },
            estimatedDimensions: {
              type: 'string',
              description: 'Estimated package dimensions in inches (L x W x H)'
            },
            estimatedWeight: {
              type: 'string',
              description: 'Estimated product weight in pounds'
            },
            opportunityScore: {
              type: 'number',
              minimum: 0,
              maximum: 10,
              description: 'Overall business opportunity score (0-10)'
            },
            marketInsights: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key market insights and trends'
            },
            riskFactors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific risk factors to consider'
            }
          },
          required: ['riskClassification', 'consistencyRating', 'opportunityScore', 'marketInsights', 'riskFactors']
        }
      }],
      function_call: { name: 'analyzeProduct' },
      temperature: 0.3,
      max_tokens: 1000
    })

    const processingTime = Date.now() - startTime
    const functionCall = response.choices[0].message.function_call

    if (!functionCall || !functionCall.arguments) {
      throw new Error('Invalid OpenAI response format')
    }

    const analysis = JSON.parse(functionCall.arguments) as AIAnalysis

    // Validate the analysis
    if (!analysis.riskClassification || !analysis.consistencyRating || typeof analysis.opportunityScore !== 'number') {
      throw new Error('Incomplete analysis from OpenAI')
    }

    // Ensure arrays are properly formatted
    analysis.marketInsights = analysis.marketInsights || []
    analysis.riskFactors = analysis.riskFactors || []

    // Set defaults for optional fields
    analysis.estimatedDimensions = analysis.estimatedDimensions || 'Unknown'
    analysis.estimatedWeight = analysis.estimatedWeight || 'Unknown'

    // Cache the result
    await cacheHelpers.setAIAnalysis(productData.asin, analysis)

    return analysis

  } catch (error) {
    console.error('OpenAI analysis error:', error)
    
    // Return fallback analysis
    return {
      riskClassification: 'No Risk',
      consistencyRating: 'Consistent',
      estimatedDimensions: 'Unknown',
      estimatedWeight: 'Unknown',
      opportunityScore: 5,
      marketInsights: ['Analysis unavailable - using fallback data'],
      riskFactors: ['Unable to perform detailed risk analysis']
    }
  }
}

// Batch analysis for multiple products
export async function analyzeProductsBatch(products: ProductData[]): Promise<Map<string, AIAnalysis>> {
  const results = new Map<string, AIAnalysis>()
  
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (product) => {
      try {
        const analysis = await analyzeProduct(product)
        return { asin: product.asin, analysis }
      } catch (error) {
        console.error(`Error analyzing product ${product.asin}:`, error)
        return {
          asin: product.asin,
          analysis: {
            riskClassification: 'No Risk' as const,
            consistencyRating: 'Consistent' as const,
            estimatedDimensions: 'Unknown',
            estimatedWeight: 'Unknown',
            opportunityScore: 5,
            marketInsights: ['Analysis failed'],
            riskFactors: ['Unable to analyze']
          }
        }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    
    batchResults.forEach(({ asin, analysis }) => {
      results.set(asin, analysis)
    })

    // Add delay between batches to respect rate limits
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

// Utility function to enhance product analysis with market context
export async function enhanceProductAnalysis(
  productData: ProductData,
  marketData?: {
    competitors: number
    avgPrice: number
    avgRating: number
    marketTrend: 'growing' | 'stable' | 'declining'
  }
): Promise<AIAnalysis> {
  const baseAnalysis = await analyzeProduct(productData)

  if (!marketData) {
    return baseAnalysis
  }

  // Enhance insights with market context
  const enhancedInsights = [...baseAnalysis.marketInsights]

  if (marketData.competitors > 100) {
    enhancedInsights.push('High competition market - consider differentiation strategy')
  } else if (marketData.competitors < 20) {
    enhancedInsights.push('Low competition opportunity - potential for market entry')
  }

  if (productData.price > marketData.avgPrice * 1.2) {
    enhancedInsights.push('Premium pricing vs market average')
  } else if (productData.price < marketData.avgPrice * 0.8) {
    enhancedInsights.push('Competitive pricing advantage')
  }

  if (productData.rating > marketData.avgRating + 0.5) {
    enhancedInsights.push('Above average product quality ratings')
  }

  // Adjust opportunity score based on market trends
  let adjustedScore = baseAnalysis.opportunityScore
  if (marketData.marketTrend === 'growing') {
    adjustedScore = Math.min(10, adjustedScore + 1)
  } else if (marketData.marketTrend === 'declining') {
    adjustedScore = Math.max(0, adjustedScore - 1)
  }

  return {
    ...baseAnalysis,
    opportunityScore: adjustedScore,
    marketInsights: enhancedInsights
  }
}

// Function to validate and sanitize AI analysis results
export function validateAIAnalysis(analysis: any): AIAnalysis {
  const validRiskClassifications = ['Electric', 'Breakable', 'Banned', 'No Risk']
  const validConsistencyRatings = ['Consistent', 'Seasonal', 'Trendy']

  return {
    riskClassification: validRiskClassifications.includes(analysis.riskClassification) 
      ? analysis.riskClassification 
      : 'No Risk',
    consistencyRating: validConsistencyRatings.includes(analysis.consistencyRating) 
      ? analysis.consistencyRating 
      : 'Consistent',
    estimatedDimensions: typeof analysis.estimatedDimensions === 'string' 
      ? analysis.estimatedDimensions 
      : 'Unknown',
    estimatedWeight: typeof analysis.estimatedWeight === 'string' 
      ? analysis.estimatedWeight 
      : 'Unknown',
    opportunityScore: typeof analysis.opportunityScore === 'number' 
      ? Math.max(0, Math.min(10, analysis.opportunityScore)) 
      : 5,
    marketInsights: Array.isArray(analysis.marketInsights) 
      ? analysis.marketInsights.filter((insight: any) => typeof insight === 'string') 
      : [],
    riskFactors: Array.isArray(analysis.riskFactors) 
      ? analysis.riskFactors.filter((factor: any) => typeof factor === 'string') 
      : []
  }
}

// Export utility functions
export const openaiUtils = {
  // Calculate AI analysis confidence based on data completeness
  calculateConfidence: (productData: ProductData): number => {
    let score = 0
    if (productData.title && productData.title.length > 10) score += 2
    if (productData.brand) score += 1
    if (productData.price > 0) score += 1
    if (productData.category) score += 1
    if (productData.bsr && productData.bsr > 0) score += 2
    if (productData.reviews >= 0) score += 1
    if (productData.rating > 0) score += 2
    
    return Math.min(10, score)
  },

  // Estimate tokens for analysis
  estimateTokens: (productData: ProductData): number => {
    const baseTokens = 500 // Base prompt tokens
    const titleTokens = (productData.title?.length || 0) / 4
    const brandTokens = (productData.brand?.length || 0) / 4
    const categoryTokens = (productData.category?.length || 0) / 4
    
    return Math.ceil(baseTokens + titleTokens + brandTokens + categoryTokens)
  },

  // Format analysis for display
  formatAnalysisForDisplay: (analysis: AIAnalysis): string => {
    return `
Risk: ${analysis.riskClassification}
Consistency: ${analysis.consistencyRating}
Opportunity Score: ${analysis.opportunityScore}/10
Dimensions: ${analysis.estimatedDimensions}
Weight: ${analysis.estimatedWeight}

Market Insights:
${analysis.marketInsights.map(insight => `• ${insight}`).join('\n')}

Risk Factors:
${analysis.riskFactors.map(factor => `• ${factor}`).join('\n')}
    `.trim()
  }
}