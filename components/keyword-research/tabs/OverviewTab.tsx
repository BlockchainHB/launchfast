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
  const { overview, asinResults, aggregatedKeywords, opportunities, gapAnalysis } = data

  // Safe data handling
  const safeAggregatedKeywords = aggregatedKeywords || []
  const safeOpportunities = opportunities || []

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
          
          {/* Business Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                Market Analysis
              </h4>
              <p className="text-sm text-muted-foreground">
                {avgSearchVolume > 10000 
                  ? "High-demand market with strong search volume potential"
                  : avgSearchVolume > 1000
                  ? "Moderate market demand with growth opportunities"
                  : "Niche market - consider long-tail keyword strategies"
                }
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-orange-600" />
                Revenue Potential
              </h4>
              <p className="text-sm text-muted-foreground">
                {avgCPC > 2 
                  ? "High-value keywords indicate strong commercial intent"
                  : avgCPC > 0.5
                  ? "Moderate CPC suggests balanced competition"
                  : "Low CPC market - focus on volume-based strategies"
                }
              </p>
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
