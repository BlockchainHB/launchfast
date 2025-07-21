import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
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

    // Get user profile
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

    // Check if user already has a Stripe customer
    if (profile.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        customerId: profile.stripe_customer_id,
        message: 'Customer already exists'
      })
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile.full_name || undefined,
      metadata: {
        supabase_user_id: user.id,
        subscription_tier: profile.subscription_tier || 'free'
      }
    })

    // Update user profile with Stripe customer ID
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update user profile with Stripe customer ID:', updateError)
      // Note: We don't return an error here because the Stripe customer was created successfully
      // The user can still proceed with checkout, we'll just retry the profile update later
    }

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      message: 'Stripe customer created successfully'
    })

  } catch (error) {
    console.error('Stripe customer creation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create Stripe customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}