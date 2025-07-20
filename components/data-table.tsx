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
import type { EnhancedProduct } from "@/types"
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
import { assessProductRisk, getRiskTooltip } from "@/lib/risk-assessment"

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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 p-0 text-muted-foreground hover:text-primary"
                  onClick={() => window.open(`https://amazon.com/dp/${product.asin}`, '_blank')}
                >
                  <IconExternalLink className="h-3 w-3" />
                </Button>
              </div>
              {product.brand && (
                <span className="text-xs text-muted-foreground">{product.brand}</span>
              )}
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
  },
  // 4. Consistency
  {
    accessorKey: "aiAnalysis.consistencyRating",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Consistency</div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Badge 
          variant="outline" 
          className={`text-xs ${getConsistencyColor(row.original.aiAnalysis?.consistencyRating || 'Unknown')}`}
        >
          {row.original.aiAnalysis?.consistencyRating || 'Unknown'}
        </Badge>
      </div>
    ),
    size: 100,
  },
  // 5. Risk Type
  {
    accessorKey: "aiAnalysis.riskClassification",
    header: ({ column }) => (
      <div className="text-center text-xs font-medium">Risk</div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Badge 
          variant="outline" 
          className={`text-xs ${getRiskColor(row.original.aiAnalysis?.riskClassification || 'Unknown')}`}
        >
          {row.original.aiAnalysis?.riskClassification || 'Unknown'}
        </Badge>
      </div>
    ),
    size: 100,
  },
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
      const keywords = row.original.keywords || []
      const avgCpc = keywords.length > 0
        ? keywords.reduce((sum, kw) => sum + (kw?.cpc || 0), 0) / keywords.length
        : 0
      return (
        <div className="text-center">
          <span className={getCPCColor(avgCpc)}>
            ${avgCpc.toFixed(2)}
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
    accessorKey: "calculatedMetrics.reviewCategory",
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
  // 19. AI Analysis
  {
    accessorKey: "competitiveIntelligence",
    header: ({ column }) => (
      <div className="text-xs font-medium">AI Analysis</div>
    ),
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-xs text-muted-foreground cursor-help max-w-[150px] truncate">
              {row.original.competitiveIntelligence || 'No analysis available'}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[300px]">
            <p>{row.original.competitiveIntelligence || 'No analysis available'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    size: 150,
  },
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
}: {
  data: EnhancedProduct[]
}) {
  const [data] = React.useState(() => initialData)
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
  })


  return (
    <div className="w-full px-4 lg:px-6">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter products..."
          value={(table.getColumn("select-product")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("select-product")?.setFilterValue(event.target.value)
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
          <Button variant="outline" size="sm">
            <IconDownload className="mr-2 h-4 w-4" />
            Export
          </Button>
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
    </div>
  )
}

