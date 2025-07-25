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
  Target,
  TrendingUp,
  Users,
  Zap,
  X,
  Star,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpportunityData } from '@/types'

interface OpportunitiesTabProps {
  data: OpportunityData[]
  showFilters?: boolean
  className?: string
}

export function OpportunitiesTab({ 
  data, 
  showFilters = false, 
  className 
}: OpportunitiesTabProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'searchVolume', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSize, setPageSize] = useState(25)

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalOpportunities = data.length
    const highVolumeOpps = data.filter(opp => opp.searchVolume > 5000).length
    const mediumVolumeOpps = data.filter(opp => opp.searchVolume >= 1000 && opp.searchVolume <= 5000).length
    const lowCompetitionOpps = data.filter(opp => opp.competitionScore <= 3).length
    const totalVolume = data.reduce((sum, opp) => sum + opp.searchVolume, 0)
    const avgCpc = data.length > 0 ? data.reduce((sum, opp) => sum + (opp.avgCpc || 0), 0) / data.length : 0
    
    const typeBreakdown = data.reduce((acc, opp) => {
      const type = opp.opportunityType || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalOpportunities,
      highVolumeOpps,
      mediumVolumeOpps,
      lowCompetitionOpps,
      totalVolume,
      avgCpc,
      typeBreakdown
    }
  }, [data])

  // Column definitions
  const columns: ColumnDef<OpportunityData>[] = useMemo(() => [
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
            {volume > 5000 && <Star className="h-3 w-3 text-yellow-500" />}
          </div>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'competitionScore',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
        >
          Competition
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
        const score = row.getValue<number>('competitionScore')
        const getCompetitionColor = (score: number) => {
          if (score <= 3) return 'bg-green-100 text-green-800'
          if (score <= 6) return 'bg-yellow-100 text-yellow-800'
          return 'bg-red-100 text-red-800'
        }
        const getCompetitionText = (score: number) => {
          if (score <= 3) return 'Low'
          if (score <= 6) return 'Medium'
          return 'High'
        }
        
        return (
          <Badge className={cn('font-medium', getCompetitionColor(score))}>
            {getCompetitionText(score)} ({score ? score.toFixed(1) : '0.0'})
          </Badge>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'opportunityType',
      header: 'Opportunity Type',
      cell: ({ row }) => {
        const type = row.getValue<string>('opportunityType') || 'unknown'
        const getTypeIcon = (type: string) => {
          switch (type) {
            case 'market_gap': return <Target className="h-3 w-3" />
            case 'weak_competitors': return <Users className="h-3 w-3" />
            case 'low_competition': return <TrendingUp className="h-3 w-3" />
            case 'keyword_mining': return <Zap className="h-3 w-3" />
            default: return <AlertCircle className="h-3 w-3" />
          }
        }
        const getTypeColor = (type: string) => {
          switch (type) {
            case 'market_gap': return 'bg-blue-100 text-blue-800'
            case 'weak_competitors': return 'bg-green-100 text-green-800'
            case 'low_competition': return 'bg-orange-100 text-orange-800'
            case 'keyword_mining': return 'bg-purple-100 text-purple-800'
            default: return 'bg-gray-100 text-gray-800'
          }
        }
        
        return (
          <Badge className={cn('font-medium flex items-center space-x-1', getTypeColor(type))}>
            {getTypeIcon(type)}
            <span className="capitalize">{type.replace('_', ' ')}</span>
          </Badge>
        )
      },
      size: 150,
    },
    {
      accessorKey: 'opportunityType',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
        >
          Opportunity Type
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
        const type = row.getValue<string>('opportunityType')
        return (
          <div className="font-medium">
            {type ? type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
          </div>
        )
      },
      size: 120,
    },
    {
      id: 'competitorPerformance',
      header: 'Competitor Analysis',
      cell: ({ row }) => {
        const performance = row.original.competitorPerformance
        if (!performance) return <span className="text-muted-foreground">N/A</span>
        
        return (
          <div className="text-xs space-y-1">
            <div>Ranking: {performance.competitorsRanking}</div>
            <div>Top 15: {performance.competitorsInTop15}</div>
            <div>Strength: {performance.competitorStrength ? performance.competitorStrength.toFixed(1) : '0.0'}</div>
          </div>
        )
      },
      size: 130,
    },
    {
      id: 'potential',
      header: 'Potential Value',
      cell: ({ row }) => {
        const volume = row.original.searchVolume
        const cpc = row.original.avgCpc
        const competition = row.original.competitionScore
        
        // Simple potential calculation: volume * cpc * (10 - competition) / 10
        const potential = Math.round((volume * cpc * (10 - competition)) / 10)
        
        return (
          <div className="font-medium text-green-600">
            ${potential.toLocaleString()}
          </div>
        )
      },
      size: 120,
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
      'Keyword,Search Volume,Competition Score,Opportunity Type,Avg CPC,Supply Demand Ratio,Growth Trend,Competitors Ranking,Competitors In Top 15,Competitor Strength',
      ...table.getFilteredRowModel().rows.map(row => {
        const original = row.original
        return [
          `"${original.keyword}"`,
          original.searchVolume,
          original.competitionScore,
          original.opportunityType || '',
          original.avgCpc,
          original.supplyDemandRatio || '',
          original.growthTrend || '',
          original.competitorPerformance?.competitorsRanking || '',
          original.competitorPerformance?.competitorsInTop15 || '',
          original.competitorPerformance?.competitorStrength || ''
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keyword-opportunities-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Opportunities
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalOpportunities}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summaryStats.highVolumeOpps} high-volume (5K+)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Volume
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined search volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Competition
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.lowCompetitionOpps}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Score ≤ 3.0 (easier to rank)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg CPC
            </CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats.avgCpc.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average cost per click
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Opportunity Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Opportunity Breakdown</CardTitle>
          <CardDescription>
            Distribution of opportunity types discovered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summaryStats.typeBreakdown).map(([type, count]) => (
              <div key={type} className="flex items-center space-x-2 p-3 border rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-sm capitalize">
                    {type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">{count} opportunities</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
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
                  (table.getColumn('opportunityType')?.getFilterValue() as string) ?? ''
                }
                onValueChange={(value) =>
                  table.getColumn('opportunityType')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="market_gap">Market Gap</SelectItem>
                  <SelectItem value="weak_competitors">Weak Competitors</SelectItem>
                  <SelectItem value="low_competition">Low Competition</SelectItem>
                  <SelectItem value="keyword_mining">Keyword Mining</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={
                  (table.getColumn('searchVolume')?.getFilterValue() as string) ?? ''
                }
                onValueChange={(value) =>
                  table.getColumn('searchVolume')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Volume filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All volumes</SelectItem>
                  <SelectItem value="5000">5K+ volume</SelectItem>
                  <SelectItem value="1000">1K+ volume</SelectItem>
                  <SelectItem value="500">500+ volume</SelectItem>
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
                    <Target className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
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
          Showing {table.getFilteredRowModel().rows.length} of {data.length} opportunities
        </p>
        <p>
          Filtered volume: {table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.searchVolume, 0).toLocaleString()}
        </p>
      </div>
    </div>
  )
}