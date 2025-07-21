import * as React from "react"
import { cn } from "@/lib/utils"

interface GradeBadgeProps extends React.ComponentProps<"span"> {
  grade: string
  children?: React.ReactNode
  isRisky?: boolean
  hasWarnings?: boolean
}

function getGradeIcon(grade: string) {
  const gradeUpper = grade.toUpperCase()
  
  if (gradeUpper === 'A10') {
    return '🏆' // Trophy for the best grade
  } else if (gradeUpper.startsWith('A')) {
    return '⭐' // Star for A grades
  } else if (gradeUpper.startsWith('B')) {
    return '✓' // Check mark for B grades
  } else if (gradeUpper.startsWith('C')) {
    return '○' // Circle for C grades
  } else if (gradeUpper.startsWith('D')) {
    return '△' // Triangle for D grades
  } else if (gradeUpper.startsWith('E')) {
    return '!!' // Warning for E grades
  } else if (gradeUpper === 'F1') {
    return '💀' // Skull for the worst grade
  } else if (gradeUpper.startsWith('F')) {
    return '✗' // X for F grades
  }
  return ''
}

function getGradePrefix(grade: string) {
  const gradeUpper = grade.toUpperCase()
  
  if (gradeUpper === 'A10') {
    return 'GOLDMINE'
  } else if (gradeUpper === 'F1') {
    return 'AVOID'
  }
  return gradeUpper
}

export function GradeBadge({ grade, children, className, isRisky = false, hasWarnings = false, ...props }: GradeBadgeProps) {
  // Base styles that match the existing Badge component aesthetic
  const baseStyles = "inline-flex items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-[color,box-shadow,border-color] overflow-hidden"
  
  // Generate grade class name
  const gradeClass = `grade-${(grade || 'F1').toLowerCase()}`
  
  // Risk-aware styling
  const riskStyles = isRisky ? "ring-2 ring-red-500 ring-opacity-50 animate-pulse" : ""
  const warningStyles = hasWarnings ? "ring-1 ring-amber-400 ring-opacity-70" : ""
  
  // Special treatments
  const isA10 = grade.toUpperCase() === 'A10'
  const isF1 = grade.toUpperCase() === 'F1'
  const specialStyles = isA10 ? "shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/30" : 
                      isF1 ? "shadow-lg shadow-red-500/25 ring-1 ring-red-400/30" : ""
  
  const icon = getGradeIcon(grade)
  const displayText = children || getGradePrefix(grade)
  
  return (
    <span
      className={cn(baseStyles, gradeClass, riskStyles, warningStyles, specialStyles, className)}
      {...props}
    >
      {icon && <span className="text-[10px] leading-none">{icon}</span>}
      <span className={isA10 || isF1 ? "font-bold tracking-wide" : ""}>{displayText}</span>
    </span>
  )
}