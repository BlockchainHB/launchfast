import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'
import { passwordResetConfirmationEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database connection not available' },
      { status: 500 }
    )
  }

  try {
    const { token, email, password } = await request.json()

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
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

    // Parse the JWT access token to get user ID
    let userId: string
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub
      
      // Verify the email matches the token
      if (payload.email !== email) {
        return NextResponse.json(
          { error: 'Token and email do not match' },
          { status: 400 }
        )
      }
      
      // Check if token is expired
      if (payload.exp < Date.now() / 1000) {
        return NextResponse.json(
          { error: 'Reset token has expired' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      )
    }

    // Update the user's password using admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password }
    )

    if (updateError) {
      console.error('Error updating user password:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Send password reset confirmation email
    try {
      await resend.emails.send({
        from: 'Launch Fast <noreply@updates.launchfastlegacyx.com>',
        to: email,
        subject: 'Password Successfully Changed - Launch Fast',
        html: passwordResetConfirmationEmail(email)
      })
    } catch (emailError) {
      console.error('Failed to send password reset confirmation email:', emailError)
      // Don't fail the request if email fails - password was already updated
    }

    return NextResponse.json(
      { success: true, message: 'Password updated successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Reset password error:', error)
    
    // Handle specific Supabase errors
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as any).message
      
      if (errorMessage.includes('Invalid token') || errorMessage.includes('expired')) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}