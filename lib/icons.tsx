import React from 'react'
import {
  CheckmarkFilled,
  WarningFilled,
  ErrorFilled,
  Trophy,
  Star,
  CircleFilled,
  WarningAltFilled,
  Close,
  Analytics,
  ArrowUp,
  ArrowDown,
  Dashboard,
  Security,
  TaskComplete,
  InProgress,
  Restart
} from '@carbon/icons-react'

// Grade icon mapping - professional Carbon alternatives
export const getGradeIcon = (grade: string, size: number = 16) => {
  const gradeUpper = grade.toUpperCase()
  
  if (gradeUpper === 'A10') {
    return <Trophy size={size} className="text-yellow-600" />
  } else if (gradeUpper.startsWith('A')) {
    return <CheckmarkFilled size={size} className="text-green-600" />
  } else if (gradeUpper.startsWith('B')) {
    return <Star size={size} className="text-blue-600" />
  } else if (gradeUpper.startsWith('C')) {
    return <CircleFilled size={size} className="text-yellow-600" />
  } else if (gradeUpper.startsWith('D')) {
    return <WarningFilled size={size} className="text-orange-600" />
  } else if (gradeUpper.startsWith('E')) {
    return <WarningAltFilled size={size} className="text-red-600" />
  } else if (gradeUpper === 'F1') {
    return <ErrorFilled size={size} className="text-red-700" />
  } else if (gradeUpper.startsWith('F')) {
    return <Close size={size} className="text-red-600" />
  }
  return <CircleFilled size={size} className="text-gray-400" />
}

// Risk level icon mapping
export const getRiskIcon = (riskLevel: string, size: number = 16) => {
  const risk = riskLevel.toLowerCase()
  
  if (risk.includes('low')) {
    return <Security size={size} className="text-green-600" />
  } else if (risk.includes('medium')) {
    return <WarningFilled size={size} className="text-yellow-600" />
  } else if (risk.includes('high')) {
    return <ErrorFilled size={size} className="text-red-600" />
  }
  return <CircleFilled size={size} className="text-gray-400" />
}

// Research phase icon mapping
export const getResearchPhaseIcon = (phase: string, size: number = 16) => {
  switch (phase) {
    case 'marketplace_analysis':
      return <Analytics size={size} className="text-blue-600" />
    case 'validating_market':
      return <InProgress size={size} className="text-orange-600" />
    case 'applying_grading':
      return <TaskComplete size={size} className="text-green-600" />
    case 'complete':
      return <CheckmarkFilled size={size} className="text-green-600" />
    case 'error':
      return <ErrorFilled size={size} className="text-red-600" />
    default:
      return <Restart size={size} className="text-gray-400" />
  }
}

// Status icon mapping  
export const getStatusIcon = (status: string, size: number = 16) => {
  switch (status.toLowerCase()) {
    case 'excellent':
      return <Trophy size={size} className="text-yellow-600" />
    case 'good':
      return <ArrowUp size={size} className="text-green-600" />
    case 'average':
      return <Dashboard size={size} className="text-blue-600" />
    case 'poor':
      return <ArrowDown size={size} className="text-orange-600" />
    case 'failed':
      return <ErrorFilled size={size} className="text-red-600" />
    default:
      return <CircleFilled size={size} className="text-gray-400" />
  }
}

// Legacy emoji replacement mapping for database/API data
export const emojiToIcon = {
  '🏆': <Trophy size={16} className="text-yellow-600" />,
  '⭐': <Star size={16} className="text-yellow-500" />,
  '✓': <CheckmarkFilled size={16} className="text-green-600" />,
  '✅': <CheckmarkFilled size={16} className="text-green-600" />,
  '❌': <Close size={16} className="text-red-600" />,
  '✗': <Close size={16} className="text-red-600" />,
  '💀': <ErrorFilled size={16} className="text-red-700" />,
  '📈': <ArrowUp size={16} className="text-green-600" />,
  '📉': <ArrowDown size={16} className="text-red-600" />,
  '📊': <Dashboard size={16} className="text-blue-600" />,
  '⚠️': <WarningFilled size={16} className="text-yellow-600" />,
  '🟢': <CheckmarkFilled size={16} className="text-green-600" />,
  '🟡': <WarningFilled size={16} className="text-yellow-600" />,
  '🟠': <WarningAltFilled size={16} className="text-orange-600" />,
  '🔴': <ErrorFilled size={16} className="text-red-600" />
}

// Helper function to replace emoji in text with icons
export const replaceEmojiWithIcon = (text: string): React.ReactNode => {
  if (!text) return text
  
  // Find first emoji and replace with icon
  for (const [emoji, icon] of Object.entries(emojiToIcon)) {
    if (text.includes(emoji)) {
      const parts = text.split(emoji)
      return (
        <>
          {parts[0]}
          {icon}
          {parts.slice(1).join(emoji)}
        </>
      )
    }
  }
  
  return text
}