import { supabaseAdmin } from './supabase'

export interface TrialInfo {
  isActive: boolean
  daysRemaining: number
  hoursRemaining: number
  trialEndDate: Date | null
  status: 'active' | 'expired' | 'converted' | 'none'
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  promoCodeUsed: string | null
  redemptionId: string | null
}

export interface TrialRedemption {
  id: string
  promo_code_id: string
  user_id: string
  trial_start_date: string
  trial_end_date: string
  status: 'active' | 'converted' | 'expired' | 'cancelled'
  stripe_subscription_id: string | null
  promo_code: {
    code: string
    description: string
    trial_days: number
  }
}

/**
 * Get comprehensive trial information for a user
 */
export const getTrialInfo = async (userId: string): Promise<TrialInfo> => {
  try {
    // Get user's trial redemption info
    const { data: redemption, error } = await supabaseAdmin
      .from('promo_code_redemptions')
      .select(`
        *,
        promo_codes (
          code,
          description,
          trial_days
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !redemption) {
      return {
        isActive: false,
        daysRemaining: 0,
        hoursRemaining: 0,
        trialEndDate: null,
        status: 'none',
        urgencyLevel: 'low',
        promoCodeUsed: null,
        redemptionId: null
      }
    }

    const now = new Date()
    const trialEndDate = new Date(redemption.trial_end_date)
    const msRemaining = trialEndDate.getTime() - now.getTime()
    
    // Check if trial has expired
    if (msRemaining <= 0) {
      return {
        isActive: false,
        daysRemaining: 0,
        hoursRemaining: 0,
        trialEndDate,
        status: 'expired',
        urgencyLevel: 'critical',
        promoCodeUsed: redemption.promo_codes?.code || null,
        redemptionId: redemption.id
      }
    }

    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
    const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60))

    // Determine urgency level
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (daysRemaining <= 1) {
      urgencyLevel = 'critical'
    } else if (daysRemaining <= 2) {
      urgencyLevel = 'high'
    } else if (daysRemaining <= 3) {
      urgencyLevel = 'medium'
    }

    return {
      isActive: true,
      daysRemaining,
      hoursRemaining,
      trialEndDate,
      status: 'active',
      urgencyLevel,
      promoCodeUsed: redemption.promo_codes?.code || null,
      redemptionId: redemption.id
    }

  } catch (error) {
    console.error('Error getting trial info:', error)
    return {
      isActive: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      trialEndDate: null,
      status: 'none',
      urgencyLevel: 'low',
      promoCodeUsed: null,
      redemptionId: null
    }
  }
}

/**
 * Check if user has access to paid features (subscription or active trial)
 */
export const hasAccessToPaidFeatures = async (userId: string): Promise<boolean> => {
  try {
    // Check for active subscription
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single()

    if (profile) {
      // Has active paid subscription
      if (['pro', 'unlimited'].includes(profile.subscription_tier) && profile.subscription_status === 'active') {
        return true
      }

      // Check for active trial
      if (profile.subscription_tier === 'trial' && profile.subscription_status === 'trialing') {
        const trialInfo = await getTrialInfo(userId)
        return trialInfo.isActive
      }
    }

    return false
  } catch (error) {
    console.error('Error checking paid access:', error)
    return false
  }
}

/**
 * Get trial status for middleware access control
 */
export const getTrialStatus = async (userId: string): Promise<{
  hasAccess: boolean
  trialInfo: TrialInfo
}> => {
  const trialInfo = await getTrialInfo(userId)
  return {
    hasAccess: trialInfo.isActive,
    trialInfo
  }
}

/**
 * Expire a trial (called when trial period ends)
 */
export const expireTrial = async (userId: string): Promise<boolean> => {
  try {
    // Update redemption status
    const { error: redemptionError } = await supabaseAdmin
      .from('promo_code_redemptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active')

    // Update user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_tier: 'expired',
        subscription_status: 'inactive',
        trial_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    return !redemptionError && !profileError
  } catch (error) {
    console.error('Error expiring trial:', error)
    return false
  }
}

/**
 * Get urgency message based on trial info
 */
export const getTrialUrgencyMessage = (trialInfo: TrialInfo): string => {
  if (!trialInfo.isActive) {
    return 'Your trial has ended'
  }

  if (trialInfo.daysRemaining <= 0) {
    return `Only ${trialInfo.hoursRemaining} hours remaining!`
  }

  if (trialInfo.daysRemaining === 1) {
    return 'Your trial expires tomorrow!'
  }

  if (trialInfo.daysRemaining <= 3) {
    return `Don't lose access - only ${trialInfo.daysRemaining} days left`
  }

  return `${trialInfo.daysRemaining} days remaining in your free trial`
}

/**
 * Get color theme based on urgency level
 */
export const getTrialColorTheme = (urgencyLevel: string) => {
  switch (urgencyLevel) {
    case 'critical':
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-600',
        buttonColor: 'bg-red-600 hover:bg-red-700'
      }
    case 'high':
      return {
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-600',
        buttonColor: 'bg-orange-600 hover:bg-orange-700'
      }
    case 'medium':
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-600',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
      }
    default:
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-600',
        buttonColor: 'bg-blue-600 hover:bg-blue-700'
      }
  }
}