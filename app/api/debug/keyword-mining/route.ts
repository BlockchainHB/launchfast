import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { keyword = 'wireless charger' } = await request.json()
    
    console.log('Testing raw SellerSprite Keyword Mining API with keyword:', keyword)
    
    // Make raw API call to inspect response structure
    const axios = require('axios')
    const response = await axios.post('https://api.sellersprite.com/v1/keyword/miner', {
      keyword,
      minSearch: 100,
      maxSupplyDemandRatio: 50,
      page: 1,
      size: 10,
      marketplace: 'US',
      amazonChoice: false
    }, {
      timeout: 30000,
      headers: {
        'secret-key': process.env.SELLERSPRITE_API_KEY,
        'Content-Type': 'application/json;charset=utf-8',
        'User-Agent': 'SellerSprite-Dashboard/1.0'
      }
    })

    console.log('Raw SellerSprite Keyword Mining Response:', JSON.stringify(response.data, null, 2))
    
    return NextResponse.json({
      status: 'OK',
      message: 'SellerSprite Keyword Mining API debug response',
      keyword,
      responseStructure: {
        hasData: !!response.data.data,
        dataType: Array.isArray(response.data.data) ? 'array' : typeof response.data.data,
        dataLength: Array.isArray(response.data.data) ? response.data.data.length : 'not an array',
        keys: Object.keys(response.data),
        sampleData: response.data.data ? (Array.isArray(response.data.data) ? response.data.data[0] : response.data.data) : null
      },
      fullResponse: response.data
    })
  } catch (error) {
    console.error('SellerSprite Keyword Mining API debug error:', error)
    
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'SellerSprite Keyword Mining API debug failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error.response?.data || null
      },
      { status: 500 }
    )
  }
}