'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { X, Clock, Sparkles, CreditCard, AlertTriangle } from 'lucide-react'
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

  const colorTheme = getTrialColorTheme(trialInfo.urgencyLevel)
  const urgencyMessage = getTrialUrgencyMessage(trialInfo)

  return (
    <Card className={`mx-4 mt-4 ${colorTheme.borderColor} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Icon */}
            <div className={`p-2 rounded-lg ${colorTheme.bgColor}`}>
              <Sparkles className={`h-5 w-5 ${colorTheme.textColor}`} />
            </div>

            {/* Trial Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">
                  {trialInfo.daysRemaining > 0 
                    ? `${trialInfo.daysRemaining} Days Left` 
                    : 'Final Hours!'
                  }
                </h3>
                {trialInfo.promoCodeUsed && (
                  <Badge variant="outline" className="text-xs">
                    Code: {trialInfo.promoCodeUsed}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{timeRemaining}</span>
                </div>
                
                {trialInfo.urgencyLevel === 'critical' && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-red-600">
                      Don't lose access!
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-2 space-y-1">
                <Progress 
                  value={progress} 
                  className="h-2"
                  style={{
                    '--progress-foreground': trialInfo.urgencyLevel === 'critical' 
                      ? 'hsl(0 72% 51%)' 
                      : trialInfo.urgencyLevel === 'high'
                      ? 'hsl(25 95% 53%)'
                      : 'hsl(221 83% 53%)'
                  } as React.CSSProperties}
                />
                <div className="text-xs text-muted-foreground">
                  {urgencyMessage}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={onUpgradeClick}
              className={`text-white font-semibold ${colorTheme.buttonColor} hover:shadow-lg transition-all duration-200`}
              size="sm"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Subscribe Now
            </Button>

            {showDismiss && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}