import { kwCache } from './keyword-research-cache'
import { kwDB } from './keyword-research-db'
import { Logger } from './logger'
import { keywordResearchService } from './keyword-research'
import type { KeywordResearchResult, KeywordResearchOptions } from '@/types'

export interface ResearchSessionInfo {
  sessionId: string
  name: string
  asins: string[]
  createdAt: string
  hasCache: boolean
  cacheAge?: number
  lastResearched?: string
  canReload: boolean
  recommendReload: boolean
}

export interface ResearchDecision {
  action: 'reload' | 'research' | 'new_session'
  reason: string
  sessionInfo?: ResearchSessionInfo
}

export class KeywordResearchSession {
  
  /**
   * Analyze whether user should reload cached data or research fresh
   */
  static async analyzeResearchDecision(
    userId: string,
    asins: string[],
    options: KeywordResearchOptions = {}
  ): Promise<ResearchDecision> {
    try {
      // Check if user has existing sessions with these exact ASINs
      const existingSessions = await this.findMatchingSessions(userId, asins)
      
      if (existingSessions.length === 0) {
        return {
          action: 'new_session',
          reason: 'No existing research found for these ASINs'
        }
      }
      
      // Get the most recent matching session
      const latestSession = existingSessions[0]
      const cacheInfo = await kwCache.getSessionCacheInfo(userId, latestSession.sessionId)
      
      const sessionInfo: ResearchSessionInfo = {
        ...latestSession,
        ...cacheInfo,
        canReload: cacheInfo.hasCache,
        recommendReload: this.shouldRecommendReload(cacheInfo.cacheAge)
      }
      
      if (!cacheInfo.hasCache) {
        return {
          action: 'research',
          reason: 'Previous research data expired - fresh research needed',
          sessionInfo
        }
      }
      
      if (sessionInfo.recommendReload) {
        return {
          action: 'reload',
          reason: `Recent data available (${this.formatCacheAge(cacheInfo.cacheAge!)} ago)`,
          sessionInfo
        }
      }
      
      return {
        action: 'research',
        reason: `Data is getting stale (${this.formatCacheAge(cacheInfo.cacheAge!)} old) - consider fresh research`,
        sessionInfo
      }
      
    } catch (error) {
      Logger.error('Failed to analyze research decision', error)
      return {
        action: 'research',
        reason: 'Unable to check existing data - proceeding with fresh research'
      }
    }
  }
  
  /**
   * Find existing sessions that match the given ASINs
   */
  private static async findMatchingSessions(
    userId: string, 
    asins: string[]
  ): Promise<ResearchSessionInfo[]> {
    try {
      const sessions = await kwDB.findMatchingSessions(userId, asins)
      return sessions.map(session => ({
        sessionId: session.id,
        name: session.name,
        asins: session.asins.map(a => a.asin),
        createdAt: session.created_at,
        hasCache: false, // Will be checked separately
        canReload: false, // Will be set by cache check
        recommendReload: false // Will be set by cache check
      }))
    } catch (error) {
      Logger.error('Failed to find matching sessions', error)
      return []
    }
  }
  
  /**
   * Load cached research results
   */
  static async loadCachedResults(
    userId: string,
    sessionId: string
  ): Promise<KeywordResearchResult | null> {
    try {
      Logger.dev.trace(`Loading cached results for session ${sessionId}`)
      
      const cached = await kwCache.getCachedSessionResult(userId, sessionId)
      
      if (cached) {
        Logger.dev.trace(`Successfully loaded cached results: ${cached.overview.totalKeywords} keywords`)
        return cached
      }
      
      // If full cache miss, try to load from database and rebuild cache
      Logger.dev.trace('Cache miss - attempting database reconstruction')
      return await this.reconstructFromDatabase(userId, sessionId)
      
    } catch (error) {
      Logger.error('Failed to load cached results', error)
      return null
    }
  }
  
  /**
   * Perform fresh research and save results
   */
  static async performFreshResearch(
    userId: string,
    asins: string[],
    options: KeywordResearchOptions = {},
    sessionName?: string
  ): Promise<{
    sessionId: string
    results: KeywordResearchResult
  }> {
    try {
      Logger.dev.trace(`Starting fresh research for ${asins.length} ASINs`)
      
      // Invalidate any existing cache for this user's similar research
      await kwCache.invalidateUserCache(userId)
      
      // Perform the research
      const results = await keywordResearchService.researchKeywords(asins, options)
      
      // Save to database
      const sessionId = await this.saveToDatabase(userId, asins, results, options, sessionName)
      
      // Cache the results
      await kwCache.cacheSessionResult(userId, sessionId, results)
      
      Logger.dev.trace(`Fresh research completed and saved as session ${sessionId}`)
      
      return { sessionId, results }
      
    } catch (error) {
      Logger.error('Failed to perform fresh research', error)
      throw error
    }
  }
  
  /**
   * Get user's research session history
   */
  static async getUserSessions(userId: string): Promise<ResearchSessionInfo[]> {
    try {
      // Try cache first
      const cached = await kwCache.getCachedUserSessions(userId)
      if (cached) {
        return cached
      }
      
      // Load from database
      const sessions = await this.loadSessionsFromDatabase(userId)
      
      // Cache for quick future access
      await kwCache.cacheUserSessions(userId, sessions)
      
      return sessions
      
    } catch (error) {
      Logger.error('Failed to get user sessions', error)
      return []
    }
  }
  
  /**
   * Delete a research session and its cache
   */
  static async deleteSession(userId: string, sessionId: string): Promise<void> {
    try {
      // Remove from database
      await this.deleteFromDatabase(userId, sessionId)
      
      // Invalidate cache
      await kwCache.invalidateSessionCache(userId, sessionId)
      
      // Invalidate user session list cache
      const sessionListKey = `kw_research:user:${userId}:sessions`
      await kwCache.invalidateUserCache(userId) // Simple approach
      
      Logger.dev.trace(`Session ${sessionId} deleted successfully`)
      
    } catch (error) {
      Logger.error('Failed to delete session', error)
      throw error
    }
  }
  
  /**
   * Rename a research session
   */
  static async renameSession(
    userId: string, 
    sessionId: string, 
    newName: string
  ): Promise<void> {
    try {
      // Update database
      await this.updateSessionName(userId, sessionId, newName)
      
      // Invalidate session list cache so new name appears
      await kwCache.invalidateUserCache(userId)
      
      Logger.dev.trace(`Session ${sessionId} renamed to "${newName}"`)
      
    } catch (error) {
      Logger.error('Failed to rename session', error)
      throw error
    }
  }
  
  // Private helper methods
  
  private static shouldRecommendReload(cacheAge?: number): boolean {
    if (!cacheAge) return false
    
    // Recommend reload if data is less than 20 minutes old
    return cacheAge < (20 * 60) // 1200 seconds
  }
  
  private static formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }
  
  // Database interaction methods
  
  private static async reconstructFromDatabase(
    userId: string, 
    sessionId: string
  ): Promise<KeywordResearchResult | null> {
    try {
      return await kwDB.reconstructSessionResults(userId, sessionId)
    } catch (error) {
      Logger.error('Failed to reconstruct from database', error)
      return null
    }
  }
  
  private static async saveToDatabase(
    userId: string,
    asins: string[],
    results: KeywordResearchResult,
    options: KeywordResearchOptions,
    sessionName?: string
  ): Promise<string> {
    try {
      return await kwDB.saveResearchSession(userId, asins, results, options, sessionName)
    } catch (error) {
      Logger.error('Failed to save to database', error)
      throw error
    }
  }
  
  private static async loadSessionsFromDatabase(userId: string): Promise<ResearchSessionInfo[]> {
    try {
      const sessions = await kwDB.loadUserSessions(userId)
      return sessions.map(session => ({
        sessionId: session.id,
        name: session.name,
        asins: session.asins.map(a => a.asin),
        createdAt: session.created_at,
        hasCache: false, // Will be checked separately
        canReload: false, // Will be set by cache check
        recommendReload: false // Will be set by cache check
      }))
    } catch (error) {
      Logger.error('Failed to load sessions from database', error)
      return []
    }
  }
  
  private static async deleteFromDatabase(userId: string, sessionId: string): Promise<void> {
    try {
      await kwDB.deleteSession(userId, sessionId)
    } catch (error) {
      Logger.error('Failed to delete from database', error)
      throw error
    }
  }
  
  private static async updateSessionName(
    userId: string, 
    sessionId: string, 
    newName: string
  ): Promise<void> {
    try {
      await kwDB.updateSessionName(userId, sessionId, newName)
    } catch (error) {
      Logger.error('Failed to update session name', error)
      throw error
    }
  }
}

// Export for easy access
export const kwSession = KeywordResearchSession