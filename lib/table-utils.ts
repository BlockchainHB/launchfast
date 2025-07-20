import { ReactElement, ReactNode } from 'react'
import { ColumnDef } from '@tanstack/react-table'

/**
 * Extracts text content from React JSX elements recursively
 */
function extractTextFromJSX(element: ReactNode): string {
  if (typeof element === 'string') {
    return element
  }
  
  if (typeof element === 'number') {
    return element.toString()
  }
  
  if (!element) {
    return ''
  }
  
  // Handle React elements
  if (typeof element === 'object' && 'props' in element) {
    const reactElement = element as ReactElement
    
    // If it has children, recursively extract text from them
    if (reactElement.props?.children) {
      if (Array.isArray(reactElement.props.children)) {
        return reactElement.props.children
          .map(child => extractTextFromJSX(child))
          .join('')
          .trim()
      } else {
        return extractTextFromJSX(reactElement.props.children)
      }
    }
  }
  
  // Handle arrays of elements
  if (Array.isArray(element)) {
    return element
      .map(child => extractTextFromJSX(child))
      .join('')
      .trim()
  }
  
  return ''
}

/**
 * Extracts display text from table column header
 * Works with both string headers and function headers that return JSX
 */
export function extractColumnHeaderText<T>(column: any): string {
  try {
    const header = column.columnDef?.header
    
    // If header is already a string, return it
    if (typeof header === 'string') {
      return header
    }
    
    // If header is a function, execute it to get JSX and extract text
    if (typeof header === 'function') {
      try {
        // Create mock parameters for the header function
        const mockColumn = {
          ...column,
          getIsSorted: () => false,
          getNextSortingOrder: () => undefined,
          getCanSort: () => true,
          toggleSorting: () => {},
        }
        
        const mockTable = {
          getIsAllPageRowsSelected: () => false,
          getIsSomePageRowsSelected: () => false,
          toggleAllPageRowsSelected: () => {},
        }
        
        // Execute header function with mock parameters
        const headerResult = header({ column: mockColumn, table: mockTable })
        
        // Extract text from the JSX result
        const extractedText = extractTextFromJSX(headerResult)
        
        if (extractedText && extractedText.trim()) {
          return extractedText.trim()
        }
      } catch (error) {
        console.warn('Error extracting header text for column:', column.id, error)
      }
    }
    
    // Fallback: format column ID into readable text
    return formatColumnId(column.id)
  } catch (error) {
    console.warn('Error processing column header:', column.id, error)
    return formatColumnId(column.id)
  }
}

/**
 * Formats a column ID into a readable display name as fallback
 */
function formatColumnId(columnId: string): string {
  if (!columnId) return 'Unknown'
  
  return columnId
    // Handle camelCase and PascalCase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Handle snake_case
    .replace(/_/g, ' ')
    // Handle kebab-case
    .replace(/-/g, ' ')
    // Handle dot notation
    .replace(/\./g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim()
}

/**
 * Cache for header text extraction to improve performance
 */
const headerTextCache = new Map<string, string>()

/**
 * Cached version of header text extraction
 */
export function getCachedColumnHeaderText<T>(column: any): string {
  const cacheKey = `${column.id}_${typeof column.columnDef?.header}`
  
  if (headerTextCache.has(cacheKey)) {
    return headerTextCache.get(cacheKey)!
  }
  
  const headerText = extractColumnHeaderText(column)
  headerTextCache.set(cacheKey, headerText)
  
  return headerText
}

/**
 * Clear the header text cache (useful for development)
 */
export function clearHeaderTextCache() {
  headerTextCache.clear()
}