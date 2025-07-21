"use client"

import * as React from "react"
import { IconFilter, IconX, IconChevronDown } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type { Table } from "@tanstack/react-table"

interface TableFiltersProps<TData> {
  table: Table<TData>
  searchColumn?: string
  searchPlaceholder?: string
  filters?: FilterConfig[]
}

interface FilterConfig {
  column: string
  label: string
  type: 'select' | 'multiselect' | 'range' | 'text'
  options?: { label: string; value: string; color?: string }[]
  min?: number
  max?: number
  step?: number
}

export function TableFilters<TData>({
  table,
  searchColumn = "title",
  searchPlaceholder = "Search...",
  filters = []
}: TableFiltersProps<TData>) {
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false)
  
  // Get active filters count
  const activeFiltersCount = table.getState().columnFilters.length
  
  // Clear all filters
  const clearAllFilters = () => {
    table.resetColumnFilters()
  }

  return (
    <div className="flex items-center justify-between py-4">
      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(searchColumn)?.setFilterValue(event.target.value)
          }
          className="max-w-sm search-input"
        />
        
        {/* Advanced Filters */}
        {filters.length > 0 && (
          <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="relative"
              >
                <IconFilter className="mr-2 h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 px-1.5 py-0.5 text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filters</h4>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-8 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {filters.map((filter) => (
                    <FilterControl
                      key={filter.column}
                      table={table}
                      filter={filter}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        {/* Active filters display */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center space-x-2">
            {table.getState().columnFilters.map((filter) => {
              const column = table.getColumn(filter.id)
              const filterConfig = filters.find(f => f.column === filter.id)
              
              if (!column || !filterConfig) return null
              
              return (
                <Badge
                  key={filter.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <span className="text-xs">
                    {filterConfig.label}: {String(filter.value)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => column.setFilterValue(undefined)}
                  >
                    <IconX className="h-3 w-3" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterControl<TData>({
  table,
  filter
}: {
  table: Table<TData>
  filter: FilterConfig
}) {
  const column = table.getColumn(filter.column)
  
  if (!column) return null

  switch (filter.type) {
    case 'select':
    case 'multiselect':
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">{filter.label}</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs"
              >
                {column.getFilterValue() 
                  ? String(column.getFilterValue())
                  : `Select ${filter.label.toLowerCase()}`
                }
                <IconChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuLabel className="text-xs">
                {filter.label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filter.options?.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  className="text-xs"
                  checked={column.getFilterValue() === option.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      column.setFilterValue(option.value)
                    } else {
                      column.setFilterValue(undefined)
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    {option.color && (
                      <div 
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span>{option.label}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )

    case 'range':
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">{filter.label}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              min={filter.min}
              max={filter.max}
              step={filter.step}
              className="text-xs"
              onChange={(e) => {
                const value = e.target.value
                const currentFilter = column.getFilterValue() as [number?, number?] || [undefined, undefined]
                column.setFilterValue([value ? Number(value) : undefined, currentFilter[1]])
              }}
            />
            <Input
              type="number"
              placeholder="Max"
              min={filter.min}
              max={filter.max}
              step={filter.step}
              className="text-xs"
              onChange={(e) => {
                const value = e.target.value
                const currentFilter = column.getFilterValue() as [number?, number?] || [undefined, undefined]
                column.setFilterValue([currentFilter[0], value ? Number(value) : undefined])
              }}
            />
          </div>
        </div>
      )

    case 'text':
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">{filter.label}</Label>
          <Input
            placeholder={`Filter by ${filter.label.toLowerCase()}`}
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(event) => column.setFilterValue(event.target.value)}
            className="text-xs"
          />
        </div>
      )

    default:
      return null
  }
}