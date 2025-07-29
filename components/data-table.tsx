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
  IconEye,
  IconExternalLink,
  IconEdit,
  IconTrash,
  IconDots,
  IconBrain,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { GradeBadge } from "@/components/ui/grade-badge"
import { getCachedColumnHeaderText } from "@/lib/table-utils"
import { formatAbbreviatedCurrency } from "@/lib/number-formatting"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { TableFilters } from "@/components/ui/table-filters"
import { toast } from "sonner"
import type { EnhancedProduct } from "@/types"
import { formatDimensions, formatWeight, getRiskColor, getConsistencyColor } from "@/lib/calculations"
import { BatchEditModal } from "@/components/batch-edit-modal"
import { OverrideIndicator, OverrideRowIndicator } from "@/components/override-indicator"
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
import { assessProductRisk, getRiskTooltip } from "@/lib/risk-assessment"
import { getGradeFilterOptions, minGradeFilter } from "@/lib/scoring"

const columns: ColumnDef<EnhancedProduct>[] = [
  // 1. Select + Product (Combined)
  {
    id: "select-product",
    accessorFn: (row) => row.title,
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
        <div className="text-xs font-medium">Product</div>
      </div>
    ),
    cell: ({ row }) => {
      const product = row.original
      return (
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
          <div className="flex items-center space-x-3 min-w-[300px]">
            {product.images && product.images[0] && (
              <img 
                src={product.images[0]} 
                alt={product.title}
                className="w-12 h-12 object-cover rounded-md border"
              />
            )}
            <div className="flex flex-col space-y-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-medium text-sm text-foreground truncate max-w-[200px]">
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
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">${product.price}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 p-0 text-muted-foreground hover:text-primary"
                  onClick={() => window.open(`https://amazon.com/dp/${product.asin}`, '_blank')}
                >
                  <IconExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                {product.brand && (
                  <span className="text-xs text-muted-foreground">{product.brand}</span>
                )}
                <OverrideRowIndicator 
                  hasOverrides={!!product.hasOverrides}
                  overrideReason={product.overrideInfo?.override_reason}
                />
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
    accessorKey: "grade",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Grade</div>
    ),
    cell: ({ row }) => {
      const riskAssessment = assessProductRisk(row.original)
      
      return (
        <div className="flex justify-center">
          <GradeBadge 
            grade={row.original.grade}
            isRisky={riskAssessment.isRisky}
            hasWarnings={riskAssessment.hasWarnings}
          />
        </div>
      )
    },
    size: 80,
    filterFn: 'minGrade',
  },
  // AI analysis columns removed to reduce costs
  // 6. Daily Revenue
  {
    accessorKey: "calculatedMetrics.dailyRevenue",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Daily Rev</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getDailyRevenueColor(row.original.calculatedMetrics?.dailyRevenue || 0)}>
          ${row.original.calculatedMetrics?.dailyRevenue?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
        </span>
      </div>
    ),
    size: 100,
    filterFn: 'range',
  },
  // 7. Monthly Revenue
  {
    accessorKey: "salesData.monthlyRevenue",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Monthly Rev</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getMonthlyRevenueColor(row.original.salesData?.monthlyRevenue || 0)}>
          {formatAbbreviatedCurrency(row.original.salesData?.monthlyRevenue)}
        </span>
      </div>
    ),
    size: 120,
    filterFn: 'range',
  },
  // 8. Sales Volume
  {
    accessorKey: "salesData.monthlySales",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Sales Vol</div>
    ),
    cell: ({ row }) => {
      const value = row.original.salesData?.monthlySales || 0
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
    size: 100,
  },
  // 9. CPC
  {
    accessorKey: "keywords",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">CPC</div>
    ),
    cell: ({ row }) => {
      const product = row.original
      
      // Check for CPC override first
      let avgCpc = 0
      if (product.hasOverrides && product.overrideInfo?.avg_cpc) {
        avgCpc = product.overrideInfo.avg_cpc
      } else {
        // Fall back to keyword average
        const keywords = product.keywords || []
        avgCpc = keywords.length > 0
          ? keywords.reduce((sum, kw) => sum + (kw?.cpc || 0), 0) / keywords.length
          : 0
      }
      
      return (
        <div className="text-center">
          <span className={getCPCColor(avgCpc)}>
            ${Number(avgCpc).toFixed(2)}
          </span>
        </div>
      )
    },
    size: 80,
  },
  // 10. COG
  {
    accessorKey: "salesData.cogs",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">COG</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="metric-currency">
          ${row.original.salesData?.cogs?.toFixed(2) || ((row.original.price || 0) * 0.3).toFixed(2)}
        </span>
      </div>
    ),
    size: 80,
  },
  // 11. Fulfillment Fees
  {
    accessorKey: "calculatedMetrics.fulfillmentFees",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">FBA Fees</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getFulfillmentFeesColor(row.original.calculatedMetrics?.fulfillmentFees || 0)}>
          ${row.original.calculatedMetrics?.fulfillmentFees?.toFixed(2) || '0.00'}
        </span>
      </div>
    ),
    size: 120,
  },
  // 12. Profit Margin
  {
    accessorKey: "salesData.margin",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Margin</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getProfitMarginColor((row.original.salesData?.margin || 0) * 100)}>
          {((row.original.salesData?.margin || 0) * 100).toFixed(1)}%
        </span>
      </div>
    ),
    size: 100,
    filterFn: 'range',
  },
  // 13. 20 Click Launch Budget
  {
    accessorKey: "calculatedMetrics.launchBudget",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Launch Budget</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="metric-currency">
          ${row.original.calculatedMetrics?.launchBudget?.toFixed(2) || '0.00'}
        </span>
      </div>
    ),
    size: 140,
  },
  // 14. Profit/Unit After Launch
  {
    accessorKey: "calculatedMetrics.profitPerUnitAfterLaunch",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Profit/Unit</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="metric-currency">
          ${row.original.calculatedMetrics?.profitPerUnitAfterLaunch?.toFixed(2) || '0.00'}
        </span>
      </div>
    ),
    size: 150,
  },
  // 15. Review Count
  {
    accessorKey: "reviews",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Reviews</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={`text-sm font-medium ${getReviewCountColor(row.original.reviews || 0)}`}>
          {row.original.reviews?.toLocaleString() || '0'}
        </span>
      </div>
    ),
    size: 100,
    filterFn: 'range',
  },
  // 16. Rating
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Rating</div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center space-x-1">
        <span className={`text-sm ${getRatingColor(row.original.rating || 0)}`}>
          {row.original.rating?.toFixed(1) || '0.0'}
        </span>
        <span className="text-xs text-yellow-500">⭐</span>
      </div>
    ),
    size: 80,
    filterFn: 'range',
  },
  // 17. Variations
  {
    accessorKey: "calculatedMetrics.variations",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Variations</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="text-sm">
          {row.original.calculatedMetrics?.variations || 1}
        </span>
      </div>
    ),
    size: 80,
  },
  // 18. Weight
  {
    accessorKey: "dimensions",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Weight</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help">
                {formatWeight(row.original.dimensions)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Product Weight: {formatWeight(row.original.dimensions)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    ),
    size: 100,
  },
  // AI Analysis column removed to reduce costs
  // 20. Date
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Date</div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="text-xs text-muted-foreground">
          {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      </div>
    ),
    size: 80,
  },
]


export function DataTable({
  data: initialData,
  onDashboardRefresh,
}: {
  data: EnhancedProduct[]
  onDashboardRefresh?: () => void
}) {
  const [data, setData] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [batchEditOpen, setBatchEditOpen] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExportCSV = async () => {
    let loadingToastId: string | number | undefined
    try {
      setIsExporting(true)
      loadingToastId = toast.loading('Exporting products to CSV...')
      
      const response = await fetch('/api/export/csv?type=products&includeOverrides=true')
      
      if (!response.ok) {
        throw new Error('Failed to export CSV')
      }
      
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `launchfast-products-${new Date().toISOString().split('T')[0]}.csv`
      
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
      
      toast.success('Products exported successfully!', {
        id: loadingToastId
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
    filterFns: {
      // Custom filter for nested properties
      nestedProperty: (row, columnId, filterValue) => {
        if (!filterValue) return true
        const keys = columnId.split('.')
        let value = row.original as any
        for (const key of keys) {
          value = value?.[key]
          if (value === undefined || value === null) return false
        }
        return String(value) === String(filterValue)
      },
      // Custom filter for range values
      range: (row, columnId, filterValue) => {
        if (!filterValue || (!filterValue[0] && !filterValue[1])) return true
        const keys = columnId.split('.')
        let value = row.original as any
        for (const key of keys) {
          value = value?.[key]
          if (value === undefined || value === null) return false
        }
        let numValue = Number(value)
        if (isNaN(numValue)) return false
        
        // Handle margin percentage conversion
        if (columnId === 'salesData.margin') {
          numValue = numValue * 100
        }
        
        const [min, max] = filterValue
        if (min !== undefined && numValue < min) return false
        if (max !== undefined && numValue > max) return false
        return true
      },
      // Custom filter for minimum grade filtering
      minGrade: minGradeFilter
    }
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedProducts = selectedRows.map(row => row.original)
  const hasSelection = selectedRows.length > 0

  const handleBatchEdit = () => {
    if (hasSelection) {
      setBatchEditOpen(true)
    }
  }


  const handleBatchDelete = async () => {
    if (!hasSelection) return

    try {
      const asins = selectedProducts.map(p => p.asin)
      
      // Show loading toast
      const loadingToast = toast.loading(`Deleting ${selectedProducts.length} selected products...`)
      
      // Call batch delete API
      const response = await fetch('/api/products/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asins }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Successfully deleted ${result.data.statistics.deleted} products`, {
          id: loadingToast,
          description: `${result.data.statistics.marketsAffected} markets affected`
        })
        // Refresh the page to update the data
        window.location.reload()
      } else {
        toast.error('Failed to delete products', {
          id: loadingToast,
          description: result.error || 'Please try again'
        })
      }
    } catch (error) {
      console.error('Error deleting products:', error)
      toast.error('Failed to delete products', {
        description: 'Network error occurred'
      })
    }
  }

  const handleGenerateAnalysis = async () => {
    if (selectedRows.length !== 1) {
      toast.error('Please select exactly one product for analysis')
      return
    }

    const product = selectedProducts[0]
    
    try {
      const loadingToast = toast.loading('Generating AI analysis document...')
      
      const response = await fetch('/api/analysis-documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('AI analysis document generated successfully!', {
          id: loadingToast,
          description: 'View it in the Product Analysis page'
        })
        // Optionally redirect to analysis page
        // window.location.href = '/dashboard/product-analysis'
      } else {
        toast.error('Failed to generate analysis document', {
          id: loadingToast,
          description: result.error || 'Please try again'
        })
      }
    } catch (error) {
      console.error('Error generating analysis:', error)
      toast.error('Failed to generate analysis document', {
        description: 'Network error occurred'
      })
    }
  }

  const handleProductsUpdated = (updatedProducts: EnhancedProduct[]) => {
    console.log(`🔄 Updating ${updatedProducts.length} products in DataTable`)
    
    // Create a map of updated products by ID for quick lookup
    const updatedProductsMap = new Map(updatedProducts.map(p => [p.id, p]))
    
    // Update the data array by replacing matching products
    setData(prevData => 
      prevData.map(product => {
        const updatedProduct = updatedProductsMap.get(product.id)
        return updatedProduct || product
      })
    )
    
    // Clear row selection after update
    setRowSelection({})
    
    console.log(`✅ Updated DataTable with ${updatedProducts.length} modified products`)
  }

  // Filter configurations for products table
  const filterConfigs = [
    {
      column: 'grade',
      label: 'Minimum Grade',
      type: 'select' as const,
      options: getGradeFilterOptions()
    },
    // Risk level filter removed (AI analysis no longer used)
    {
      column: 'salesData.monthlyRevenue',
      label: 'Monthly Revenue',
      type: 'range' as const,
      min: 0,
      max: 1000000,
      step: 1000
    },
    {
      column: 'calculatedMetrics.dailyRevenue',
      label: 'Daily Revenue',
      type: 'range' as const,
      min: 0,
      max: 10000,
      step: 100
    },
    {
      column: 'salesData.margin',
      label: 'Profit Margin %',
      type: 'range' as const,
      min: 0,
      max: 100,
      step: 1
    },
    {
      column: 'reviews',
      label: 'Review Count',
      type: 'range' as const,
      min: 0,
      max: 50000,
      step: 100
    },
    {
      column: 'rating',
      label: 'Rating',
      type: 'range' as const,
      min: 1,
      max: 5,
      step: 0.1
    }
  ]

  return (
    <div className="w-full px-4 lg:px-6">
      <div className="flex items-center justify-between py-4">
        <div className="flex-1 max-w-lg">
          <TableFilters
            table={table}
            searchColumn="select-product"
            searchPlaceholder="Search products..."
            filters={filterConfigs}
          />
        </div>
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBatchEdit}
            disabled={!hasSelection}
            className={hasSelection ? "border-primary text-primary" : ""}
          >
            <IconEdit className="mr-2 h-4 w-4" />
            Edit Selected ({selectedRows.length})
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateAnalysis}
            disabled={selectedRows.length !== 1}
            className={selectedRows.length === 1 ? "border-blue-500 text-blue-500" : ""}
          >
            <IconBrain className="mr-2 h-4 w-4" />
            Generate AI Analysis
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={!hasSelection}
                className={hasSelection ? "border-destructive text-destructive hover:bg-destructive/10" : ""}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Delete Selected ({selectedRows.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Selected Products</AlertDialogTitle>
                <AlertDialogDescription>
                  <>
                    Are you sure you want to delete {selectedRows.length} selected product{selectedRows.length > 1 ? 's' : ''}?
                    <br /><br />
                    <strong>This will:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Permanently delete {selectedRows.length} product{selectedRows.length > 1 ? 's' : ''} from your research</li>
                      <li>Remove all product overrides and customizations</li>
                      <li>Recalculate affected market data</li>
                    </ul>
                    <br />
                    <span className="text-destructive font-medium">This action cannot be undone.</span>
                  </>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBatchDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete {selectedRows.length} Product{selectedRows.length > 1 ? 's' : ''}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table className="data-table">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header, index) => {
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell, index) => {
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
      </div>
      <div className="flex items-center justify-between pt-4">
        <div className="text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
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

      {/* Batch Edit Modal */}
      <BatchEditModal
        open={batchEditOpen}
        onClose={() => setBatchEditOpen(false)}
        selectedProducts={selectedProducts}
        onProductsUpdated={handleProductsUpdated}
        onDashboardRefresh={onDashboardRefresh}
      />
    </div>
  )
}

