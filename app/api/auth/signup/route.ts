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
    const { email, password, full_name, company } = await request.json()

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

    // Create user profile
    if (data.user) {
      try {
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            full_name: full_name || 'User',
            company: company || null,
            invitation_code: null,
            role: 'user',
            subscription_tier: 'free',
            subscription_status: 'active',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            subscription_current_period_start: null,
            subscription_current_period_end: null,
            subscription_cancel_at_period_end: false,
            payment_method_last4: null,
            payment_method_brand: null
          })

        if (profileError) {
          console.error('Failed to create user profile:', profileError)
        }
      } catch (profileError) {
        console.error('Profile creation error:', profileError)
      }

      // Generate confirmation token and send custom email
      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'confirmation',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`
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
      message: 'User created successfully. Please check your email for confirmation.'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}