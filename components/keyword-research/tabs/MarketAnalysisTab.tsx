'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  DollarSign,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AggregatedKeyword, OpportunityData } from '@/lib/keyword-research'
import { KeywordCell } from '../KeywordCell'
import { DataCell } from '../DataCell'

interface MarketAnalysisTabProps {
  data: OpportunityData[] | AggregatedKeyword[]
  aggregatedData?: AggregatedKeyword[]
  className?: string
}

export function MarketAnalysisTab({ 
  data, 
  aggregatedData = [],
  className 
}: MarketAnalysisTabProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'searchVolume', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [pageIndex, setPageIndex] = useState(0)

  // Reset page index when data or global filter changes
  useEffect(() => {
    setPageIndex(0)
  }, [data, globalFilter])

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

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const filteredData = globalFilter
      ? data.filter(item => 
          item.keyword.toLowerCase().includes(globalFilter.toLowerCase())
        )
      : data

    return {
      totalKeywords: filteredData.length,
      totalVolume: filteredData.reduce((sum, item) => sum + item.searchVolume, 0),
      avgCPC: filteredData.length > 0
        ? filteredData.reduce((sum, item) => sum + (item.avgCpc || 0), 0) / filteredData.length
        : 0,
      avgCompetition: filteredData.length > 0
        ? filteredData.reduce((sum, item) => sum + (item.products || 0), 0) / filteredData.length
        : 0
    }
  }, [data, globalFilter])
  
  // Column definitions - focused on key data
  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: 'keyword',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium text-xs text-left justify-start"
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
      ),
      cell: ({ row }) => <KeywordCell keyword={row.getValue('keyword')} className="text-sm" maxWidth="max-w-[300px]" />,
      size: 300,
    },
    {
      accessorKey: 'searchVolume',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium text-xs w-full text-right justify-end"
        >
          Search Volume
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
        <div className="text-sm tabular-nums text-right text-gray-900">
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
          className="hover:bg-transparent p-0 h-auto font-medium text-xs w-full text-right justify-end"
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
      ),
      cell: ({ row }) => (
        <div className="text-sm tabular-nums text-right">
          <DataCell value={row.getValue('avgCpc')} format="currency" />
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
          className="hover:bg-transparent p-0 h-auto font-medium text-xs w-full text-right justify-end"
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
      ),
      cell: ({ row }) => {
        const products = row.getValue('products') as number | null
        const competitionLevel = products ? (
          products > 500 ? 'High' :
          products > 200 ? 'Med' :
          'Low'
        ) : null

        return (
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm tabular-nums text-gray-900">
              <DataCell value={products} format="number" />
            </span>
            {competitionLevel && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0 h-4 border-0",
                  competitionLevel === 'Low' ? "bg-green-100 text-green-700" :
                  competitionLevel === 'Med' ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                )}
              >
                {competitionLevel}
              </Badge>
            )}
          </div>
        )
      },
      size: 140,
    },
    {
      accessorKey: 'purchaseRate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-medium text-xs w-full text-right justify-end"
        >
          Conversion
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
        <div className="text-sm tabular-nums text-right">
          <DataCell value={row.getValue('purchaseRate')} format="percentage" decimals={1} />
          </div>
      ),
      size: 100,
    },
    {
      accessorKey: 'rankingAsins',
      header: () => <div className="text-center text-xs font-medium">Ranking ASINs</div>,
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
            <div className="text-center">
              <Badge variant="outline" className="text-[10px] font-medium text-gray-400 border-gray-200">
              0 ASINs
              </Badge>
            </div>
          )
        }
        
        // Calculate percentage and get color
        const rankingPercentage = asins.length / totalAsinsAnalyzed
        const getRankingColor = (percentage: number) => {
          if (percentage === 0) return 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          if (percentage <= 0.2) return 'bg-green-50 text-green-700 hover:bg-green-100'
          if (percentage <= 0.4) return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
          if (percentage <= 0.6) return 'bg-orange-50 text-orange-700 hover:bg-orange-100'
          return 'bg-red-50 text-red-700 hover:bg-red-100'
        }
        
        return (
          <div className="text-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      'text-[10px] font-medium cursor-help transition-colors px-2 py-0.5',
                      getRankingColor(rankingPercentage)
                    )}
                  >
                      {asins.length} ASIN{asins.length === 1 ? '' : 's'}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-md p-3">
                  <div className="space-y-2">
                    <div className="font-medium text-xs">
                      Ranking ASINs ({Math.round(rankingPercentage * 100)}% of analyzed)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {asins.map((asin, index) => (
                        <Badge key={index} variant="outline" className="text-[10px] font-mono">
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
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination: {
        pageSize,
        pageIndex,
      },
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPagination = updater({ pageSize, pageIndex })
        setPageSize(newPagination.pageSize)
        setPageIndex(newPagination.pageIndex)
      } else {
        setPageSize(updater.pageSize)
        setPageIndex(updater.pageIndex)
      }
    },
  })

  // Export function
  const handleExport = () => {
    const csvContent = [
      ['Keyword', 'Search Volume', 'CPC', 'Products', 'Purchase Rate', 'Ranking ASINs'].join(','),
      ...table.getFilteredRowModel().rows.map(row => {
        const asins = row.getValue('rankingAsins') as AggregatedKeyword['rankingAsins'] | undefined
        return [
          row.getValue('keyword'),
          row.getValue('searchVolume'),
          row.getValue('avgCpc') || 0,
          row.getValue('products') || 0,
          row.getValue('purchaseRate') || 0,
          asins ? asins.length : 0
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'market-analysis.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Section */}
      <div className="flex flex-col gap-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-gray-50 rounded">
                <Search className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Total Keywords</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalKeywords.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-50 rounded">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Total Search Volume</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalVolume.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-green-50 rounded">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Average CPC</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  <DataCell value={summaryStats.avgCPC} format="currency" />
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-purple-50 rounded">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Avg Competition</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round(summaryStats.avgCompetition).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search keywords..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 pr-9 h-9 text-sm"
            />
            {globalFilter && (
              <Button
                variant="ghost"
                onClick={() => setGlobalFilter('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Eye className="mr-2 h-3.5 w-3.5" />
                Columns
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
                        className="capitalize text-sm"
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
                      className="h-9 px-4 text-xs"
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
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-2.5">
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
                  <div className="flex flex-col items-center space-y-2">
                    <Search className="h-6 w-6 text-gray-400" />
                    <p className="text-sm text-gray-500">
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-gray-700">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              const newPageSize = Number(value)
              setPageSize(newPageSize)
              setPageIndex(0)
              table.setPageSize(newPageSize)
              table.setPageIndex(0)
            }}
          >
              <SelectTrigger className="h-8 w-[65px] text-xs">
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
        
          <div className="text-xs text-gray-600">
            Showing {table.getFilteredRowModel().rows.length} of {data.length} keywords
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
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