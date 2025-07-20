/**
 * Formats numbers to abbreviated form (e.g., 134623 -> 134K)
 */
export function formatAbbreviatedNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }

  const absNum = Math.abs(num)
  
  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  } else if (absNum >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  } else {
    return num.toFixed(0)
  }
}

/**
 * Formats numbers to whole numbers (no decimals)
 */
export function formatWholeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  
  return Math.round(num).toLocaleString()
}

/**
 * Formats currency values with abbreviated notation
 */
export function formatAbbreviatedCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '$0'
  }

  return '$' + formatAbbreviatedNumber(num)
}