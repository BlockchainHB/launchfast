'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHelpers } from '@/lib/auth'
import { getTrialInfo, TrialInfo } from '@/lib/trial-utils'
import { autoShowTrialReminders, showTrialExpirationWarning } from '@/lib/trial-notifications'

/**
 * Hook to automatically manage trial notifications throughout the app
 */
export const useTrialNotifications = () => {
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let notificationInterval: NodeJS.Timeout

    const checkTrialStatus = async () => {
      try {
        // Get current user
        const user = await authHelpers.getCurrentUser()
        if (!user || !isMounted) {
          setIsLoading(false)
          return
        }

        // Get trial info
        const info = await getTrialInfo(user.id)
        if (!isMounted) return

        setTrialInfo(info)

        // Show automatic reminders if needed
        if (info.isActive) {
          autoShowTrialReminders(info)
        } else if (info.status === 'expired') {
          // Show expiration warning if just expired
          showTrialExpirationWarning()
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error checking trial status:', error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Initial check
    checkTrialStatus()

    // Set up periodic checking (every 10 minutes)
    notificationInterval = setInterval(checkTrialStatus, 10 * 60 * 1000)

    return () => {
      isMounted = false
      if (notificationInterval) {
        clearInterval(notificationInterval)
      }
    }
  }, [])

  // Function to manually trigger subscription flow
  const handleSubscribe = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'trial_subscribe_click', {
        days_remaining: trialInfo?.daysRemaining || 0,
        urgency_level: trialInfo?.urgencyLevel || 'low'
      })
    }
    router.push('/api/stripe/create-checkout?plan=pro')
  }

  // Function to go to settings
  const handleGoToSettings = () => {
    router.push('/dashboard/settings?tab=subscription')
  }

  return {
    trialInfo,
    isLoading,
    handleSubscribe,
    handleGoToSettings,
    isTrialActive: trialInfo?.isActive || false,
    daysRemaining: trialInfo?.daysRemaining || 0,
    urgencyLevel: trialInfo?.urgencyLevel || 'low'
  }
}

/**
 * Hook for components that need to display trial status
 */
export const useTrialStatus = () => {
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTrialInfo = async () => {
      try {
        const response = await fetch('/api/user/trial-info')
        if (response.ok) {
          const data = await response.json()
          setTrialInfo(data)
        }
      } catch (error) {
        console.error('Error fetching trial info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrialInfo()
  }, [])

  return {
    trialInfo,
    isLoading,
    isTrialActive: trialInfo?.isActive || false,
    needsUpgrade: trialInfo?.status === 'expired' || (trialInfo?.daysRemaining || 0) <= 3
  }
}