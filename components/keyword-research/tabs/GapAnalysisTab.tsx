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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  X,
  Crown,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GapAnalysisResult, GapOpportunity } from '@/types'

interface GapAnalysisTabProps {
  data: GapAnalysisResult
  showFilters?: boolean
  className?: string
}

export function GapAnalysisTab({ 
  data, 
  showFilters = false, 
  className 
}: GapAnalysisTabProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'gapScore', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSize, setPageSize] = useState(25)

  const { analysis, gaps, userAsin, competitorAsins } = data

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const highImpactGaps = gaps.filter(gap => gap.potentialImpact === 'high').length
    const mediumImpactGaps = gaps.filter(gap => gap.potentialImpact === 'medium').length
    const lowImpactGaps = gaps.filter(gap => gap.potentialImpact === 'low').length
    
    const gapTypeBreakdown = gaps.reduce((acc, gap) => {
      acc[gap.gapType] = (acc[gap.gapType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const avgGapScore = gaps.length > 0 
      ? gaps.reduce((sum, gap) => sum + gap.gapScore, 0) / gaps.length 
      : 0

    return {
      highImpactGaps,
      mediumImpactGaps,
      lowImpactGaps,
      gapTypeBreakdown,
      avgGapScore
    }
  }, [gaps])

  // Column definitions
  const columns: ColumnDef<GapOpportunity>[] = useMemo(() => [
    {
      accessorKey: 'keyword',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
        >
          Keyword
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium max-w-48">
          <div className="truncate">{row.getValue('keyword')}</div>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'searchVolume',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
        >
          Search Volume
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const volume = row.getValue<number>('searchVolume')
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{volume.toLocaleString()}</span>
            {volume > 5000 && <Crown className="h-3 w-3 text-yellow-500" />}
          </div>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'gapType',
      header: 'Gap Type',
      cell: ({ row }) => {
        const type = row.getValue<string>('gapType')
        const getTypeIcon = (type: string) => {
          switch (type) {
            case 'market_gap': return <BarChart3 className="h-3 w-3" />
            case 'competitor_weakness': return <Users className="h-3 w-3" />
            case 'user_advantage': return <TrendingUp className="h-3 w-3" />
            default: return <AlertTriangle className="h-3 w-3" />
          }
        }
        const getTypeColor = (type: string) => {
          switch (type) {
            case 'market_gap': return 'bg-blue-100 text-blue-800'
            case 'competitor_weakness': return 'bg-orange-100 text-orange-800'
            case 'user_advantage': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
          }
        }
        const getTypeText = (type: string) => {
          switch (type) {
            case 'market_gap': return 'Market Gap'
            case 'competitor_weakness': return 'Weak Competitors'
            case 'user_advantage': return 'Your Advantage'
            default: return type
          }
        }
        
        return (
          <Badge className={cn('font-medium flex items-center space-x-1', getTypeColor(type))}>
            {getTypeIcon(type)}
            <span>{getTypeText(type)}</span>
          </Badge>
        )
      },
      size: 150,
    },
    {
      accessorKey: 'gapScore',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
        >
          Gap Score
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const score = row.getValue<number>('gapScore')
        const getScoreColor = (score: number) => {
          if (score >= 8) return 'bg-green-100 text-green-800'
          if (score >= 6) return 'bg-yellow-100 text-yellow-800'
          if (score >= 4) return 'bg-orange-100 text-orange-800'
          return 'bg-red-100 text-red-800'
        }
        
        return (
          <Badge className={cn('font-medium', getScoreColor(score))}>
            {score}/10
          </Badge>
        )
      },
      size: 100,
    },
    {
      id: 'userRanking',
      header: 'Your Position',
      cell: ({ row }) => {
        const userRanking = row.original.userRanking
        const position = userRanking.position
        
        if (!position) {
          return (
            <Badge variant="outline" className="bg-gray-100 text-gray-600">
              Not ranking
            </Badge>
          )
        }
        
        const getPositionColor = (pos: number) => {
          if (pos <= 3) return 'bg-green-100 text-green-800'
          if (pos <= 10) return 'bg-yellow-100 text-yellow-800'
          if (pos <= 20) return 'bg-orange-100 text-orange-800'
          return 'bg-red-100 text-red-800'
        }
        
        return (
          <Badge className={cn('font-medium', getPositionColor(position))}>
            #{position}
          </Badge>
        )
      },
      size: 120,
    },
    {
      id: 'competitorRankings',
      header: 'Competitor Positions',
      cell: ({ row }) => {
        const competitors = row.original.competitorRankings
        const topCompetitors = competitors
          .filter(c => c.position && c.position <= 20)
          .sort((a, b) => (a.position || 999) - (b.position || 999))
          .slice(0, 3)
        
        if (topCompetitors.length === 0) {
          return (
            <span className="text-muted-foreground text-xs">No rankings</span>
          )
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {topCompetitors.map((comp, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{comp.position}
              </Badge>
            ))}
          </div>
        )
      },
      size: 150,
    },
    {
      accessorKey: 'potentialImpact',
      header: 'Impact',
      cell: ({ row }) => {
        const impact = row.getValue<string>('potentialImpact')
        const getImpactColor = (impact: string) => {
          switch (impact) {
            case 'high': return 'bg-red-100 text-red-800'
            case 'medium': return 'bg-yellow-100 text-yellow-800'
            case 'low': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
          }
        }
        const getImpactIcon = (impact: string) => {
          switch (impact) {
            case 'high': return <Zap className="h-3 w-3" />
            case 'medium': return <TrendingUp className="h-3 w-3" />
            case 'low': return <CheckCircle className="h-3 w-3" />
            default: return <AlertTriangle className="h-3 w-3" />
          }
        }
        
        return (
          <Badge className={cn('font-medium flex items-center space-x-1', getImpactColor(impact))}>
            {getImpactIcon(impact)}
            <span className="capitalize">{impact}</span>
          </Badge>
        )
      },
      size: 100,
    },
    {
      accessorKey: 'gapScore',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
        >
          Gap Score
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const gapScore = row.getValue<number>('gapScore')
        return (
          <div className="font-medium">
            {gapScore ? gapScore.toFixed(1) : 'N/A'}
          </div>
        )
      },
      size: 80,
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
      'Keyword,Search Volume,Gap Type,Gap Score,Potential Impact,Your Position,Avg CPC,Recommendation,Competitor Positions',
      ...table.getFilteredRowModel().rows.map(row => {
        const original = row.original
        return [
          `"${original.keyword}"`,
          original.searchVolume,
          original.gapType,
          original.gapScore,
          original.potentialImpact,
          original.userRanking.position || 'Not ranking',
          original.avgCpc,
          `"${original.recommendation || ''}"`,
          `"${original.competitorRankings.map(c => `${c.asin}:#${c.position || 'N/A'}`).join('; ')}"`
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
      {/* Analysis Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gaps
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalGapsFound}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.highVolumeGaps} high-volume gaps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Impact
            </CardTitle>
            <Zap className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.highImpactGaps}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Priority opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Gap Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.avgGapScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of 10.0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Potential
            </CardTitle>
            <Crown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalGapPotential.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined search volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Context */}
      <Card>
        <CardHeader>
          <CardTitle>Gap Analysis Overview</CardTitle>
          <CardDescription>
            Comparing your product ({userAsin}) against {competitorAsins.length} competitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Your Product</h4>
              <Badge variant="outline" className="font-mono">
                {userAsin}
              </Badge>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Competitors</h4>
              <div className="flex flex-wrap gap-1">
                {competitorAsins.map((asin, index) => (
                  <Badge key={index} variant="secondary" className="font-mono text-xs">
                    {asin}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Gap Types</h4>
              <div className="space-y-1">
                {Object.entries(summaryStats.gapTypeBreakdown).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search gaps..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8 w-64"
            />
            {globalFilter && (
              <Button
                variant="ghost"
                onClick={() => setGlobalFilter('')}
                className="absolute right-1 top-1 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {showFilters && (
            <div className="flex items-center space-x-2">
              <Select
                value={
                  (table.getColumn('gapType')?.getFilterValue() as string) ?? ''
                }
                onValueChange={(value) =>
                  table.getColumn('gapType')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Gap type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="market_gap">Market Gap</SelectItem>
                  <SelectItem value="competitor_weakness">Weak Competitors</SelectItem>
                  <SelectItem value="user_advantage">Your Advantage</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={
                  (table.getColumn('potentialImpact')?.getFilterValue() as string) ?? ''
                }
                onValueChange={(value) =>
                  table.getColumn('potentialImpact')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Impact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All impact</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Eye className="mr-2 h-4 w-4" />
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
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
                      className="capitalize"
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
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
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
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  <div className="flex flex-col items-center space-y-2">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No gaps found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
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
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-24 items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              ⟪
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ⟨
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              ⟩
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              ⟫
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Showing {table.getFilteredRowModel().rows.length} of {gaps.length} gaps
        </p>
        <p>
          High impact gaps: {table.getFilteredRowModel().rows.filter(row => row.original.potentialImpact === 'high').length}
        </p>
      </div>
    </div>
  )
}