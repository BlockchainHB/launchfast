'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { X, Clock, Sparkles, CreditCard, AlertTriangle, Crown, Zap, Timer, Lightbulb } from 'lucide-react'
import { TrialInfo, getTrialUrgencyMessage, getTrialColorTheme } from '@/lib/trial-utils'

interface TrialBannerProps {
  trialInfo: TrialInfo
  onUpgradeClick: () => void
  onDismiss?: () => void
  showDismiss?: boolean
}

export function TrialBanner({ 
  trialInfo, 
  onUpgradeClick, 
  onDismiss, 
  showDismiss = false 
}: TrialBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateCountdown = () => {
      if (!trialInfo.trialEndDate) return

      const now = new Date().getTime()
      const endTime = new Date(trialInfo.trialEndDate).getTime()
      const remaining = endTime - now

      if (remaining <= 0) {
        setTimeRemaining('Trial expired')
        setProgress(0)
        return
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`)
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`)
      } else {
        setTimeRemaining(`${minutes}m remaining`)
      }

      // Calculate progress (7 days = 100%)
      const totalTrialMs = 7 * 24 * 60 * 60 * 1000
      const usedMs = totalTrialMs - remaining
      const progressPercent = Math.max(0, Math.min(100, (usedMs / totalTrialMs) * 100))
      setProgress(progressPercent)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [trialInfo.trialEndDate])

  if (!trialInfo.isActive) {
    return null
  }

  // Get theme colors based on urgency level with clean card-based design
  const getThemeClasses = () => {
    switch (trialInfo.urgencyLevel) {
      case 'critical':
        return {
          container: 'border-l-red-500',
          icon: 'bg-red-100 text-red-600',
          text: 'text-red-900',
          badge: 'bg-red-100 text-red-700 border-red-200',
          button: 'bg-red-600 hover:bg-red-700'
        }
      case 'high':
        return {
          container: 'border-l-orange-500',
          icon: 'bg-orange-100 text-orange-600',
          text: 'text-orange-900',
          badge: 'bg-orange-100 text-orange-700 border-orange-200',
          button: 'bg-orange-600 hover:bg-orange-700'
        }
      case 'medium':
        return {
          container: 'border-l-blue-500',
          icon: 'bg-blue-100 text-blue-600',
          text: 'text-blue-900',
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
      default:
        return {
          container: 'border-l-gray-400',
          icon: 'bg-gray-100 text-gray-600',
          text: 'text-gray-900',
          badge: 'bg-gray-100 text-gray-700 border-gray-200',
          button: 'bg-gray-900 hover:bg-gray-800'
        }
    }
  }

  const theme = getThemeClasses()
  const urgencyMessage = getTrialUrgencyMessage(trialInfo)

  return (
    <div className={`mx-4 mb-4 border rounded-lg shadow-sm bg-white border-l-4 ${theme.container}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Main Content - Single Row */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Compact Icon */}
            <div className={`p-1.5 rounded-lg ${theme.icon} flex-shrink-0`}>
              {trialInfo.urgencyLevel === 'critical' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
            </div>

            {/* Compact Content */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${theme.text}`}>
                  {trialInfo.daysRemaining > 0 
                    ? `${trialInfo.daysRemaining} days left` 
                    : 'Trial ending soon!'
                  }
                </span>
                {trialInfo.promoCodeUsed && (
                  <Badge className={`text-xs px-1.5 py-0.5 ${theme.badge}`}>
                    {trialInfo.promoCodeUsed}
                  </Badge>
                )}
                {/* Urgency indicator for all levels */}
                {trialInfo.urgencyLevel === 'critical' && (
                  <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    <AlertTriangle className="h-3 w-3" />
                    URGENT
                  </span>
                )}
                {trialInfo.urgencyLevel === 'high' && (
                  <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    <Zap className="h-3 w-3" />
                    ACT SOON
                  </span>
                )}
                {trialInfo.urgencyLevel === 'medium' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    <Lightbulb className="h-3 w-3" />
                    REMINDER
                  </span>
                )}
                {trialInfo.urgencyLevel === 'low' && (
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                    <Timer className="h-3 w-3" />
                    TRIAL ACTIVE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{timeRemaining}</span>
              </div>


              {/* Compact Progress */}
              <div className="flex-1 max-w-32">
                <Progress 
                  value={progress} 
                  className="h-1.5"
                  style={{
                    '--progress-foreground': trialInfo.urgencyLevel === 'critical' 
                      ? '#dc2626' 
                      : trialInfo.urgencyLevel === 'high'
                      ? '#ea580c'
                      : trialInfo.urgencyLevel === 'medium'
                      ? '#2563eb'
                      : '#374151'
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          {/* Compact Action */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={onUpgradeClick}
              size="sm"
              className={`text-white font-medium px-3 py-1.5 h-auto text-xs ${theme.button}`}
            >
              Subscribe Now
            </Button>

            {showDismiss && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}