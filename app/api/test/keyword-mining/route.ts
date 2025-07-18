import { NextRequest, NextResponse } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'

export async function POST(request: NextRequest) {
  try {
    const { 
      keyword = 'wireless charger', 
      minSearch = 100, 
      maxSupplyDemandRatio = 50,
      size = 10 
    } = await request.json()
    
    console.log('Testing SellerSprite Keyword Mining with relaxed parameters:', {
      keyword,
      minSearch,
      maxSupplyDemandRatio,
      size
    })
    
    const keywordData = await sellerSpriteClient.keywordMining(keyword, {
      minSearch,
      maxSupplyDemandRatio,
      size
    })
    
    return NextResponse.json({
      status: 'OK',
      message: 'SellerSprite Keyword Mining test with relaxed parameters',
      test: 'Keyword Mining (Relaxed)',
      keyword,
      parameters: {
        minSearch,
        maxSupplyDemandRatio,
        size
      },
      resultsCount: keywordData.length,
      data: keywordData,
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