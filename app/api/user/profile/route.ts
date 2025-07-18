import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Use your user ID for testing
    const testUserId = '0e955998-11ad-41e6-a270-989ab1c86788'

    // Get user profile from user_profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch user profile',
          details: profileError.message
        },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Format the response to match NavUser component expectations
    const userProfile = {
      id: profile.id,
      name: profile.full_name || 'Unknown User',
      email: profile.email || '',
      avatar: profile.avatar_url || '',
      company: profile.company || '',
      role: profile.role || 'user',
      subscriptionTier: profile.subscription_tier || 'free',
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    }

    return NextResponse.json({
      success: true,
      data: userProfile
    })

  } catch (error) {
    console.error('User profile API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}