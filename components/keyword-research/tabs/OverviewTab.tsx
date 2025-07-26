'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  Clock,
  Search,
  TrendingUp,
  Target,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Crown,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Shield,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KeywordResearchResult } from '@/lib/keyword-research'
import { KeywordCell } from '../KeywordCell'
import { DataCell } from '../DataCell'

interface OverviewTabProps {
  data: KeywordResearchResult
  className?: string
}

export function OverviewTab({ data, className }: OverviewTabProps) {
  const { overview, asinResults, aggregatedKeywords, opportunities, gapAnalysis } = data

  // Safe data handling
  const safeAggregatedKeywords = aggregatedKeywords || []
  const safeOpportunities = opportunities || []
  const safeAllKeywords = safeAggregatedKeywords // Use aggregated keywords for all keywords view

  // Helper function for formatting values in text
  const formatInText = (value: number | null | undefined, format: 'percentage' | 'currency' | 'number', decimals = 1) => {
    if (value === null || value === undefined || (format === 'currency' && value === 0)) {
      return 'N/A'
    }
    switch (format) {
      case 'percentage':
        return `${value.toFixed(decimals)}%`
      case 'currency':
        return `$${value.toFixed(decimals)}`
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  // Core business metrics from actual data
  const totalKeywords = overview?.totalKeywords || 0
  const avgSearchVolume = overview?.avgSearchVolume || 0
  
  // Calculate average CPC from aggregated keywords
  const avgCPC = safeAggregatedKeywords.length > 0 
    ? safeAggregatedKeywords.reduce((sum, k) => sum + (k.avgCpc || 0), 0) / safeAggregatedKeywords.length 
    : 0

  // Calculate average rank from ranking positions
  const allRankings = safeAggregatedKeywords.flatMap(k => 
    (k.rankingAsins || []).filter(r => r.position && r.position > 0).map(r => r.position!)
  )
  const avgRank = allRankings.length > 0 
    ? allRankings.reduce((sum, rank) => sum + rank, 0) / allRankings.length 
    : 0

  // Enhanced competition intelligence calculations from ALL keywords
  const keywordsWithProducts = safeAllKeywords.filter(o => o.products !== undefined && o.products > 0)
  const avgCompetingProducts = keywordsWithProducts.length > 0
    ? keywordsWithProducts.reduce((sum, o) => sum + (o.products || 0), 0) / keywordsWithProducts.length
    : 0

  // Market concentration (monopoly click rate) - lower is better for entry
  const keywordsWithMonopoly = safeAllKeywords.filter(o => o.monopolyClickRate !== undefined && o.monopolyClickRate > 0)
  const avgMonopolyRate = keywordsWithMonopoly.length > 0
    ? keywordsWithMonopoly.reduce((sum, o) => sum + (o.monopolyClickRate || 0), 0) / keywordsWithMonopoly.length
    : 0

  // Supply/Demand ratio - higher means more demand relative to supply
  const keywordsWithSupplyDemand = safeAllKeywords.filter(o => o.supplyDemandRatio !== undefined && o.supplyDemandRatio > 0)
  const avgSupplyDemandRatio = keywordsWithSupplyDemand.length > 0
    ? keywordsWithSupplyDemand.reduce((sum, o) => sum + (o.supplyDemandRatio || 0), 0) / keywordsWithSupplyDemand.length
    : 0

  // Title density - how optimized are competitor listings
  const keywordsWithTitleDensity = safeAllKeywords.filter(o => o.titleDensity !== undefined)
  const avgTitleDensity = keywordsWithTitleDensity.length > 0
    ? keywordsWithTitleDensity.reduce((sum, o) => sum + (o.titleDensity || 0), 0) / keywordsWithTitleDensity.length
    : 0

  // Your ASINs' market share (how many keywords you rank for)
  const userAsinKeywords = safeAllKeywords.filter(o => o.rankingAsins && o.rankingAsins.some(r => r.position && r.position <= 50)).length
  const marketSharePercentage = totalKeywords > 0 ? (userAsinKeywords / totalKeywords) * 100 : 0

  // Competition Intelligence metrics
  const keywordsWithAdProducts = safeAllKeywords.filter(o => o.adProducts !== undefined && o.adProducts > 0)
  const avgAdvertisedProducts = keywordsWithAdProducts.length > 0
    ? keywordsWithAdProducts.reduce((sum, o) => sum + (o.adProducts || 0), 0) / keywordsWithAdProducts.length
    : 0

  const keywordsWithBids = safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined && o.bidMin > 0)
  const avgBidMin = keywordsWithBids.length > 0
    ? keywordsWithBids.reduce((sum, o) => sum + (o.bidMin || 0), 0) / keywordsWithBids.length
    : 0
  const avgBidMax = keywordsWithBids.length > 0
    ? keywordsWithBids.reduce((sum, o) => sum + (o.bidMax || 0), 0) / keywordsWithBids.length
    : 0

  // Debug logging to see what data we're getting
  console.log('Competition Intelligence Debug:', {
    totalKeywords: safeAllKeywords.length,
    keywordsWithAdProducts: safeAllKeywords.filter(o => o.adProducts !== undefined).length,
    avgAdvertisedProducts: safeAllKeywords.filter(o => o.adProducts !== undefined).reduce((sum, o) => sum + (o.adProducts || 0), 0) / safeAllKeywords.filter(o => o.adProducts !== undefined).length,
    keywordsWithBids: safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined).length,
    avgBidMin: safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined).reduce((sum, o) => sum + (o.bidMin || 0), 0) / safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined).length,
    avgBidMax: safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined).reduce((sum, o) => sum + (o.bidMax || 0), 0) / safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined).length,
    sampleKeyword: safeAllKeywords[0],
    sampleBidData: safeAllKeywords.slice(0, 3).map(k => ({ keyword: k.keyword, bidMin: k.bidMin, bidMax: k.bidMax })),
    conditionPassed: safeAllKeywords.filter(o => o.adProducts !== undefined).length > 0 && safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined).length > 0,
    avgAdvertisedProductsCheck: safeAllKeywords.filter(o => o.adProducts !== undefined).length > 0,
    avgBidMinCheck: safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined).length > 0,
    avgAdvertisedProductsType: typeof safeAllKeywords.filter(o => o.adProducts !== undefined).length,
    avgBidMinType: typeof safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined).length
  })

  const keywordsWithPurchaseRate = safeAllKeywords.filter(o => o.purchaseRate !== undefined)
  const avgPurchaseRate = keywordsWithPurchaseRate.length > 0
    ? keywordsWithPurchaseRate.reduce((sum, o) => sum + ((o.purchaseRate || 0) * 100), 0) / keywordsWithPurchaseRate.length
    : 0

  // Enhanced conversion intelligence calculations
  const keywordsWithPurchases = safeAllKeywords.filter(o => o.purchases !== undefined && o.purchases > 0)
  const totalMonthlyPurchases = keywordsWithPurchases.length > 0
    ? keywordsWithPurchases.reduce((sum, o) => sum + (o.purchases || 0), 0)
    : 0

  const keywordsWithAvgPrice = safeAllKeywords.filter(o => o.avgPrice !== undefined && o.avgPrice > 0)
  const avgProductPrice = keywordsWithAvgPrice.length > 0
    ? keywordsWithAvgPrice.reduce((sum, o) => sum + (o.avgPrice || 0), 0) / keywordsWithAvgPrice.length
    : 0

  const opportunityPercentage = totalKeywords > 0 ? (safeOpportunities.length / totalKeywords) * 100 : 0

  // Top 5 highest search volume keywords
  const topVolumeKeywords = safeAggregatedKeywords
    .filter(k => k.searchVolume > 0)
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 5)

  // Top 5 opportunity keywords - use actual opportunities from business logic
  const topOpportunityKeywords = safeOpportunities
    .sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0))
    .slice(0, 5)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Strategic Insights at Top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Strategic Insights</span>
          </CardTitle>
          <CardDescription>
            Key metrics and business intelligence from your keyword research
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Core Metrics */}
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalKeywords}</div>
              <div className="text-sm text-muted-foreground">Keywords Found</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                <DataCell value={avgSearchVolume} format="number" />
              </div>
              <div className="text-sm text-muted-foreground">Avg Search Volume</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                <DataCell value={avgCPC} format="currency" />
              </div>
              <div className="text-sm text-muted-foreground">Average CPC</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                <DataCell value={avgRank > 0 ? Math.round(avgRank) : null} format="number" />
              </div>
              <div className="text-sm text-muted-foreground">Average Rank</div>
            </div>
          </div>
          
          {/* Enhanced Business Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-3 flex items-center">
                <Shield className="h-4 w-4 mr-2 text-blue-600" />
                Market Position
              </h4>
              <div className="space-y-2">
                {avgCompetingProducts > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Avg Competing Products</span>
                      <span className="text-sm font-medium">
                  <DataCell value={avgCompetingProducts} format="number" />
                </span>
                    </div>
                    {avgMonopolyRate > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Market Concentration</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                          <DataCell value={avgMonopolyRate} format="percentage" decimals={1} />
                        </span>
                          <Badge 
                            variant={avgMonopolyRate < 0.15 ? "secondary" : avgMonopolyRate < 0.25 ? "outline" : "destructive"} 
                            className="text-xs px-2 py-0"
                          >
                            {avgMonopolyRate < 0.15 ? "Open" : avgMonopolyRate < 0.25 ? "Moderate" : "Concentrated"}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {avgSupplyDemandRatio > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Supply/Demand Ratio</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                          <DataCell value={avgSupplyDemandRatio} format="decimal" decimals={2} />
                        </span>
                          <Badge 
                            variant={avgSupplyDemandRatio > 1.5 ? "secondary" : avgSupplyDemandRatio > 0.8 ? "outline" : "destructive"} 
                            className="text-xs px-2 py-0"
                          >
                            {avgSupplyDemandRatio > 1.5 ? "High Demand" : avgSupplyDemandRatio > 0.8 ? "Balanced" : "Oversupplied"}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {marketSharePercentage > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Your Keyword Coverage</span>
                        <span className="text-sm font-medium">
                          <DataCell value={marketSharePercentage / 100} format="percentage" decimals={1} />
                        </span>
                      </div>
                    )}
                    {avgPurchaseRate > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Avg Conversion Rate</span>
                            <span className="text-sm font-medium text-green-600">
                          <DataCell value={avgPurchaseRate / 100} format="percentage" decimals={1} />
                        </span>
                          </div>
                        )}
                    {avgTitleDensity > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Listing Optimization</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            <DataCell value={avgTitleDensity / 100} format="percentage" decimals={0} />
                          </span>
                          <Badge 
                            variant={avgTitleDensity < 30 ? "secondary" : avgTitleDensity < 60 ? "outline" : "destructive"} 
                            className="text-xs px-2 py-0"
                          >
                            {avgTitleDensity < 30 ? "Low" : avgTitleDensity < 60 ? "Moderate" : "High"}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {avgMonopolyRate < 0.15 
                        ? `Open market with good entry opportunities${avgPurchaseRate > 2 ? ' and strong conversion potential' : ''}`
                        : avgMonopolyRate < 0.25
                        ? `Moderate competition${avgPurchaseRate > 2 ? ' with good conversion rates' : ''}`
                        : `Concentrated market - strong differentiation needed${avgPurchaseRate > 2 ? ', though conversions are promising' : ''}`
                      }
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {avgSearchVolume > 10000 
                      ? "High-demand market with strong potential"
                      : avgSearchVolume > 1000
                      ? "Moderate market with growth opportunities"
                      : "Niche market - focus on long-tail strategies"
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-3 flex items-center">
                <Trophy className="h-4 w-4 mr-2 text-orange-600" />
                Competition Intelligence
              </h4>
              <div className="space-y-2">
                {avgAdvertisedProducts > 0 && avgBidMin > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Advertised Products</span>
                      <span className="text-sm font-medium">{Math.round(avgAdvertisedProducts)} avg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Recommended Bids</span>
                                              <span className="text-sm font-medium">
                          <DataCell value={avgBidMin} format="currency" /> - <DataCell value={avgBidMax} format="currency" />
                        </span>
                    </div>
                    {opportunityPercentage > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Opportunity Rate</span>
                        <span className="text-sm font-medium text-green-600">
                          <DataCell value={opportunityPercentage / 100} format="percentage" decimals={0} />
                        </span>
                      </div>
                    )}
                    {totalMonthlyPurchases > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Monthly Purchases</span>
                        <span className="text-sm font-medium text-blue-600">
                          <DataCell value={totalMonthlyPurchases} format="number" />
                        </span>
                      </div>
                    )}
                    {avgProductPrice > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Avg Product Price</span>
                        <span className="text-sm font-medium">
                          <DataCell value={avgProductPrice} format="currency" decimals={0} />
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {avgPurchaseRate > 3 
                        ? `High-converting market (${formatInText(avgPurchaseRate, 'percentage')} conversion)${totalMonthlyPurchases > 10000 ? ' with strong volume potential' : ''}`
                        : avgPurchaseRate > 1
                        ? `Moderate conversion rates (${formatInText(avgPurchaseRate, 'percentage')})${avgProductPrice > 50 ? ' but higher-value products' : ''}`
                        : `Focus on top-funnel awareness${avgProductPrice > 30 ? ' for premium products' : ' and conversion optimization'}`
                      }
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {avgCPC > 2 
                      ? "High-value keywords with strong commercial intent"
                      : avgCPC > 0.5
                      ? "Moderate CPC suggests balanced competition"
                      : "Low CPC market - focus on volume strategies"
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Keywords Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Highest Search Volume Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Top Keywords by Volume</span>
            </CardTitle>
            <CardDescription>
              Highest search volume keywords discovered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topVolumeKeywords.length > 0 ? (
              topVolumeKeywords.map((keyword, index) => (
                <div key={keyword.keyword} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <KeywordCell keyword={keyword.keyword} className="text-sm" maxWidth="max-w-full" />
                      <p className="text-xs text-muted-foreground">
                        {keyword.rankingAsins.length} products ranking
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      <DataCell value={keyword.searchVolume} format="number" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <DataCell value={keyword.avgCpc} format="currency" prefix="" suffix=" CPC" />
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No high-volume keywords found yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Opportunity Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Top Opportunity Keywords</span>
            </CardTitle>
            <CardDescription>
              Keywords with the highest opportunity potential based on competitive analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topOpportunityKeywords.length > 0 ? (
              topOpportunityKeywords.map((opportunity, index) => (
                <div key={opportunity.keyword} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <KeywordCell keyword={opportunity.keyword} className="text-sm" maxWidth="max-w-full" />
                      <p className="text-xs text-muted-foreground">
                        {opportunity.opportunityType ? opportunity.opportunityType.replace('_', ' ') : 'Opportunity keyword'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      <DataCell value={opportunity.searchVolume} format="number" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <DataCell value={opportunity.avgCpc} format="currency" prefix="" suffix=" CPC" />
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No opportunity keywords identified yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
