/**
 * Centralized subscription state management utility
 * Provides consistent logic for determining subscription status and capabilities
 */

import { SUBSCRIPTION_PLANS, getSubscriptionPlan, hasActiveSubscription } from '@/lib/stripe'

export interface SubscriptionData {
  subscription_tier: string
  subscription_status?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
}

export interface SubscriptionState {
  // Core status
  tier: 'expired' | 'unlimited' | 'pro'
  status: string | null
  isActive: boolean
  isValid: boolean
  
  // Plan details
  plan: typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS]
  
  // Capabilities
  canAccessFeatures: boolean
  canManageSubscription: boolean
  hasUnlimitedAccess: boolean
  
  // Billing info
  currentPeriodEnd: Date | null
  willCancelAtPeriodEnd: boolean
  hasStripeCustomer: boolean
  
  // Error states
  hasErrors: boolean
  errors: string[]
}

/**
 * Get comprehensive subscription state from raw subscription data
 */
export function getSubscriptionState(data: SubscriptionData | null): SubscriptionState {
  const errors: string[] = []
  
  // Handle null/undefined data
  if (!data) {
    return createErrorState(['No subscription data available'])
  }
  
  // Validate required fields
  if (!data.subscription_tier) {
    errors.push('Missing subscription tier')
  }
  
  // Normalize tier
  const tier = normalizeSubscriptionTier(data.subscription_tier)
  if (!tier) {
    errors.push(`Invalid subscription tier: ${data.subscription_tier}`)
  }
  
  // Get plan details
  const plan = getSubscriptionPlan(tier || 'expired')
  
  // Determine active status
  const isActive = hasActiveSubscription(data.subscription_status)
  
  // Validate status consistency
  if (tier && tier !== 'expired' && !isActive && !data.subscription_status) {
    errors.push('Subscription tier indicates active plan but no status provided')
  }
  
  // Parse dates
  let currentPeriodEnd: Date | null = null
  if (data.current_period_end) {
    currentPeriodEnd = new Date(data.current_period_end)
    if (isNaN(currentPeriodEnd.getTime())) {
      errors.push('Invalid current_period_end date')
      currentPeriodEnd = null
    }
  }
  
  // Check for expired subscriptions
  if (currentPeriodEnd && currentPeriodEnd < new Date() && isActive) {
    errors.push('Subscription marked as active but period has ended')
  }
  
  // Determine capabilities
  const isUnlimited = tier === 'unlimited'
  const isPro = tier === 'pro'
  const hasStripeCustomer = Boolean(data.stripe_customer_id)
  
  // Calculate overall validity
  const isValid = errors.length === 0 && (
    // Unlimited users are always valid
    isUnlimited ||
    // Pro users need active status
    (isPro && isActive) ||
    // Expired tier is valid (just no access)
    tier === 'expired'
  )
  
  const canAccessFeatures = isValid && (isUnlimited || (isPro && isActive))
  const canManageSubscription = hasStripeCustomer && (isPro || tier === 'expired')
  
  return {
    // Core status
    tier: tier || 'expired',
    status: data.subscription_status,
    isActive,
    isValid,
    
    // Plan details
    plan,
    
    // Capabilities
    canAccessFeatures,
    canManageSubscription,
    hasUnlimitedAccess: isUnlimited,
    
    // Billing info
    currentPeriodEnd,
    willCancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    hasStripeCustomer,
    
    // Error states
    hasErrors: errors.length > 0,
    errors
  }
}

/**
 * Create an error state for invalid subscription data
 */
function createErrorState(errors: string[]): SubscriptionState {
  const plan = SUBSCRIPTION_PLANS.expired
  
  return {
    tier: 'expired',
    status: null,
    isActive: false,
    isValid: false,
    plan,
    canAccessFeatures: false,
    canManageSubscription: false,
    hasUnlimitedAccess: false,
    currentPeriodEnd: null,
    willCancelAtPeriodEnd: false,
    hasStripeCustomer: false,
    hasErrors: true,
    errors
  }
}

/**
 * Normalize subscription tier to valid values
 */
function normalizeSubscriptionTier(tier: string): 'expired' | 'unlimited' | 'pro' | null {
  if (!tier || typeof tier !== 'string') return null
  
  const normalized = tier.toLowerCase().trim()
  
  switch (normalized) {
    case 'expired':
    case 'inactive':
    case 'cancelled':
      return 'expired'
    case 'unlimited':
    case 'unlimited_user':
    case 'special':
      return 'unlimited'
    case 'pro':
    case 'premium':
    case 'paid':
      return 'pro'
    default:
      return null
  }
}

/**
 * Get user-friendly status message
 */
export function getSubscriptionStatusMessage(state: SubscriptionState): string {
  if (state.hasErrors) {
    return `Subscription data error: ${state.errors[0]}`
  }
  
  if (state.hasUnlimitedAccess) {
    return 'You have unlimited access to all features'
  }
  
  if (state.tier === 'pro' && state.isActive) {
    const periodEnd = state.currentPeriodEnd
    if (periodEnd) {
      const willCancel = state.willCancelAtPeriodEnd
      const endDate = periodEnd.toLocaleDateString()
      return willCancel
        ? `Pro subscription ends on ${endDate} (will not renew)`
        : `Pro subscription renews on ${endDate}`
    }
    return 'Pro subscription is active'
  }
  
  if (state.tier === 'expired' || !state.isActive) {
    return 'Subscription expired - upgrade to continue using features'
  }
  
  return 'Subscription status unknown'
}

/**
 * Get recommended actions for the user based on subscription state
 */
export function getRecommendedActions(state: SubscriptionState): Array<{
  action: 'upgrade' | 'manage' | 'contact_support' | 'retry'
  label: string
  description: string
  priority: 'high' | 'medium' | 'low'
}> {
  const actions = []
  
  if (state.hasErrors) {
    actions.push({
      action: 'retry' as const,
      label: 'Refresh subscription data',
      description: 'Try reloading your subscription information',
      priority: 'high' as const
    })
    
    actions.push({
      action: 'contact_support' as const,
      label: 'Contact support',
      description: 'Get help resolving subscription data issues',
      priority: 'medium' as const
    })
  }
  
  if (state.tier === 'expired' || !state.isActive) {
    actions.push({
      action: 'upgrade' as const,
      label: 'Upgrade subscription',
      description: 'Get full access to all features',
      priority: 'high' as const
    })
  }
  
  if (state.canManageSubscription) {
    actions.push({
      action: 'manage' as const,
      label: 'Manage subscription',
      description: 'View billing details and update payment method',
      priority: 'low' as const
    })
  }
  
  return actions
}