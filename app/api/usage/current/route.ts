import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSubscriptionLimits, hasUnlimitedSearches } from '@/lib/stripe'

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
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with subscription tier
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    const subscriptionTier = (profile?.subscription_tier || 'expired') as any
    const isUnlimited = hasUnlimitedSearches(subscriptionTier)
    const limits = getSubscriptionLimits(subscriptionTier)

    // Get current month usage
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Count research searches this month
    const { count: searchCount, error: countError } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if (countError) {
      console.error('Error counting usage:', countError)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    return NextResponse.json({
      monthlySearches: searchCount || 0,
      limit: limits.monthlySearches,
      unlimited: isUnlimited,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      subscriptionTier
    })
  } catch (error) {
    console.error('Usage fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}