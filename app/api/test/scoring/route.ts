import { NextResponse } from 'next/server'
import { scoreProduct } from '@/lib/scoring'
import type { ProductData, SalesPrediction, AIAnalysis, KeywordData } from '@/types'

export async function GET() {
  try {
    // Test scoring algorithm with sample data - WARNING: This contains mock data and should be replaced with real API calls
    const testProduct: ProductData = {
      asin: 'TEST_ASIN_PLACEHOLDER',
      title: 'Test Product - Replace with Real Data',
      brand: 'Test Brand',
      price: 0,
      bsr: 0,
      reviews: 0,
      rating: 0,
      category: 'Test Category',
      createdAt: new Date().toISOString()
    }

    const testSalesData: SalesPrediction = {
      monthlyProfit: 0,
      monthlyRevenue: 0,
      monthlySales: 0,
      margin: 0,
      ppu: 0,
      fbaCost: 0,
      cogs: 0
    }

    const testAIAnalysis: AIAnalysis = {
      riskClassification: 'Unknown',
      consistencyRating: 'Unknown',
      estimatedDimensions: 'Unknown',
      estimatedWeight: 'Unknown',
      opportunityScore: 0,
      marketInsights: ['Replace with real AI analysis'],
      riskFactors: ['Replace with real risk analysis']
    }

    const testKeywordData: KeywordData[] = [
      {
        keyword: 'test keyword',
        searchVolume: 0,
        rankingPosition: 0,
        trafficPercentage: 0,
        cpc: 0,
        competitionScore: 0
      }
    ]
    
    console.log('Testing scoring algorithm with sample data')
    
    const scoringResult = scoreProduct(testProduct, testSalesData, testAIAnalysis, testKeywordData)
    
    return NextResponse.json({
      status: 'OK',
      message: 'Scoring algorithm test successful',
      test: 'A10-F1 Scoring',
      product: {
        asin: testProduct.asin,
        title: testProduct.title,
        price: testProduct.price,
        reviews: testProduct.reviews
      },
      inputs: {
        monthlyProfit: testSalesData.monthlyProfit,
        margin: testSalesData.margin,
        avgCPC: testKeywordData.reduce((sum, kw) => sum + kw.cpc, 0) / testKeywordData.length,
        riskClassification: testAIAnalysis.riskClassification,
        consistencyRating: testAIAnalysis.consistencyRating
      },
      result: {
        grade: scoringResult.grade,
        score: scoringResult.score,
        breakdown: scoringResult.breakdown
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Scoring algorithm test error:', error)
    
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'Scoring algorithm test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}