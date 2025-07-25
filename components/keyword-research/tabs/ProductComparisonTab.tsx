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
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AsinKeywordResult } from '@/lib/keyword-research'

interface ProductComparisonTabProps {
  data: AsinKeywordResult[]
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
  showFilters = false, 
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
        ) : null
      },
      size: 40,
    },
    {
      accessorKey: 'asin',
      header: 'ASIN',
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <div className="flex items-center space-x-2">
            <div className="font-mono font-medium">
              {row.getValue('asin')}
            </div>
            {status === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : status === 'failed' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
          </div>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'productTitle',
      header: 'Product Title',
      cell: ({ row }) => (
        <div className="max-w-64">
          <div className="truncate text-sm">
            {row.getValue('productTitle') || 'No title available'}
          </div>
        </div>
      ),
      size: 250,
    },
    {
      accessorKey: 'totalKeywords',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
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
        <div className="font-medium">
          {row.getValue<number>('totalKeywords').toLocaleString()}
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
          className="hover:bg-transparent p-0 h-auto font-semibold"
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
        <Badge variant="default" className="bg-green-100 text-green-800">
          {row.getValue<number>('strongKeywords')} (Top 15)
        </Badge>
      ),
      size: 130,
    },
    {
      accessorKey: 'weakKeywords',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
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
        <Badge variant="outline" className="bg-orange-100 text-orange-800">
          {row.getValue<number>('weakKeywords')} (16+)
        </Badge>
      ),
      size: 130,
    },
    {
      accessorKey: 'avgSearchVolume',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0 h-auto font-semibold"
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
        <div className="font-medium">
          {row.getValue<number>('avgSearchVolume').toLocaleString()}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue<string>('status')
        const error = row.original.error
        
        return (
          <div>
            <Badge 
              variant={status === 'success' ? 'default' : 'destructive'}
              className={cn(
                status === 'success' && 'bg-green-100 text-green-800',
                status === 'failed' && 'bg-red-100 text-red-800'
              )}
            >
              {status}
            </Badge>
            {error && (
              <div className="text-xs text-muted-foreground mt-1 max-w-32 truncate">
                {error}
              </div>
            )}
          </div>
        )
      },
      size: 100,
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
          
          {showFilters && (
            <div className="flex items-center space-x-2">
              <Select
                value={
                  (table.getColumn('status')?.getFilterValue() as string) ?? ''
                }
                onValueChange={(value) =>
                  table.getColumn('status')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
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
                            <h4 className="font-semibold mb-3">Top Keywords for {row.original.asin}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {row.original.topKeywords.map((keyword, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded">
                                  <div>
                                    <div className="font-medium text-sm">{keyword.keyword}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {keyword.rankingPosition ? `Rank #${keyword.rankingPosition}` : 'Not Ranked'}
                                      {keyword.trafficPercentage && ` • ${keyword.trafficPercentage}% traffic`}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-sm">
                                      {keyword.searchVolume.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">volume</div>
                                  </div>
                                </div>
                              ))}
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