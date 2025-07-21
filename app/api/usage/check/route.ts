import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSubscriptionLimits, getMonthlySearchLimit, hasUnlimitedSearches } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'

interface UsageCheckRequest {
  action: 'search' | 'csv_export' | 'api_call'
  increment?: boolean // Whether to increment the usage counter
}

export async function POST(request: NextRequest) {
  try {
    const { action, increment = false }: UsageCheckRequest = await request.json()

    // Get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const subscriptionTier = profile.subscription_tier || 'free'
    const subscriptionStatus = profile.subscription_status || 'inactive'
    
    // Check if subscription is active (for paid plans)
    const isSubscriptionActive = subscriptionTier === 'free' || 
      ['active', 'trialing'].includes(subscriptionStatus)

    if (!isSubscriptionActive) {
      return NextResponse.json({
        success: false,
        error: 'Subscription is not active',
        allowAction: false,
        subscriptionTier,
        subscriptionStatus
      })
    }

    // Get subscription limits
    const limits = getSubscriptionLimits(subscriptionTier as any)
    
    // Get current month usage
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM format
    
    const { data: usage, error: usageError } = await supabaseAdmin
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_year', currentMonth)
      .single()

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Usage fetch error:', usageError)
      return NextResponse.json(
        { error: 'Failed to fetch usage data' },
        { status: 500 }
      )
    }

    // Initialize usage if not found
    const currentUsage = usage || {
      searches_used: 0,
      csv_exports_used: 0,
      api_calls_used: 0
    }

    // Check limits based on action
    let allowAction = true
    let currentCount = 0
    let limit = 0

    switch (action) {
      case 'search':
        currentCount = currentUsage.searches_used || 0
        limit = getMonthlySearchLimit(subscriptionTier as any)
        allowAction = hasUnlimitedSearches(subscriptionTier as any) || currentCount < limit
        break
        
      case 'csv_export':
        allowAction = limits.csvExports
        currentCount = currentUsage.csv_exports_used || 0
        limit = -1 // No specific limit, just feature access
        break
        
      case 'api_call':
        allowAction = limits.apiAccess
        currentCount = currentUsage.api_calls_used || 0
        limit = -1 // No specific limit, just feature access
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action type' },
          { status: 400 }
        )
    }

    // If increment is requested and action is allowed, update the usage
    if (increment && allowAction) {
      const updateField = `${action === 'search' ? 'searches' : action}_used`
      
      if (usage) {
        // Update existing record
        await supabaseAdmin
          .from('user_usage')
          .update({
            [updateField]: currentCount + 1,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('month_year', currentMonth)
      } else {
        // Create new record
        await supabaseAdmin
          .from('user_usage')
          .insert({
            user_id: user.id,
            month_year: currentMonth,
            [updateField]: 1
          })
      }
    }

    return NextResponse.json({
      success: true,
      allowAction,
      subscriptionTier,
      subscriptionStatus,
      usage: {
        ...currentUsage,
        [action === 'search' ? 'searches_used' : `${action}_used`]: 
          increment && allowAction ? currentCount + 1 : currentCount
      },
      limits: {
        monthlySearches: limit === -1 ? 'unlimited' : limit,
        csvExports: limits.csvExports,
        apiAccess: limits.apiAccess
      },
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - currentCount - (increment && allowAction ? 1 : 0))
    })

  } catch (error) {
    console.error('Usage check error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to check usage limits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}