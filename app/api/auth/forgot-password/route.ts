import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'
import { passwordResetRequestEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database connection not available' },
      { status: 500 }
    )
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.listUsers({
      filter: `email.eq.${email}`
    })
    
    if (userError || !existingUser.users || existingUser.users.length === 0) {
      // Don't reveal whether the email exists for security reasons
      // Always return success to prevent email enumeration
      return NextResponse.json(
        { success: true, message: 'If an account with that email exists, we have sent a password reset link.' },
        { status: 200 }
      )
    }

    // Generate password reset link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
      }
    })

    if (error) {
      console.error('Error generating reset link:', error)
      return NextResponse.json(
        { error: 'Failed to generate password reset link' },
        { status: 500 }
      )
    }

    // Send custom password reset email using Resend
    try {
      await resend.emails.send({
        from: 'Launch Fast <noreply@updates.launchfastlegacyx.com>',
        to: email,
        subject: 'Reset Your Launch Fast Password',
        html: passwordResetRequestEmail(data.properties.action_link, email)
      })
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Password reset link sent successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}