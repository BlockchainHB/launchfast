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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  EyeOff,
  Download,
  Filter,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AggregatedKeyword, OpportunityData } from '@/lib/keyword-research'

interface MarketAnalysisTabProps {
  data: OpportunityData[] | AggregatedKeyword[]
  aggregatedData?: AggregatedKeyword[]
  showFilters?: boolean
  className?: string
}

export function MarketAnalysisTab({ 
  data, 
  aggregatedData = [],
  showFilters = false, 
  className 
}: MarketAnalysisTabProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'searchVolume', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSize, setPageSize] = useState(25)

  // Detect if we're dealing with enhanced data (OpportunityData) or basic data (AggregatedKeyword)
  const isEnhancedData = (data.length > 0 && 'competitionScore' in data[0]) as boolean
  
  // Create lookup map for ranking ASINs from aggregated data
  const rankingAsinsLookup = useMemo(() => {
    const lookup = new Map<string, AggregatedKeyword['rankingAsins']>()
    aggregatedData.forEach(item => {
      lookup.set(item.keyword, item.rankingAsins)
    })
    return lookup
  }, [aggregatedData])
  
  // Calculate total ASINs analyzed for dynamic coloring
  const totalAsinsAnalyzed = useMemo(() => {
    if (aggregatedData.length > 0) {
      // Get unique ASINs from all ranking data
      const uniqueAsins = new Set<string>()
      aggregatedData.forEach(item => {
        item.rankingAsins?.forEach(asin => uniqueAsins.add(asin.asin))
      })
      return uniqueAsins.size
    }
    return 5 // Default fallback
  }, [aggregatedData])
  
  // Column definitions - focused on key data
  const columns: ColumnDef<any>[] = useMemo(() => [
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
        <div className="font-medium text-center px-2">
          <div className="break-words">{row.getValue('keyword')}</div>
        </div>
      ),
      size: 250,
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
      cell: ({ row }) => (
        <div className="font-medium text-center">
          {row.getValue<number>('searchVolume').toLocaleString()}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: isEnhancedData ? 'avgCpc' : 'avgCpc',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
        >
          CPC
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
        <div className="font-medium text-center">
          ${row.getValue<number>('avgCpc')?.toFixed(2) || '0.00'}
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: 'products',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
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
      cell: ({ row }) => {
        const products = row.getValue<number>('products')
        return (
          <div className="font-medium text-center">
            {products?.toLocaleString() || '--'}
          </div>
        )
      },
      size: 100,
    },
    {
      accessorKey: 'purchaseRate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
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
      cell: ({ row }) => {
        const rate = row.getValue<number>('purchaseRate')
        return (
          <div className="font-medium text-center">
            {rate ? `${(rate * 100).toFixed(1)}%` : '--'}
          </div>
        )
      },
      size: 110,
    },
    {
      accessorKey: 'rankingAsins',
      header: 'Ranking ASINs',
      cell: ({ row }) => {
        // Try to get ranking ASINs from the row data first, then from lookup
        let asins = row.getValue('rankingAsins') as AggregatedKeyword['rankingAsins'] | undefined
        
        // If no ranking ASINs in row data (enhanced data), lookup from aggregated data
        if (!asins && isEnhancedData) {
          const keyword = row.getValue('keyword') as string
          asins = rankingAsinsLookup.get(keyword)
        }
        
        if (!asins || !Array.isArray(asins) || asins.length === 0) {
          return (
            <div className="text-xs text-muted-foreground text-center">
              0 ASINs
            </div>
          )
        }
        
        // Calculate percentage and get color
        const rankingPercentage = asins.length / totalAsinsAnalyzed
        const getRankingColor = (percentage: number) => {
          if (percentage === 0) return 'bg-green-100 text-green-800 border-green-200'
          if (percentage <= 0.2) return 'bg-green-100 text-green-800 border-green-200'
          if (percentage <= 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
          if (percentage <= 0.6) return 'bg-orange-100 text-orange-800 border-orange-200'
          if (percentage <= 0.8) return 'bg-red-100 text-red-800 border-red-200'
          return 'bg-red-200 text-red-900 border-red-300'
        }
        
        return (
          <div className="text-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center cursor-help">
                    <Badge className={cn('text-xs font-medium border', getRankingColor(rankingPercentage))}>
                      {asins.length} ASIN{asins.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <div className="space-y-1">
                    <div className="font-medium text-xs mb-2">
                      Ranking ASINs ({Math.round(rankingPercentage * 100)}% of analyzed):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {asins.map((asin, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {asin.asin} {asin.position ? `#${asin.position}` : 'Not Ranked'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
      size: 120,
    },
  ], [isEnhancedData, rankingAsinsLookup, totalAsinsAnalyzed, aggregatedData])

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
      // Header row
      columns.map(col => col.id || 'unknown').join(','),
      // Data rows
      ...table.getFilteredRowModel().rows.map(row =>
        columns.map(col => {
          const value = row.getValue(col.accessorKey as string)
          if (col.accessorKey === 'rankingAsins') {
            const asins = value as AggregatedKeyword['rankingAsins'] | undefined
            if (!asins || !Array.isArray(asins)) {
              return '"No ranking data"'
            }
            return `"${asins
              .map(asin => `${asin.asin}:${asin.position ? `#${asin.position}` : 'Not Ranked'}`)
              .join('; ')}"`
          }
          return typeof value === 'string' ? `"${value}"` : value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `all-keywords-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
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
                  <SelectItem value="1000">1K+ volume</SelectItem>
                  <SelectItem value="5000">5K+ volume</SelectItem>
                  <SelectItem value="10000">10K+ volume</SelectItem>
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
                    <TableHead key={header.id} style={{ width: header.getSize() }} className="text-center">
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
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No keywords found
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
              <span className="sr-only">Go to first page</span>
              ⟪
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              ⟨
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              ⟩
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              ⟫
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Showing {table.getFilteredRowModel().rows.length} of {data.length} keywords
        </p>
        <p>
          Total search volume: {data.reduce((sum, item) => sum + item.searchVolume, 0).toLocaleString()}
        </p>
      </div>
    </div>
  )
}