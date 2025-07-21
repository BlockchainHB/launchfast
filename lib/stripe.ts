import Stripe from 'stripe'

// Server-side Stripe instance - only initialize when needed
let stripeInstance: Stripe | null = null

export const getStripe = () => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
      typescript: true,
    })
  }
  return stripeInstance
}

// Legacy export for backwards compatibility
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripe()[prop as keyof Stripe]
  }
})

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  expired: {
    name: 'Expired Plan',
    description: 'Subscription expired - read-only access',
    price: 0,
    stripeId: null,
    features: [
      'View saved data only',
      'No new searches',
      'No exports'
    ],
    limits: {
      monthlySearches: 0, // No new searches
      csvExports: false,
      batchOperations: false,
      apiAccess: false
    }
  },
  unlimited: {
    name: 'Unlimited User - You\'re Special!',
    description: 'Full unlimited access with special privileges',
    price: 0,
    stripeId: null,
    features: [
      '🚀 Unlimited product searches',
      '📊 Unlimited CSV exports',
      '🔬 Advanced market analytics',
      '⚡ Risk assessment tools', 
      '🎯 Keyword intelligence',
      '🔧 Batch operations',
      '🔌 Full API access',
      '👑 VIP priority support',
      '✨ Early access to new features',
      '🎁 Special user privileges'
    ],
    limits: {
      monthlySearches: -1, // Unlimited
      csvExports: true,
      batchOperations: true,
      apiAccess: true
    }
  },
  pro: {
    name: 'LaunchFast Pro',
    description: 'Unlimited access for serious Amazon sellers',
    price: 5000, // $50.00 in cents
    stripeId: 'price_1RnAMaDWe1hjENea37Yg5myP', // LaunchFast Pro $50/month - LIVE
    features: [
      'Unlimited product searches',
      'Unlimited CSV exports',
      'Advanced market analytics',
      'Risk assessment tools',
      'Keyword intelligence',
      'Batch operations',
      'API access',
      'Priority support'
    ],
    limits: {
      monthlySearches: -1, // Unlimited
      csvExports: true,
      batchOperations: true,
      apiAccess: true
    }
  }
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS
export type SubscriptionLimits = typeof SUBSCRIPTION_PLANS[SubscriptionPlan]['limits']

// Helper functions
export function getSubscriptionPlan(planId: SubscriptionPlan) {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.expired // Default to expired (no access)
}

export function getSubscriptionLimits(planId: SubscriptionPlan): SubscriptionLimits {
  return getSubscriptionPlan(planId).limits
}

export function isFeatureAllowed(
  planId: SubscriptionPlan, 
  feature: keyof SubscriptionLimits
): boolean {
  const limits = getSubscriptionLimits(planId)
  return Boolean(limits[feature])
}

export function getMonthlySearchLimit(planId: SubscriptionPlan): number {
  const limits = getSubscriptionLimits(planId)
  return limits.monthlySearches
}

export function hasUnlimitedSearches(planId: SubscriptionPlan): boolean {
  return getMonthlySearchLimit(planId) === -1
}

export function hasActiveSubscription(subscriptionStatus: string | null): boolean {
  return ['active', 'trialing'].includes(subscriptionStatus || '')
}