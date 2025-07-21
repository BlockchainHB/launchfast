"use client"

import { IconEdit } from "@tabler/icons-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface OverrideIndicatorProps {
  hasOverride: boolean
  originalValue?: any
  overrideReason?: string
  children: React.ReactNode
  field?: string
}

export function OverrideIndicator({ 
  hasOverride, 
  originalValue, 
  overrideReason, 
  children, 
  field 
}: OverrideIndicatorProps) {
  if (!hasOverride) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex items-center gap-1">
            {children}
            <IconEdit className="h-3 w-3 text-blue-500 flex-shrink-0" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-primary-foreground">Manual Override</div>
            {field && <div className="text-primary-foreground/80">Field: {field}</div>}
            {originalValue !== undefined && (
              <div className="text-primary-foreground/80">
                Original: {String(originalValue)}
              </div>
            )}
            {overrideReason && (
              <div className="text-primary-foreground/80">
                Reason: {overrideReason}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface OverrideRowIndicatorProps {
  hasOverrides: boolean
  overrideCount?: number
  overrideReason?: string
}

export function OverrideRowIndicator({ 
  hasOverrides, 
  overrideCount, 
  overrideReason 
}: OverrideRowIndicatorProps) {
  if (!hasOverrides) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="h-5 text-xs bg-blue-50 text-blue-700 border-blue-200">
            <IconEdit className="h-3 w-3 mr-1" />
            {overrideCount && overrideCount > 1 ? `${overrideCount} overrides` : 'Modified'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold text-primary-foreground">Manual Overrides Applied</div>
            {overrideReason && (
              <div className="text-primary-foreground/80 mt-1">
                Reason: {overrideReason}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}