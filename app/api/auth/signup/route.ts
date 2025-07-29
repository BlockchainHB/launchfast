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

    // Validate promo code if provided
    let promoRedemption = null
    if (promo_code && data.user) {
      try {
        const { data: redemptionResult, error: promoError } = await supabaseAdmin
          .rpc('redeem_promo_code', { 
            promo_code: promo_code.toUpperCase().trim(),
            user_id: data.user.id
          })

        if (promoError) {
          console.error('Promo code redemption failed during signup:', promoError)
        } else if (redemptionResult?.success) {
          promoRedemption = redemptionResult
        }
      } catch (promoError) {
        console.error('Promo code processing error during signup:', promoError)
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
          subscription_tier: promoRedemption ? 'trial' : 'free',
          subscription_status: promoRedemption ? 'trialing' : 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_current_period_start: promoRedemption?.trial_start_date || null,
          subscription_current_period_end: promoRedemption?.trial_end_date || null,
          subscription_cancel_at_period_end: false,
          payment_method_last4: null,
          payment_method_brand: null,
          promo_code_used: promo_code?.toUpperCase().trim() || null
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
      promoRedemption: promoRedemption,
      message: promoRedemption 
        ? `User created successfully with ${promoRedemption.trial_days}-day free trial! Please check your email for confirmation.`
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