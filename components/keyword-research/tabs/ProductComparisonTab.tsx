'use client'

import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ExpandedState
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronDown,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Trophy,
  Target,
  TrendingUp,
  Shield,
  Zap,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Sword,
  Activity,
  Hash,
  TrendingDown,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AsinKeywordResult } from '@/lib/keyword-research'
import type { OpportunityData } from '@/types'
import { KeywordCell } from '../KeywordCell'
import { DataCell } from '../DataCell'

interface ProductComparisonTabProps {
  data: AsinKeywordResult[]
  opportunities?: OpportunityData[]
  showFilters?: boolean
  className?: string
}

// Transform ASIN results to comparison format
interface ComparisonData {
  asin: string
  productTitle?: string
  status: 'success' | 'failed' | 'no_data'
  error?: string
  totalKeywords: number
  avgSearchVolume: number
  totalSearchVolume: number
  strongKeywords: number // Rankings 1-15
  dominantKeywords: number // Rankings 1-5
  weakKeywords: number // Rankings 16+
  avgRanking: number
  marketShare: number // Estimated based on rankings
  competitiveScore: number // 0-100
  topKeywords: Array<{
    keyword: string
    searchVolume: number
    rankingPosition?: number
    trafficPercentage?: number
  }>
  isUserProduct?: boolean
}

export function ProductComparisonTab({ 
  data, 
  opportunities = [],
  showFilters = false, 
  className 
}: ProductComparisonTabProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'competitiveScore', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [pageSize, setPageSize] = useState(10)

  // Identify user's product (first ASIN in the list)
  const userAsin = data[0]?.asin

  // Transform data to comparison format
  const comparisonData: ComparisonData[] = useMemo(() => {
    return data.map((result, index) => {
      if (result.status !== 'success') {
        return {
          asin: result.asin,
          productTitle: result.productTitle,
          status: result.status,
          error: result.error,
          totalKeywords: 0,
          avgSearchVolume: 0,
          totalSearchVolume: 0,
          strongKeywords: 0,
          dominantKeywords: 0,
          weakKeywords: 0,
          avgRanking: 0,
          marketShare: 0,
          competitiveScore: 0,
          topKeywords: [],
          isUserProduct: index === 0
        }
      }

      const dominantKeywords = result.keywords.filter(kw => 
        kw.rankingPosition && kw.rankingPosition <= 5
      ).length

      const strongKeywords = result.keywords.filter(kw => 
        kw.rankingPosition && kw.rankingPosition <= 15
      ).length
      
      const weakKeywords = result.keywords.filter(kw => 
        kw.rankingPosition && kw.rankingPosition > 15
      ).length

      const totalSearchVolume = result.keywords.reduce((sum, kw) => sum + kw.searchVolume, 0)
      const avgSearchVolume = result.keywords.length > 0
        ? Math.round(totalSearchVolume / result.keywords.length)
        : 0

      // Calculate average ranking (only for ranked keywords)
      const rankedKeywords = result.keywords.filter(kw => kw.rankingPosition)
      const avgRanking = rankedKeywords.length > 0
        ? Math.round(rankedKeywords.reduce((sum, kw) => sum + (kw.rankingPosition || 0), 0) / rankedKeywords.length)
        : 0

      // Estimate market share based on rankings and search volume
      const marketShare = result.keywords.reduce((share, kw) => {
        if (!kw.rankingPosition) return share
        const positionWeight = Math.max(0, 1 - (kw.rankingPosition - 1) / 20) // Linear decay
        return share + (kw.searchVolume * positionWeight)
      }, 0)

      // Calculate competitive score (0-100)
      const scores = {
        coverage: (result.keywordCount / 100) * 20, // Max 20 points
        dominance: (dominantKeywords / result.keywordCount) * 30, // Max 30 points
        strength: (strongKeywords / result.keywordCount) * 20, // Max 20 points
        avgRank: Math.max(0, 20 - avgRanking) * 1.5, // Max 30 points
      }
      const competitiveScore = Math.min(100, Math.round(
        scores.coverage + scores.dominance + scores.strength + scores.avgRank
      ))

      const topKeywords = result.keywords
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 10)
        .map(kw => ({
          keyword: kw.keyword,
          searchVolume: kw.searchVolume,
          rankingPosition: kw.rankingPosition,
          trafficPercentage: kw.trafficPercentage
        }))

      return {
        asin: result.asin,
        productTitle: result.productTitle,
        status: result.status,
        totalKeywords: result.keywordCount,
        avgSearchVolume,
        totalSearchVolume,
        strongKeywords,
        dominantKeywords,
        weakKeywords,
        avgRanking,
        marketShare,
        competitiveScore,
        topKeywords,
        isUserProduct: index === 0
      }
    })
  }, [data])

  // Calculate market insights
  const marketInsights = useMemo(() => {
    const successfulProducts = comparisonData.filter(p => p.status === 'success')
    const userProduct = comparisonData.find(p => p.isUserProduct)
    const competitors = successfulProducts.filter(p => !p.isUserProduct)
    
    const marketLeader = [...successfulProducts].sort((a, b) => b.competitiveScore - a.competitiveScore)[0]
    const closestCompetitor = competitors
      .map(c => ({ ...c, gap: Math.abs(c.competitiveScore - (userProduct?.competitiveScore || 0)) }))
      .sort((a, b) => a.gap - b.gap)[0]
    
    const avgCompetitorScore = competitors.length > 0
      ? competitors.reduce((sum, c) => sum + c.competitiveScore, 0) / competitors.length
      : 0

    return {
      marketLeader,
      userRank: successfulProducts.findIndex(p => p.isUserProduct) + 1,
      totalProducts: successfulProducts.length,
      closestCompetitor,
      userVsAverage: userProduct ? userProduct.competitiveScore - avgCompetitorScore : 0,
      userProduct
    }
  }, [comparisonData])

  // Column definitions
  const columns: ColumnDef<ComparisonData>[] = useMemo(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return row.getCanExpand() ? (
          <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={row.getToggleExpandedHandler()}
              className="p-0 h-6 w-6"
          >
            {row.getIsExpanded() ? (
                <ChevronDown className="h-3 w-3" />
            ) : (
                <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          </div>
        ) : null
      },
      size: 40,
    },
    {
      accessorKey: 'asin',
      header: () => <div className="text-left text-xs font-medium">Product</div>,
      cell: ({ row }) => {
        const isUser = row.original.isUserProduct
        const status = row.original.status
        const isMarketLeader = row.original.asin === marketInsights.marketLeader?.asin
        
        return (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "font-mono text-xs",
                  isUser && "font-semibold"
                )}>
              {row.getValue('asin')}
                </span>
                {isUser && (
                  <Badge variant="default" className="h-4 px-1.5 text-[10px] bg-blue-100 text-blue-700 border-0">
                    YOU
                  </Badge>
                )}
                {isMarketLeader && !isUser && (
                  <Crown className="h-3 w-3 text-amber-500" />
                )}
            </div>
              <div className="flex items-center gap-1 mt-0.5">
              {status === 'success' ? (
                  <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />
              ) : status === 'failed' ? (
                  <XCircle className="h-2.5 w-2.5 text-red-600" />
              ) : (
                  <AlertTriangle className="h-2.5 w-2.5 text-yellow-600" />
              )}
                <span className="text-[10px] text-gray-500">
                  {status === 'success' ? 'Active' : status === 'failed' ? 'Failed' : 'Limited'}
                </span>
              </div>
            </div>
          </div>
        )
      },
      size: 140,
    },
    {
      accessorKey: 'competitiveScore',
      header: ({ column }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                className="hover:bg-transparent p-0 h-auto font-medium text-xs w-full justify-center"
        >
                Score
          {column.getIsSorted() === 'asc' ? (
                  <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
                  <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Competitive strength (0-100)</p>
              <p className="text-xs text-gray-400">Based on coverage, rankings, and dominance</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      cell: ({ row }) => {
        const score = row.getValue('competitiveScore') as number
        const scoreColor = score >= 80 ? 'text-green-700 bg-green-100' :
                         score >= 60 ? 'text-blue-700 bg-blue-100' :
                         score >= 40 ? 'text-amber-700 bg-amber-100' :
                         'text-red-700 bg-red-100'
        
        return (
          <div className="flex items-center justify-center">
            <Badge variant="secondary" className={cn(
              "font-semibold text-xs px-2 py-0.5 min-w-[3rem] text-center border-0",
              scoreColor
            )}>
              {score}
            </Badge>
        </div>
        )
      },
      size: 80,
    },
    {
      accessorKey: 'totalKeywords',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium text-xs w-full text-right justify-end"
        >
          Keywords
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <span className="text-sm tabular-nums font-medium">
            <DataCell value={row.getValue('totalKeywords')} format="number" />
          </span>
        </div>
      ),
      size: 90,
    },
    {
      id: 'rankingDistribution',
      header: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center text-xs font-medium cursor-help">
                Ranking Distribution
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Keyword ranking breakdown</p>
              <p className="text-xs text-gray-400">Top 5 / 6-15 / 16+</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      cell: ({ row }) => {
        const total = row.original.totalKeywords || 1
        const dominant = row.original.dominantKeywords
        const strong = row.original.strongKeywords - dominant
        const weak = row.original.weakKeywords
        
        const dominantPct = Math.round((dominant / total) * 100)
        const strongPct = Math.round((strong / total) * 100)
        const weakPct = Math.round((weak / total) * 100)
        
        return (
          <div className="px-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
              {dominantPct > 0 && (
                <div 
                  className="bg-green-500 transition-all"
                  style={{ width: `${dominantPct}%` }}
                />
              )}
              {strongPct > 0 && (
                <div 
                  className="bg-blue-500 transition-all"
                  style={{ width: `${strongPct}%` }}
                />
              )}
              {weakPct > 0 && (
                <div 
                  className="bg-amber-500 transition-all"
                  style={{ width: `${weakPct}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-500">
              <span>{dominant}</span>
              <span>{strong}</span>
              <span>{weak}</span>
            </div>
          </div>
        )
      },
      size: 150,
    },
    {
      accessorKey: 'avgRanking',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium text-xs w-full text-center"
        >
          Avg Rank
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const rank = row.getValue('avgRanking') as number
        return (
        <div className="text-center">
            {rank > 0 ? (
              <Badge variant="outline" className={cn(
                "text-xs px-2 py-0 border-0",
                rank <= 10 ? "bg-green-100 text-green-700" :
                rank <= 20 ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              )}>
                #{rank}
          </Badge>
            ) : (
              <span className="text-xs text-gray-400">-</span>
            )}
        </div>
        )
      },
      size: 90,
    },
    {
      accessorKey: 'totalSearchVolume',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium text-xs w-full text-right justify-end"
        >
          Total Volume
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <span className="text-sm tabular-nums">
            <DataCell value={row.getValue('totalSearchVolume')} format="number" />
          </span>
        </div>
      ),
      size: 110,
    },
    {
      id: 'actions',
      header: () => <div className="text-center text-xs font-medium">Analysis</div>,
      cell: ({ row }) => {
        const isUser = row.original.isUserProduct
        const score = row.original.competitiveScore
        
        return (
          <div className="flex items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    {isUser ? (
                      <Shield className="h-3 w-3" />
                    ) : score >= 70 ? (
                      <Sword className="h-3 w-3 text-red-500" />
                    ) : score >= 40 ? (
                      <Target className="h-3 w-3 text-amber-500" />
                    ) : (
                      <Activity className="h-3 w-3 text-gray-400" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">
                    {isUser ? "Your Product" :
                     score >= 70 ? "Strong Competitor" :
                     score >= 40 ? "Growing Threat" :
                     "Weak Position"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
      size: 80,
    },
  ], [marketInsights.marketLeader])

  const table = useReactTable({
    data: comparisonData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getRowCanExpand: (row) => row.original.topKeywords.length > 0,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      expanded,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
  })

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      'ASIN,Product Title,Status,Competitive Score,Total Keywords,Dominant Keywords,Strong Keywords,Weak Keywords,Avg Ranking,Total Search Volume',
      ...comparisonData.map(item => [
        item.asin,
        `"${item.productTitle || ''}"`,
        item.status,
        item.competitiveScore,
        item.totalKeywords,
        item.dominantKeywords,
        item.strongKeywords,
        item.weakKeywords,
        item.avgRanking,
        item.totalSearchVolume
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `product-comparison-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Market Intelligence Overview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Competitive Intelligence</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Market Leader */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-50 rounded">
                <Crown className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Market Leader</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {marketInsights.marketLeader?.isUserProduct ? 'You!' : marketInsights.marketLeader?.asin || '-'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Score: {marketInsights.marketLeader?.competitiveScore || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Your Position */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-50 rounded">
                <Trophy className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Your Rank</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  #{marketInsights.userRank} of {marketInsights.totalProducts}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {marketInsights.userVsAverage >= 0 ? '+' : ''}{Math.round(marketInsights.userVsAverage)} vs avg
                </p>
              </div>
            </div>
          </div>

          {/* Closest Competitor */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-red-50 rounded">
                <Sword className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Closest Threat</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {marketInsights.closestCompetitor?.asin || 'None'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Gap: {marketInsights.closestCompetitor?.gap || 0} points
                </p>
              </div>
            </div>
          </div>

          {/* Market Coverage */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-green-50 rounded">
                <BarChart3 className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Your Coverage</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {marketInsights.userProduct?.totalKeywords || 0} keywords
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {marketInsights.userProduct?.dominantKeywords || 0} dominant
                </p>
              </div>
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
              placeholder="Search products..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-9 pr-9 h-9 text-sm w-64"
            />
            {globalFilter && (
              <Button
                variant="ghost"
                onClick={() => setGlobalFilter('')}
                className="absolute right-1 top-1 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
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
                <ChevronDown className="ml-1 h-3 w-3" />
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

      {/* Comparison Table */}
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
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn(
                      "hover:bg-gray-50/50 transition-colors",
                      row.original.isUserProduct && "bg-blue-50/30 hover:bg-blue-50/50"
                    )}
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
                  {row.getIsExpanded() && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={columns.length} className="p-0 border-b-0">
                        <div className="bg-gray-50/50 border-t border-gray-200">
                          <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">
                                  Keyword Performance Analysis
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Top performing keywords for {row.original.asin}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3" />
                                  <span>{row.original.dominantKeywords} top 5</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>{Math.round(row.original.topKeywords.reduce((sum, kw) => sum + (kw.trafficPercentage || 0), 0))}% traffic</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Top Keywords Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Top 5 Ranked Keywords */}
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                  <h5 className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                    Best Rankings
                                </h5>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {row.original.topKeywords
                                    .filter(kw => kw.rankingPosition)
                                    .sort((a, b) => (a.rankingPosition || 999) - (b.rankingPosition || 999))
                                    .slice(0, 5)
                                    .map((keyword, index) => (
                                      <div key={index} className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 min-w-0">
                                            <KeywordCell 
                                              keyword={keyword.keyword} 
                                              className="text-sm font-medium text-gray-900" 
                                              maxWidth="max-w-full"
                                            />
                                            <div className="flex items-center gap-3 mt-1">
                                              <span className="text-[10px] text-gray-500">
                                                <DataCell value={keyword.searchVolume} format="number" suffix=" searches/mo" />
                                              </span>
                                              {keyword.trafficPercentage && (
                                                <span className="text-[10px] text-gray-500">
                                                  <DataCell value={keyword.trafficPercentage / 100} format="percentage" decimals={1} suffix=" traffic" />
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <Badge 
                                            variant="secondary" 
                                            className={cn(
                                              "border-0 text-xs px-2 py-0.5",
                                              keyword.rankingPosition && keyword.rankingPosition <= 5 ? "bg-green-100 text-green-700" :
                                              keyword.rankingPosition && keyword.rankingPosition <= 15 ? "bg-blue-100 text-blue-700" :
                                              keyword.rankingPosition && keyword.rankingPosition <= 30 ? "bg-amber-100 text-amber-700" :
                                              "bg-gray-100 text-gray-700"
                                            )}
                                          >
                                            #{keyword.rankingPosition}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  {row.original.topKeywords.filter(kw => kw.rankingPosition).length === 0 && (
                                    <div className="px-4 py-8 text-center">
                                      <p className="text-sm text-gray-400">No rankings found</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Highest Volume Keywords */}
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                  <h5 className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                                    <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                                    Highest Search Volume
                                </h5>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {row.original.topKeywords
                                    .slice(0, 5)
                                    .map((keyword, index) => (
                                      <div key={index} className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 min-w-0">
                                            <KeywordCell 
                                              keyword={keyword.keyword} 
                                              className="text-sm font-medium text-gray-900" 
                                              maxWidth="max-w-full"
                                            />
                                            <div className="flex items-center gap-3 mt-1">
                                              <span className="text-[10px] text-gray-500">
                                                Rank {keyword.rankingPosition ? `#${keyword.rankingPosition}` : 'Not Ranking'}
                                              </span>
                                              {keyword.trafficPercentage && (
                                                <span className="text-[10px] text-gray-500">
                                                  <DataCell value={keyword.trafficPercentage / 100} format="percentage" decimals={1} suffix=" traffic" />
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm font-semibold text-gray-900 tabular-nums">
                                              <DataCell value={keyword.searchVolume} format="number" />
                                            </div>
                                            <div className="text-[10px] text-gray-500">searches/mo</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                                </div>
                              </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <div className="flex items-center gap-2">
                                  <Hash className="h-3.5 w-3.5 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">Avg Position</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {row.original.avgRanking || '-'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <div className="flex items-center gap-2">
                                  <Target className="h-3.5 w-3.5 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">Coverage</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {Math.round((row.original.strongKeywords / row.original.totalKeywords) * 100)}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">Opportunities</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {row.original.weakKeywords}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <div className="flex items-center gap-2">
                                  <Crown className="h-3.5 w-3.5 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">Dominance</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {row.original.dominantKeywords}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Top 3 Opportunities Preview */}
                            {opportunities.length > 0 && (() => {
                              // Get keywords from this ASIN that have opportunities
                              const asinKeywords = row.original.topKeywords.map(k => k.keyword.toLowerCase())
                              const relevantOpportunities = opportunities
                                .filter(opp => asinKeywords.includes(opp.keyword.toLowerCase()))
                                .sort((a, b) => b.searchVolume - a.searchVolume)
                                .slice(0, 3)
                              
                              if (relevantOpportunities.length === 0) return null

                              return (
                                <div className="mt-4">
                                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                                      <h5 className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                                        Top Opportunities
                                        <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 border-0">
                                          Quick Wins
                                        </Badge>
                                </h5>
                                      </div>
                                    <div className="divide-y divide-gray-100">
                                      {relevantOpportunities.map((opp, index) => {
                                        const keywordData = row.original.topKeywords.find(
                                          k => k.keyword.toLowerCase() === opp.keyword.toLowerCase()
                                        )
                                        const currentRank = keywordData?.rankingPosition
                                        
                                        return (
                                          <div key={index} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <KeywordCell 
                                                    keyword={opp.keyword} 
                                                    className="text-sm font-medium text-gray-900" 
                                                    maxWidth="max-w-full"
                                                  />
                                                  {opp.opportunityType && (
                                                    <Badge 
                                                      variant="secondary" 
                                                      className={cn(
                                                        "text-[10px] px-1.5 py-0 h-4 border-0",
                                                        opp.opportunityType === 'low_competition' && "bg-blue-100 text-blue-700",
                                                        opp.opportunityType === 'market_gap' && "bg-purple-100 text-purple-700",
                                                        opp.opportunityType === 'weak_competitors' && "bg-amber-100 text-amber-700"
                                                      )}
                                                    >
                                                      {opp.opportunityType === 'low_competition' && 'Low Comp'}
                                                      {opp.opportunityType === 'market_gap' && 'Gap'}
                                                      {opp.opportunityType === 'weak_competitors' && 'Weak Comp'}
                                                    </Badge>
                                  )}
                                </div>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                  <span className="text-[10px] text-gray-500">
                                                    <DataCell value={opp.searchVolume} format="number" suffix=" searches" />
                                                  </span>
                                                  <span className="text-[10px] text-gray-500">
                                                    CPC: <DataCell value={opp.avgCpc} format="currency" />
                                                  </span>
                                                  <span className="text-[10px] text-gray-500">
                                                    Current: {currentRank ? `#${currentRank}` : 'Not Ranking'}
                                                  </span>
                              </div>
                            </div>
                                              <div className="text-right">
                                                <div className="flex items-center gap-1 text-emerald-600">
                                                  <Zap className="h-3 w-3" />
                                                  <span className="text-xs font-medium">
                                                    {opp.competitionScore ? `${100 - opp.competitionScore}%` : '-'}
                                                  </span>
                                      </div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">opportunity</div>
                                    </div>
                                    </div>
                                  </div>
                                        )
                                      })}
                              </div>
                                    <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100">
                                      <p className="text-[10px] text-gray-500 text-center">
                                        View all opportunities in the Opportunities tab
                                      </p>
                            </div>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Search className="h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      No products found
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
        <p className="text-xs text-gray-600">
          Showing {table.getFilteredRowModel().rows.length} of {comparisonData.length} products
        </p>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-600">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPageSize(Number(value))
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
                {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
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
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            
            <div className="flex items-center gap-1 px-2">
              <span className="text-xs text-gray-600">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}