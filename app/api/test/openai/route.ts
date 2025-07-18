import { NextResponse } from 'next/server'
import { analyzeProduct } from '@/lib/openai'
import type { ProductData } from '@/types'

export async function GET() {
  try {
    // Test OpenAI with sample product data
    const testProduct: ProductData = {
      asin: 'B08C7HDF1F',
      title: 'Wireless Bluetooth Headphones with Noise Cancelling',
      brand: 'TechBrand',
      price: 89.99,
      bsr: 15000,
      reviews: 1250,
      rating: 4.3,
      category: 'Electronics',
      createdAt: new Date().toISOString()
    }
    
    console.log('Testing OpenAI analysis with product:', testProduct.title)
    
    const aiAnalysis = await analyzeProduct(testProduct)
    
    return NextResponse.json({
      status: 'OK',
      message: 'OpenAI API test successful',
      test: 'Product Analysis',
      product: {
        asin: testProduct.asin,
        title: testProduct.title,
        price: testProduct.price
      },
      analysis: aiAnalysis,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('OpenAI API test error:', error)
    
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'OpenAI API test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}