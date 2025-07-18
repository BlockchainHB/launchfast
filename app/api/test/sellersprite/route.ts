import { NextResponse } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'

export async function GET() {
  try {
    // Test sales prediction with dynamic ASIN (should be passed as parameter)
    const testASIN = 'B0CZC4NSK3' // Default ASIN for testing - should be replaced with dynamic input
    
    console.log('Testing SellerSprite API with ASIN:', testASIN)
    
    const salesData = await sellerSpriteClient.salesPrediction(testASIN)
    
    return NextResponse.json({
      status: 'OK',
      message: 'SellerSprite API test successful',
      test: 'Sales Prediction',
      asin: testASIN,
      data: salesData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('SellerSprite API test error:', error)
    
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'SellerSprite API test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Test keyword mining - should be passed as parameter
    const testKeyword = 'phone stand' // Default keyword for testing
    
    console.log('Testing SellerSprite Keyword Mining with keyword:', testKeyword)
    
    const keywordData = await sellerSpriteClient.keywordMining(testKeyword, {
      minSearch: 500,
      size: 10
    })
    
    return NextResponse.json({
      status: 'OK',
      message: 'SellerSprite Keyword Mining test successful',
      test: 'Keyword Mining',
      keyword: testKeyword,
      resultsCount: keywordData.length,
      data: keywordData.slice(0, 3), // Show first 3 results
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('SellerSprite Keyword Mining test error:', error)
    
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'SellerSprite Keyword Mining test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}