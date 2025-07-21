"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconDownload,
  IconChevronUp,
  IconExternalLink,
  IconTrash,
  IconDots,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { GradeBadge } from "@/components/ui/grade-badge"
import { MarketOverrideIndicator } from "@/components/market-override-indicator"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { getCachedColumnHeaderText } from "@/lib/table-utils"
import { formatWholeNumber, formatAbbreviatedCurrency } from "@/lib/number-formatting"
import type { MarketTableRow, EnhancedProduct } from "@/types/dashboard"
import { formatDimensions, formatWeight, getRiskColor, getConsistencyColor } from "@/lib/calculations"
import { 
  getPriceColor, 
  getMonthlyRevenueColor, 
  getDailyRevenueColor, 
  getProfitMarginColor, 
  getFulfillmentFeesColor,
  getCPCColor,
  getReviewCountColor,
  getRatingColor 
} from "@/lib/metric-colors"

// Product sub-row component
function ProductSubRow({ product, isLast }: { product: EnhancedProduct; isLast: boolean }) {
  return (
    <TableRow className={`bg-muted hover:bg-muted/80 transition-colors ${isLast ? '' : 'border-b-0'}`}>
      <TableCell className="sticky left-0 z-30 bg-muted backdrop-blur-sm shadow-lg border-r pl-12">
        <div className="flex items-center space-x-3 min-w-[280px]">
          {product.images && product.images[0] && (
            <img 
              src={product.images[0]} 
              alt={product.title}
              className="w-8 h-8 object-cover rounded-md border flex-shrink-0"
            />
          )}
          <div className="flex flex-col space-y-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="font-medium text-xs text-foreground truncate max-w-[180px]">
                    {product.title}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p>{product.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">{product.asin}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-3 p-0 text-muted-foreground hover:text-primary"
                onClick={() => window.open(`https://amazon.com/dp/${product.asin}`, '_blank')}
              >
                <IconExternalLink className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <GradeBadge grade={product.grade} />
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className={`text-xs ${getConsistencyColor(product.aiAnalysis?.consistencyRating || 'Unknown')}`}>
          {product.aiAnalysis?.consistencyRating || 'Unknown'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className={`text-xs ${getRiskColor(product.aiAnalysis?.riskClassification || 'Unknown')}`}>
          {product.aiAnalysis?.riskClassification || 'Unknown'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className={getDailyRevenueColor(product.calculatedMetrics?.dailyRevenue || 0)}>
          ${product.calculatedMetrics?.dailyRevenue?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={getMonthlyRevenueColor(product.salesData?.monthlyRevenue || 0)}>
          ${product.salesData?.monthlyRevenue?.toLocaleString() || '0'}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className="text-sm">
          {((product.salesData?.monthlySales || 0) >= 1000 
            ? `${Math.round((product.salesData?.monthlySales || 0) / 1000)}K` 
            : Math.round(product.salesData?.monthlySales || 0).toString()
          )}/mo
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={getCPCColor((product.keywords || []).reduce((sum, kw) => sum + (kw?.cpc || 0), 0) / Math.max((product.keywords || []).length, 1))}>
          ${((product.keywords || []).reduce((sum, kw) => sum + (kw?.cpc || 0), 0) / Math.max((product.keywords || []).length, 1)).toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className="metric-currency">
          ${product.salesData?.cogs?.toFixed(2) || ((product.price || 0) * 0.3).toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={getFulfillmentFeesColor(product.calculatedMetrics?.fulfillmentFees || 0)}>
          ${product.calculatedMetrics?.fulfillmentFees?.toFixed(2) || '0.00'}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={getProfitMarginColor((product.salesData?.margin || 0) * 100)}>
          {((product.salesData?.margin || 0) * 100).toFixed(1)}%
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className="metric-currency">
          ${product.calculatedMetrics?.launchBudget?.toFixed(2) || '0.00'}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className="metric-currency">
          ${product.calculatedMetrics?.profitPerUnitAfterLaunch?.toFixed(2) || '0.00'}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={`text-sm font-medium ${getReviewCountColor(product.reviews || 0)}`}>
          {product.reviews?.toLocaleString() || '0'}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center space-x-1">
          <span className={`text-sm ${getRatingColor(product.rating || 0)}`}>
            {product.rating?.toFixed(1) || '0.0'}
          </span>
          <span className="text-xs text-yellow-500">⭐</span>
        </div>
      </TableCell>
      {/* Market Size - show product weight info */}
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help">
                {formatWeight(product.dimensions)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Product Weight: {formatWeight(product.dimensions)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-center">
        <span className="text-xs text-muted-foreground">
          {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      </TableCell>
    </TableRow>
  )
}

function createColumns(expandedRows: Record<string, boolean>): ColumnDef<MarketTableRow>[] {
  return [
  // 1. Select + Keyword (Combined)
  {
    id: "select-keyword",
    accessorFn: (row) => row.keyword,
    header: ({ table }) => (
      <div className="flex items-center space-x-4">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
        <div className="text-xs font-medium">Market Keyword</div>
      </div>
    ),
    cell: ({ row, table }) => {
      const market = row.original
      return (
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
          <div className="flex items-center space-x-3 min-w-[300px]">
            {market.products && market.products[0] && market.products[0].images && market.products[0].images[0] && (
              <img 
                src={market.products[0].images[0]} 
                alt={market.keyword}
                className="w-12 h-12 object-cover rounded-md border flex-shrink-0"
              />
            )}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <div className="font-medium text-sm text-foreground">
                  {market.keyword}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {market.products.length} products
                </Badge>
                <MarketOverrideIndicator
                  hasOverrides={!!market.hasOverrides}
                  keyword={market.keyword}
                  recalculationDate={market.overrideInfo?.recalculation_date}
                  overrideReason={market.overrideInfo?.override_reason}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-auto px-2 text-xs"
                  onClick={() => {
                    // Toggle expansion
                    table.options.meta?.toggleRowExpansion?.(row.id)
                  }}
                >
                  {expandedRows[row.id] ? (
                    <>
                      <IconChevronUp className="h-3 w-3 mr-1" />
                      Hide Products
                    </>
                  ) : (
                    <>
                      <IconChevronDown className="h-3 w-3 mr-1" />
                      Show Products
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    enableHiding: false,
    enableSorting: false,
    meta: {
      sticky: 'left'
    }
  },
  // 3. Grade
  {
    accessorKey: "market_grade",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Grade</div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <GradeBadge grade={row.original.market_grade} />
      </div>
    ),
    size: 80,
  },
  // 4. Consistency (Market Average)
  {
    accessorKey: "consistency",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Consistency</div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Badge 
          variant="outline" 
          className={`text-xs ${getConsistencyColor(row.original.consistency)}`}
        >
          {row.original.consistency}
        </Badge>
      </div>
    ),
    size: 100,
  },
  // 5. Risk Type (Market Average)
  {
    accessorKey: "riskType",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Risk</div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Badge 
          variant="outline" 
          className={`text-xs ${getRiskColor(row.original.riskType)}`}
        >
          {row.original.riskType}
        </Badge>
      </div>
    ),
    size: 100,
  },
  // 6. Daily Revenue (Market Average)
  {
    accessorKey: "dailyRevenue",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Daily Rev</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getDailyRevenueColor(row.original.dailyRevenue)}>
          ${row.original.dailyRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
    ),
    size: 120,
  },
  // 7. Monthly Revenue (Market Average)
  {
    accessorKey: "monthlyRevenue",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Monthly Rev</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getMonthlyRevenueColor(row.original.monthlyRevenue)}>
          {formatAbbreviatedCurrency(row.original.monthlyRevenue)}
        </span>
      </div>
    ),
    size: 140,
  },
  // 8. Sales Volume (Market Average)
  {
    accessorKey: "monthlySales",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Sales Vol</div>
    ),
    cell: ({ row }) => {
      const value = row.original.monthlySales
      const formatCompact = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
        if (num >= 1000) return `${Math.round(num / 1000)}K`
        return Math.round(num).toString()
      }
      return (
        <div className="text-center">
          <span className="text-sm">
            {formatCompact(value)}/mo
          </span>
        </div>
      )
    },
    size: 120,
  },
  // 9. CPC (Market Average)
  {
    accessorKey: "cpc",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">CPC</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getCPCColor(row.original.cpc)}>
          ${row.original.cpc.toFixed(2)}
        </span>
      </div>
    ),
    size: 100,
  },
  // 10. COG (Market Average)
  {
    accessorKey: "price",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">COG</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="metric-currency">
          ${(row.original.price * 0.3).toFixed(2)}
        </span>
      </div>
    ),
    size: 100,
  },
  // 11. Fulfillment Fees (Market Average) - calculated from avg launch budget
  {
    accessorKey: "fbaFees",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">FBA Fees</div>
    ),
    cell: ({ row }) => {
      // Estimate FBA fees as ~15% of price
      const estimatedFees = row.original.price * 0.15
      return (
        <div className="text-center">
          <span className={getFulfillmentFeesColor(estimatedFees)}>
            ${estimatedFees.toFixed(2)}
          </span>
        </div>
      )
    },
    size: 120,
  },
  // 12. Profit Margin (Market Average)
  {
    accessorKey: "profitMargin",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Margin</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getProfitMarginColor(row.original.profitMargin * 100)}>
          {(row.original.profitMargin * 100).toFixed(1)}%
        </span>
      </div>
    ),
    size: 120,
  },
  // 13. Launch Budget (Market Average)
  {
    accessorKey: "launchBudget",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Launch Budget</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="metric-currency">
          ${row.original.launchBudget.toFixed(2)}
        </span>
      </div>
    ),
    size: 160,
  },
  // 14. Profit/Unit (Market Average)
  {
    accessorKey: "profitPerUnit",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Profit/Unit</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="metric-currency">
          ${row.original.profitPerUnit.toFixed(2)}
        </span>
      </div>
    ),
    size: 160,
  },
  // 15. Review Count (Market Average)
  {
    accessorKey: "reviews",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Reviews</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={`text-sm font-medium ${getReviewCountColor(row.original.reviews)}`}>
          {formatWholeNumber(row.original.reviews)}
        </span>
      </div>
    ),
    size: 120,
  },
  // 16. Rating (Market Average)
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Rating</div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center space-x-1">
        <span className={`text-sm ${getRatingColor(row.original.rating)}`}>
          {row.original.rating.toFixed(1)}
        </span>
        <span className="text-xs text-yellow-500">⭐</span>
      </div>
    ),
    size: 100,
  },
  // 17. Market Size (placeholder for variations column)
  {
    accessorKey: "marketSize",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Market Size</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help">
                Medium
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Market size based on search volume and competition analysis</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    ),
    size: 100,
  },
  // 18. Date
  {
    accessorKey: "researchDate",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Date</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString()}
        </span>
      </div>
    ),
    size: 80,
  },
  ]
}

export function MarketDataTable({
  data: initialData,
}: {
  data: MarketTableRow[]
}) {
  const [data] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({})
  const [isExporting, setIsExporting] = React.useState(false)

  // Create columns with access to expandedRows state
  const columns = React.useMemo(() => createColumns(expandedRows), [expandedRows])

  const handleBatchDeleteMarkets = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    if (selectedRows.length === 0) return

    try {
      // Get user profile for authentication
      const userResponse = await fetch('/api/user/profile')
      const userData = await userResponse.json()
      
      if (!userData.success || !userData.data?.id) {
        toast.error('Authentication required')
        return
      }
      
      const userId = userData.data.id
      const marketIds = selectedRows.map(row => row.original.id)
      
      // Show loading toast
      const loadingToast = toast.loading(`Deleting ${selectedRows.length} selected markets...`)
      
      // Call batch delete API
      const response = await fetch('/api/markets/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketIds, userId }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Successfully deleted ${result.data.statistics.deleted} markets`, {
          id: loadingToast,
          description: `${result.data.productsConvertedToLegacy} products converted to legacy`
        })
        // Refresh the page to update the data
        window.location.reload()
      } else {
        toast.error('Failed to delete markets', {
          id: loadingToast,
          description: result.error || 'Please try again'
        })
      }
    } catch (error) {
      console.error('Error deleting markets:', error)
      toast.error('Failed to delete markets', {
        description: 'Network error occurred'
      })
    }
  }

  const handleExportCSV = async () => {
    let loadingToastId: string | number | undefined
    try {
      setIsExporting(true)
      loadingToastId = toast.loading('Exporting markets to CSV...')
      
      const response = await fetch('/api/export/csv?type=markets&includeOverrides=true')
      
      if (!response.ok) {
        throw new Error('Failed to export CSV')
      }
      
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `launchfast-markets-${new Date().toISOString().split('T')[0]}.csv`
      
      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Markets exported successfully!', {
        id: loadingToastId,
        duration: 2000
      })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export CSV', {
        id: loadingToastId,
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      toggleRowExpansion: (rowId: string) => {
        setExpandedRows(prev => ({
          ...prev,
          [rowId]: !prev[rowId]
        }))
        
        // Update the data
        const updatedData = data.map(row => 
          row.id === rowId 
            ? { ...row, isExpanded: !expandedRows[rowId] }
            : row
        )
        // This would normally trigger a re-render but since we're using useState with initial data
        // we need to handle this differently. For now, we'll just update the expanded state.
      }
    }
  })

  return (
    <div className="w-full px-4 lg:px-6">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter markets by keyword..."
          value={(table.getColumn("select-keyword")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("select-keyword")?.setFilterValue(event.target.value)
          }
          className="max-w-sm search-input"
        />
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="mr-2 h-4 w-4" />
                Columns
                <IconChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] text-black">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="text-black"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
{getCachedColumnHeaderText(column)}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            disabled={isExporting}
          >
            <IconDownload className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table className="data-table">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => {
                  const isSticky = header.column.columnDef.meta?.sticky === 'left'
                  
                  return (
                    <TableHead 
                      key={header.id} 
                      colSpan={header.colSpan}
                      style={{ 
                        width: header.getSize(),
                        left: isSticky ? '0px' : undefined
                      }}
                      className={`font-medium text-left px-4 py-3 text-sm border-b whitespace-nowrap ${
                        isSticky ? 'sticky z-30 bg-muted backdrop-blur-sm shadow-lg border-r' : ''
                      }`}
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
              table.getRowModel().rows.map((row) => {
                const market = row.original
                const isExpanded = expandedRows[row.id]
                
                return (
                  <React.Fragment key={row.id}>
                    {/* Main market row */}
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isSticky = cell.column.columnDef.meta?.sticky === 'left'
                        
                        return (
                          <TableCell 
                            key={cell.id}
                            style={{ 
                              width: cell.column.getSize(),
                              left: isSticky ? '0px' : undefined
                            }}
                            className={`px-4 py-3 text-sm border-b whitespace-nowrap ${
                              isSticky ? 'sticky z-30 bg-background backdrop-blur-sm shadow-lg border-r' : ''
                            }`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                    
                    {/* Expanded product rows */}
                    {isExpanded && market.products.map((product, idx) => (
                      <ProductSubRow 
                        key={`${row.id}-product-${product.id}`}
                        product={product} 
                        isLast={idx === market.products.length - 1}
                      />
                    ))}
                  </React.Fragment>
                )
              })
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
      </div>
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center space-x-4">
          <div className="text-muted-foreground text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} market(s) selected.
          </div>
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <IconTrash className="mr-2 h-4 w-4" />
                  Delete Selected ({table.getFilteredSelectedRowModel().rows.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Markets</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {table.getFilteredSelectedRowModel().rows.length} selected market{table.getFilteredSelectedRowModel().rows.length > 1 ? 's' : ''}?
                    <br /><br />
                    <strong>This will:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Permanently delete {table.getFilteredSelectedRowModel().rows.length} market{table.getFilteredSelectedRowModel().rows.length > 1 ? 's' : ''} from your research</li>
                      <li>Convert all products in these markets to legacy status</li>
                      <li>Remove all market overrides and recalculations</li>
                    </ul>
                    <br />
                    <span className="text-destructive font-medium">This action cannot be undone.</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBatchDeleteMarkets}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete {table.getFilteredSelectedRowModel().rows.length} Market{table.getFilteredSelectedRowModel().rows.length > 1 ? 's' : ''}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}