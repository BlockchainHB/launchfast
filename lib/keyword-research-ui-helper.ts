import { kwSession, type ResearchDecision, type ResearchSessionInfo } from './keyword-research-session'
import type { KeywordResearchOptions } from '@/types'

export interface ResearchUIState {
  showDecisionModal: boolean
  decision?: ResearchDecision
  isLoading: boolean
  selectedAction?: 'reload' | 'research'
}

export class KeywordResearchUIHelper {
  
  /**
   * Handle user's intent to start keyword research
   * Returns UI state and recommended actions
   */
  static async handleResearchIntent(
    userId: string,
    asins: string[],
    options: KeywordResearchOptions = {}
  ): Promise<{
    uiState: ResearchUIState
    decision: ResearchDecision
  }> {
    
    const decision = await kwSession.analyzeResearchDecision(userId, asins, options)
    
    const uiState: ResearchUIState = {
      showDecisionModal: decision.action === 'reload' || (decision.action === 'research' && decision.sessionInfo?.hasCache),
      decision,
      isLoading: false,
      selectedAction: decision.action === 'new_session' ? 'research' : undefined
    }
    
    return { uiState, decision }
  }
  
  /**
   * Generate user-friendly messages for different scenarios
   */
  static getDecisionMessage(decision: ResearchDecision): {
    title: string
    message: string
    primaryAction: string
    secondaryAction?: string
    icon: string
  } {
    
    switch (decision.action) {
      case 'reload':
        return {
          title: 'Recent Research Found',
          message: `We found recent keyword research for these ASINs from ${this.formatRelativeTime(decision.sessionInfo!.lastResearched!)}. Would you like to reload the existing data or research fresh?`,
          primaryAction: 'Load Recent Data',
          secondaryAction: 'Research Fresh',
          icon: '⚡'
        }
        
      case 'research':
        if (decision.sessionInfo?.hasCache) {
          return {
            title: 'Stale Data Found',
            message: `Previous research exists but is ${this.formatRelativeTime(decision.sessionInfo.lastResearched!)} old. Fresh research is recommended.`,
            primaryAction: 'Research Fresh',
            secondaryAction: 'Use Existing Data',
            icon: '🔄'
          }
        }
        return {
          title: 'Fresh Research Required',
          message: decision.reason,
          primaryAction: 'Start Research',
          icon: '🔍'
        }
        
      case 'new_session':
        return {
          title: 'New Research',
          message: 'Starting fresh keyword research for these ASINs.',
          primaryAction: 'Start Research',
          icon: '✨'
        }
        
      default:
        return {
          title: 'Keyword Research',
          message: 'Ready to analyze your keywords.',
          primaryAction: 'Start Research',
          icon: '🎯'
        }
    }
  }
  
  /**
   * Get timeline display for research sessions
   */
  static getSessionTimeline(sessions: ResearchSessionInfo[]): Array<{
    id: string
    name: string
    asins: string[]
    timeAgo: string
    status: 'fresh' | 'stale' | 'expired'
    canReload: boolean
    badge?: string
  }> {
    
    return sessions.map(session => ({
      id: session.sessionId,
      name: session.name,
      asins: session.asins,
      timeAgo: this.formatRelativeTime(session.createdAt),
      status: this.getSessionStatus(session),
      canReload: session.canReload,
      badge: this.getSessionBadge(session)
    }))
  }
  
  /**
   * Validate ASINs before showing decision modal
   */
  static validateResearchInput(asins: string[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!asins || asins.length === 0) {
      errors.push('At least one ASIN is required')
    }
    
    if (asins.length > 10) {
      errors.push('Maximum 10 ASINs allowed per research')
    }
    
    const invalidAsins = asins.filter(asin => !/^[A-Z0-9]{10}$/i.test(asin))
    if (invalidAsins.length > 0) {
      errors.push(`Invalid ASIN format: ${invalidAsins.join(', ')}`)
    }
    
    if (asins.length === 1) {
      warnings.push('GAP analysis requires multiple ASINs for competitor comparison')
    }
    
    const duplicates = asins.filter((asin, index) => asins.indexOf(asin) !== index)
    if (duplicates.length > 0) {
      warnings.push(`Duplicate ASINs found: ${[...new Set(duplicates)].join(', ')}`)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Generate research progress steps for UI
   */
  static getResearchSteps(asinCount: number, includeGapAnalysis: boolean): Array<{
    phase: string
    title: string
    description: string
    estimatedTime: string
  }> {
    
    const steps = [
      {
        phase: 'keyword_extraction',
        title: 'Extracting Keywords',
        description: `Analyzing ${asinCount} product${asinCount > 1 ? 's' : ''} for ranking keywords`,
        estimatedTime: `${Math.ceil(asinCount * 3)}s`
      },
      {
        phase: 'keyword_aggregation',
        title: 'Aggregating Data',
        description: 'Creating market view and comparison analysis',
        estimatedTime: '5s'
      },
      {
        phase: 'opportunity_mining',
        title: 'Finding Opportunities',
        description: 'Identifying high-potential keywords with weak competition',
        estimatedTime: '10s'
      }
    ]
    
    if (includeGapAnalysis && asinCount > 1) {
      steps.push({
        phase: 'gap_analysis',
        title: 'Gap Analysis',
        description: 'Comparing your product against competitors',
        estimatedTime: '8s'
      })
    }
    
    return steps
  }
  
  /**
   * Format research options for display
   */
  static formatResearchOptions(options: KeywordResearchOptions): string[] {
    const formatted: string[] = []
    
    if (options.maxKeywordsPerAsin && options.maxKeywordsPerAsin !== 50) {
      formatted.push(`Max ${options.maxKeywordsPerAsin} keywords per ASIN`)
    }
    
    if (options.minSearchVolume && options.minSearchVolume !== 100) {
      formatted.push(`Min ${options.minSearchVolume.toLocaleString()} search volume`)
    }
    
    if (options.includeOpportunities === false) {
      formatted.push('Opportunities disabled')
    }
    
    if (options.includeGapAnalysis === false) {
      formatted.push('Gap analysis disabled')
    }
    
    if (options.opportunityFilters?.minSearchVolume && options.opportunityFilters.minSearchVolume !== 500) {
      formatted.push(`Opportunity min volume: ${options.opportunityFilters.minSearchVolume.toLocaleString()}`)
    }
    
    return formatted.length > 0 ? formatted : ['Default settings']
  }
  
  // Private helper methods
  
  private static formatRelativeTime(isoString: string): string {
    const now = new Date()
    const time = new Date(isoString)
    const diffMs = now.getTime() - time.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    
    return time.toLocaleDateString()
  }
  
  private static getSessionStatus(session: ResearchSessionInfo): 'fresh' | 'stale' | 'expired' {
    if (!session.hasCache) return 'expired'
    if (!session.cacheAge) return 'expired'
    
    if (session.cacheAge < 20 * 60) return 'fresh' // Less than 20 minutes
    if (session.cacheAge < 2 * 60 * 60) return 'stale' // Less than 2 hours
    return 'expired'
  }
  
  private static getSessionBadge(session: ResearchSessionInfo): string | undefined {
    const status = this.getSessionStatus(session)
    
    switch (status) {
      case 'fresh': return '🟢 Fresh'
      case 'stale': return '🟡 Stale'
      case 'expired': return '🔴 Expired'
      default: return undefined
    }
  }
}

// Export for easy access
export const kwUI = KeywordResearchUIHelper