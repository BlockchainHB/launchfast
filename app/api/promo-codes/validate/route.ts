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

    // Get authenticated user (optional for validation, required for redemption)
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

    // Validate promo code using the helper function
    const { data: validationResult, error } = await supabaseAdmin
      .rpc('validate_promo_code', { 
        promo_code: code.toUpperCase().trim(),
        check_user_id: user?.id || null
      })

    if (error) {
      console.error('Promo code validation error:', error)
      return NextResponse.json(
        { error: 'Failed to validate promo code' },
        { status: 500 }
      )
    }

    if (!validationResult.is_valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: validationResult.error_message || 'Invalid promo code'
        },
        { status: 400 }
      )
    }

    // Return validation success with promo code details
    return NextResponse.json({
      valid: true,
      promoCode: {
        id: validationResult.promo_code_id,
        code: validationResult.code,
        description: validationResult.description,
        trialDays: validationResult.trial_days,
        usesRemaining: validationResult.max_uses ? 
          (validationResult.max_uses - validationResult.current_uses) : null
      }
    })

  } catch (error) {
    console.error('Promo code validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}