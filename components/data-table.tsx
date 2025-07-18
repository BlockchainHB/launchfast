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
import { formatDimensions, getRiskColor, getConsistencyColor } from "@/lib/calculations"

const columns: ColumnDef<EnhancedProduct>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "title",
    header: "Product",
    cell: ({ row }) => {
      const product = row.original
      return (
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
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: "grade",
    header: "Grade",
    cell: ({ row }) => (
      <Badge className={`grade-badge grade-${row.original.grade.toLowerCase()}`}>
        {row.original.grade}
      </Badge>
    ),
    size: 80,
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <span className="metric-currency">
        ${row.original.price.toFixed(2)}
      </span>
    ),
    size: 80,
  },
  {
    accessorKey: "salesData.monthlyRevenue",
    header: "Monthly Revenue",
    cell: ({ row }) => (
      <span className="metric-currency font-semibold">
        ${row.original.salesData?.monthlyRevenue?.toLocaleString() || '0'}
      </span>
    ),
    size: 120,
  },
  {
    accessorKey: "calculatedMetrics.dailyRevenue",
    header: "Daily Revenue",
    cell: ({ row }) => (
      <span className="metric-currency">
        ${row.original.calculatedMetrics?.dailyRevenue?.toFixed(2) || '0.00'}
      </span>
    ),
    size: 100,
  },
  {
    accessorKey: "aiAnalysis.consistencyRating",
    header: "Consistency",
    cell: ({ row }) => (
      <Badge 
        variant="outline" 
        className={`text-xs ${getConsistencyColor(row.original.aiAnalysis?.consistencyRating || 'Unknown')}`}
      >
        {row.original.aiAnalysis?.consistencyRating || 'Unknown'}
      </Badge>
    ),
    size: 100,
  },
  {
    accessorKey: "aiAnalysis.riskClassification",
    header: "Risk Type",
    cell: ({ row }) => (
      <Badge 
        variant="outline" 
        className={`text-xs ${getRiskColor(row.original.aiAnalysis?.riskClassification || 'Unknown')}`}
      >
        {row.original.aiAnalysis?.riskClassification || 'Unknown'}
      </Badge>
    ),
    size: 100,
  },
  {
    accessorKey: "salesData.monthlySales",
    header: "Sales Volume",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.salesData?.monthlySales?.toLocaleString() || '0'}/mo
      </span>
    ),
    size: 100,
  },
  {
    accessorKey: "keywords",
    header: "CPC",
    cell: ({ row }) => {
      const keywords = row.original.keywords || []
      const avgCpc = keywords.length > 0
        ? keywords.reduce((sum, kw) => sum + (kw?.cpc || 0), 0) / keywords.length
        : 0
      return (
        <span className="text-sm">
          ${avgCpc.toFixed(2)}
        </span>
      )
    },
    size: 80,
  },
  {
    accessorKey: "calculatedMetrics.reviewCategory",
    header: "Review Count",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {row.original.reviews?.toLocaleString() || '0'}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.original.calculatedMetrics?.reviewCategory || 'N/A'}
        </span>
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <div className="flex items-center space-x-1">
        <span className="text-sm">{row.original.rating?.toFixed(1) || '0.0'}</span>
        <span className="text-xs text-yellow-500">⭐</span>
      </div>
    ),
    size: 80,
  },
  {
    accessorKey: "calculatedMetrics.variations",
    header: "Variations",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.calculatedMetrics?.variations || 1}
      </span>
    ),
    size: 80,
  },
  {
    accessorKey: "dimensions",
    header: "Dimensions",
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground cursor-help">
              {formatDimensions(row.original.dimensions)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{formatDimensions(row.original.dimensions)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    size: 120,
  },
  {
    accessorKey: "dimensions.weight",
    header: "Weight",
    cell: ({ row }) => {
      const weight = row.original.dimensions?.weight
      const unit = row.original.dimensions?.weightUnit || 'lbs'
      return (
        <span className="text-sm">
          {weight ? `${weight}${unit}` : 'Unknown'}
        </span>
      )
    },
    size: 80,
  },
  {
    accessorKey: "calculatedMetrics.fulfillmentFees",
    header: "Fulfillment Fees",
    cell: ({ row }) => (
      <span className="metric-currency">
        ${row.original.calculatedMetrics?.fulfillmentFees?.toFixed(2) || '0.00'}
      </span>
    ),
    size: 120,
  },
  {
    accessorKey: "salesData.cogs",
    header: "COG",
    cell: ({ row }) => (
      <span className="metric-currency">
        ${row.original.salesData?.cogs?.toFixed(2) || ((row.original.price || 0) * 0.3).toFixed(2)}
      </span>
    ),
    size: 80,
  },
  {
    accessorKey: "salesData.margin",
    header: "Profit Margin",
    cell: ({ row }) => (
      <span className="metric-percentage">
        {((row.original.salesData?.margin || 0) * 100).toFixed(1)}%
      </span>
    ),
    size: 100,
  },
  {
    accessorKey: "calculatedMetrics.launchBudget",
    header: "20 Click Launch Budget",
    cell: ({ row }) => (
      <span className="metric-currency">
        ${row.original.calculatedMetrics?.launchBudget?.toFixed(2) || '0.00'}
      </span>
    ),
    size: 140,
  },
  {
    accessorKey: "calculatedMetrics.profitPerUnitAfterLaunch",
    header: "Profit/Unit After Launch",
    cell: ({ row }) => (
      <span className="metric-currency">
        ${row.original.calculatedMetrics?.profitPerUnitAfterLaunch?.toFixed(2) || '0.00'}
      </span>
    ),
    size: 150,
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : 'N/A'}
      </span>
    ),
    size: 80,
  },
  {
    accessorKey: "competitiveIntelligence",
    header: "AI Analysis",
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
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter products..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
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
            <DropdownMenuContent align="end" className="w-[200px]">
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
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.columnDef.header as string}
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
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      className="font-medium text-left px-4 py-3 text-sm border-b whitespace-nowrap"
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
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="px-4 py-3 text-sm border-b whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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

