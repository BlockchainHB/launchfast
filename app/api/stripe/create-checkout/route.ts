import { NextRequest, NextResponse } from 'next/server'
import { stripe, SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { PRICE_IDS } from '@/lib/customer-utils'

interface CreateCheckoutRequest {
  plan: SubscriptionPlan
  email?: string // For customer verification
  successUrl?: string
  cancelUrl?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') as SubscriptionPlan
    const successUrl = searchParams.get('successUrl')
    const cancelUrl = searchParams.get('cancelUrl')

    // Validate plan
    if (!plan || !SUBSCRIPTION_PLANS[plan]) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}?error=invalid_plan`)
    }

    const result = await createCheckoutSession({ plan, successUrl, cancelUrl }, request)
    
    if ('url' in result && result.url) {
      return NextResponse.redirect(result.url)
    } else {
      return result as NextResponse
    }
  } catch (error) {
    console.error('Stripe checkout creation error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}?error=checkout_failed`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { plan, email, successUrl, cancelUrl }: CreateCheckoutRequest = await request.json()

    // Validate plan
    if (!plan || !SUBSCRIPTION_PLANS[plan]) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    return await createCheckoutSession({ plan, email, successUrl, cancelUrl }, request)

  } catch (error) {
    console.error('Stripe checkout creation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function createCheckoutSession(
  { plan, email, successUrl, cancelUrl }: CreateCheckoutRequest,
  request: NextRequest
) {
  const subscriptionPlan = SUBSCRIPTION_PLANS[plan]

  // Determine price ID based on customer verification
  let priceId = subscriptionPlan.stripeId; // Default price

  if (email) {
    try {
      // Verify if customer is legacy customer
      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/customer/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (verifyResponse.ok) {
        const verification = await verifyResponse.json();
        priceId = verification.priceId;
      }
    } catch (error) {
      console.error('Customer verification failed, using default pricing:', error);
      // Continue with default pricing on verification failure - this ensures checkout always works
      priceId = subscriptionPlan.stripeId;
    }
  }

  // Get authenticated user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - please login' },
      { status: 401 }
    )
  }

  // Get user profile with Stripe customer ID
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 404 }
    )
  }

  let customerId = profile.stripe_customer_id

  // Create Stripe customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile.full_name || undefined,
      metadata: {
        supabase_user_id: user.id,
        subscription_tier: profile.subscription_tier || 'free'
      }
    })

    customerId = customer.id

    // Update profile with customer ID
    await supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId, // Dynamic pricing based on customer verification
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}?canceled=true`,
    metadata: {
      supabase_user_id: user.id,
      plan: plan,
      customer_email: email || user.email || '',
      price_id: priceId
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan: plan,
        customer_email: email || user.email || '',
        price_id: priceId
      }
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto'
    }
  })

  return NextResponse.json({
    success: true,
    sessionId: session.id,
    url: session.url
  })
}