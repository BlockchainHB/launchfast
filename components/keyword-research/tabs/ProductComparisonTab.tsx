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
import { Card, CardContent } from '@/components/ui/card'
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
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Trophy,
  Target,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { KeywordCell } from '../KeywordCell'
import { DataCell } from '../DataCell'
import type { AsinKeywordResult } from '@/lib/keyword-research'

interface ProductComparisonTabProps {
  data: AsinKeywordResult[]
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
  strongKeywords: number // Rankings 1-15
  weakKeywords: number // Rankings 16+
  topKeywords: Array<{
    keyword: string
    searchVolume: number
    rankingPosition?: number
    trafficPercentage?: number
  }>
}

export function ProductComparisonTab({ 
  data, 
  className 
}: ProductComparisonTabProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalKeywords', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [pageSize, setPageSize] = useState(25)

  // Transform data to comparison format
  const comparisonData: ComparisonData[] = useMemo(() => {
    return data.map(result => {
      if (result.status !== 'success') {
        return {
          asin: result.asin,
          productTitle: result.productTitle,
          status: result.status,
          error: result.error,
          totalKeywords: 0,
          avgSearchVolume: 0,
          strongKeywords: 0,
          weakKeywords: 0,
          topKeywords: []
        }
      }

      const strongKeywords = result.keywords.filter(kw => 
        kw.rankingPosition && kw.rankingPosition <= 15
      ).length
      
      const weakKeywords = result.keywords.filter(kw => 
        kw.rankingPosition && kw.rankingPosition > 15
      ).length

      const avgSearchVolume = result.keywords.length > 0
        ? Math.round(result.keywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / result.keywords.length)
        : 0

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
        strongKeywords,
        weakKeywords,
        topKeywords
      }
    })
  }, [data])

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
              className="p-0 h-auto w-6"
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : null
      },
      size: 40,
    },
    {
      accessorKey: 'asin',
      header: () => <div className="text-left font-semibold">ASIN</div>,
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <div className="flex flex-col items-start space-y-1 py-1">
            <div className="font-mono font-semibold text-sm tracking-wide">
              {row.getValue('asin')}
            </div>
            <div className="flex items-center">
              {status === 'success' ? (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Success</span>
                </div>
              ) : status === 'failed' ? (
                <div className="flex items-center space-x-1">
                  <XCircle className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600 font-medium">Failed</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  <span className="text-xs text-yellow-600 font-medium">Warning</span>
                </div>
              )}
            </div>
          </div>
        )
      },
      size: 160,
    },
    {
      accessorKey: 'totalKeywords',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Total Keywords
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
        <div className="font-medium text-right">
          <DataCell value={row.getValue('totalKeywords')} format="number" />
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'strongKeywords',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold text-center w-full"
        >
          Strong Keywords
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
        <div className="text-center">
          <Badge variant="default" className="bg-green-100 text-green-800">
            {row.getValue<number>('strongKeywords')} (Top 15)
          </Badge>
        </div>
      ),
      size: 130,
    },
    {
      accessorKey: 'weakKeywords',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold text-center w-full"
        >
          Weak Keywords
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
        <div className="text-center">
          <Badge variant="outline" className="bg-orange-100 text-orange-800">
            {row.getValue<number>('weakKeywords')} (16+)
          </Badge>
        </div>
      ),
      size: 130,
    },
    {
      accessorKey: 'avgSearchVolume',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold w-full text-right justify-end"
        >
          Avg Volume
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
        <div className="font-medium text-right">
          <DataCell value={row.getValue('avgSearchVolume')} format="number" />
        </div>
      ),
      size: 120,
    },
  ], [])

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
      'ASIN,Product Title,Status,Total Keywords,Strong Keywords,Weak Keywords,Avg Search Volume,Top Keywords',
      ...comparisonData.map(item => [
        item.asin,
        `"${item.productTitle || ''}"`,
        item.status,
        item.totalKeywords,
        item.strongKeywords,
        item.weakKeywords,
        item.avgSearchVolume,
        `"${item.topKeywords.map(kw => `${kw.keyword}:${kw.searchVolume}`).join('; ')}"`
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
      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ASINs or products..."
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
                <React.Fragment key={row.id}>
                  <TableRow
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
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        <Card className="m-4">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-lg">Competitive Analysis: {row.original.asin}</h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>Avg Rank: #<DataCell value={Math.round(row.original.topKeywords.reduce((sum, kw) => sum + (kw.rankingPosition || 50), 0) / row.original.topKeywords.length)} format="number" /></span>
                                <span>Traffic Share: <DataCell value={row.original.topKeywords.reduce((sum, kw) => sum + (kw.trafficPercentage || 0), 0) / 100} format="percentage" decimals={1} /></span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                              {/* Dominant Keywords */}
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                <h5 className="font-medium text-green-800 mb-1 flex items-center text-sm">
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Dominant (Top 5)
                                </h5>
                                <div className="space-y-0.5">
                                  {row.original.topKeywords
                                    .filter(kw => kw.rankingPosition && kw.rankingPosition <= 5)
                                    .slice(0, 6)
                                    .map((keyword, index) => (
                                      <div key={index} className="text-xs flex items-center justify-between">
                                        <span className="font-medium truncate flex-1">{keyword.keyword}</span>
                                        <span className="text-green-600 ml-1">#{keyword.rankingPosition}</span>
                                      </div>
                                    ))}
                                  {row.original.topKeywords.filter(kw => kw.rankingPosition && kw.rankingPosition <= 5).length === 0 && (
                                    <div className="text-xs text-muted-foreground">No top 5 rankings</div>
                                  )}
                                </div>
                              </div>

                              {/* Opportunity Keywords */}
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                                <h5 className="font-medium text-orange-800 mb-1 flex items-center text-sm">
                                  <Target className="h-3 w-3 mr-1" />
                                  Opportunities (16+)
                                </h5>
                                <div className="space-y-0.5">
                                  {row.original.topKeywords
                                    .filter(kw => kw.rankingPosition && kw.rankingPosition > 15)
                                    .sort((a, b) => b.searchVolume - a.searchVolume)
                                    .slice(0, 6)
                                    .map((keyword, index) => (
                                      <div key={index} className="text-xs flex items-center justify-between">
                                        <span className="font-medium truncate flex-1">{keyword.keyword}</span>
                                        <span className="text-orange-600 ml-1">#{keyword.rankingPosition}</span>
                                      </div>
                                    ))}
                                  {row.original.topKeywords.filter(kw => kw.rankingPosition && kw.rankingPosition > 15).length === 0 && (
                                    <div className="text-xs text-muted-foreground">All keywords well-ranked</div>
                                  )}
                                </div>
                              </div>

                              {/* High Traffic Keywords */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                <h5 className="font-medium text-blue-800 mb-1 flex items-center text-sm">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  High Traffic
                                </h5>
                                <div className="space-y-0.5">
                                  {row.original.topKeywords
                                    .filter(kw => kw.trafficPercentage && kw.trafficPercentage > 1)
                                    .sort((a, b) => (b.trafficPercentage || 0) - (a.trafficPercentage || 0))
                                    .slice(0, 6)
                                    .map((keyword, index) => (
                                      <div key={index} className="text-xs flex items-center justify-between">
                                        <KeywordCell keyword={keyword.keyword} className="font-medium flex-1" maxWidth="max-w-full" />
                                        <span className="text-blue-600 ml-1">
                                          <DataCell value={keyword.trafficPercentage / 100} format="percentage" decimals={2} />
                                        </span>
                                      </div>
                                    ))}
                                  {row.original.topKeywords.filter(kw => kw.trafficPercentage && kw.trafficPercentage > 1).length === 0 && (
                                    <div className="text-xs text-muted-foreground">Low traffic keywords</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Top Keywords Table */}
                            <div>
                              <h5 className="font-medium mb-2">Top 8 Keywords by Volume</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {row.original.topKeywords.slice(0, 8).map((keyword, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                                    <div className="flex-1 min-w-0">
                                      <KeywordCell keyword={keyword.keyword} className="font-medium" maxWidth="max-w-full" />
                                      <div className="text-xs text-muted-foreground">
                                        Rank #{keyword.rankingPosition || 'NR'}
                                        {keyword.trafficPercentage && (
                                          <span>
                                            {' • '}
                                            <DataCell value={keyword.trafficPercentage / 100} format="percentage" decimals={2} className="inline" suffix=" traffic" />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right ml-2">
                                      <div className="font-medium">
                                        <DataCell value={keyword.searchVolume} format="number" />
                                      </div>
                                      <div className="text-xs text-muted-foreground">volume</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
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
          Showing {table.getFilteredRowModel().rows.length} of {comparisonData.length} products
        </p>
        <p>
          Success rate: {Math.round((comparisonData.filter(item => item.status === 'success').length / comparisonData.length) * 100)}%
        </p>
      </div>
    </div>
  )
}