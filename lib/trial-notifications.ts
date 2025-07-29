import { toast } from 'sonner'
import { TrialInfo } from './trial-utils'

interface TrialNotificationOptions {
  showSubscribeButton?: boolean
  onSubscribeClick?: () => void
  duration?: number
}

/**
 * Show trial notification using Sonner toast
 */
export const showTrialNotification = (
  trialInfo: TrialInfo, 
  options: TrialNotificationOptions = {}
) => {
  const { showSubscribeButton = true, onSubscribeClick, duration } = options

  if (!trialInfo.isActive) return

  const { daysRemaining, hoursRemaining, urgencyLevel } = trialInfo

  // Determine toast type and duration based on urgency
  let toastType: 'message' | 'warning' | 'error' = 'message'
  let toastDuration = duration || 8000

  switch (urgencyLevel) {
    case 'critical':
      toastType = 'error'
      toastDuration = duration || 15000 // Stay longer for critical
      break
    case 'high':
      toastType = 'warning'
      toastDuration = duration || 12000
      break
    case 'medium':
      toastType = 'warning'
      toastDuration = duration || 10000
      break
    default:
      toastType = 'message'
      toastDuration = duration || 8000
  }

  // Create message based on time remaining
  let message = ''
  let title = ''

  if (daysRemaining > 0) {
    title = `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left in trial`
    if (urgencyLevel === 'critical') {
      message = '⚠️ Your trial expires today! Subscribe now to avoid losing access.'
    } else if (urgencyLevel === 'high') {
      message = '🔥 Don\'t lose access to your Amazon data. Subscribe now!'
    } else if (urgencyLevel === 'medium') {
      message = '⏰ Your trial is ending soon. Secure your access now.'
    } else {
      message = '✨ Enjoying LaunchFast? Consider subscribing to keep your access.'
    }
  } else {
    title = `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} remaining!`
    message = '🚨 Trial expires very soon! Subscribe immediately to avoid losing access.'
  }

  // Show appropriate toast type
  const toastOptions = {
    duration: toastDuration,
    action: showSubscribeButton ? {
      label: 'Subscribe Now',
      onClick: () => {
        if (onSubscribeClick) {
          onSubscribeClick()
        } else {
          // Default action - redirect to subscription
          window.location.href = '/api/stripe/create-checkout?plan=pro'
        }
      }
    } : undefined,
    description: message,
  }

  switch (toastType) {
    case 'error':
      toast.error(title, toastOptions)
      break
    case 'warning':
      toast.warning(title, toastOptions)
      break
    default:
      toast.message(title, toastOptions)
  }
}

/**
 * Show welcome trial notification
 */
export const showTrialWelcomeNotification = (trialInfo: TrialInfo) => {
  if (!trialInfo.isActive || !trialInfo.promoCodeUsed) return

  toast.success('🎉 Trial activated!', {
    description: `Welcome to your ${trialInfo.daysRemaining}-day free trial. Explore all premium features!`,
    duration: 6000,
    action: {
      label: 'Explore Features',
      onClick: () => {
        window.location.href = '/dashboard'
      }
    }
  })
}

/**
 * Show conversion success notification
 */
export const showTrialConversionNotification = () => {
  toast.success('🚀 Welcome to LaunchFast Pro!', {
    description: 'Your subscription is now active. Enjoy unlimited access to all features!',
    duration: 8000,
    action: {
      label: 'Get Started',
      onClick: () => {
        window.location.href = '/dashboard'
      }
    }
  })
}

/**
 * Check if we should show reminder notification based on localStorage
 */
export const shouldShowReminderNotification = (trialInfo: TrialInfo): boolean => {
  if (!trialInfo.isActive) return false

  const { daysRemaining, hoursRemaining } = trialInfo
  const today = new Date().toDateString()
  
  // Check localStorage for when we last showed notifications
  const lastShown = localStorage.getItem('trial-reminder-last-shown')
  const reminderDay = localStorage.getItem('trial-reminder-day')
  
  // Show on specific days: 5, 3, 1, and final hours
  const shouldShow = (
    daysRemaining === 5 ||
    daysRemaining === 3 ||
    daysRemaining === 1 ||
    (daysRemaining === 0 && hoursRemaining <= 12)
  )

  // Don't show if we already showed today for this specific day
  if (lastShown === today && reminderDay === daysRemaining.toString()) {
    return false
  }

  return shouldShow
}

/**
 * Mark reminder as shown for today
 */
export const markReminderAsShown = (daysRemaining: number) => {
  const today = new Date().toDateString()
  localStorage.setItem('trial-reminder-last-shown', today)
  localStorage.setItem('trial-reminder-day', daysRemaining.toString())
}

/**
 * Auto-show trial reminders (call this on app load/page navigation)
 */
export const autoShowTrialReminders = (trialInfo: TrialInfo) => {
  if (!trialInfo.isActive) return

  // Check if we should show reminder
  if (shouldShowReminderNotification(trialInfo)) {
    // Small delay to avoid overwhelming user on page load
    setTimeout(() => {
      showTrialNotification(trialInfo, {
        onSubscribeClick: () => {
          // Track that user clicked subscribe from notification
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'trial_reminder_subscribe_click', {
              days_remaining: trialInfo.daysRemaining,
              urgency_level: trialInfo.urgencyLevel
            })
          }
          window.location.href = '/api/stripe/create-checkout?plan=pro'
        }
      })
      
      // Mark as shown
      markReminderAsShown(trialInfo.daysRemaining)
    }, 2000) // 2 second delay
  }
}

/**
 * Show trial expiration warning (for immediate expiration)
 */
export const showTrialExpirationWarning = () => {
  toast.error('🚨 Trial Expired', {
    description: 'Your free trial has ended. Subscribe now to regain access to your data.',
    duration: Infinity, // Keep showing until dismissed
    action: {
      label: 'Subscribe Now',
      onClick: () => {
        window.location.href = '/api/stripe/create-checkout?plan=pro'
      }
    }
  })
}

/**
 * Dismiss all trial-related notifications
 */
export const dismissTrialNotifications = () => {
  toast.dismiss()
}