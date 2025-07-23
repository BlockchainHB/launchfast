import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    const stripe = getStripe()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with subscription details
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id, subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    // Only allow cancellation for pro subscriptions
    if (profile.subscription_tier !== 'pro') {
      return NextResponse.json({ error: 'Cannot cancel this subscription type' }, { status: 400 })
    }

    console.log('Debug info:', {
      stripe_subscription_id: profile.stripe_subscription_id,
      subscription_tier: profile.subscription_tier,
      subscription_status: profile.subscription_status,
      stripe_key_present: !!process.env.STRIPE_SECRET_KEY,
      stripe_key_type: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...'
    })
    
    // Verify subscription exists in Stripe first
    let existingSubscription
    try {
      existingSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      console.log('Existing subscription in Stripe:', {
        id: existingSubscription.id,
        status: existingSubscription.status,
        cancel_at_period_end: existingSubscription.cancel_at_period_end,
        current_period_end: existingSubscription.current_period_end
      })
    } catch (stripeError) {
      console.error('Failed to retrieve subscription from Stripe:', stripeError)
      return NextResponse.json({ 
        error: 'Subscription not found in Stripe',
        details: stripeError instanceof Error ? stripeError.message : String(stripeError)
      }, { status: 404 })
    }
    
    // Update the subscription in Stripe to cancel at period end
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    )
    
    console.log('Stripe subscription updated:', {
      id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end,
      status: subscription.status
    })

    // Update the database to reflect the cancellation
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        subscription_cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update user profile after cancellation:', updateError)
      // Note: The Stripe subscription is already updated, so we don't want to fail here
      // The webhook will eventually sync this data
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
      periodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
    })

  } catch (error) {
    console.error('Error cancelling subscription:', error)
    
    // Provide more specific error information
    let errorMessage = 'Failed to cancel subscription'
    if (error instanceof Error) {
      if (error.message.includes('STRIPE_SECRET_KEY')) {
        errorMessage = 'Stripe configuration error - missing API key'
      } else if (error.message.includes('stripe')) {
        errorMessage = `Stripe API error: ${error.message}`
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    const stripe = getStripe()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with subscription details
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id, subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    // Reactivate the subscription (remove cancel_at_period_end)
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    )

    // Update the database to reflect the reactivation
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        subscription_cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update user profile after reactivation:', updateError)
      // Note: The Stripe subscription is already updated, so we don't want to fail here
      // The webhook will eventually sync this data
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription has been reactivated and will continue at the next billing cycle',
      periodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
    })

  } catch (error) {
    console.error('Error reactivating subscription:', error)
    
    // Provide more specific error information
    let errorMessage = 'Failed to reactivate subscription'
    if (error instanceof Error) {
      if (error.message.includes('STRIPE_SECRET_KEY')) {
        errorMessage = 'Stripe configuration error - missing API key'
      } else if (error.message.includes('stripe')) {
        errorMessage = `Stripe API error: ${error.message}`
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}