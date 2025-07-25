'use client'

import React, { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Target, 
  Search, 
  TrendingUp, 
  Users, 
  Clock,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Import tab components (we'll create these)
import { OverviewTab } from './tabs/OverviewTab'
import { MarketAnalysisTab } from './tabs/MarketAnalysisTab'
import { ProductComparisonTab } from './tabs/ProductComparisonTab'
import { OpportunitiesTab } from './tabs/OpportunitiesTab'
import { GapAnalysisTab } from './tabs/GapAnalysisTab'

// Import types from our API
import type { 
  KeywordResearchResult,
  AsinKeywordResult,
  AggregatedKeyword,
  OpportunityData,
  GapAnalysisResult
} from '@/lib/keyword-research'

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
  const [showFilters, setShowFilters] = useState(false)

  // Calculate tab badges and availability
  const tabConfigs: TabConfig[] = useMemo(() => {
    if (!data) {
      return [
        { value: 'overview', label: 'Overview', icon: BarChart3, description: 'Research summary', disabled: true },
        { value: 'market', label: 'Market Analysis', icon: TrendingUp, description: 'Aggregated keywords', disabled: true },
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
        label: 'Market Analysis',
        icon: TrendingUp,
        description: 'Aggregated keywords',
        badge: data.aggregatedKeywords?.length || 0
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

  // Handle export functionality
  const handleExport = () => {
    if (!data) return
    
    // Export logic based on active tab
    console.log(`Exporting ${activeTab} data...`)
  }

  // Loading state
  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-72 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Processing research...</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="text-destructive">Research Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRefresh} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!data) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2">
                <span>Keyword Research Results</span>
                <Badge variant="outline" className="ml-2">
                  <Clock className="mr-1 h-3 w-3" />
                  Ready
                </Badge>
              </CardTitle>
              <CardDescription>
                Start a keyword research session to view results here.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tabs Preview */}
          <div className="flex space-x-1 p-1 bg-muted rounded-lg">
            <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground bg-background rounded-md shadow-sm flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </div>
            <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Market Analysis</span>
            </div>
            <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Product Comparison</span>
            </div>
            <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Opportunities</span>
            </div>
            <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Gap Analysis</span>
            </div>
          </div>
          
          {/* Empty Content Area */}
          <div className="flex items-center justify-center py-16 border-2 border-dashed border-muted rounded-lg">
            <div className="text-center space-y-4 max-w-sm">
              <div className="flex justify-center">
                <div className="relative">
                  <Search className="h-16 w-16 text-muted-foreground" />
                  <div className="absolute -top-1 -right-1 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="h-3 w-3 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ready for Keyword Research</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter Amazon ASINs above and start your research to see:
                </p>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
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
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center space-x-2">
              <span>Keyword Research Results</span>
              <Badge variant="outline" className="ml-2">
                <Clock className="mr-1 h-3 w-3" />
                {Math.round((data.overview?.processingTime || 0) / 1000)}s
              </Badge>
            </CardTitle>
            <CardDescription>
              Analyzed {data.overview?.totalAsins || 0} products and found {(data.overview?.totalKeywords || 0).toLocaleString()} keywords
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="hidden md:flex"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="hidden md:flex"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            {tabConfigs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  disabled={tab.disabled}
                  className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  title={tab.tooltip}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge !== undefined && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {typeof tab.badge === 'number' ? tab.badge.toLocaleString() : tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OverviewTab data={data} />
          </TabsContent>

          <TabsContent value="market" className="space-y-4">
            <MarketAnalysisTab 
              data={data.aggregatedKeywords || []} 
              showFilters={showFilters}
            />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <ProductComparisonTab 
              data={data.asinResults || []} 
              showFilters={showFilters}
            />
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <OpportunitiesTab 
              data={data.opportunities || []} 
              showFilters={showFilters}
            />
          </TabsContent>

          <TabsContent value="gaps" className="space-y-4">
            {data.gapAnalysis ? (
              <GapAnalysisTab 
                data={data.gapAnalysis} 
                showFilters={showFilters}
              />
            ) : (
              <div className="flex items-center justify-center py-12 text-center">
                <div className="space-y-2">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Gap analysis requires 2 or more ASINs
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}