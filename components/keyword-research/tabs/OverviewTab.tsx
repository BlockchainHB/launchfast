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

interface OverviewTabProps {
  data: KeywordResearchResult
  className?: string
}

export function OverviewTab({ data, className }: OverviewTabProps) {
  const { overview, asinResults, aggregatedKeywords, opportunities, gapAnalysis, allKeywordsWithCompetition } = data

  // Safe data handling
  const safeAggregatedKeywords = aggregatedKeywords || []
  const safeOpportunities = opportunities || []
  const safeAllKeywords = allKeywordsWithCompetition || safeOpportunities // Fallback to opportunities if not available

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

  // Enhanced competition intelligence calculations from ALL keywords, not just opportunities
  // This gives a true overview of your ASIN portfolio's competitive landscape
  const keywordsWithCompetition = safeAllKeywords.filter(o => o.competitionScore !== undefined && o.competitionScore > 0)
  const avgCompetitionScore = keywordsWithCompetition.length > 0
    ? keywordsWithCompetition.reduce((sum, o) => sum + (o.competitionScore || 0), 0) / keywordsWithCompetition.length
    : 0

  const keywordsWithProducts = safeAllKeywords.filter(o => o.products !== undefined)
  const avgCompetingProducts = keywordsWithProducts.length > 0
    ? keywordsWithProducts.reduce((sum, o) => sum + (o.products || 0), 0) / keywordsWithProducts.length
    : 0

  const keywordsWithAdProducts = safeAllKeywords.filter(o => o.adProducts !== undefined)
  const avgAdvertisedProducts = keywordsWithAdProducts.length > 0
    ? keywordsWithAdProducts.reduce((sum, o) => sum + (o.adProducts || 0), 0) / keywordsWithAdProducts.length
    : 0

  const keywordsWithBids = safeAllKeywords.filter(o => o.bidMin !== undefined && o.bidMax !== undefined)
  const avgBidMin = keywordsWithBids.length > 0
    ? keywordsWithBids.reduce((sum, o) => sum + (o.bidMin || 0), 0) / keywordsWithBids.length
    : 0
  const avgBidMax = keywordsWithBids.length > 0
    ? keywordsWithBids.reduce((sum, o) => sum + (o.bidMax || 0), 0) / keywordsWithBids.length
    : 0

  // Debug logging to see what data we're getting
  console.log('Competition Intelligence Debug:', {
    totalKeywords: safeAllKeywords.length,
    keywordsWithAdProducts: keywordsWithAdProducts.length,
    avgAdvertisedProducts,
    keywordsWithBids: keywordsWithBids.length,
    avgBidMin,
    avgBidMax,
    sampleKeyword: safeAllKeywords[0],
    sampleBidData: safeAllKeywords.slice(0, 3).map(k => ({ keyword: k.keyword, bidMin: k.bidMin, bidMax: k.bidMax })),
    conditionPassed: avgAdvertisedProducts > 0 && avgBidMin > 0
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
              <div className="text-2xl font-bold text-green-600">{avgSearchVolume.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Avg Search Volume</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">${avgCPC.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Average CPC</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {avgRank > 0 ? Math.round(avgRank) : '--'}
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
                      <span className="text-xs text-muted-foreground">Competing Products</span>
                      <span className="text-sm font-medium">{Math.round(avgCompetingProducts)} avg</span>
                    </div>
                    {avgCompetitionScore > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Competition Level</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{avgCompetitionScore.toFixed(1)}/10</span>
                            <Badge variant={avgCompetitionScore <= 3 ? "secondary" : avgCompetitionScore <= 6 ? "outline" : "destructive"} className="text-xs px-2 py-0">
                              {avgCompetitionScore <= 3 ? "Low" : avgCompetitionScore <= 6 ? "Medium" : "High"}
                            </Badge>
                          </div>
                        </div>
                        {avgPurchaseRate > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Avg Conversion Rate</span>
                            <span className="text-sm font-medium text-green-600">{avgPurchaseRate.toFixed(1)}%</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {avgCompetitionScore <= 3 
                            ? `Good entry opportunities${avgPurchaseRate > 2 ? ' with strong conversion potential' : ''}`
                            : avgCompetitionScore <= 6
                            ? `Strategic positioning required${avgPurchaseRate > 2 ? ', but good conversion rates' : ''}`
                            : `Strong differentiation needed${avgPurchaseRate > 2 ? ', though conversions are promising' : ''}`
                          }
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Competition analysis pending - enhanced data being processed
                      </p>
                    )}
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
                      <span className="text-sm font-medium">${avgBidMin.toFixed(2)} - ${avgBidMax.toFixed(2)}</span>
                    </div>
                    {opportunityPercentage > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Opportunity Rate</span>
                        <span className="text-sm font-medium text-green-600">{opportunityPercentage.toFixed(0)}%</span>
                      </div>
                    )}
                    {totalMonthlyPurchases > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Monthly Purchases</span>
                        <span className="text-sm font-medium text-blue-600">{totalMonthlyPurchases.toLocaleString()}</span>
                      </div>
                    )}
                    {avgProductPrice > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Avg Product Price</span>
                        <span className="text-sm font-medium">${avgProductPrice.toFixed(0)}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {avgPurchaseRate > 3 
                        ? `High-converting market (${avgPurchaseRate.toFixed(1)}% conversion)${totalMonthlyPurchases > 10000 ? ' with strong volume potential' : ''}`
                        : avgPurchaseRate > 1
                        ? `Moderate conversion rates (${avgPurchaseRate.toFixed(1)}%)${avgProductPrice > 50 ? ' but higher-value products' : ''}`
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
                    <div>
                      <p className="font-medium text-sm">{keyword.keyword}</p>
                      <p className="text-xs text-muted-foreground">
                        {keyword.rankingAsins.length} products ranking
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{keyword.searchVolume.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">${keyword.avgCpc.toFixed(2)} CPC</p>
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
                    <div>
                      <p className="font-medium text-sm">{opportunity.keyword}</p>
                      <p className="text-xs text-muted-foreground">
                        {opportunity.opportunityType ? opportunity.opportunityType.replace('_', ' ') : 'Opportunity keyword'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{opportunity.searchVolume?.toLocaleString() || '--'}</p>
                    <p className="text-xs text-muted-foreground">${opportunity.avgCpc?.toFixed(2) || '--'} CPC</p>
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
