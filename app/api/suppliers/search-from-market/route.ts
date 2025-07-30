import { NextRequest, NextResponse } from 'next/server'

interface MarketContext {
  marketId: string
  productName: string
  estimatedProfit: number
  marketGrade: string
  competitionLevel: 'low' | 'medium' | 'high'
  suggestedMOQ: number
}

interface SupplierSearchWithMarket {
  searchTerm: string
  marketId?: string
  marketContext?: MarketContext
  searchOptions?: {
    goldSupplierOnly?: boolean
    tradeAssuranceOnly?: boolean
    maxResults?: number
    minYearsInBusiness?: number
    maxMoq?: number
    regions?: string[]
    certifications?: string[]
  }
}

interface SupplierWithMarketContext {
  id: string
  companyName: string
  location: { city: string; country: string }
  qualityScore: number
  marketOpportunityScore?: number // New: Combined supplier + market score
  projectedProfitMargin?: number // New: Calculated from market data
  recommendedMOQ?: number // New: Based on market analysis
  marketContext?: {
    originalGrade: string
    estimatedProfit: number
    competitionLevel: string
  }
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    const body: SupplierSearchWithMarket = await request.json()
    const { searchTerm, marketId, marketContext, searchOptions = {} } = body

    if (!searchTerm) {
      return NextResponse.json(
        { error: 'Search term is required' }, 
        { status: 400 }
      )
    }

    console.log('🎯 Market-Enhanced Supplier Search:', {
      searchTerm,
      marketId,
      hasMarketContext: !!marketContext,
      searchOptions
    })

    // Call the regular supplier search API first
    const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/suppliers/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchTerm,
        userId: 'market-search', // Special identifier for market-sourced searches
        options: {
          goldSupplierOnly: searchOptions.goldSupplierOnly ?? true,
          tradeAssuranceOnly: searchOptions.tradeAssuranceOnly ?? true,
          maxResults: searchOptions.maxResults ?? 50,
          minYearsInBusiness: searchOptions.minYearsInBusiness ?? 2,
          maxMoq: searchOptions.maxMoq ?? 500,
          regions: searchOptions.regions ?? [],
          certifications: searchOptions.certifications ?? []
        }
      })
    })

    if (!searchResponse.ok) {
      throw new Error(`Supplier search failed: ${searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json()

    // Enhance suppliers with market context
    const enhancedSuppliers: SupplierWithMarketContext[] = searchData.suppliers?.map((supplier: any) => {
      let marketOpportunityScore = supplier.qualityScore || 0
      let projectedProfitMargin = 0
      let recommendedMOQ = supplier.moq || 100

      if (marketContext) {
        // Calculate market opportunity score (supplier quality + market potential)
        const marketGradeScore = getGradeScore(marketContext.marketGrade)
        marketOpportunityScore = Math.round((supplier.qualityScore * 0.7) + (marketGradeScore * 0.3))

        // Estimate profit margin based on market data
        const supplierCost = 10 // Placeholder - would come from supplier pricing
        const sellingPrice = marketContext.estimatedProfit / 30 // Monthly to daily estimate
        projectedProfitMargin = Math.max(0, Math.round(((sellingPrice - supplierCost) / sellingPrice) * 100))

        // Adjust MOQ recommendation based on market potential
        if (marketContext.estimatedProfit > 10000) {
          recommendedMOQ = Math.min(supplier.moq || 500, marketContext.suggestedMOQ)
        }
      }

      return {
        ...supplier,
        marketOpportunityScore,
        projectedProfitMargin,
        recommendedMOQ,
        marketContext: marketContext ? {
          originalGrade: marketContext.marketGrade,
          estimatedProfit: marketContext.estimatedProfit,
          competitionLevel: marketContext.competitionLevel
        } : undefined
      }
    }) || []

    // Generate market insights
    const marketInsights = marketContext ? {
      profitPotential: marketContext.estimatedProfit,
      recommendedMOQ: marketContext.suggestedMOQ,
      competitionAnalysis: getCompetitionAnalysis(marketContext.competitionLevel),
      qualityRecommendation: getQualityRecommendation(marketContext.marketGrade),
      topOpportunitySuppliers: enhancedSuppliers
        .sort((a, b) => (b.marketOpportunityScore || 0) - (a.marketOpportunityScore || 0))
        .slice(0, 3)
        .map(s => ({
          name: s.companyName,
          score: s.marketOpportunityScore,
          projectedMargin: s.projectedProfitMargin
        }))
    } : null

    // Store search with market context if marketId provided
    if (marketId) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/suppliers/searches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: searchTerm,
            user_id: 'market-search',
            market_id: marketId,
            search_source: 'market_research',
            market_context: marketContext,
            total_results: enhancedSuppliers.length,
            search_options: searchOptions
          })
        })
      } catch (error) {
        console.warn('Failed to store search with market context:', error)
        // Continue without failing the main request
      }
    }

    return NextResponse.json({
      success: true,
      searchTerm,
      marketContext,
      suppliers: enhancedSuppliers,
      marketInsights,
      qualityAnalysis: {
        ...searchData.qualityAnalysis,
        marketEnhanced: true,
        averageOpportunityScore: enhancedSuppliers.length > 0 
          ? Math.round(enhancedSuppliers.reduce((sum, s) => sum + (s.marketOpportunityScore || 0), 0) / enhancedSuppliers.length)
          : 0
      },
      totalResults: enhancedSuppliers.length,
      searchId: `market-${marketId}-${Date.now()}`
    })

  } catch (error) {
    console.error('❌ Market-enhanced supplier search failed:', error)
    
    return NextResponse.json({
      error: 'Market-enhanced supplier search failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { 
      status: 500 
    })
  }
}

// Helper functions
function getGradeScore(grade: string): number {
  const gradeMap: { [key: string]: number } = {
    'A10': 100,
    'A9': 95,
    'A8': 90,
    'A7': 85,
    'A6': 80,
    'A5': 75,
    'B4': 70,
    'B3': 65,
    'B2': 60,
    'B1': 55,
    'C4': 50,
    'C3': 45,
    'C2': 40,
    'C1': 35,
    'D4': 30,
    'D3': 25,
    'D2': 20,
    'D1': 15,
    'F1': 10
  }
  return gradeMap[grade] || 50
}

function getCompetitionAnalysis(level: string): string {
  switch (level) {
    case 'low':
      return 'Low competition market - Focus on quality suppliers for premium positioning'
    case 'high':
      return 'High competition market - Prioritize cost-effective suppliers and fast response times'
    default:
      return 'Medium competition market - Balance quality and cost for optimal market entry'
  }
}

function getQualityRecommendation(grade: string): string {
  const gradeScore = getGradeScore(grade)
  if (gradeScore >= 85) {
    return 'Premium market - Seek Gold Suppliers with 5+ years experience'
  } else if (gradeScore >= 70) {
    return 'Established market - Target experienced suppliers with Trade Assurance'
  } else {
    return 'Competitive market - Focus on cost-effective suppliers with good ratings'
  }
}