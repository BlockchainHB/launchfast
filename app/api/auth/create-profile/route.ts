import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE PROFILE API CALLED ===')
    
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is null - missing SUPABASE_SERVICE_ROLE_KEY?')
      return NextResponse.json(
        { error: 'Supabase admin client not available' },
        { status: 500 }
      )
    }

    const { userId, full_name, company, email } = await request.json()

    if (!userId || !email) {
      console.error('Missing required fields:', { userId: !!userId, email: !!email })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Creating user profile for:', { userId, email, full_name, company })
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      isServer: typeof window === 'undefined'
    })

    // Create user profile with admin client, using upsert to handle duplicates
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        full_name: full_name || 'User',
        company: company || null,
        invitation_code: null,
        role: 'user',
        subscription_tier: 'free', // Will trigger paywall, upgraded to 'pro' after payment
        subscription_status: 'active', // Use schema default
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_current_period_start: null,
        subscription_current_period_end: null,
        subscription_cancel_at_period_end: false,
        payment_method_last4: null,
        payment_method_brand: null
      })
      .select()

    if (error) {
      console.error('Supabase insert error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Failed to create profile', details: error.message },
        { status: 500 }
      )
    }

    console.log('User profile created successfully:', data)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Profile creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}