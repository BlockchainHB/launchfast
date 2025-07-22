import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') // Optional: pre-fill customer email
    
    // Check if user is authenticated
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

    const { data: { user } } = await supabase.auth.getUser()
    
    // Create checkout session with or without user metadata
    const sessionData: any = {
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
      customer_email: email || user?.email || undefined,
      metadata: {
        plan: 'pro'
      },
      subscription_data: {
        metadata: {
          plan: 'pro'
        }
      }
    }

    // If user is authenticated, add user ID to metadata for webhook linking
    if (user) {
      sessionData.metadata.supabase_user_id = user.id
      sessionData.subscription_data.metadata.supabase_user_id = user.id
    }

    const session = await stripe.checkout.sessions.create(sessionData)

    // Redirect to Stripe checkout
    return NextResponse.redirect(session.url!)

  } catch (error) {
    console.error('Subscribe redirect error:', error)
    
    // Redirect back to home with error
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}?error=checkout_failed`)
  }
}