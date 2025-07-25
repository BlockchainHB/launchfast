import { Redis } from '@upstash/redis'
import { Logger } from './logger'
import type { KeywordResearchResult } from '@/types'

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.REDIS_KV_REST_API__URL!,
  token: process.env.REDIS_KV_REST_API_TOKEN!,
})

// Cache configuration
const CACHE_CONFIG = {
  // Session result cache - 30 minutes
  SESSION_RESULT_TTL: 30 * 60, // 1800 seconds
  
  // User session list - 5 minutes (changes more frequently)
  SESSION_LIST_TTL: 5 * 60, // 300 seconds
  
  // Gap analysis cache - 1 hour (expensive computation)
  GAP_ANALYSIS_TTL: 60 * 60, // 3600 seconds
  
  // Aggregated keywords cache - 15 minutes
  AGGREGATED_KEYWORDS_TTL: 15 * 60, // 900 seconds
} as const

// Cache key generators with user isolation
const CacheKeys = {
  sessionResult: (userId: string, sessionId: string) => 
    `kw_research:user:${userId}:session:${sessionId}:result`,
    
  sessionList: (userId: string) => 
    `kw_research:user:${userId}:sessions`,
    
  gapAnalysis: (userId: string, sessionId: string) => 
    `kw_research:user:${userId}:session:${sessionId}:gaps`,
    
  aggregatedKeywords: (userId: string, sessionId: string) => 
    `kw_research:user:${userId}:session:${sessionId}:aggregated`,
    
  comparisonView: (userId: string, sessionId: string) => 
    `kw_research:user:${userId}:session:${sessionId}:comparison`,
    
  opportunities: (userId: string, sessionId: string) => 
    `kw_research:user:${userId}:session:${sessionId}:opportunities`,
}

export class KeywordResearchCache {
  
  /**
   * Cache complete research session results
   */
  static async cacheSessionResult(
    userId: string, 
    sessionId: string, 
    result: KeywordResearchResult
  ): Promise<void> {
    try {
      const key = CacheKeys.sessionResult(userId, sessionId)
      
      // Cache the complete result
      await redis.setex(key, CACHE_CONFIG.SESSION_RESULT_TTL, JSON.stringify(result))
      
      // Also cache individual components for partial loading
      const pipeline = redis.pipeline()
      
      pipeline.setex(
        CacheKeys.aggregatedKeywords(userId, sessionId),
        CACHE_CONFIG.AGGREGATED_KEYWORDS_TTL,
        JSON.stringify(result.aggregatedKeywords)
      )
      
      pipeline.setex(
        CacheKeys.comparisonView(userId, sessionId),
        CACHE_CONFIG.AGGREGATED_KEYWORDS_TTL,
        JSON.stringify(result.comparisonView)
      )
      
      pipeline.setex(
        CacheKeys.opportunities(userId, sessionId),
        CACHE_CONFIG.SESSION_RESULT_TTL,
        JSON.stringify(result.opportunities)
      )
      
      if (result.gapAnalysis) {
        pipeline.setex(
          CacheKeys.gapAnalysis(userId, sessionId),
          CACHE_CONFIG.GAP_ANALYSIS_TTL,
          JSON.stringify(result.gapAnalysis)
        )
      }
      
      await pipeline.exec()
      
      Logger.cache.set(`session_result:${sessionId}`, CACHE_CONFIG.SESSION_RESULT_TTL)
      
    } catch (error) {
      Logger.error('Failed to cache session result', error)
      // Don't throw - caching failures shouldn't break the app
    }
  }
  
  /**
   * Get cached session result
   */
  static async getCachedSessionResult(
    userId: string, 
    sessionId: string
  ): Promise<KeywordResearchResult | null> {
    try {
      const key = CacheKeys.sessionResult(userId, sessionId)
      const cached = await redis.get(key)
      
      if (cached) {
        Logger.cache.hit(`session_result:${sessionId}`)
        return JSON.parse(cached as string)
      }
      
      Logger.cache.miss(`session_result:${sessionId}`)
      return null
      
    } catch (error) {
      Logger.error('Failed to get cached session result', error)
      return null
    }
  }
  
  /**
   * Cache user's session list for quick dashboard loading
   */
  static async cacheUserSessions(
    userId: string, 
    sessions: Array<{id: string, name: string, created_at: string, asin_count: number}>
  ): Promise<void> {
    try {
      const key = CacheKeys.sessionList(userId)
      await redis.setex(key, CACHE_CONFIG.SESSION_LIST_TTL, JSON.stringify(sessions))
      
      Logger.cache.set(`user_sessions:${userId}`, CACHE_CONFIG.SESSION_LIST_TTL)
      
    } catch (error) {
      Logger.error('Failed to cache user sessions', error)
    }
  }
  
  /**
   * Get cached user sessions
   */
  static async getCachedUserSessions(userId: string): Promise<any[] | null> {
    try {
      const key = CacheKeys.sessionList(userId)
      const cached = await redis.get(key)
      
      if (cached) {
        Logger.cache.hit(`user_sessions:${userId}`)
        return JSON.parse(cached as string)
      }
      
      Logger.cache.miss(`user_sessions:${userId}`)
      return null
      
    } catch (error) {
      Logger.error('Failed to get cached user sessions', error)
      return null
    }
  }
  
  /**
   * Check if session has cached data (for UI decision making)
   */
  static async hasSessionCache(userId: string, sessionId: string): Promise<boolean> {
    try {
      const key = CacheKeys.sessionResult(userId, sessionId)
      const exists = await redis.exists(key)
      return exists === 1
      
    } catch (error) {
      Logger.error('Failed to check session cache existence', error)
      return false
    }
  }
  
  /**
   * Get cache metadata for UI decisions
   */
  static async getSessionCacheInfo(userId: string, sessionId: string): Promise<{
    hasCache: boolean
    cacheAge?: number
    lastResearched?: string
  }> {
    try {
      const key = CacheKeys.sessionResult(userId, sessionId)
      const [exists, ttl] = await Promise.all([
        redis.exists(key),
        redis.ttl(key)
      ])
      
      if (exists === 1) {
        const cacheAge = CACHE_CONFIG.SESSION_RESULT_TTL - ttl
        const lastResearched = new Date(Date.now() - (cacheAge * 1000)).toISOString()
        
        return {
          hasCache: true,
          cacheAge,
          lastResearched
        }
      }
      
      return { hasCache: false }
      
    } catch (error) {
      Logger.error('Failed to get session cache info', error)
      return { hasCache: false }
    }
  }
  
  /**
   * Invalidate all cache for a user (when they research new data)
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    try {
      // Get all keys for this user
      const pattern = `kw_research:user:${userId}:*`
      const keys = await redis.keys(pattern)
      
      if (keys.length > 0) {
        await redis.del(...keys)
        Logger.cache.invalidated('user_keyword_research', userId)
      }
      
    } catch (error) {
      Logger.error('Failed to invalidate user cache', error)
    }
  }
  
  /**
   * Invalidate specific session cache (when user re-researches)
   */
  static async invalidateSessionCache(userId: string, sessionId: string): Promise<void> {
    try {
      const keys = [
        CacheKeys.sessionResult(userId, sessionId),
        CacheKeys.aggregatedKeywords(userId, sessionId),
        CacheKeys.comparisonView(userId, sessionId),
        CacheKeys.opportunities(userId, sessionId),
        CacheKeys.gapAnalysis(userId, sessionId),
      ]
      
      await redis.del(...keys)
      Logger.cache.invalidated('session_keyword_research', `${userId}:${sessionId}`)
      
    } catch (error) {
      Logger.error('Failed to invalidate session cache', error)
    }
  }
  
  /**
   * Get partial cached data for faster UI loading
   */
  static async getCachedComponents(userId: string, sessionId: string): Promise<{
    aggregatedKeywords?: any[]
    comparisonView?: any[]
    opportunities?: any[]
    gapAnalysis?: any
  }> {
    try {
      const [aggregated, comparison, opportunities, gaps] = await Promise.all([
        redis.get(CacheKeys.aggregatedKeywords(userId, sessionId)),
        redis.get(CacheKeys.comparisonView(userId, sessionId)),
        redis.get(CacheKeys.opportunities(userId, sessionId)),
        redis.get(CacheKeys.gapAnalysis(userId, sessionId)),
      ])
      
      return {
        ...(aggregated && { aggregatedKeywords: JSON.parse(aggregated as string) }),
        ...(comparison && { comparisonView: JSON.parse(comparison as string) }),
        ...(opportunities && { opportunities: JSON.parse(opportunities as string) }),
        ...(gaps && { gapAnalysis: JSON.parse(gaps as string) }),
      }
      
    } catch (error) {
      Logger.error('Failed to get cached components', error)
      return {}
    }
  }
  
  /**
   * Warm cache for recently accessed sessions
   */
  static async warmSessionCache(userId: string, sessionIds: string[]): Promise<void> {
    // This would be called when user logs in or accesses dashboard
    // Pre-load frequently accessed sessions in background
    Logger.dev.trace(`Cache warming requested for ${sessionIds.length} sessions`)
    // Implementation depends on your database queries
  }
  
  /**
   * Get cache statistics for monitoring
   */
  static async getCacheStats(userId: string): Promise<{
    totalKeys: number
    sessionsCached: number
    cacheSize: string
  }> {
    try {
      const pattern = `kw_research:user:${userId}:*`
      const keys = await redis.keys(pattern)
      
      const sessionKeys = keys.filter(key => key.includes(':session:') && key.endsWith(':result'))
      
      return {
        totalKeys: keys.length,
        sessionsCached: sessionKeys.length,
        cacheSize: `${keys.length} keys` // Redis doesn't easily give memory usage per pattern
      }
      
    } catch (error) {
      Logger.error('Failed to get cache stats', error)
      return { totalKeys: 0, sessionsCached: 0, cacheSize: '0 keys' }
    }
  }
}

// Export utility functions for easy access
export const kwCache = KeywordResearchCache