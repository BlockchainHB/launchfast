import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Note: We can't set cookies in API routes, but this prevents the warning
          },
          remove(name: string, options: any) {
            // Note: We can't remove cookies in API routes, but this prevents the warning
          },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('User profile fetch failed')
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: profile?.full_name,
      company: profile?.company,
      avatar_url: profile?.avatar_url,
      subscription_tier: profile?.subscription_tier || 'expired',
      subscription_status: profile?.subscription_status,
      stripe_customer_id: profile?.stripe_customer_id,
      stripe_subscription_id: profile?.stripe_subscription_id,
      current_period_end: profile?.current_period_end,
      cancel_at_period_end: profile?.cancel_at_period_end
    })
  } catch (error) {
    console.error('Profile operation failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Note: We can't set cookies in API routes, but this prevents the warning
          },
          remove(name: string, options: any) {
            // Note: We can't remove cookies in API routes, but this prevents the warning
          },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { full_name, company } = await request.json()

    // Update user profile
    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update({
        full_name,
        company,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: updatedProfile?.full_name,
      company: updatedProfile?.company,
      avatar_url: updatedProfile?.avatar_url,
      subscription_tier: updatedProfile?.subscription_tier || 'expired'
    })
  } catch (error) {
    console.error('Profile update failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}