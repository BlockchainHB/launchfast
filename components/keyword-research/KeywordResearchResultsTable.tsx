'use client'

import React, { useMemo, useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Search, 
  RefreshCw,
  Download,
  AlertCircle,
  Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { OverviewTab } from './tabs/OverviewTab'
import { MarketAnalysisTab } from './tabs/MarketAnalysisTab'
import { ProductComparisonTab } from './tabs/ProductComparisonTab'
import { OpportunitiesTab } from './tabs/OpportunitiesTab'
import { GapAnalysisTab } from './tabs/GapAnalysisTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { KeywordResearchResult } from '@/lib/keyword-research'

// Import types from our API
import type { 
  KeywordResearchResult,
  AsinKeywordResult,
  AggregatedKeyword
} from '@/lib/keyword-research'
import type { OpportunityData, GapAnalysisResult } from '@/types'

interface KeywordResearchResultsTableProps {
  data: KeywordResearchResult | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  className?: string
}

type TabValue = 'overview' | 'market' | 'comparison' | 'opportunities' | 'gaps'

interface TabConfig {
  value: TabValue
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: string | number
  disabled?: boolean
  tooltip?: string
}

export function KeywordResearchResultsTable({
  data,
  loading = false,
  error = null,
  onRefresh,
  className
}: KeywordResearchResultsTableProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('overview')

  // Calculate tab badges and availability
  const tabConfigs: TabConfig[] = useMemo(() => {
    if (!data) {
      return [
        { value: 'overview', label: 'Overview', icon: BarChart3, description: 'Research summary', disabled: true },
        { value: 'market', label: 'All Keywords', icon: TrendingUp, description: 'All discovered keywords', disabled: true },
        { value: 'comparison', label: 'Product Comparison', icon: Users, description: 'ASIN performance', disabled: true },
        { value: 'opportunities', label: 'Opportunities', icon: Target, description: 'Keyword opportunities', disabled: true },
        { value: 'gaps', label: 'Gap Analysis', icon: Search, description: 'Market gaps', disabled: true }
      ]
    }

    const hasGapAnalysis = !!data.gapAnalysis && (data.overview?.totalAsins || 0) >= 2

    return [
      {
        value: 'overview',
        label: 'Overview',
        icon: BarChart3,
        description: 'Research summary',
        badge: data.overview?.totalAsins || 0
      },
      {
        value: 'market',
        label: 'All Keywords',
        icon: TrendingUp,
        description: 'All discovered keywords',
        badge: data.allKeywordsWithCompetition?.length || data.aggregatedKeywords?.length || 0
      },
      {
        value: 'comparison',
        label: 'Product Comparison',
        icon: Users,
        description: 'ASIN performance',
        badge: data.asinResults?.filter(r => r.status === 'success').length || 0
      },
      {
        value: 'opportunities',
        label: 'Opportunities',
        icon: Target,
        description: 'Keyword opportunities',
        badge: data.opportunities?.length || 0
      },
      {
        value: 'gaps',
        label: 'Gap Analysis',
        icon: Search,
        description: 'Market gaps',
        badge: hasGapAnalysis ? data.gapAnalysis.analysis.totalGapsFound : undefined,
        disabled: !hasGapAnalysis,
        tooltip: hasGapAnalysis ? undefined : 'Requires 2+ ASINs for gap analysis'
      }
    ]
  }, [data])



  // Loading state
  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <div className="h-7 w-48 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-72 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Processing research...</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg" />
                ))}
              </div>
              <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('w-full', className)}>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4 max-w-sm">
                <div className="flex justify-center">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Research Failed</h3>
                  <p className="text-sm text-gray-600">{error}</p>
                </div>
                {onRefresh && (
                  <button 
                    onClick={onRefresh}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // No data state
  if (!data) {
    return (
      <div className={cn('w-full', className)}>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            {/* Tab previews */}
            <div className="flex space-x-1 mb-6 p-1 bg-gray-100/50 rounded-lg">
              <div className="px-3 py-2 text-sm font-medium text-gray-600 flex items-center space-x-2 opacity-50">
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
              </div>
              <div className="px-3 py-2 text-sm font-medium text-gray-600 flex items-center space-x-2 opacity-50">
                <TrendingUp className="h-4 w-4" />
                <span>All Keywords</span>
              </div>
              <div className="px-3 py-2 text-sm font-medium text-gray-600 flex items-center space-x-2 opacity-50">
                <Users className="h-4 w-4" />
                <span>Product Comparison</span>
              </div>
              <div className="px-3 py-2 text-sm font-medium text-gray-600 flex items-center space-x-2 opacity-50">
                <Target className="h-4 w-4" />
                <span>Opportunities</span>
              </div>
              <div className="px-3 py-2 text-sm font-medium text-gray-600 flex items-center space-x-2 opacity-50">
                <Search className="h-4 w-4" />
                <span>Gap Analysis</span>
              </div>
            </div>
            
            {/* Empty Content Area */}
            <div className="flex items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center space-y-4 max-w-sm">
                <div className="flex justify-center">
                  <div className="relative">
                    <Search className="h-16 w-16 text-gray-400" />
                    <div className="absolute -top-1 -right-1 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-3 w-3 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Ready for Keyword Research</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Enter Amazon ASINs above and start your research to see:
                  </p>
                </div>
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center justify-center space-x-2">
                    <BarChart3 className="h-3 w-3 text-blue-600" />
                    <span>Research overview & metrics</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span>Market analysis & keyword data</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Users className="h-3 w-3 text-purple-600" />
                    <span>Product performance comparison</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Target className="h-3 w-3 text-orange-600" />
                    <span>Keyword opportunities</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Search className="h-3 w-3 text-red-600" />
                    <span>Competitive gap analysis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <span>Keyword Research Results</span>
                <Badge variant="outline" className="ml-3 text-xs px-2 py-0.5">
                  <Clock className="mr-1 h-3 w-3" />
                  {Math.round((data.overview?.processingTime || 0) / 1000)}s
                </Badge>
              </h2>
              <p className="text-sm text-gray-500">
                Analyzed {data.overview?.totalAsins || 0} products and found {(data.overview?.totalKeywords || 0).toLocaleString()} keywords
              </p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="space-y-6">
            <TabsList className="bg-gray-100/50 p-1 inline-flex h-auto rounded-lg">
              {tabConfigs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    disabled={tab.disabled}
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-md transition-all"
                    title={tab.tooltip}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="text-sm">{tab.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab data={data} />
            </TabsContent>

            <TabsContent value="market">
              <MarketAnalysisTab 
                data={data.aggregatedKeywords || []} 
                aggregatedData={data.aggregatedKeywords || []}
              />
            </TabsContent>

            <TabsContent value="comparison">
              <ProductComparisonTab 
                data={data.asinResults || []} 
                opportunities={data.opportunities || []}
              />
            </TabsContent>

            <TabsContent value="opportunities">
              <OpportunitiesTab 
                data={data.opportunities || []} 
              />
            </TabsContent>

            <TabsContent value="gaps">
              {data.gapAnalysis ? (
                <GapAnalysisTab 
                  data={data.gapAnalysis} 
                />
              ) : (
                <div className="flex items-center justify-center py-12 text-center">
                  <div className="space-y-2">
                    <Search className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-500">
                      Gap analysis requires 2 or more ASINs
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}