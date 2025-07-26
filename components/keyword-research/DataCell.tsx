'use client'

import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface DataCellProps {
  value: any
  format?: 'number' | 'currency' | 'percentage' | 'decimal'
  decimals?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function DataCell({ 
  value, 
  format = 'number', 
  decimals = 2, 
  className,
  prefix = '',
  suffix = ''
}: DataCellProps) {
  // Check if value is null, undefined, empty string, or zero for currency
  const isNoData = value === null || value === undefined || value === '' || 
    (format === 'currency' && value === 0)
  
  const formatValue = () => {
    if (isNoData) return 'N/A'
    
    switch (format) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(decimals)}` : value
      case 'percentage':
        return typeof value === 'number' ? `${(value * 100).toFixed(decimals)}%` : value
      case 'decimal':
        return typeof value === 'number' ? value.toFixed(decimals) : value
      default:
        return value
    }
  }
  
  const displayValue = `${prefix}${formatValue()}${suffix}`
  
  if (isNoData) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('text-muted-foreground cursor-help', className)}>
              {displayValue}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Not Enough Sales Data</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  return <span className={className}>{displayValue}</span>
} 