import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing Stripe signature or webhook secret')
    }

    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    // Log error without sensitive details
    console.error('Webhook signature verification failed')
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  if (!relevantEvents.has(event.type)) {
    console.log(`Ignoring irrelevant event: ${event.type}`)
    return NextResponse.json({ received: true })
  }

  console.log(`Processing Stripe webhook: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          await handleSubscriptionCheckout(session)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await handlePaymentSucceeded(invoice)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await handlePaymentFailed(invoice)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing failed:', error)
    console.error('Event type:', event.type)
    console.error('Event data:', JSON.stringify(event.data, null, 2))
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id
  const planName = session.metadata?.plan

  console.log('=== CHECKOUT SESSION HANDLER ===')
  console.log('Session ID:', session.id)
  console.log('Customer Email:', session.customer_email)
  console.log('User ID from metadata:', userId)
  console.log('Plan from metadata:', planName)
  console.log('Session metadata:', JSON.stringify(session.metadata, null, 2))

  if (!userId) {
    console.error('No supabase_user_id in checkout session metadata - payment from non-authenticated user')
    console.log('Full session object:', JSON.stringify(session, null, 2))
    // TODO: Handle non-authenticated payments (could store pending subscriptions)
    return
  }

  // Get the subscription from Stripe
  if (session.subscription) {
    console.log('Processing subscription:', session.subscription)
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    )
    
    console.log('Subscription metadata:', JSON.stringify(subscription.metadata, null, 2))
    await updateUserSubscription(userId, subscription, planName)
  } else {
    console.error('No subscription found in session')
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id
  const planName = subscription.metadata?.plan

  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  await updateUserSubscription(userId, subscription, planName)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id

  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  // Set user back to free tier
  await supabaseAdmin
    .from('user_profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      subscription_current_period_start: null,
      subscription_current_period_end: null,
      subscription_cancel_at_period_end: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  console.log('Subscription deleted successfully')
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  
  // Get the subscription to find the user
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.supabase_user_id

  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  // Update subscription status to active
  await supabaseAdmin
    .from('user_profiles')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  console.log('Payment succeeded')
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  
  // Get the subscription to find the user
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.supabase_user_id

  if (!userId) {
    console.error('No supabase_user_id in subscription metadata')
    return
  }

  // Update subscription status to past_due
  await supabaseAdmin
    .from('user_profiles')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  console.log('Payment failed')
}

async function updateUserSubscription(
  userId: string, 
  subscription: Stripe.Subscription,
  planName?: string
) {
  const status = subscription.status
  const currentPeriodStart = new Date(subscription.current_period_start * 1000)
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
  
  console.log('Raw timestamps from Stripe:')
  console.log('current_period_start:', subscription.current_period_start)
  console.log('current_period_end:', subscription.current_period_end)
  console.log('Converted dates:')
  console.log('currentPeriodStart:', currentPeriodStart)
  console.log('currentPeriodEnd:', currentPeriodEnd)
  const cancelAtPeriodEnd = subscription.cancel_at_period_end

  // Determine subscription tier from plan name or price ID
  let subscriptionTier = planName || 'pro' // Default to pro if not specified
  
  if (!planName) {
    // Try to determine tier from price ID
    const priceId = subscription.items.data[0]?.price?.id
    if (priceId) {
      // Map price IDs to tiers (you'll need to update this with your actual price IDs)
      const priceToTierMap: Record<string, string> = {
        // 'price_pro_monthly': 'pro',
        // 'price_premium_monthly': 'premium',
        // 'price_enterprise_monthly': 'enterprise'
      }
      subscriptionTier = priceToTierMap[priceId] || 'pro'
    }
  }

  // Get payment method details if available
  let paymentMethodLast4: string | null = null
  let paymentMethodBrand: string | null = null

  if (subscription.default_payment_method) {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        subscription.default_payment_method as string
      )
      if (paymentMethod.card) {
        paymentMethodLast4 = paymentMethod.card.last4
        paymentMethodBrand = paymentMethod.card.brand
      }
    } catch (error) {
      console.log('Could not retrieve payment method details')
    }
  }

  console.log('=== UPDATING USER SUBSCRIPTION ===')
  console.log('User ID:', userId)
  console.log('Subscription Tier:', subscriptionTier)
  console.log('Subscription Status:', status)

  // Try to update existing profile first
  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({
      subscription_tier: subscriptionTier,
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      subscription_current_period_start: isNaN(currentPeriodStart.getTime()) ? null : currentPeriodStart.toISOString(),
      subscription_current_period_end: isNaN(currentPeriodEnd.getTime()) ? null : currentPeriodEnd.toISOString(),
      subscription_cancel_at_period_end: cancelAtPeriodEnd,
      payment_method_last4: paymentMethodLast4,
      payment_method_brand: paymentMethodBrand,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  console.log('Update result - Error:', updateError)

  // If update failed because profile doesn't exist, create it
  if (updateError && updateError.code === 'PGRST116') {
    console.log('Profile not found, creating new profile for user:', userId)
    const { error: insertError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: 'Stripe Customer', // Temporary name
        company: null,
        invitation_code: null,
        role: 'user',
        subscription_tier: subscriptionTier,
        subscription_status: status,
        stripe_subscription_id: subscription.id,
        subscription_current_period_start: isNaN(currentPeriodStart.getTime()) ? null : currentPeriodStart.toISOString(),
        subscription_current_period_end: isNaN(currentPeriodEnd.getTime()) ? null : currentPeriodEnd.toISOString(),
        subscription_cancel_at_period_end: cancelAtPeriodEnd,
        payment_method_last4: paymentMethodLast4,
        payment_method_brand: paymentMethodBrand
      })

    if (insertError) {
      console.error('Failed to create user profile:', insertError)
      throw insertError
    }
  } else if (updateError) {
    console.error('Failed to update user subscription:', updateError)
    throw updateError
  }

  console.log('Updated subscription successfully for user:', userId)
}