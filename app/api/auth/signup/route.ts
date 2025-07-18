import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, company, invitationCode } = await request.json()

    // Validate invitation code
    const { data: invitation, error: invitationError } = await supabaseAdmin!
      .from('invitation_codes')
      .select('*')
      .eq('code', invitationCode)
      .eq('is_active', true)
      .is('used_by', null)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation code' },
        { status: 400 }
      )
    }

    // Check if code is expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation code has expired' },
        { status: 400 }
      )
    }

    // Create user account
    const { data: authData, error: authError } = await supabaseAdmin!.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company,
        invitation_code: invitationCode
      }
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin!
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        company,
        invitation_code: invitationCode,
        role: 'user',
        subscription_tier: 'early_access'
      })

    if (profileError) {
      console.error('Failed to create user profile:', profileError)
      // Don't fail the signup for this, just log it
    }

    // Mark invitation code as used
    const { error: updateError } = await supabaseAdmin!
      .from('invitation_codes')
      .update({
        used_by: authData.user.id,
        used_at: new Date().toISOString()
      })
      .eq('code', invitationCode)

    if (updateError) {
      console.error('Failed to mark invitation code as used:', updateError)
      // Don't fail the signup for this, just log it
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}