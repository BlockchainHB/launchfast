import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Promo code is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { valid: false, error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Check if promo code exists and is active (case-insensitive)
    const { data: promoCodes, error: promoError } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('is_active', true)

    if (promoError) {
      console.error('Error fetching promo codes:', promoError)
      return NextResponse.json(
        { valid: false, error: 'Error validating promo code' },
        { status: 500 }
      )
    }

    // Find matching code (case-insensitive)
    const promoCode = promoCodes?.find(pc => 
      pc.code.toLowerCase() === code.trim().toLowerCase()
    )

    if (!promoCode) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired promo code'
      })
    }

    // Check if promo code has expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Promo code has expired'
      })
    }

    // Check if promo code usage limit is exceeded
    if (promoCode.max_uses) {
      const { count: usageCount, error: countError } = await supabaseAdmin
        .from('promo_code_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code_id', promoCode.id)

      if (countError) {
        console.error('Error checking promo code usage:', countError)
        return NextResponse.json(
          { valid: false, error: 'Error validating promo code' },
          { status: 500 }
        )
      }

      if (usageCount && usageCount >= promoCode.max_uses) {
        return NextResponse.json({
          valid: false,
          error: 'Promo code usage limit reached'
        })
      }
    }

    // Return successful validation
    return NextResponse.json({
      valid: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        description: promoCode.description,
        trialDays: promoCode.trial_days,
        expiresAt: promoCode.expires_at
      }
    })

  } catch (error) {
    console.error('Promo code validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}