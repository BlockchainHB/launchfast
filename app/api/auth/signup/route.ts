import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'
import { signupConfirmationEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database connection not available' },
      { status: 500 }
    )
  }

  try {
    const { email, password, full_name, company, promo_code } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create user with email confirmation disabled
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Disable automatic email confirmation
      user_metadata: {
        full_name: full_name || '',
        company: company || ''
      }
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Handle promo code redemption if provided
    let trialInfo = null
    if (data.user && promo_code && promo_code.trim()) {
      try {
        // Directly redeem promo code using database logic instead of RPC function
        
        // Get promo code details (case-insensitive)
        const { data: promoCodes, error: promoError } = await supabaseAdmin
          .from('promo_codes')
          .select('*')
          .eq('is_active', true)

        if (!promoError && promoCodes) {
          // Find matching code (case-insensitive)
          const promoCode = promoCodes.find(pc => 
            pc.code.toLowerCase() === promo_code.trim().toLowerCase()
          )

          if (promoCode) {
            // Check if promo code has expired
            if (!promoCode.expires_at || new Date(promoCode.expires_at) >= new Date()) {
              // Check if user has already redeemed this or any other promo code
              const { data: existingRedemption } = await supabaseAdmin
                .from('promo_code_redemptions')
                .select('*')
                .eq('user_id', data.user.id)
                .single()

              if (!existingRedemption) {
                // Check usage limit
                let canRedeem = true
                if (promoCode.max_uses) {
                  const { count: usageCount } = await supabaseAdmin
                    .from('promo_code_redemptions')
                    .select('*', { count: 'exact', head: true })
                    .eq('promo_code_id', promoCode.id)

                  if (usageCount && usageCount >= promoCode.max_uses) {
                    canRedeem = false
                  }
                }

                if (canRedeem) {
                  // Calculate trial dates
                  const trialStartDate = new Date()
                  const trialEndDate = new Date(trialStartDate)
                  trialEndDate.setDate(trialEndDate.getDate() + promoCode.trial_days)

                  // Create redemption record
                  const { error: createError } = await supabaseAdmin
                    .from('promo_code_redemptions')
                    .insert({
                      user_id: data.user.id,
                      promo_code_id: promoCode.id,
                      redeemed_at: trialStartDate.toISOString(),
                      trial_start_date: trialStartDate.toISOString(),
                      trial_end_date: trialEndDate.toISOString(),
                      status: 'active'
                    })

                  if (!createError) {
                    trialInfo = {
                      startDate: trialStartDate.toISOString(),
                      endDate: trialEndDate.toISOString(),
                      trialDays: promoCode.trial_days
                    }
                    console.log(`✅ Promo code ${promo_code} redeemed for user ${data.user.id}`)
                  }
                }
              }
            }
          }
        }
      } catch (promoError) {
        console.error('Error redeeming promo code:', promoError)
      }
    }

    // Create user profile
    if (data.user) {
      try {
        const profileData = {
          id: data.user.id,
          full_name: full_name || 'User',
          company: company || null,
          invitation_code: null,
          role: 'user',
          subscription_tier: trialInfo ? 'trial' : 'free',
          subscription_status: trialInfo ? 'trialing' : 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_current_period_start: trialInfo ? trialInfo.startDate : null,
          subscription_current_period_end: trialInfo ? trialInfo.endDate : null,
          subscription_cancel_at_period_end: false,
          payment_method_last4: null,
          payment_method_brand: null,
          // Add trial info if promo code was redeemed
          trial_status: trialInfo ? 'active' : null,
          trial_start_date: trialInfo ? trialInfo.startDate : null,
          trial_end_date: trialInfo ? trialInfo.endDate : null
        }

        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .upsert(profileData)

        if (profileError) {
          console.error('Failed to create user profile:', profileError)
        }
      } catch (profileError) {
        console.error('Profile creation error:', profileError)
      }

      // Generate confirmation token and send custom email
      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: email,
          password: password,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
          }
        })

        if (linkError) {
          console.error('Failed to generate confirmation link:', linkError)
        } else {
          // Send our custom signup confirmation email
          await resend.emails.send({
            from: 'Launch Fast <noreply@updates.launchfastlegacyx.com>',
            to: email,
            subject: 'Confirm Your Launch Fast Account',
            html: signupConfirmationEmail(linkData.properties.action_link)
          })
        }
      } catch (emailError) {
        console.error('Failed to send custom signup confirmation email:', emailError)
        // Don't fail the signup if email fails
      }
    }

    return NextResponse.json({
      user: data.user,
      trial: trialInfo,
      trialMessage: trialInfo 
        ? `🎉 Promo code applied! You now have ${trialInfo.trialDays} days of free access.`
        : null,
      message: trialInfo 
        ? `User created successfully with ${trialInfo.trialDays}-day free trial! Please check your email for confirmation.`
        : 'User created successfully. Please check your email for confirmation.'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}