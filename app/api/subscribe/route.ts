import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { PRICE_IDS } from '@/lib/customer-utils'

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
    
    // Determine price based on customer verification
    let priceId = PRICE_IDS.NEW_CUSTOMER; // Default: new customer price
    let customerType = 'new';
    const customerEmail = email || user?.email;

    if (customerEmail) {
      try {
        // Verify if customer is legacy customer
        const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/customer/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: customerEmail })
        });

        if (verifyResponse.ok) {
          const verification = await verifyResponse.json();
          priceId = verification.priceId;
          customerType = verification.isLegacyCustomer ? 'legacy' : 'new';
        }
      } catch (error) {
        console.error('Customer verification failed, using new customer pricing:', error);
        // Continue with new customer pricing on verification failure - this ensures checkout always works
        priceId = PRICE_IDS.NEW_CUSTOMER;
        customerType = 'new';
      }
    }
    
    // Create checkout session with dynamic pricing
    const sessionData: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // Dynamic pricing based on customer verification
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_email: customerEmail || undefined,
      metadata: {
        plan: 'pro',
        customer_type: customerType,
        customer_email: customerEmail || '',
        price_id: priceId
      },
      subscription_data: {
        metadata: {
          plan: 'pro',
          customer_type: customerType,
          customer_email: customerEmail || '',
          price_id: priceId
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