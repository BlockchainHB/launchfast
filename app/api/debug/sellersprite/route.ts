import { NextRequest, NextResponse } from 'next/server'
import { sellerSpriteClient } from '@/lib/sellersprite'

export async function POST(request: NextRequest) {
  try {
    const { keyword = 'wireless charger' } = await request.json()
    
    console.log('Testing SellerSprite Product Research API with keyword:', keyword)
    
    // Make raw API call to inspect response structure
    const axios = require('axios')
    const response = await axios.post('https://api.sellersprite.com/v1/product/research', {
      keyword,
      marketplace: 'US',
      page: 1,
      size: 5
    }, {
      timeout: 30000,
      headers: {
        'secret-key': process.env.SELLERSPRITE_API_KEY,
        'Content-Type': 'application/json;charset=utf-8',
        'User-Agent': 'SellerSprite-Dashboard/1.0'
      }
    })

    console.log('Raw SellerSprite Response:', JSON.stringify(response.data, null, 2))
    
    return NextResponse.json({
      status: 'OK',
      message: 'SellerSprite API debug response',
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
    console.error('SellerSprite API debug error:', error)
    
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'SellerSprite API debug failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error.response?.data || null
      },
      { status: 500 }
    )
  }
}