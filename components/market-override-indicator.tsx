"use client"

import { IconEdit, IconCalculator } from "@tabler/icons-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface MarketOverrideIndicatorProps {
  hasOverrides: boolean
  keyword?: string
  overriddenProductCount?: number
  recalculationDate?: string
  overrideReason?: string
}

export function MarketOverrideIndicator({ 
  hasOverrides, 
  keyword,
  overriddenProductCount,
  recalculationDate,
  overrideReason
}: MarketOverrideIndicatorProps) {
  if (!hasOverrides) {
    return null
  }

  const formattedDate = recalculationDate 
    ? new Date(recalculationDate).toLocaleDateString()
    : 'Unknown'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className="h-5 text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
          >
            <IconCalculator className="h-3 w-3 mr-1" />
            Recalculated
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-orange-600">Market Recalculated</div>
            {keyword && <div className="text-muted-foreground">Market: {keyword}</div>}
            {overriddenProductCount && overriddenProductCount > 0 && (
              <div className="text-muted-foreground">
                Based on {overriddenProductCount} overridden product{overriddenProductCount > 1 ? 's' : ''}
              </div>
            )}
            <div className="text-muted-foreground">
              Recalculated: {formattedDate}
            </div>
            {overrideReason && (
              <div className="text-muted-foreground border-t pt-1 mt-1">
                Reason: {overrideReason}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface MarketFieldOverrideIndicatorProps {
  hasOverride: boolean
  originalValue?: any
  overrideReason?: string
  children: React.ReactNode
  field?: string
}

export function MarketFieldOverrideIndicator({ 
  hasOverride, 
  originalValue, 
  overrideReason, 
  children, 
  field 
}: MarketFieldOverrideIndicatorProps) {
  if (!hasOverride) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex items-center gap-1">
            {children}
            <IconCalculator className="h-3 w-3 text-orange-500 flex-shrink-0" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-orange-600">Recalculated Value</div>
            {field && <div className="text-muted-foreground">Field: {field}</div>}
            {originalValue !== undefined && (
              <div className="text-muted-foreground">
                Original: {String(originalValue)}
              </div>
            )}
            {overrideReason && (
              <div className="text-muted-foreground">
                Reason: {overrideReason}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}