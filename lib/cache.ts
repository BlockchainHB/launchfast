import { Redis } from '@upstash/redis'

// Upstash Redis client setup with error handling
const createRedisClient = () => {
  try {
    // Handle both development and production environment variable naming
    const url = process.env.REDIS_KV_REST_API_URL || process.env.KV_REST_API_URL
    const token = process.env.REDIS_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN
    
    if (!url || !token) {
      console.warn('Upstash Redis environment variables not found, using memory cache only')
      console.warn('Expected: REDIS_KV_REST_API_URL + REDIS_KV_REST_API_TOKEN (Vercel) or KV_REST_API_URL + KV_REST_API_TOKEN (local)')
      return null
    }
    
    console.log('🔗 Connecting to Upstash Redis:', url.substring(0, 30) + '...')
    
    return new Redis({
      url,
      token,
    })
  } catch (error) {
    console.warn('Failed to create Upstash Redis client, using memory cache only:', error.message)
    return null
  }
}

const redis = createRedisClient()

// In-memory fallback cache when Redis is unavailable
const memoryCache = new Map<string, { data: any, expires: number }>()

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) {
      // Use memory cache when Redis is not available
      const cached = memoryCache.get(key)
      if (cached && cached.expires > Date.now()) {
        return cached.data
      }
      return null
    }

    try {
      const data = await redis.get<T>(key)
      return data
    } catch (error) {
      console.warn('Upstash Redis unavailable, using memory cache:', error.message)
      // Fallback to memory cache
      const cached = memoryCache.get(key)
      if (cached && cached.expires > Date.now()) {
        return cached.data
      }
      return null
    }
  },

  async set(key: string, value: any, ttl: number): Promise<void> {
    if (!redis) {
      // Use memory cache when Redis is not available
      memoryCache.set(key, {
        data: value,
        expires: Date.now() + (ttl * 1000)
      })
      return
    }

    try {
      await redis.setex(key, ttl, value)
    } catch (error) {
      console.warn('Upstash Redis unavailable, using memory cache:', error.message)
      // Fallback to memory cache
      memoryCache.set(key, {
        data: value,
        expires: Date.now() + (ttl * 1000)
      })
    }
  },

  async del(key: string): Promise<void> {
    // Always delete from memory cache
    memoryCache.delete(key)
    console.log(`🗑️ Deleted from memory cache: ${key}`)
    
    if (!redis) {
      console.log('📢 Upstash Redis not available, only memory cache cleared')
      return
    }

    try {
      await redis.del(key)
      console.log(`🗑️ Deleted from Upstash Redis cache: ${key}`)
    } catch (error) {
      console.warn('Upstash Redis unavailable during deletion:', error.message)
      console.log('📢 Memory cache cleared, Redis deletion failed')
    }
  },

  async exists(key: string): Promise<boolean> {
    if (!redis) {
      const cached = memoryCache.get(key)
      return cached ? cached.expires > Date.now() : false
    }

    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.warn('Upstash Redis unavailable, using memory cache:', error.message)
      const cached = memoryCache.get(key)
      return cached ? cached.expires > Date.now() : false
    }
  },

  generateKey: (endpoint: string, params: Record<string, any>) => {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    return `${endpoint}:${Buffer.from(paramString).toString('base64')}`
  }
}

// Cache TTL configuration (in seconds)
export const CACHE_TTL = {
  PRODUCT_RESEARCH: 6 * 60 * 60, // 6 hours
  SALES_PREDICTION: 24 * 60 * 60, // 24 hours
  REVERSE_ASIN: 7 * 24 * 60 * 60, // 7 days
  KEYWORD_MINING: 3 * 24 * 60 * 60, // 3 days
  AI_ANALYSIS: 7 * 24 * 60 * 60, // 7 days
  SEARCH_RESULTS: 2 * 60 * 60 // 2 hours
}

// Cache key prefixes
export const CACHE_KEYS = {
  PRODUCT: 'product',
  SALES: 'sales',
  KEYWORDS: 'keywords',
  OPPORTUNITIES: 'opportunities',
  AI_ANALYSIS: 'ai_analysis',
  SEARCH: 'search'
}

// Helper functions for specific cache operations
export const cacheHelpers = {
  async getProductData(asin: string) {
    return await cache.get(`${CACHE_KEYS.PRODUCT}:${asin}`)
  },

  async setProductData(asin: string, data: any, ttl: number = CACHE_TTL.PRODUCT_RESEARCH) {
    await cache.set(`${CACHE_KEYS.PRODUCT}:${asin}`, data, ttl)
  },

  async getSalesData(asin: string) {
    return await cache.get(`${CACHE_KEYS.SALES}:${asin}`)
  },

  async setSalesData(asin: string, data: any, ttl: number = CACHE_TTL.SALES_PREDICTION) {
    await cache.set(`${CACHE_KEYS.SALES}:${asin}`, data, ttl)
  },

  async getKeywordsData(asin: string) {
    return await cache.get(`${CACHE_KEYS.KEYWORDS}:${asin}`)
  },

  async setKeywordsData(asin: string, data: any, ttl: number = CACHE_TTL.REVERSE_ASIN) {
    await cache.set(`${CACHE_KEYS.KEYWORDS}:${asin}`, data, ttl)
  },

  async getAIAnalysis(asin: string) {
    return await cache.get(`${CACHE_KEYS.AI_ANALYSIS}:${asin}`)
  },

  async setAIAnalysis(asin: string, data: any, ttl: number = CACHE_TTL.AI_ANALYSIS) {
    await cache.set(`${CACHE_KEYS.AI_ANALYSIS}:${asin}`, data, ttl)
  }
}

// Export memoryCache for direct access if needed
export { memoryCache }

export default cache