import { supabaseAdmin, UserProfile } from './supabase'

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

    const trialEndDate = new Date(redemption.trial_end_date)
    const now = new Date()
    const msRemaining = trialEndDate.getTime() - now.getTime()
    const hoursRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60)))
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))

    const isActive = msRemaining > 0
    const status = isActive ? 'active' : 'expired'

    // Determine urgency level
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
    if (daysRemaining <= 0) {
      urgencyLevel = 'critical'
    } else if (daysRemaining === 1) {
      urgencyLevel = 'high'
    } else if (daysRemaining <= 3) {
      urgencyLevel = 'medium'
    } else {
      urgencyLevel = 'low'
    }

    return {
      isActive,
      daysRemaining,
      hoursRemaining,
      trialEndDate,
      status,
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
 * Check if user has access to paid features
 */
export const hasAccessToPaidFeatures = async (userProfile: UserProfile): Promise<boolean> => {
  // If user has active paid subscription
  if (userProfile.subscription_status === 'active' && userProfile.subscription_tier !== 'free') {
    return true
  }

  // If user is on trial, check if trial is still active
  if (userProfile.subscription_tier === 'trial' && userProfile.subscription_status === 'trialing') {
    const trialInfo = await getTrialInfo(userProfile.id)
    return trialInfo.isActive
  }

  return false
}

/**
 * Get trial status for middleware/auth checks
 */
export const getTrialStatus = async (userId: string): Promise<{
  hasAccess: boolean
  isTrialing: boolean
  needsSubscription: boolean
  trialInfo: TrialInfo
}> => {
  const trialInfo = await getTrialInfo(userId)
  
  const isTrialing = trialInfo.status === 'active'
  const hasAccess = isTrialing
  const needsSubscription = trialInfo.status === 'expired' || (!isTrialing && trialInfo.status !== 'converted')

  return {
    hasAccess,
    isTrialing,
    needsSubscription,
    trialInfo
  }
}

/**
 * Expire trial for a user (called by background job or manually)
 */
export const expireTrial = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Update promo code redemption status
    const { error: redemptionError } = await supabaseAdmin
      .from('promo_code_redemptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (redemptionError) {
      console.error('Error updating redemption status:', redemptionError)
      return { success: false, error: redemptionError.message }
    }

    // Update user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'expired',
        subscription_current_period_start: null,
        subscription_current_period_end: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      return { success: false, error: profileError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error expiring trial:', error)
    return { success: false, error: 'Failed to expire trial' }
  }
}

/**
 * Get urgency message based on trial status
 */
export const getTrialUrgencyMessage = (trialInfo: TrialInfo): string => {
  if (!trialInfo.isActive) {
    return 'Your trial has expired. Subscribe now to continue using LaunchFast.'
  }

  const { daysRemaining, hoursRemaining, urgencyLevel } = trialInfo

  switch (urgencyLevel) {
    case 'critical':
      if (hoursRemaining <= 1) {
        return `⚠️ Trial expires in less than 1 hour! Subscribe now to avoid losing access.`
      }
      return `⚠️ Trial expires in ${hoursRemaining} hours! Subscribe now to avoid losing access.`
    
    case 'high':
      return `🔥 Only ${daysRemaining} day left in your trial! Don't lose access to your data.`
    
    case 'medium':
      return `⏰ ${daysRemaining} days left in your trial. Secure your access now.`
    
    case 'low':
    default:
      return `✨ ${daysRemaining} days remaining in your free trial.`
  }
}

/**
 * Get trial color theme based on urgency
 */
export const getTrialColorTheme = (urgencyLevel: string): {
  bgColor: string
  textColor: string
  borderColor: string
  buttonColor: string
} => {
  switch (urgencyLevel) {
    case 'critical':
      return {
        bgColor: 'bg-red-50 dark:bg-red-950',
        textColor: 'text-red-800 dark:text-red-200',
        borderColor: 'border-red-200 dark:border-red-800',
        buttonColor: 'bg-red-600 hover:bg-red-700'
      }
    
    case 'high':
      return {
        bgColor: 'bg-orange-50 dark:bg-orange-950',
        textColor: 'text-orange-800 dark:text-orange-200',
        borderColor: 'border-orange-200 dark:border-orange-800',
        buttonColor: 'bg-orange-600 hover:bg-orange-700'
      }
    
    case 'medium':
      return {
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
      }
    
    case 'low':
    default:
      return {
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        textColor: 'text-blue-800 dark:text-blue-200',
        borderColor: 'border-blue-200 dark:border-blue-800',
        buttonColor: 'bg-blue-600 hover:bg-blue-700'
      }
  }
}

/**
 * Check if user should see subscription reminder popup
 */
export const shouldShowReminderPopup = (trialInfo: TrialInfo): boolean => {
  if (!trialInfo.isActive) return false
  
  // Show popup at days 5, 3, 1, and final hours
  const { daysRemaining, hoursRemaining } = trialInfo
  
  return (
    daysRemaining === 5 ||
    daysRemaining === 3 ||
    daysRemaining === 1 ||
    (daysRemaining === 0 && hoursRemaining <= 12)
  )
}