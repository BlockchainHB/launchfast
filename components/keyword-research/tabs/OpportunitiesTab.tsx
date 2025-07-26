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
    const totalOpportunities = data.length
    const marketGaps = data.filter(opp => opp.opportunityType === 'market_gap').length
    const weakCompetitors = data.filter(opp => opp.opportunityType === 'weak_competitors').length
    const lowCompetition = data.filter(opp => opp.opportunityType === 'low_competition').length
    
    const totalVolume = data.reduce((sum, opp) => sum + opp.searchVolume, 0)
    const avgCpc = data.length > 0 ? data.reduce((sum, opp) => sum + (opp.avgCpc || 0), 0) / data.length : 0
    const avgPurchaseRate = data.length > 0 ? data.reduce((sum, opp) => sum + (opp.purchaseRate || 0), 0) / data.length : 0
    
    // High-value opportunities (good search volume + low competition + decent conversion)
    const highValueOpps = data.filter(opp => 
      opp.searchVolume >= 2000 && 
      opp.competitionScore <= 3 && 
      (opp.purchaseRate || 0) >= 0.01
    ).length

    return {
      totalOpportunities,
      marketGaps,
      weakCompetitors, 
      lowCompetition,
      highValueOpps,
      totalVolume,
      avgCpc,
      avgPurchaseRate
    }
  }, [data])

  // Column definitions - all enhanced opportunity data by importance
  const columns: ColumnDef<OpportunityData>[] = useMemo(() => [
    {
      accessorKey: 'keyword',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold text-left justify-start"
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
      cell: ({ row }) => <KeywordCell keyword={row.getValue('keyword')} />,
      size: 200,
    },
    {
      accessorKey: 'searchVolume',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
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
          <div className="text-right">
            <span className="font-medium">{volume.toLocaleString()}</span>
          </div>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'relevancy',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold text-center w-full"
        >
          Relevancy
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
        <div className="text-center font-medium">
          <DataCell value={row.original.relevancy} format="decimal" />
        </div>
      ),
      size: 130,
    },
    {
      accessorKey: 'purchaseRate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Purchase Rate
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
        <div className="text-right">
          <DataCell value={row.getValue('purchaseRate')} format="percentage" decimals={1} />
        </div>
      ),
      size: 110,
    },
    {
      accessorKey: 'products',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Products
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
        <div className="text-right">
          <DataCell value={row.getValue('products')} format="number" />
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: 'competitionScore',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold text-center w-full"
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
        // If competitionScore is not available, try to get it from competitorPerformance
        const actualScore = score || row.original.competitorPerformance?.competitorStrength || 0
        
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
          <div className="text-center">
            <Badge className={cn('font-medium', actualScore ? getCompetitionColor(actualScore) : 'bg-gray-100 text-gray-800')}>
              {actualScore ? getCompetitionText(actualScore) : 'N/A'} (<DataCell value={actualScore} format="decimal" decimals={1} className="inline" />)
            </Badge>
          </div>
        )
      },
      size: 130,
    },
    {
      accessorKey: 'adProducts',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Ad Products
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
        <div className="text-right">
          <DataCell value={row.getValue('adProducts')} format="number" />
        </div>
      ),
      size: 110,
    },
    {
      accessorKey: 'supplyDemandRatio',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Supply/Demand
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
        <div className="text-right">
          <DataCell value={row.getValue('supplyDemandRatio')} format="decimal" decimals={1} />
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'avgCpc',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Avg CPC
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
        <div className="text-right">
          <DataCell value={row.getValue('avgCpc')} format="currency" />
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: 'bidMin',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Min Bid
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
        <div className="text-right">
          <DataCell value={row.original.bidMin} format="currency" />
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: 'bidMax',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Max Bid
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
        <div className="text-right">
          <DataCell value={row.original.bidMax} format="currency" />
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: 'monopolyClickRate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Monopoly
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
        <div className="text-right">
          <DataCell value={row.getValue('monopolyClickRate')} format="percentage" decimals={0} />
        </div>
      ),
      size: 110,
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
              High-Value Opps
            </CardTitle>
            <Star className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.highValueOpps}</div>
            <p className="text-xs text-muted-foreground mt-1">
              High volume + low competition
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Purchase Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summaryStats.avgPurchaseRate * 100).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Conversion potential
            </p>
          </CardContent>
        </Card>
      </div>


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