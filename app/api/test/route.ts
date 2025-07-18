import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test environment variables
    const envCheck = {
      sellersprite: !!process.env.SELLERSPRITE_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      apify: !!process.env.APIFY_API_TOKEN,
      redis: !!process.env.REDIS_URL
    }

    // Test basic imports
    const { sellerSpriteClient } = await import('@/lib/sellersprite')
    const { analyzeProduct } = await import('@/lib/openai')
    const { calculateGrade } = await import('@/lib/scoring')
    const { supabase } = await import('@/lib/supabase')

    return NextResponse.json({
      status: 'OK',
      message: 'SellerSprite Dashboard API is working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        environment: envCheck,
        imports: {
          sellerSprite: !!sellerSpriteClient,
          openai: !!analyzeProduct,
          scoring: !!calculateGrade,
          supabase: !!supabase
        }
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'API test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}