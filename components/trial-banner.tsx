'use client'

import { useState, useEffect } from 'react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  Sparkles, 
  X, 
  CreditCard,
  AlertTriangle,
  Timer,
  Zap
} from 'lucide-react'
import { TrialInfo, getTrialUrgencyMessage, getTrialColorTheme } from '@/lib/trial-utils'

interface TrialBannerProps {
  trialInfo: TrialInfo
  onUpgradeClick: () => void
  className?: string
}

export function TrialBanner({ trialInfo, onUpgradeClick, className }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState({
    days: trialInfo.daysRemaining,
    hours: trialInfo.hoursRemaining
  })

  // Update countdown every minute
  useEffect(() => {
    if (!trialInfo.isActive || !trialInfo.trialEndDate) return

    const updateCountdown = () => {
      const now = new Date()
      const endDate = new Date(trialInfo.trialEndDate!)
      const msRemaining = Math.max(0, endDate.getTime() - now.getTime())
      
      const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24))
      const hours = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      
      setTimeRemaining({ days, hours })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [trialInfo.isActive, trialInfo.trialEndDate])

  if (!trialInfo.isActive || !isVisible) {
    return null
  }

  const colors = getTrialColorTheme(trialInfo.urgencyLevel)
  const message = getTrialUrgencyMessage(trialInfo)

  const getIcon = () => {
    switch (trialInfo.urgencyLevel) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 animate-pulse" />
      case 'high':
        return <Zap className="h-5 w-5" />
      case 'medium':
        return <Timer className="h-5 w-5" />
      default:
        return <Sparkles className="h-5 w-5" />
    }
  }

  const getCountdownDisplay = () => {
    if (timeRemaining.days > 0) {
      return (
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" />
          <span>
            {timeRemaining.days} day{timeRemaining.days !== 1 ? 's' : ''} remaining
          </span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-2 text-sm font-semibold animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <span>
            {timeRemaining.hours} hour{timeRemaining.hours !== 1 ? 's' : ''} remaining!
          </span>
        </div>
      )
    }
  }

  return (
    <div className={cn(
      "sticky top-0 z-50 border-b backdrop-blur-sm",
      colors.bgColor,
      colors.borderColor,
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3 gap-4">
          {/* Left side - Icon and message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn("flex-shrink-0", colors.textColor)}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", colors.textColor)}>
                {message}
              </p>
            </div>
          </div>

          {/* Center - Countdown */}
          <div className={cn("flex-shrink-0", colors.textColor)}>
            {getCountdownDisplay()}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              onClick={onUpgradeClick}
              className={cn(
                "text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200",
                colors.buttonColor
              )}
              size="sm"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Subscribe Now
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className={cn("hover:bg-black/10", colors.textColor)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact version for smaller screens
export function TrialBannerCompact({ trialInfo, onUpgradeClick, className }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!trialInfo.isActive || !isVisible) {
    return null
  }

  const colors = getTrialColorTheme(trialInfo.urgencyLevel)

  return (
    <div className={cn(
      "sticky top-0 z-50 border-b backdrop-blur-sm",
      colors.bgColor,
      colors.borderColor,
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("flex-shrink-0", colors.textColor)}>
              {trialInfo.urgencyLevel === 'critical' ? 
                <AlertTriangle className="h-4 w-4 animate-pulse" /> :
                <Clock className="h-4 w-4" />
              }
            </div>
            <span className={cn("text-xs font-medium truncate", colors.textColor)}>
              {trialInfo.daysRemaining > 0 ? 
                `${trialInfo.daysRemaining}d left` : 
                `${trialInfo.hoursRemaining}h left`
              }
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={onUpgradeClick}
              className={cn(
                "text-white font-semibold text-xs px-3 py-1 h-7",
                colors.buttonColor
              )}
            >
              Upgrade
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className={cn("hover:bg-black/10 h-7 w-7 p-0", colors.textColor)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}