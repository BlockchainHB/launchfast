'use client'

import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface KeywordCellProps {
  keyword: string
  className?: string
  maxWidth?: string
}

export function KeywordCell({ keyword, className, maxWidth = 'max-w-[200px]' }: KeywordCellProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('font-medium text-left', maxWidth, className)}>
            <span className="block truncate">{keyword}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <p className="break-words">{keyword}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 