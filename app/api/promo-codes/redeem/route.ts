import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      )
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
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Redeem promo code using the helper function
    const { data: redemptionResult, error } = await supabaseAdmin
      .rpc('redeem_promo_code', { 
        promo_code: code.toUpperCase().trim(),
        user_id: user.id
      })

    if (error) {
      console.error('Promo code redemption error:', error)
      return NextResponse.json(
        { error: 'Failed to redeem promo code' },
        { status: 500 }
      )
    }

    if (!redemptionResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: redemptionResult.error_message || 'Failed to redeem promo code'
        },
        { status: 400 }
      )
    }

    // Update user profile with promo code and trial status
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        promo_code_used: code.toUpperCase().trim(),
        subscription_tier: 'trial',
        subscription_status: 'trialing',
        subscription_current_period_start: redemptionResult.trial_start_date,
        subscription_current_period_end: redemptionResult.trial_end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Failed to update user profile:', profileError)
      // Don't fail the redemption if profile update fails
    }

    return NextResponse.json({
      success: true,
      redemption: {
        id: redemptionResult.redemption_id,
        trialStartDate: redemptionResult.trial_start_date,
        trialEndDate: redemptionResult.trial_end_date,
        trialDays: redemptionResult.trial_days
      },
      message: `Promo code redeemed successfully! You now have a ${redemptionResult.trial_days}-day free trial.`
    })

  } catch (error) {
    console.error('Promo code redemption error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}