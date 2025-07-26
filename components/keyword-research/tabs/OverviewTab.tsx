'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  TrendingUp,
  Target,
  Users,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Crown,
  ArrowUp,
  ArrowDown,
  Zap,
  Shield,
  Trophy,
  Package,
  ShoppingCart,
  Activity,
  Lightbulb,
  ChartBar,
  Sparkles
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

  // Core metrics
  const totalKeywords = overview?.totalKeywords || 0
  const avgSearchVolume = overview?.avgSearchVolume || 0
  
  // Average CPC across all keywords
  const avgCPC = safeAggregatedKeywords.length > 0
    ? safeAggregatedKeywords.reduce((sum, o) => sum + (o.avgCpc || 0), 0) / safeAggregatedKeywords.length
    : 0

  // Average rank calculation using ASIN results
  const allRankings = asinResults?.flatMap(result => 
    result.keywords?.map(kw => kw.rank).filter(rank => rank && rank > 0) || []
  ) || []
  const avgRank = allRankings.length > 0
    ? Math.round(allRankings.reduce((sum, rank) => sum + rank, 0) / allRankings.length)
    : 0

  // Market Position metrics - calculate average competing products per keyword
  const keywordsWithProducts = safeAllKeywords.filter(o => o.products !== undefined && o.products > 0)
  const avgCompetingProducts = keywordsWithProducts.length > 0
    ? Math.round(keywordsWithProducts.reduce((sum, o) => sum + (o.products || 0), 0) / keywordsWithProducts.length)
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

  const keywordsWithPurchaseRate = safeAllKeywords.filter(o => o.purchaseRate !== undefined)
  const avgPurchaseRate = keywordsWithPurchaseRate.length > 0
    ? keywordsWithPurchaseRate.reduce((sum, o) => sum + ((o.purchaseRate || 0) * 100), 0) / keywordsWithPurchaseRate.length
    : 0

  // Monthly purchase volume
  const keywordsWithPurchases = safeAllKeywords.filter(o => o.purchases !== undefined && o.purchases > 0)
  const totalMonthlyPurchases = keywordsWithPurchases.length > 0
    ? keywordsWithPurchases.reduce((sum, o) => sum + (o.purchases || 0), 0)
    : 0

  const keywordsWithAvgPrice = safeOpportunities.filter(o => o.avgPrice !== undefined && o.avgPrice > 0)
  const avgProductPrice = keywordsWithAvgPrice.length > 0
    ? keywordsWithAvgPrice.reduce((sum, o) => sum + (o.avgPrice || 0), 0) / keywordsWithAvgPrice.length
    : 0

  // Calculate opportunity percentage
  const opportunityPercentage = totalKeywords > 0 ? (safeOpportunities.length / totalKeywords) * 100 : 0

  // Top 5 keywords by volume - use aggregated keywords for accurate data
  const topVolumeKeywords = safeAggregatedKeywords
    .sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0))
    .slice(0, 5)

  // Top 5 opportunity keywords - use actual opportunities from business logic
  const topOpportunityKeywords = safeOpportunities
    .sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0))
    .slice(0, 5)

  // Market health calculation
  const marketHealth = {
    score: 0,
    factors: [] as { name: string; positive: boolean; value: string }[]
  }

  if (avgSupplyDemandRatio > 1.5) {
    marketHealth.score += 25
    marketHealth.factors.push({ name: 'Supply/Demand', positive: true, value: `${avgSupplyDemandRatio.toFixed(1)}x` })
  }
  if (avgMonopolyRate < 0.25) {
    marketHealth.score += 25
    marketHealth.factors.push({ name: 'Competition', positive: true, value: 'Open Market' })
  }
  if (avgPurchaseRate > 5) {
    marketHealth.score += 25
    marketHealth.factors.push({ name: 'Conversion', positive: true, value: `${avgPurchaseRate.toFixed(1)}%` })
  }
  if (opportunityPercentage > 20) {
    marketHealth.score += 25
    marketHealth.factors.push({ name: 'Opportunities', positive: true, value: `${Math.round(opportunityPercentage)}%` })
  }

  // Keyword distribution by search volume
  const volumeDistribution = {
    high: safeAggregatedKeywords.filter(k => k.searchVolume >= 10000).length,
    medium: safeAggregatedKeywords.filter(k => k.searchVolume >= 1000 && k.searchVolume < 10000).length,
    low: safeAggregatedKeywords.filter(k => k.searchVolume < 1000).length
  }

  // PPC Competitiveness Score
  const ppcCompetitiveness = avgAdvertisedProducts > 50 ? 'High' : avgAdvertisedProducts > 20 ? 'Medium' : 'Low'
  const ppcCompetitiveScore = avgAdvertisedProducts > 50 ? 80 : avgAdvertisedProducts > 20 ? 50 : 20

  return (
    <div className={cn('space-y-6', className)}>
      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Market Overview Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center text-sm font-medium text-gray-700">
              <Activity className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
              Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-4 px-4">
            <div className="space-y-3">
              {/* Primary Metric */}
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-gray-900">{totalKeywords.toLocaleString()}</span>
                  <span className="text-xs text-gray-500">keywords</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100/70 text-blue-700 border-0 text-xs font-medium mt-1 px-2 py-0.5">
                  {avgSearchVolume.toLocaleString()} avg volume
                </Badge>
              </div>
              
              {/* Volume Distribution */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600">Volume Distribution</span>
                <div className="flex gap-0.5 h-6 rounded overflow-hidden">
                  {volumeDistribution.high > 0 && (
                    <div 
                      className="bg-blue-600 flex items-center justify-center text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-default"
                      style={{ width: `${Math.max((volumeDistribution.high / totalKeywords) * 100, 15)}%` }}
                      title={`High Volume: ${volumeDistribution.high} keywords`}
                    >
                      {volumeDistribution.high}
                    </div>
                  )}
                  {volumeDistribution.medium > 0 && (
                    <div 
                      className="bg-blue-400 flex items-center justify-center text-xs font-medium text-white hover:bg-blue-500 transition-colors cursor-default"
                      style={{ width: `${Math.max((volumeDistribution.medium / totalKeywords) * 100, 15)}%` }}
                      title={`Medium Volume: ${volumeDistribution.medium} keywords`}
                    >
                      {volumeDistribution.medium}
                    </div>
                  )}
                  {volumeDistribution.low > 0 && (
                    <div 
                      className="bg-blue-200 flex items-center justify-center text-xs font-medium text-gray-700 hover:bg-blue-300 transition-colors cursor-default"
                      style={{ width: `${Math.max((volumeDistribution.low / totalKeywords) * 100, 15)}%` }}
                      title={`Low Volume: ${volumeDistribution.low} keywords`}
                    >
                      {volumeDistribution.low}
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>High (10K+)</span>
                  <span>Med</span>
                  <span>Low (&lt;1K)</span>
                </div>
              </div>

              {/* Footer Metric */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Market Health</span>
                  <div className="flex items-center gap-2">
                    <Progress value={marketHealth.score} className="w-14 h-1" />
                    <span className="text-xs font-semibold text-gray-900">{marketHealth.score}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competitive Landscape Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50/50 to-pink-50/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center text-sm font-medium text-gray-700">
              <Users className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
              Competitive Landscape
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-4 px-4">
            <div className="space-y-3">
              {/* Primary Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">
                      {Math.round(avgCompetingProducts).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Avg Competitors</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">
                      {marketSharePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Your Coverage</span>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="bg-purple-50/40 rounded-md p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Market Concentration</span>
                  <Badge 
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0 h-4",
                      avgMonopolyRate < 0.15 ? "bg-green-100 text-green-700 border-0" : 
                      avgMonopolyRate < 0.25 ? "bg-yellow-100 text-yellow-700 border-0" : 
                      "bg-red-100 text-red-700 border-0"
                    )}
                  >
                    {avgMonopolyRate < 0.15 ? 'Low' : avgMonopolyRate < 0.25 ? 'Med' : 'High'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">PPC Competition</span>
                  <div className="flex items-center gap-1.5">
                    <Progress value={ppcCompetitiveScore} className="w-12 h-1" />
                    <Badge className="text-[10px] font-medium px-1.5 py-0 h-4 bg-purple-100 text-purple-700 border-0">
                      {ppcCompetitiveness}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Listing Optimization</span>
                  <Badge 
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0 h-4",
                      avgTitleDensity < 30 ? "bg-green-100 text-green-700 border-0" : 
                      avgTitleDensity < 60 ? "bg-yellow-100 text-yellow-700 border-0" : 
                      "bg-red-100 text-red-700 border-0"
                    )}
                  >
                    {avgTitleDensity < 30 ? 'Low' : avgTitleDensity < 60 ? 'Med' : 'High'}
                  </Badge>
                </div>
              </div>

              {/* Footer Insight */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-start gap-1.5">
                  <Lightbulb className="h-3 w-3 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    {avgMonopolyRate < 0.25 
                      ? "Open market with entry opportunities"
                      : "Concentrated market - differentiation needed"
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Potential Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50/50 to-emerald-50/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center text-sm font-medium text-gray-700">
              <DollarSign className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              Revenue Potential
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-4 px-4">
            <div className="space-y-3">
              {/* Primary Metric */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {totalMonthlyPurchases.toLocaleString()}
                  </span>
                </div>
                <span className="text-xs text-gray-500">Est. Monthly Purchases</span>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50/40 rounded-md p-2">
                  <div className="text-lg font-bold text-gray-900">
                    <DataCell value={avgProductPrice} format="currency" decimals={0} />
                  </div>
                  <p className="text-[10px] text-gray-600">Avg Product Price</p>
                </div>
                <div className="bg-green-50/40 rounded-md p-2">
                  <div className="text-lg font-bold text-gray-900">
                    {avgPurchaseRate > 0 ? `${avgPurchaseRate.toFixed(1)}%` : 'N/A'}
                  </div>
                  <p className="text-[10px] text-gray-600">Avg Conversion</p>
                </div>
              </div>

              {/* PPC Bids */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-600">Recommended PPC Bids</span>
                <div className="flex items-center justify-between bg-gradient-to-r from-green-50/60 to-emerald-50/60 rounded-md px-3 py-2 border border-green-100">
                  <span className="text-sm font-bold text-gray-800">
                    <DataCell value={avgBidMin} format="currency" /> - <DataCell value={avgBidMax} format="currency" />
                  </span>
                  <span className="text-[10px] text-gray-500">per click</span>
                </div>
              </div>

              {/* Footer Insight */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-start gap-1.5">
                  <TrendingUp className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    {avgPurchaseRate > 5 
                      ? "High-converting market with strong ROI"
                      : totalMonthlyPurchases > 10000
                      ? "High volume - focus on competitive pricing"
                      : "Niche market - optimize for targeting"
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-base font-semibold">
            <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
            Key Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {marketHealth.factors.map((factor, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/70 hover:bg-gray-50 transition-colors">
                {factor.positive ? (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{factor.name}</p>
                  <p className="text-xs text-gray-600">{factor.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Keywords Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Volume Keywords */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center text-base font-semibold">
                <Crown className="h-4 w-4 mr-2 text-blue-600" />
                Top Keywords by Volume
              </div>
              <Badge variant="secondary" className="text-xs font-medium bg-blue-50 text-blue-700 border-0">
                Highest Traffic Potential
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {topVolumeKeywords.length > 0 ? (
                topVolumeKeywords.map((keyword, idx) => (
                  <div key={keyword.keyword} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/70 transition-colors">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <KeywordCell keyword={keyword.keyword} className="font-medium text-gray-900 text-sm" />
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-600">
                          <span className="font-semibold">{keyword.searchVolume?.toLocaleString()}</span> searches
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          <DataCell value={keyword.avgCpc} format="currency" /> CPC
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {keyword.rankingAsins && keyword.rankingAsins.length > 0 && (
                        <Badge variant="outline" className="text-xs font-medium border-gray-200">
                          {keyword.rankingAsins.length} ranking
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No keyword data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Opportunity Keywords */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center text-base font-semibold">
                <Target className="h-4 w-4 mr-2 text-green-600" />
                Top Opportunity Keywords
              </div>
              <Badge variant="secondary" className="text-xs font-medium bg-green-50 text-green-700 border-0">
                Best ROI Potential
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {topOpportunityKeywords.length > 0 ? (
                topOpportunityKeywords.map((opportunity, idx) => (
                  <div key={opportunity.keyword} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/70 transition-colors">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-xs flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <KeywordCell keyword={opportunity.keyword} className="font-medium text-gray-900 text-sm" />
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-600">
                          <span className="font-semibold">{opportunity.searchVolume?.toLocaleString()}</span> searches
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          <DataCell value={opportunity.avgCpc} format="currency" /> CPC
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Opportunity
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No opportunity keywords found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
