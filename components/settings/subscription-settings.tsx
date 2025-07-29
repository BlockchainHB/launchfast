'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { IconCreditCard, IconExternalLink, IconCheck, IconX, IconAlertTriangle, IconClock, IconSparkles } from '@tabler/icons-react'
import { SUBSCRIPTION_PLANS, getSubscriptionPlan, hasUnlimitedSearches } from '@/lib/stripe'
import { getTrialInfo, getTrialUrgencyMessage, getTrialColorTheme, TrialInfo } from '@/lib/trial-utils'

interface SubscriptionData {
  subscription_tier: string
  subscription_status?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
}

interface UsageData {
  monthlySearches: number
  limit: number
  unlimited: boolean
}

interface BillingHistoryItem {
  id: string
  date: string
  description: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
}

export function SubscriptionSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([])
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false)
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)

  useEffect(() => {
    fetchSubscriptionData()
    fetchUsageData()
    fetchBillingHistory()
    fetchTrialInfo()
  }, [])

  const fetchTrialInfo = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        if (data.id) {
          // Get trial info using the utility function
          const response = await fetch('/api/user/trial-info')
          if (response.ok) {
            const trialData = await response.json()
            setTrialInfo(trialData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load trial data:', error)
    }
  }

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setSubscription({
          subscription_tier: data.subscription_tier || 'expired',
          subscription_status: data.subscription_status,
          stripe_customer_id: data.stripe_customer_id,
          stripe_subscription_id: data.stripe_subscription_id,
          current_period_end: data.current_period_end,
          cancel_at_period_end: data.cancel_at_period_end
        })
      }
    } catch (error) {
      toast.error('Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsageData = async () => {
    try {
      const response = await fetch('/api/usage/current')
      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      console.error('Failed to load usage data:', error)
    }
  }

  const fetchBillingHistory = async () => {
    try {
      const response = await fetch('/api/billing/history')
      if (response.ok) {
        const data = await response.json()
        setBillingHistory(data)
      }
    } catch (error) {
      console.error('Failed to load billing history:', error)
      // Set mock data for now
      setBillingHistory([
        {
          id: '1',
          date: '2024-01-01',
          description: 'LaunchFast Pro - Monthly',
          amount: 5000,
          status: 'paid'
        }
      ])
    }
  }

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true)
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.url
      } else {
        toast.error('Failed to open billing portal')
      }
    } catch (error) {
      toast.error('Error opening billing portal')
    } finally {
      setIsManagingSubscription(false)
    }
  }

  const handleUpgrade = () => {
    // For trial users, API will automatically detect trial status and use correct price
    if (subscription?.subscription_tier === 'trial') {
      window.location.href = '/api/stripe/create-checkout?plan=pro'
    } else {
      window.location.href = '/api/subscribe'
    }
  }

  const handleCancelSubscription = async () => {
    setIsCancellingSubscription(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchSubscriptionData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      toast.error('Error cancelling subscription')
    } finally {
      setIsCancellingSubscription(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setIsCancellingSubscription(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchSubscriptionData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to reactivate subscription')
      }
    } catch (error) {
      toast.error('Error reactivating subscription')
    } finally {
      setIsCancellingSubscription(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return <div>Failed to load subscription data</div>
  }

  const plan = getSubscriptionPlan(subscription.subscription_tier as any)
  const isActive = ['active', 'trialing'].includes(subscription.subscription_status || '')
  const isUnlimited = subscription.subscription_tier === 'unlimited'
  const isPro = subscription.subscription_tier === 'pro'
  const isTrial = subscription.subscription_tier === 'trial' && subscription.subscription_status === 'trialing'

  return (
    <div className="space-y-6">
      {/* Trial Status Banner (if on trial) */}
      {isTrial && trialInfo && trialInfo.isActive && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Free Trial Status</h3>
          <Card className={getTrialColorTheme(trialInfo.urgencyLevel).borderColor}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTrialColorTheme(trialInfo.urgencyLevel).bgColor}`}>
                    <IconSparkles className={`h-5 w-5 ${getTrialColorTheme(trialInfo.urgencyLevel).textColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {trialInfo.daysRemaining > 0 
                        ? `${trialInfo.daysRemaining} Days Remaining` 
                        : `${trialInfo.hoursRemaining} Hours Remaining!`
                      }
                    </CardTitle>
                    <CardDescription>
                      {getTrialUrgencyMessage(trialInfo)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IconClock className={`h-5 w-5 ${getTrialColorTheme(trialInfo.urgencyLevel).textColor}`} />
                  <span className={`text-sm font-semibold ${getTrialColorTheme(trialInfo.urgencyLevel).textColor}`}>
                    {trialInfo.promoCodeUsed && `Code: ${trialInfo.promoCodeUsed}`}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${getTrialColorTheme(trialInfo.urgencyLevel).bgColor} ${getTrialColorTheme(trialInfo.urgencyLevel).borderColor}`}>
                  <div className="flex items-start gap-3">
                    <IconAlertTriangle className={`h-5 w-5 mt-0.5 ${getTrialColorTheme(trialInfo.urgencyLevel).textColor}`} />
                    <div>
                      <p className={`font-medium ${getTrialColorTheme(trialInfo.urgencyLevel).textColor}`}>
                        Don't lose access to your data!
                      </p>
                      <p className={`text-sm mt-1 ${getTrialColorTheme(trialInfo.urgencyLevel).textColor}`}>
                        Subscribe now to continue using LaunchFast after your trial expires. 
                        Your trial will automatically end on {trialInfo.trialEndDate ? new Date(trialInfo.trialEndDate).toLocaleDateString() : 'soon'}.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleUpgrade}
                  className={`w-full text-white font-semibold ${getTrialColorTheme(trialInfo.urgencyLevel).buttonColor}`}
                  size="lg"
                >
                  <IconCreditCard className="h-4 w-4 mr-2" />
                  Subscribe Now - $199/month
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Plan */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Plan</h3>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isUnlimited && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  ✨ Special User
                </Badge>
              )}
              {isPro && isActive && !subscription.cancel_at_period_end && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <IconCheck className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
              {isPro && isActive && subscription.cancel_at_period_end && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <IconAlertTriangle className="h-3 w-3 mr-1" />
                  Cancelling
                </Badge>
              )}
              {!isActive && !isUnlimited && (
                <Badge variant="destructive">
                  <IconX className="h-3 w-3 mr-1" />
                  Inactive
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscription.current_period_end && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancel_at_period_end 
                      ? `Subscription ends on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                      : `Next billing date: ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    }
                  </p>
                </div>
              )}
              
              {!isUnlimited && (
                <div className="space-y-4">
                  {/* Cancellation Alert */}
                  {isPro && isActive && subscription.cancel_at_period_end && (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <IconAlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-800">
                          Subscription Cancellation Scheduled
                        </p>
                        <p className="text-sm text-orange-700 mt-1">
                          Your subscription will end on {new Date(subscription.current_period_end!).toLocaleDateString()}. 
                          You&apos;ll continue to have access until then.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {!isPro && (
                      <Button onClick={handleUpgrade}>
                        Upgrade to Pro
                      </Button>
                    )}
                    
                    {isPro && isActive && (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleManageSubscription}
                          disabled={isManagingSubscription}
                        >
                          <IconCreditCard className="h-4 w-4 mr-2" />
                          {isManagingSubscription ? 'Loading...' : 'Manage Subscription'}
                          <IconExternalLink className="h-4 w-4 ml-2" />
                        </Button>

                        {!subscription.cancel_at_period_end ? (
                          <Button
                            variant="outline"
                            onClick={handleCancelSubscription}
                            disabled={isCancellingSubscription}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <IconX className="h-4 w-4 mr-2" />
                            {isCancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={handleReactivateSubscription}
                            disabled={isCancellingSubscription}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <IconCheck className="h-4 w-4 mr-2" />
                            {isCancellingSubscription ? 'Reactivating...' : 'Reactivate Subscription'}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Statistics */}
      {usage && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Usage This Month</h3>
            <Card>
              <CardHeader>
                <CardTitle>Product Searches</CardTitle>
                <CardDescription>
                  {usage.unlimited 
                    ? 'You have unlimited searches' 
                    : `${usage.monthlySearches} of ${usage.limit} searches used`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!usage.unlimited && (
                  <div className="space-y-2">
                    <Progress 
                      value={(usage.monthlySearches / usage.limit) * 100} 
                      className="w-full" 
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{usage.monthlySearches} used</span>
                      <span>{usage.limit - usage.monthlySearches} remaining</span>
                    </div>
                  </div>
                )}
                {usage.unlimited && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
                    <IconCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Unlimited searches available
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Plan Features */}
      <Separator />
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Plan Features</h3>
        <Card>
          <CardContent className="pt-6">
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      {billingHistory.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Billing History</h3>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {new Date(item.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>${(item.amount / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.status === 'paid' ? 'default' :
                              item.status === 'pending' ? 'secondary' : 'destructive'
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}