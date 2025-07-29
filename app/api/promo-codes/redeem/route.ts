import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json()
    
    if (!code || !userId) {
      return NextResponse.json(
        { success: false, error: 'Promo code and user ID are required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Get promo code details (case-insensitive)
    const { data: promoCodes, error: promoError } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('is_active', true)

    if (promoError) {
      console.error('Error fetching promo codes:', promoError)
      return NextResponse.json(
        { success: false, error: 'Error processing redemption' },
        { status: 500 }
      )
    }

    // Find matching code (case-insensitive)
    const promoCode = promoCodes?.find(pc => 
      pc.code.toLowerCase() === code.trim().toLowerCase()
    )

    if (!promoCode) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired promo code'
      })
    }

    // Check if promo code has expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Promo code has expired'
      })
    }

    // Check if user has already redeemed this or any other promo code
    const { data: existingRedemption, error: redemptionError } = await supabaseAdmin
      .from('promo_code_redemptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (redemptionError && redemptionError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if no redemption exists
      console.error('Error checking existing redemption:', redemptionError)
      return NextResponse.json(
        { success: false, error: 'Error processing redemption' },
        { status: 500 }
      )
    }

    if (existingRedemption) {
      return NextResponse.json({
        success: false,
        error: 'You have already redeemed a promo code'
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
          { success: false, error: 'Error processing redemption' },
          { status: 500 }
        )
      }

      if (usageCount && usageCount >= promoCode.max_uses) {
        return NextResponse.json({
          success: false,
          error: 'Promo code usage limit reached'
        })
      }
    }

    // Calculate trial dates
    const trialStartDate = new Date()
    const trialEndDate = new Date(trialStartDate)
    trialEndDate.setDate(trialEndDate.getDate() + promoCode.trial_days)

    // Create redemption record
    const { data: redemption, error: createError } = await supabaseAdmin
      .from('promo_code_redemptions')
      .insert({
        user_id: userId,
        promo_code_id: promoCode.id,
        redeemed_at: trialStartDate.toISOString(),
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        status: 'active'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating redemption:', createError)
      return NextResponse.json(
        { success: false, error: 'Error processing redemption' },
        { status: 500 }
      )
    }

    // Update user profile with trial status
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        trial_status: 'active',
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      // Don't fail the request if profile update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Promo code redeemed successfully',
      trial: {
        startDate: trialStartDate.toISOString(),
        endDate: trialEndDate.toISOString(),
        trialDays: promoCode.trial_days
      }
    })

  } catch (error) {
    console.error('Promo code redemption error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}