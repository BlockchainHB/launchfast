import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') // Optional: pre-fill customer email
    
    // Create Stripe checkout session directly - no auth required
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1RnAMaDWe1hjENea37Yg5myP', // LaunchFast Pro $50/month
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_email: email || undefined, // Pre-fill email if provided
      metadata: {
        plan: 'pro'
      },
      subscription_data: {
        metadata: {
          plan: 'pro'
        }
      }
    })

    // Redirect to Stripe checkout
    return NextResponse.redirect(session.url!)

  } catch (error) {
    console.error('Subscribe redirect error:', error)
    
    // Redirect back to home with error
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}?error=checkout_failed`)
  }
}