'use client'

import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Download,
  Target,
  TrendingUp,
  Sparkles,
  Zap,
  X,
  Star,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  Users,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpportunityData } from '@/types'
import { KeywordCell } from '../KeywordCell'
import { DataCell } from '../DataCell'

interface OpportunitiesTabProps {
  data: OpportunityData[]
  className?: string
}

export function OpportunitiesTab({ 
  data, 
  className 
}: OpportunitiesTabProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'searchVolume', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSize, setPageSize] = useState(25)

  // Calculate summary stats for opportunities
  const summaryStats = useMemo(() => {
    const filteredData = globalFilter
      ? data.filter(item =>
          item.keyword.toLowerCase().includes(globalFilter.toLowerCase())
        )
      : data

    const totalOpportunities = filteredData.length
    const marketGaps = filteredData.filter(opp => opp.opportunityType === 'market_gap').length
    const weakCompetitors = filteredData.filter(opp => opp.opportunityType === 'weak_competitors').length
    const lowCompetition = filteredData.filter(opp => opp.opportunityType === 'low_competition').length
    
    const totalVolume = filteredData.reduce((sum, opp) => sum + opp.searchVolume, 0)
    const avgCpc = filteredData.length > 0 
      ? filteredData.reduce((sum, opp) => sum + (opp.avgCpc || 0), 0) / filteredData.length 
      : 0
    const avgSupplyDemand = filteredData.length > 0
      ? filteredData.reduce((sum, opp) => sum + (opp.supplyDemandRatio || 0), 0) / filteredData.length
      : 0
    
    // High-value opportunities (good search volume + low competition + decent CPC)
    const highValueOpps = filteredData.filter(opp => 
      opp.searchVolume >= 2000 && 
      opp.competitionScore <= 30 && 
      (opp.avgCpc || 0) >= 0.5
    ).length

    return {
      totalOpportunities,
      marketGaps,
      weakCompetitors, 
      lowCompetition,
      highValueOpps,
      totalVolume,
      avgCpc,
      avgSupplyDemand
    }
  }, [data, globalFilter])

  // Column definitions - all enhanced opportunity data by importance
  const columns: ColumnDef<OpportunityData>[] = useMemo(() => [
    {
      accessorKey: 'keyword',
      header: ({ column }) => (
        <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 h-auto text-xs font-medium"
        >
          Keyword
          {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <KeywordCell keyword={row.getValue('keyword')} className="text-sm font-medium" />
          {row.original.opportunityType && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 border-0",
                row.original.opportunityType === 'low_competition' && "bg-blue-100 text-blue-700",
                row.original.opportunityType === 'market_gap' && "bg-purple-100 text-purple-700",
                row.original.opportunityType === 'weak_competitors' && "bg-amber-100 text-amber-700"
              )}
            >
              {row.original.opportunityType === 'low_competition' && 'Low Comp'}
              {row.original.opportunityType === 'market_gap' && 'Gap'}
              {row.original.opportunityType === 'weak_competitors' && 'Weak Comp'}
            </Badge>
          )}
        </div>
      ),
      size: 300,
    },
    {
      accessorKey: 'searchVolume',
      header: ({ column }) => (
        <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 h-auto text-xs font-medium"
        >
            Volume
          {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
        </div>
      ),
      cell: ({ row }) => {
        const volume = row.getValue<number>('searchVolume')
        return (
          <div className="text-right">
            <span className="text-sm tabular-nums font-medium">
              <DataCell value={volume} format="number" />
            </span>
            {volume >= 10000 && (
              <Sparkles className="inline-block ml-1 h-3 w-3 text-amber-500" />
            )}
          </div>
        )
      },
      size: 110,
    },
    {
      accessorKey: 'competitionScore',
      header: ({ column }) => (
        <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 h-auto text-xs font-medium"
        >
          Competition
          {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
        </div>
      ),
      cell: ({ row }) => {
        const score = row.getValue<number>('competitionScore')
        const getBadgeVariant = (score: number) => {
          if (score <= 20) return 'bg-green-100 text-green-700'
          if (score <= 50) return 'bg-blue-100 text-blue-700'
          if (score <= 70) return 'bg-amber-100 text-amber-700'
          return 'bg-red-100 text-red-700'
        }
        const getLabel = (score: number) => {
          if (score <= 20) return 'Low'
          if (score <= 50) return 'Med'
          if (score <= 70) return 'High'
          return 'V.High'
        }
        return (
          <div className="text-center">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs px-2 py-0.5 border-0",
                getBadgeVariant(score)
              )}
            >
              {getLabel(score)}
            </Badge>
          </div>
        )
      },
      size: 110,
    },
    {
      accessorKey: 'purchases',
      header: ({ column }) => (
        <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 h-auto text-xs font-medium"
        >
            Monthly Sales
          {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <span className="text-sm tabular-nums">
            <DataCell value={row.original.purchases} format="number" />
          </span>
        </div>
      ),
      size: 110,
    },
    {
      accessorKey: 'avgCpc',
      header: ({ column }) => (
        <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 h-auto text-xs font-medium"
        >
            CPC
          {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <span className="text-sm tabular-nums">
            <DataCell value={row.getValue('avgCpc')} format="currency" />
          </span>
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: 'supplyDemandRatio',
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 h-auto text-xs font-medium"
          >
            S/D Ratio
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-3 w-3" />
            ) : (
              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
            )}
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const ratio = row.original.supplyDemandRatio
        if (!ratio && ratio !== 0) return <div className="text-right text-gray-400 text-xs">-</div>
        
        return (
          <div className="text-right">
            <Badge 
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 border-0",
                ratio <= 30 ? "bg-green-100 text-green-700" :
                ratio <= 60 ? "bg-blue-100 text-blue-700" :
                ratio <= 80 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}
            >
              {ratio.toFixed(0)}%
            </Badge>
          </div>
        )
      },
      size: 80,
    },
    {
      id: 'purchaseData',
      header: () => (
        <div className="text-center">
          <span className="text-xs font-medium">Purchase Data</span>
        </div>
      ),
      cell: ({ row }) => {
        const purchases = row.original.purchases
        const purchaseRate = row.original.purchaseRate
        
        if (!purchases && !purchaseRate) {
          return <div className="text-center text-gray-400 text-xs">-</div>
        }
        
        return (
          <div className="text-center flex flex-col gap-0.5">
            {purchases && (
              <span className="text-xs font-medium text-gray-700">
                {purchases.toLocaleString()} sales
              </span>
            )}
            {purchaseRate && (
              <span className={cn(
                "text-[10px]",
                purchaseRate > 0.05 ? "text-green-600 font-medium" : 
                purchaseRate > 0.03 ? "text-blue-600" : 
                "text-gray-500"
              )}>
                {(purchaseRate * 100).toFixed(1)}% CR
              </span>
            )}
          </div>
        )
      },
      size: 100,
    },
    {
      id: 'marketDominance',
      header: () => (
        <div className="text-center">
          <span className="text-xs font-medium">Market Control</span>
        </div>
      ),
      cell: ({ row }) => {
        const monopolyRate = row.original.monopolyClickRate
        const cvsShareRate = row.original.cvsShareRate
        
        if (!monopolyRate && !cvsShareRate) {
          return <div className="text-center text-gray-400 text-xs">-</div>
        }
        
        const openMarketShare = monopolyRate ? (1 - monopolyRate) * 100 : null
        
        return (
          <div className="text-center flex flex-col gap-0.5">
            {openMarketShare !== null && (
              <Badge 
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 border-0",
                  openMarketShare > 70 ? "bg-green-100 text-green-700" :
                  openMarketShare > 50 ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700"
                )}
              >
                {openMarketShare.toFixed(0)}% open
              </Badge>
            )}
            {cvsShareRate && (
              <span className="text-[10px] text-gray-500">
                {(cvsShareRate * 100).toFixed(0)}% CVS
              </span>
            )}
          </div>
        )
      },
      size: 100,
    },
    {
      id: 'productMetrics',
      header: () => (
        <div className="text-center">
          <span className="text-xs font-medium">Competition</span>
        </div>
      ),
      cell: ({ row }) => {
        const products = row.original.products
        const adProducts = row.original.adProducts
        const avgPrice = row.original.avgPrice
        const avgRating = row.original.avgRating
        
        if (!products) {
          return <div className="text-center text-gray-400 text-xs">-</div>
        }
        
        const adRatio = products > 0 ? (adProducts || 0) / products : 0
        
        return (
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-medium">{Math.round(products)}</span>
              <span className="text-[10px] text-gray-500">products</span>
            </div>
            {adRatio > 0 && (
              <Badge 
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 border-0",
                  adRatio > 0.5 ? "bg-red-100 text-red-700" :
                  adRatio > 0.3 ? "bg-amber-100 text-amber-700" :
                  "bg-green-100 text-green-700"
                )}
              >
                {(adRatio * 100).toFixed(0)}% ads
              </Badge>
            )}
            {avgPrice && (
              <div className="text-[10px] text-gray-500">
                ${avgPrice.toFixed(0)} avg
              </div>
            )}
          </div>
        )
      },
      size: 110,
    },
    {
      id: 'ppcStrategy',
      header: () => <div className="text-center text-xs font-medium">PPC Strategy</div>,
      cell: ({ row }) => {
        const volume = row.original.searchVolume
        const competition = row.original.competitionScore
        const cpc = row.original.avgCpc || row.original.bid || 0
        const bidMin = row.original.bidMin
        const bidMax = row.original.bidMax
        const purchaseRate = row.original.purchaseRate
        const monopolyRate = row.original.monopolyClickRate
        
        // Enhanced strategy determination using keyword mining data
        let strategy = ''
        let badgeColor = ''
        let icon = null
        let detail = ''
        
        if (purchaseRate && purchaseRate > 0.05 && competition <= 30) {
          strategy = 'High Convert'
          badgeColor = 'bg-emerald-100 text-emerald-700'
          icon = <Sparkles className="h-3 w-3" />
          detail = `${(purchaseRate * 100).toFixed(1)}% CR`
        } else if (monopolyRate && monopolyRate < 0.3 && volume >= 2000) {
          strategy = 'Open Market'
          badgeColor = 'bg-blue-100 text-blue-700'
          icon = <Target className="h-3 w-3" />
          detail = `${Math.round((1 - monopolyRate) * 100)}% open`
        } else if (bidMin && bidMax && (bidMax - bidMin) > 1) {
          strategy = 'Price Gap'
          badgeColor = 'bg-purple-100 text-purple-700'
          icon = <DollarSign className="h-3 w-3" />
          detail = `$${bidMin.toFixed(2)}-${bidMax.toFixed(2)}`
        } else if (volume >= 5000 && competition <= 30) {
          strategy = 'Prime Target'
          badgeColor = 'bg-amber-100 text-amber-700'
          icon = <TrendingUp className="h-3 w-3" />
          detail = `${competition}% comp`
        } else if (cpc > 0) {
          strategy = 'Standard PPC'
          badgeColor = 'bg-gray-100 text-gray-700'
          icon = <BarChart3 className="h-3 w-3" />
          detail = `$${cpc.toFixed(2)} CPC`
        } else {
          return <div className="text-center text-gray-400 text-xs">-</div>
        }
        
        return (
          <div className="flex flex-col items-center gap-0.5">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 border-0 flex items-center gap-1",
                badgeColor
              )}
            >
              {icon}
              {strategy}
            </Badge>
            {detail && (
              <span className="text-[10px] text-gray-500">{detail}</span>
            )}
          </div>
        )
      },
      size: 120,
    },
    {
      id: 'estimatedROI',
      header: ({ column }) => (
        <div className="text-right">
          <span className="text-xs font-medium">Est. ROI</span>
        </div>
      ),
      cell: ({ row }) => {
        const volume = row.original.searchVolume
        const cpc = row.original.avgCpc || row.original.bid || 0
        const purchaseRate = row.original.purchaseRate
        const avgPrice = row.original.avgPrice
        const products = row.original.products || 0
        const adProducts = row.original.adProducts || 0
        
        // If we don't have purchase rate or price from mining, return market metrics
        if (!purchaseRate || !avgPrice) {
          // Show competition metrics instead
          const competitionRatio = products > 0 ? (adProducts / products) * 100 : 0
          const supplyDemand = row.original.supplyDemandRatio || 0
          
          return (
            <div className="text-right flex flex-col gap-0.5">
              <div className="text-xs text-gray-500">
                {products > 0 ? `${products} products` : '-'}
              </div>
              {competitionRatio > 0 && (
                <div className="text-[10px] text-gray-400">
                  {competitionRatio.toFixed(0)}% ads
                </div>
              )}
            </div>
          )
        }
        
        // Enhanced ROI calculation with real data
        const monthlySearches = volume
        const estimatedCTR = 0.02 + (0.03 * (1 - (row.original.competitionScore / 100))) // 2-5% CTR based on competition
        const monthlyClicks = monthlySearches * estimatedCTR
        const monthlyCost = monthlyClicks * cpc
        const monthlySales = monthlyClicks * purchaseRate
        const monthlyRevenue = monthlySales * avgPrice
        const monthlyProfit = monthlyRevenue - monthlyCost
        const roi = monthlyCost > 0 ? (monthlyProfit / monthlyCost) * 100 : 0
        
        return (
          <div className="text-right flex flex-col gap-0.5">
            <span className={cn(
              "text-sm tabular-nums font-medium",
              roi > 200 ? "text-emerald-600" : 
              roi > 100 ? "text-green-600" : 
              roi > 50 ? "text-blue-600" : 
              roi > 0 ? "text-gray-600" : "text-red-500"
            )}>
              {roi > 0 ? `${Math.round(roi)}%` : 'Negative'}
            </span>
            <span className="text-[10px] text-gray-500">
              ${monthlyProfit > 0 ? `+${monthlyProfit.toFixed(0)}` : monthlyProfit.toFixed(0)}/mo
            </span>
          </div>
        )
      },
      size: 100,
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
  })

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      'Keyword,Type,Search Volume,Competition Score,Monthly Sales,CPC,Supply/Demand,Purchase Rate,Avg Price',
      ...data.map(item => [
        item.keyword,
        item.opportunityType || '',
        item.searchVolume,
        item.competitionScore,
        item.purchases || 0,
        item.avgCpc || 0,
        item.supplyDemandRatio || 0,
        item.purchaseRate || 0,
        item.avgPrice || 0
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opportunities-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-50 rounded">
              <Target className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600">Total Opportunities</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalOpportunities}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {summaryStats.highValueOpps} high-value
            </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-blue-50 rounded">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalVolume.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                combined searches
            </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-green-50 rounded">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600">Avg CPC</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                <DataCell value={summaryStats.avgCpc} format="currency" />
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                per click
            </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-purple-50 rounded">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600">Opportunity Mix</p>
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 border-0">
                  {summaryStats.marketGaps}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-0">
                  {summaryStats.lowCompetition}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-0">
                  {summaryStats.weakCompetitors}
                </Badge>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                gap / low / weak
            </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search opportunities..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-9 pr-9 h-9 text-sm w-64"
            />
            {globalFilter && (
              <Button
                variant="ghost"
                onClick={() => setGlobalFilter('')}
                className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-transparent"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Eye className="mr-2 h-3.5 w-3.5" />
                Columns
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="text-sm"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-50/50 hover:bg-gray-50/50">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      style={{ width: header.getSize() }}
                      className="h-9 px-3 py-2"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 px-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Target className="h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      No opportunities found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-600">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPageSize(Number(value))
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-7 w-14 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1">
            <Button
              variant="outline"
            size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
            >
            <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
            size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
            >
            <ChevronLeft className="h-4 w-4" />
            </Button>
          <div className="flex items-center gap-1 px-2">
            <span className="text-xs text-gray-600">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
          </div>
            <Button
              variant="outline"
            size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
            >
            <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
            size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
            >
            <ChevronsRight className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  )
}