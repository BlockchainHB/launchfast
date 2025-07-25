import { Logger } from './logger'

// Custom error types for keyword research
export class KeywordResearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: any
  ) {
    super(message)
    this.name = 'KeywordResearchError'
  }
}

export class ValidationError extends KeywordResearchError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', 400, context)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends KeywordResearchError {
  constructor(message: string, originalError?: any, context?: any) {
    super(message, 'DATABASE_ERROR', 500, context)
    this.name = 'DatabaseError' 
    if (originalError) {
      this.cause = originalError
    }
  }
}

export class CacheError extends KeywordResearchError {
  constructor(message: string, originalError?: any, context?: any) {
    super(message, 'CACHE_ERROR', 500, context)
    this.name = 'CacheError'
    if (originalError) {
      this.cause = originalError
    }
  }
}

export class SessionNotFoundError extends KeywordResearchError {
  constructor(sessionId: string, userId?: string) {
    super(`Session ${sessionId} not found or access denied`, 'SESSION_NOT_FOUND', 404, {
      sessionId,
      userId
    })
    this.name = 'SessionNotFoundError'
  }
}

export class RateLimitError extends KeywordResearchError {
  constructor(service: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${service}`, 'RATE_LIMIT_EXCEEDED', 429, {
      service,
      retryAfter
    })
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends KeywordResearchError {
  constructor(service: string, originalError?: any) {
    super(`External service error: ${service}`, 'EXTERNAL_SERVICE_ERROR', 502, {
      service,
      originalError: originalError?.message
    })
    this.name = 'ExternalServiceError'
    if (originalError) {
      this.cause = originalError
    }
  }
}

// Error handler utility
export class ErrorHandler {
  
  /**
   * Handle and format errors for API responses
   */
  static handleError(error: any, context: string): {
    message: string
    statusCode: number
    code: string
    shouldLog: boolean
  } {
    
    // Log error with context
    Logger.error(context, error)
    
    // Handle known error types
    if (error instanceof KeywordResearchError) {
      return {
        message: error.message,
        statusCode: error.statusCode,
        code: error.code,
        shouldLog: false // Already logged above
      }
    }
    
    // Handle validation errors (from service layer)
    if (error.message?.includes('ASINs array is required') ||
        error.message?.includes('Maximum 10 ASINs') ||
        error.message?.includes('Invalid ASIN format')) {
      return {
        message: error.message,
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        shouldLog: false
      }
    }
    
    // Handle Supabase/database errors
    if (error.code?.startsWith('PGRST') || error.message?.includes('database')) {
      return {
        message: 'Database operation failed. Please try again.',
        statusCode: 500,
        code: 'DATABASE_ERROR',
        shouldLog: true
      }
    }
    
    // Handle rate limiting from external services
    if (error.message?.includes('rate limit') || error.status === 429) {
      return {
        message: 'Service temporarily unavailable due to rate limits. Please try again later.',
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        shouldLog: true
      }
    }
    
    // Handle network/connection errors
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' || 
        error.message?.includes('network') ||
        error.message?.includes('connection')) {
      return {
        message: 'Service temporarily unavailable. Please try again.',
        statusCode: 502,
        code: 'NETWORK_ERROR',
        shouldLog: true
      }
    }
    
    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        message: 'Request timed out. Please try again.',
        statusCode: 504,
        code: 'TIMEOUT_ERROR',
        shouldLog: true
      }
    }
    
    // Default: Internal server error
    return {
      message: 'An unexpected error occurred. Please try again.',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      shouldLog: true
    }
  }
  
  /**
   * Validate ASIN input and throw appropriate errors
   */
  static validateAsins(asins: any): string[] {
    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      throw new ValidationError('ASINs array is required and must not be empty')
    }

    if (asins.length > 10) {
      throw new ValidationError('Maximum 10 ASINs allowed per request')
    }

    // Validate ASIN format (Amazon ASINs are 10 characters, alphanumeric)
    const invalidAsins = asins.filter(asin => 
      typeof asin !== 'string' || !/^[A-Z0-9]{10}$/i.test(asin)
    )
    
    if (invalidAsins.length > 0) {
      throw new ValidationError(`Invalid ASIN format: ${invalidAsins.join(', ')}`)
    }
    
    return asins.map(asin => asin.toUpperCase())
  }
  
  /**
   * Validate user ID
   */
  static validateUserId(userId: any): string {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new ValidationError('Valid user ID is required')
    }
    
    // Basic UUID validation
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      throw new ValidationError('Invalid user ID format')
    }
    
    return userId.trim()
  }
  
  /**
   * Validate session name
   */
  static validateSessionName(name: any): string | undefined {
    if (!name) return undefined
    
    if (typeof name !== 'string') {
      throw new ValidationError('Session name must be a string')
    }
    
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      return undefined
    }
    
    if (trimmed.length > 100) {
      throw new ValidationError('Session name must be 100 characters or less')
    }
    
    // Check for potentially problematic characters
    if (!/^[a-zA-Z0-9\s\-_.,()]+$/.test(trimmed)) {
      throw new ValidationError('Session name contains invalid characters')
    }
    
    return trimmed
  }
  
  /**
   * Validate research options
   */
  static validateResearchOptions(options: any): any {
    if (!options || typeof options !== 'object') {
      return {}
    }
    
    const validated: any = {}
    
    // Validate maxKeywordsPerAsin
    if (options.maxKeywordsPerAsin !== undefined) {
      const max = parseInt(options.maxKeywordsPerAsin)
      if (isNaN(max) || max < 1 || max > 200) {
        throw new ValidationError('maxKeywordsPerAsin must be between 1 and 200')
      }
      validated.maxKeywordsPerAsin = max
    }
    
    // Validate minSearchVolume
    if (options.minSearchVolume !== undefined) {
      const min = parseInt(options.minSearchVolume)
      if (isNaN(min) || min < 0 || min > 50000) {
        throw new ValidationError('minSearchVolume must be between 0 and 50,000')
      }
      validated.minSearchVolume = min
    }
    
    // Validate boolean options
    if (options.includeOpportunities !== undefined) {
      validated.includeOpportunities = Boolean(options.includeOpportunities)
    }
    
    if (options.includeGapAnalysis !== undefined) {
      validated.includeGapAnalysis = Boolean(options.includeGapAnalysis)
    }
    
    // Validate opportunity filters
    if (options.opportunityFilters && typeof options.opportunityFilters === 'object') {
      const filters: any = {}
      
      if (options.opportunityFilters.minSearchVolume !== undefined) {
        const min = parseInt(options.opportunityFilters.minSearchVolume)
        if (isNaN(min) || min < 0 || min > 50000) {
          throw new ValidationError('opportunityFilters.minSearchVolume must be between 0 and 50,000')
        }
        filters.minSearchVolume = min
      }
      
      if (options.opportunityFilters.maxCompetitorsInTop15 !== undefined) {
        const max = parseInt(options.opportunityFilters.maxCompetitorsInTop15)
        if (isNaN(max) || max < 0 || max > 15) {
          throw new ValidationError('opportunityFilters.maxCompetitorsInTop15 must be between 0 and 15')
        }
        filters.maxCompetitorsInTop15 = max
      }
      
      if (options.opportunityFilters.maxCompetitorStrength !== undefined) {
        const max = parseFloat(options.opportunityFilters.maxCompetitorStrength)
        if (isNaN(max) || max < 1 || max > 10) {
          throw new ValidationError('opportunityFilters.maxCompetitorStrength must be between 1 and 10')
        }
        filters.maxCompetitorStrength = max
      }
      
      if (Object.keys(filters).length > 0) {
        validated.opportunityFilters = filters
      }
    }
    
    return validated
  }
  
  /**
   * Wrap async functions with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const handled = this.handleError(error, context)
      
      if (fallback !== undefined && handled.statusCode >= 500) {
        Logger.warn(`Using fallback for ${context}: ${handled.message}`)
        return fallback
      }
      
      throw error
    }
  }
  
  /**
   * Create retry wrapper with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Don't retry client errors (4xx) or specific errors
        if (error instanceof ValidationError ||
            error instanceof SessionNotFoundError ||
            (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)) {
          throw error
        }
        
        if (attempt === maxRetries) {
          Logger.error(`${context} failed after ${maxRetries} attempts`, error)
          throw error
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1)
        Logger.warn(`${context} attempt ${attempt} failed, retrying in ${delay}ms`, error)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
}

// Export utilities for easy access
export const validateAsins = ErrorHandler.validateAsins
export const validateUserId = ErrorHandler.validateUserId
export const validateSessionName = ErrorHandler.validateSessionName
export const validateResearchOptions = ErrorHandler.validateResearchOptions
export const handleError = ErrorHandler.handleError
export const withErrorHandling = ErrorHandler.withErrorHandling
export const withRetry = ErrorHandler.withRetry