import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    // List all prices for your product
    const prices = await stripe.prices.list({
      product: 'prod_Sic90HreVX86sB',
      limit: 10
    })

    return NextResponse.json({
      success: true,
      prices: prices.data.map(price => ({
        id: price.id,
        lookup_key: price.lookup_key,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
        active: price.active
      }))
    })

  } catch (error) {
    console.error('Debug prices error:', error)
    return NextResponse.json({
      error: 'Failed to fetch prices',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}