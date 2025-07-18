import { NextRequest, NextResponse } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'

export async function POST(request: NextRequest) {
  try {
    const { asin = 'B0CZC4NSK3', size = 10 } = await request.json()
    
    console.log('Testing SellerSprite Reverse ASIN with ASIN:', asin)
    
    const keywordData = await sellerSpriteClient.reverseASIN(asin, 1, size)
    
    return NextResponse.json({
      status: 'OK',
      message: 'SellerSprite Reverse ASIN test successful',
      test: 'Reverse ASIN',
      asin,
      resultsCount: keywordData.length,
      data: keywordData.slice(0, 3), // Show first 3 results
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('SellerSprite Reverse ASIN test error:', error)
    
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'SellerSprite Reverse ASIN test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}