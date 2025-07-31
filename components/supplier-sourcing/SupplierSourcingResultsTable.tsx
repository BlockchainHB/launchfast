'use client'

import React, { useMemo, useState } from 'react'
import { 
  Search, 
  Users, 
  Package, 
  BarChart3, 
  MessageCircle, 
  RefreshCw,
  Download,
  AlertCircle,
  Factory
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SearchDiscoveryTab } from './tabs/SearchDiscoveryTab'
import { SupplierManagerTab } from './tabs/SupplierManagerTab'
import { SampleTrackerTab } from './tabs/SampleTrackerTab'
import { MarketIntelligenceTab } from './tabs/MarketIntelligenceTab'
import { CommunicationHubTab } from './tabs/CommunicationHubTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SupplierSearchResult } from '@/types/supplier'

interface MarketContext {
  marketId: string
  productName: string
  estimatedProfit: number
  marketGrade: string
  competitionLevel: 'low' | 'medium' | 'high'
  suggestedMOQ: number
}

interface SupplierSourcingResultsTableProps {
  data: SupplierSearchResult | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  className?: string
  marketContext?: MarketContext | null
  initialSearchTerm?: string
}

type TabValue = 'search' | 'manager' | 'samples' | 'intelligence' | 'communication'

interface TabConfig {
  value: TabValue
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: string | number
  disabled?: boolean
  tooltip?: string
}

export function SupplierSourcingResultsTable({
  data,
  loading = false,
  error = null,
  onRefresh,
  className,
  marketContext = null,
  initialSearchTerm = ''
}: SupplierSourcingResultsTableProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('search')

  // Calculate tab badges and availability
  const tabConfigs: TabConfig[] = useMemo(() => {
    if (!data) {
      return [
        { value: 'search', label: 'Search & Discovery', icon: Search, description: 'Find new suppliers', disabled: false },
        { value: 'manager', label: 'Supplier Manager', icon: Users, description: 'Manage relationships', disabled: false },
        { value: 'samples', label: 'Sample Tracker', icon: Package, description: 'Track sample requests', disabled: false },
        { value: 'intelligence', label: 'Market Intelligence', icon: BarChart3, description: 'Market analysis', disabled: false },
        { value: 'communication', label: 'Communication Hub', icon: MessageCircle, description: 'Email templates', disabled: false }
      ]
    }

    return [
      {
        value: 'search',
        label: 'Search & Discovery',
        icon: Search,
        description: 'Find new suppliers',
        badge: data.suppliers?.length || 0
      },
      {
        value: 'manager',
        label: 'Supplier Manager',
        icon: Users,
        description: 'Manage relationships',
        badge: 0 // TODO: Get from saved relationships API
      },
      {
        value: 'samples',
        label: 'Sample Tracker',
        icon: Package,
        description: 'Track sample requests',
        badge: 0 // TODO: Get from samples API
      },
      {
        value: 'intelligence',
        label: 'Market Intelligence',
        icon: BarChart3,
        description: 'Market analysis',
        badge: data.suppliers ? 1 : 0 // Has analysis if has data
      },
      {
        value: 'communication',
        label: 'Communication Hub',
        icon: MessageCircle,
        description: 'Email templates',
        badge: 0 // TODO: Get from templates API
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

  // Always show tabs, even without search data

  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <span>{data ? 'Supplier Search Results' : 'Supplier Sourcing'}</span>
                {data && (
                  <Badge variant="outline" className="ml-3 text-xs px-2 py-0.5">
                    <Factory className="mr-1 h-3 w-3" />
                    {data.suppliers?.length || 0} suppliers
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-gray-500">
                {data ? (
                  `Found suppliers for "${data.searchQuery}" • ${data.qualityAnalysis?.goldSuppliers || 0} Gold Suppliers`
                ) : (
                  'Search for suppliers and manage your supplier relationships'
                )}
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

            <TabsContent value="search">
              <SearchDiscoveryTab 
                data={data} 
                marketContext={marketContext}
                initialSearchTerm={initialSearchTerm}
              />
            </TabsContent>

            <TabsContent value="manager">
              <SupplierManagerTab data={data} />
            </TabsContent>

            <TabsContent value="samples">
              <SampleTrackerTab data={data} />
            </TabsContent>

            <TabsContent value="intelligence">
              <MarketIntelligenceTab data={data} />
            </TabsContent>

            <TabsContent value="communication">
              <CommunicationHubTab data={data} />
            </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  )
}