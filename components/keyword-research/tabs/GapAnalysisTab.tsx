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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  X,
  Crown,
  Zap,
  Sparkles,
  ShoppingCart,
  Target,
  ChevronRight,
  Info,
  DollarSign,
  Shield
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { GapAnalysisResult, GapOpportunity } from '@/types'
import { KeywordCell } from '../KeywordCell'
import { DataCell } from '../DataCell'

interface GapAnalysisTabProps {
  data: GapAnalysisResult
  className?: string
}

interface GapTableProps {
  gaps: GapOpportunity[]
  gapType: 'market_gap' | 'competitor_weakness' | 'user_advantage'
  userAsin: string
  competitorAsins: string[]
}

const gapTypeConfig = {
  market_gap: {
    title: 'Market Opportunities',
    description: 'Keywords with low competition across all analyzed products',
    icon: ShoppingCart,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  competitor_weakness: {
    title: 'Competitor Weaknesses',
    description: 'Keywords where competitors rank poorly or not at all',
    icon: Users,
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-800',
  },
  user_advantage: {
    title: 'Your Advantages',
    description: 'Keywords where you outrank competitors significantly',
    icon: TrendingUp,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-800',
  },
}

function GapTable({ gaps, gapType, userAsin, competitorAsins }: GapTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'searchVolume', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  const config = gapTypeConfig[gapType]

  // Column definitions without gap type column
  const columns: ColumnDef<GapOpportunity>[] = useMemo(() => [
    {
      accessorKey: 'keyword',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto text-left justify-start text-xs font-medium uppercase tracking-wider text-gray-600"
        >
          Keyword
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-3.5 w-3.5" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-gray-400" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const keyword = row.getValue<string>('keyword')
        const volume = row.original.searchVolume
        const cpc = row.original.avgCpc || 0
        
        return (
          <div className="py-1">
            <KeywordCell keyword={keyword} maxWidth="max-w-[300px]" className="font-medium text-gray-900 text-sm" />
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {volume.toLocaleString()}
              </span>
              {cpc > 0 && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {cpc.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        )
      },
      size: 300,
    },
    {
      id: 'rankingComparison',
      header: () => <div className="text-xs font-medium uppercase tracking-wider text-gray-600 text-center">Position Analysis</div>,
      cell: ({ row }) => {
        const userRanking = row.original.userRanking
        const competitors = row.original.competitorRankings || []
        const userPosition = userRanking.position || null
        
        // Sort all positions for display
        const allRankings = [
          { asin: 'You', position: userPosition, isUser: true },
          ...competitors.map(c => ({ 
            asin: c.asin?.slice(-4) || c.asin, 
            position: c.position || null,
            isUser: false 
          }))
        ].sort((a, b) => {
          if (!a.position && !b.position) return 0
          if (!a.position) return 1
          if (!b.position) return -1
          return a.position - b.position
        })
        
        // Find best competitor position
        const bestCompetitor = competitors
          .filter(c => c.position)
          .sort((a, b) => (a.position || 999) - (b.position || 999))[0]
        
        return (
          <div className="space-y-2 py-1">
            {/* Minimalist position display */}
            <div className="flex items-center justify-center gap-6">
              {/* Your position */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">You</span>
                {userPosition ? (
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-lg font-semibold",
                      userPosition <= 10 ? "text-emerald-600" :
                      userPosition <= 20 ? "text-amber-600" :
                      "text-gray-600"
                    )}>
                      #{userPosition}
                    </span>
                    <span className="text-xs text-gray-400">
                      Page {Math.ceil(userPosition / 10)}
                    </span>
                  </div>
                ) : (
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-xs font-medium">
                    Not Ranking
          </Badge>
                )}
              </div>
              
              {/* Separator */}
              <div className="h-8 w-px bg-gray-200" />
              
              {/* Best competitor */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Best</span>
                {bestCompetitor ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-600">
                      #{bestCompetitor.position}
                    </span>
                    <span className="text-xs text-gray-400">
                      {bestCompetitor.asin?.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </div>
            </div>
            
            {/* Competitive landscape */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-gray-500">All positions:</span>
              <div className="flex items-center gap-1">
                {allRankings.slice(0, 5).map((item, idx) => (
                  <TooltipProvider key={idx}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "text-xs px-2 py-0.5 rounded-md font-medium cursor-help transition-colors",
                          item.isUser && item.position && "bg-blue-50 text-blue-700 border border-blue-200",
                          item.isUser && !item.position && "bg-gray-100 text-gray-500 border border-gray-200",
                          !item.isUser && item.position && "bg-gray-50 text-gray-600 border border-gray-200",
                          !item.isUser && !item.position && "bg-white text-gray-400 border border-gray-200"
                        )}>
                          {item.position ? item.position : '—'}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p className="font-medium">{item.isUser ? 'Your Product' : `ASIN ${item.asin}`}</p>
                          <p className="text-gray-500">{item.position ? `Position ${item.position}` : 'Not ranking'}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {allRankings.length > 5 && (
                  <span className="text-xs text-gray-400">+{allRankings.length - 5}</span>
                )}
              </div>
            </div>
          </div>
        )
      },
      size: 320,
    },
    {
      id: 'opportunity',
      header: ({ column }) => (
        <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 h-auto text-xs font-medium uppercase tracking-wider text-gray-600"
        >
            Opportunity Score
          {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-3.5 w-3.5" />
          ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-3.5 w-3.5" />
          ) : (
              <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-gray-400" />
          )}
        </Button>
        </div>
      ),
      accessorFn: (row) => {
        // Calculate real opportunity score based on multiple factors
        const volume = row.searchVolume
        const userPos = row.userRanking.position || 999
        const competitorsBetter = row.competitorRankings.filter(c => 
          c.position && c.position < userPos
        ).length
        const cpc = row.avgCpc || 1
        
        // Higher score for: high volume, poor/no ranking, many competitors ranking better, low CPC
        let score = 0
        
        // Volume component (0-40 points)
        if (volume >= 50000) score += 40
        else if (volume >= 20000) score += 30
        else if (volume >= 10000) score += 20
        else if (volume >= 5000) score += 15
        else if (volume >= 1000) score += 10
        else score += 5
        
        // Position component (0-30 points)
        if (userPos === 999) score += 30 // Not ranking
        else if (userPos > 50) score += 25
        else if (userPos > 20) score += 20
        else if (userPos > 10) score += 15
        else if (userPos > 5) score += 10
        else score += 5
        
        // Competition component (0-20 points)
        score += Math.min(20, competitorsBetter * 5)
        
        // CPC component (0-10 points)
        if (cpc < 0.5) score += 10
        else if (cpc < 1) score += 8
        else if (cpc < 2) score += 6
        else if (cpc < 3) score += 4
        else score += 2
        
        return score
      },
      cell: ({ row }) => {
        const score = row.getValue<number>('opportunity')
        
        const getScoreColor = (score: number) => {
          if (score >= 70) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
          if (score >= 50) return 'text-blue-700 bg-blue-50 border-blue-200'
          if (score >= 30) return 'text-amber-700 bg-amber-50 border-amber-200'
          return 'text-gray-700 bg-gray-50 border-gray-200'
        }
        
        return (
          <div className="text-center py-1">
            <div className={cn(
              "inline-flex items-center justify-center w-14 h-14 rounded-lg border font-semibold text-xl",
              getScoreColor(score)
            )}>
              {score}
            </div>
          </div>
        )
      },
      size: 140,
    },
    {
      id: 'actionableInsight',
      header: () => <div className="text-xs font-medium uppercase tracking-wider text-gray-600">Recommended Strategy</div>,
      cell: ({ row }) => {
        const userPos = row.original.userRanking.position
        const volume = row.original.searchVolume
        const cpc = row.original.avgCpc || 0
        const competitors = row.original.competitorRankings
        const topCompetitor = competitors
          .filter(c => c.position)
          .sort((a, b) => (a.position || 999) - (b.position || 999))[0]
        
        // Generate specific, actionable recommendations
        let primaryAction = ''
        let estimatedBid = 0
        let tacticType = ''
        let icon = Target
        
        if (!userPos || userPos > 50) {
          // Not ranking
          tacticType = 'Launch Campaign'
          estimatedBid = cpc > 0 ? cpc * 1.15 : 2.5
          primaryAction = `Target $${estimatedBid.toFixed(2)} CPC`
          icon = Zap
        } else if (userPos > 20) {
          // Poor ranking
          tacticType = 'Boost Position'
          estimatedBid = cpc > 0 ? cpc * 1.2 : 1.5
          primaryAction = `Exact match at $${estimatedBid.toFixed(2)}`
          icon = TrendingUp
        } else if (userPos > 10) {
          // Page 2
          tacticType = 'Push to Page 1'
          estimatedBid = cpc > 0 ? cpc : 1.0
          primaryAction = `Top of search placement`
          icon = ArrowUp
        } else {
          // Already ranking well
          tacticType = 'Defend Position'
          estimatedBid = cpc > 0 ? cpc * 0.8 : 0.8
          primaryAction = `Maintain at $${estimatedBid.toFixed(2)}`
          icon = Shield
        }
        
        const Icon = icon
        
        return (
          <div className="py-1">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                !userPos || userPos > 50 ? 'bg-purple-50' :
                userPos > 20 ? 'bg-blue-50' :
                userPos > 10 ? 'bg-amber-50' :
                'bg-emerald-50'
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  !userPos || userPos > 50 ? 'text-purple-600' :
                  userPos > 20 ? 'text-blue-600' :
                  userPos > 10 ? 'text-amber-600' :
                  'text-emerald-600'
                )} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{tacticType}</div>
                <div className="text-sm text-gray-600 mt-0.5">{primaryAction}</div>
              </div>
            </div>
          </div>
        )
      },
      size: 260,
    },
  ], [])

  const table = useReactTable({
    data: gaps,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPagination = updater({ pageIndex, pageSize })
        setPageIndex(newPagination.pageIndex)
      }
    },
    manualPagination: false,
  })

  if (gaps.length === 0) {
    return (
      <Card className={cn('border-dashed', config.borderColor, config.bgColor)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <config.icon className={cn('h-12 w-12 mb-4', config.iconColor)} />
          <p className="text-muted-foreground text-center">
            No {config.title.toLowerCase()} found in this analysis
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-start gap-4 p-6 rounded-lg bg-gray-50/50 border border-gray-200">
        <div className="p-2 rounded-lg bg-white border border-gray-200">
          <config.icon className={cn('h-5 w-5', config.iconColor)} />
      </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{config.title}</h3>
          <p className="text-sm text-gray-600">{config.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">{gaps.length}</span>
              <span className="text-xs text-gray-400">opportunities</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">{Math.round(gaps.reduce((sum, g) => sum + g.searchVolume, 0) / 1000)}K</span>
              <span className="text-xs text-gray-400">total volume</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">{(gaps.reduce((sum, g) => sum + g.gapScore, 0) / gaps.length).toFixed(1)}</span>
              <span className="text-xs text-gray-400">avg score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-gray-200">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    style={{ width: header.getSize() }}
                    className="bg-gray-50/70 py-3"
                  >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-gray-50/50 border-gray-100"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
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
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

      {/* Pagination */}
        {gaps.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
            <p className="text-sm text-muted-foreground">
              Showing {table.getState().pagination.pageIndex * pageSize + 1} to{' '}
              {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, gaps.length)} of{' '}
              {gaps.length} opportunities
            </p>
            <div className="flex items-center gap-2">
            <Button
              variant="outline"
                size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
                Previous
            </Button>
            <Button
              variant="outline"
                size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
                Next
            </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export function GapAnalysisTab({ 
  data, 
  className 
}: GapAnalysisTabProps) {
  const [globalFilter, setGlobalFilter] = useState('')
  
  const { analysis, gaps, userAsin, competitorAsins } = data

  // Group gaps by type
  const groupedGaps = useMemo(() => {
    const filtered = globalFilter 
      ? gaps.filter(gap => 
          gap.keyword.toLowerCase().includes(globalFilter.toLowerCase()) ||
          gap.recommendation?.toLowerCase().includes(globalFilter.toLowerCase())
        )
      : gaps

    return {
      market_gap: filtered.filter(g => g.gapType === 'market_gap'),
      competitor_weakness: filtered.filter(g => g.gapType === 'competitor_weakness'),
      user_advantage: filtered.filter(g => g.gapType === 'user_advantage'),
    }
  }, [gaps, globalFilter])

  // Calculate enhanced summary stats
  const summaryStats = useMemo(() => {
    const stats = {
      totalOpportunities: gaps.length,
      totalSearchVolume: gaps.reduce((sum, g) => sum + g.searchVolume, 0),
      avgGapScore: gaps.length > 0 ? gaps.reduce((sum, g) => sum + g.gapScore, 0) / gaps.length : 0,
      highValueGaps: gaps.filter(g => g.searchVolume >= 5000 && g.gapScore >= 7).length,
      quickWins: gaps.filter(g => g.gapScore >= 8 && g.potentialImpact === 'high').length,
      byType: {
        market_gap: groupedGaps.market_gap.length,
        competitor_weakness: groupedGaps.competitor_weakness.length,
        user_advantage: groupedGaps.user_advantage.length,
      }
    }
    return stats
  }, [gaps, groupedGaps])

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      'Keyword,Search Volume,Gap Type,Gap Score,Your Position,Competitor Positions,Impact,Recommendation',
      ...gaps.map(gap => {
        const competitorPositions = gap.competitorRankings
          .map(c => `${c.asin?.slice(-4) || 'Unknown'}:${c.position || 'NR'}`)
          .join(';')
        return [
          `"${gap.keyword}"`,
          gap.searchVolume,
          gap.gapType,
          gap.gapScore,
          gap.userRanking.position || 'NR',
          `"${competitorPositions}"`,
          gap.potentialImpact,
          `"${gap.recommendation || ''}"`
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gap-analysis-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Gap Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Strategic opportunities based on {competitorAsins.length} competitor{competitorAsins.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Strategic Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-red-50 rounded">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Critical Gaps</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">
                  {gaps.filter(g => !g.userRanking.position && g.searchVolume >= 5000).length}
                </span>
                <span className="text-xs text-gray-500">opportunities</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Not ranking for high-volume keywords
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Lost traffic</span>
                <span className="text-xs font-medium text-gray-700">
                  ~{Math.round(gaps.filter(g => !g.userRanking.position && g.searchVolume >= 5000)
                    .reduce((sum, g) => sum + g.searchVolume, 0) / 1000)}K/mo
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-amber-50 rounded">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Competitive Advantages</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">
                  {gaps.filter(g => {
                    const userPos = g.userRanking.position || 999
                    const bestCompetitor = Math.min(...g.competitorRankings.map(c => c.position || 999))
                    return userPos < bestCompetitor && userPos <= 20
                  }).length}
                </span>
                <span className="text-xs text-gray-500">keywords</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Outranking all competitors
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Strategy</span>
                <span className="text-xs font-medium text-gray-700">
                  Defend with PPC
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-50 rounded">
              <Zap className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Low-Hanging Fruit</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">
                  {gaps.filter(g => {
                    const pos = g.userRanking.position
                    return pos && pos > 10 && pos <= 30 && g.searchVolume >= 1000
                  }).length}
                </span>
                <span className="text-xs text-gray-500">keywords</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Page 2-3 with good volume
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Strategy</span>
                <span className="text-xs font-medium text-gray-700">
                  Small PPC push
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Tables */}
      <Tabs defaultValue="all" className="space-y-6" onValueChange={() => {
        // Reset pagination when switching tabs
        window.scrollTo(0, 0)
      }}>
        {/* Tab Navigation with integrated search */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <TabsList className="grid w-fit grid-cols-4 bg-gray-100/50 p-1">
          <TabsTrigger value="all" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <span className="text-sm">All Types</span>
          </TabsTrigger>
          <TabsTrigger value="market_gap" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-sm">Market Gaps</span>
          </TabsTrigger>
          <TabsTrigger value="competitor_weakness" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-sm">Weaknesses</span>
          </TabsTrigger>
          <TabsTrigger value="user_advantage" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-sm">Advantages</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Search and Export */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search keywords..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 pr-10 w-64 text-sm border-gray-200 focus:border-gray-300 focus:ring-gray-300"
            />
            {globalFilter && (
              <Button
                variant="ghost"
                onClick={() => setGlobalFilter('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button 
            onClick={handleExport} 
            variant="outline" 
            size="sm"
            className="text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

        <TabsContent value="all" className="space-y-8">
          {Object.entries(groupedGaps).map(([type, gapList]) => (
            gapList.length > 0 && (
              <GapTable
                key={type}
                gaps={gapList}
                gapType={type as any}
                userAsin={userAsin}
                competitorAsins={competitorAsins}
              />
            )
          ))}
        </TabsContent>

        <TabsContent value="market_gap">
          <GapTable
            gaps={groupedGaps.market_gap}
            gapType="market_gap"
            userAsin={userAsin}
            competitorAsins={competitorAsins}
          />
        </TabsContent>

        <TabsContent value="competitor_weakness">
          <GapTable
            gaps={groupedGaps.competitor_weakness}
            gapType="competitor_weakness"
            userAsin={userAsin}
            competitorAsins={competitorAsins}
          />
        </TabsContent>

        <TabsContent value="user_advantage">
          <GapTable
            gaps={groupedGaps.user_advantage}
            gapType="user_advantage"
            userAsin={userAsin}
            competitorAsins={competitorAsins}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}