// Production-ready logging utility
export const Logger = {
  // Research flow logging
  research: {
    start: (keyword: string, filters?: any) => {
      console.log(`🔍 [RESEARCH] Starting research for: "${keyword}"${filters ? ` with filters` : ''}`)
    },
    apifyFound: (count: number) => {
      console.log(`📦 [APIFY] Found ${count} products`)
    },
    sellerSpriteVerifying: (asin: string, score: number) => {
      console.log(`🔍 [SELLERSPRITE] Verifying ${asin} (score: ${score})`)
    },
    sellerSpriteVerified: (asin: string) => {
      console.log(`✅ [SELLERSPRITE] Verified ${asin}`)
    },
    sellerSpriteFailed: (asin: string, reason: string) => {
      console.log(`❌ [SELLERSPRITE] Failed ${asin}: ${reason}`)
    },
    marketCalculated: (grade: string, products: number) => {
      console.log(`📊 [MARKET] Calculated grade ${grade} from ${products} products`)
    },
    completed: (productCount: number, time: number) => {
      console.log(`🎉 [RESEARCH] Completed: ${productCount} products in ${time}ms`)
    }
  },

  // Save flow logging
  save: {
    start: (productCount: number, hasMarket: boolean) => {
      console.log(`💾 [SAVE] Saving ${productCount} products${hasMarket ? ' + market analysis' : ''}`)
    },
    marketSaved: (marketId: string) => {
      console.log(`📊 [SAVE] Market saved: ${marketId}`)
    },
    productSaved: (asin: string) => {
      console.log(`📦 [SAVE] Product saved: ${asin}`)
    },
    completed: (productCount: number, marketId?: string) => {
      console.log(`✅ [SAVE] Saved ${productCount} products${marketId ? ` to market ${marketId}` : ''}`)
    }
  },

  // API request logging (minimal)
  api: {
    request: (endpoint: string, method: string = 'GET') => {
      console.log(`🌐 [API] ${method} ${endpoint}`)
    },
    success: (endpoint: string, status: number) => {
      console.log(`✅ [API] ${endpoint} → ${status}`)
    },
    error: (endpoint: string, error: string) => {
      console.error(`❌ [API] ${endpoint} → ${error}`)
    }
  },

  // SellerSprite specific (no data dumps)
  sellersprite: {
    request: (type: 'sales' | 'keywords' | 'research', identifier: string) => {
      console.log(`🔍 [SS] ${type} request: ${identifier}`)
    },
    success: (type: 'sales' | 'keywords' | 'research', identifier: string) => {
      console.log(`✅ [SS] ${type} success: ${identifier}`)
    },
    cached: (type: 'sales' | 'keywords' | 'research', identifier: string) => {
      console.log(`⚡ [SS] ${type} cached: ${identifier}`)
    },
    error: (type: 'sales' | 'keywords' | 'research', identifier: string, error: string) => {
      console.error(`❌ [SS] ${type} failed: ${identifier} → ${error}`)
    }
  },

  // Development helpers
  dev: {
    object: (label: string, obj: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔧 [DEV] ${label}:`, obj)
      }
    },
    trace: (message: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔧 [TRACE] ${message}`)
      }
    }
  },

  // Error logging
  error: (context: string, error: any) => {
    console.error(`💥 [ERROR] ${context}:`, error instanceof Error ? error.message : error)
  },

  // Cache logging
  cache: {
    hit: (key: string) => {
      console.log(`⚡ [CACHE] Hit: ${key}`)
    },
    miss: (key: string) => {
      console.log(`📦 [CACHE] Miss: ${key}`)
    },
    set: (key: string, ttl: number) => {
      console.log(`💾 [CACHE] Set: ${key} (TTL: ${ttl}s)`)
    }
  }
}

// Utility to truncate large objects for logging
export const truncateForLog = (obj: any, maxLength: number = 100): string => {
  const str = JSON.stringify(obj)
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}

// Safe object logging that won't spam
export const safeLog = (label: string, obj: any, maxProps: number = 5) => {
  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj)
    const truncated = keys.slice(0, maxProps).reduce((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {} as any)
    
    if (keys.length > maxProps) {
      truncated[`... +${keys.length - maxProps} more`] = true
    }
    
    console.log(`${label}:`, truncated)
  } else {
    console.log(`${label}:`, obj)
  }
}