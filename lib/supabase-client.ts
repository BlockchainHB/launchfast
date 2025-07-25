import { createClient } from '@supabase/supabase-js'
import { Logger } from './logger'

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Server-side client with service role key for bypassing RLS when needed
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Client for authenticated user operations (respects RLS)
export const supabaseAuth = createClient(
  supabaseUrl, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Database table names
export const TABLES = {
  SESSIONS: 'keyword_research_sessions',
  ASINS: 'research_asins', 
  KEYWORDS: 'keyword_research_keywords',
  RANKINGS: 'asin_keyword_rankings',
  OPPORTUNITIES: 'research_opportunities',
  GAPS: 'gap_analysis_results'
} as const

// Helper function to get authenticated user client
export function getAuthenticatedClient(userId: string) {
  // Set the user context for RLS
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'sb-jwt-claim-sub': userId
      }
    }
  })
  
  return client
}

// Transaction helper for complex multi-table operations
export class SupabaseTransaction {
  private operations: Array<() => Promise<any>> = []
  private client: any
  
  constructor(userId?: string) {
    this.client = userId ? getAuthenticatedClient(userId) : supabaseServer
  }
  
  // Add operation to transaction
  add<T>(operation: () => Promise<T>): this {
    this.operations.push(operation)
    return this
  }
  
  // Execute all operations (pseudo-transaction - Supabase doesn't support true transactions in SDK)
  async execute(): Promise<any[]> {
    const results: any[] = []
    
    try {
      for (const operation of this.operations) {
        const result = await operation()
        if (result.error) {
          throw new Error(`Transaction failed: ${result.error.message}`)
        }
        results.push(result.data)
      }
      
      return results
    } catch (error) {
      Logger.error('Transaction failed', error)
      // In a real implementation, you'd want to rollback previous operations
      // For now, we'll rely on foreign key constraints and careful ordering
      throw error
    }
  }
}

// RLS helper functions
export const RLSHelpers = {
  /**
   * Verify user owns the session
   */
  async verifySessionOwnership(sessionId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseServer
        .from(TABLES.SESSIONS)
        .select('user_id')
        .eq('id', sessionId)
        .single()
      
      if (error || !data) return false
      return data.user_id === userId
    } catch (error) {
      Logger.error('Failed to verify session ownership', error)
      return false
    }
  },
  
  /**
   * Get user's session IDs for batch operations
   */
  async getUserSessionIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabaseServer
        .from(TABLES.SESSIONS)
        .select('id')
        .eq('user_id', userId)
      
      if (error) {
        Logger.error('Failed to get user session IDs', error)
        return []
      }
      
      return data.map(row => row.id)
    } catch (error) {
      Logger.error('Failed to get user session IDs', error)
      return []
    }
  }
}

// Batch operation helpers
export const BatchHelpers = {
  /**
   * Insert keywords in batches, handling duplicates
   */
  async insertKeywordsBatch(keywords: Array<{
    keyword_text: string
    search_volume: number
    cpc: number
  }>): Promise<Map<string, string>> {
    try {
      const keywordMap = new Map<string, string>()
      
      // First, try to get existing keywords
      const existingKeywords = await supabaseServer
        .from(TABLES.KEYWORDS)
        .select('id, keyword_text')
        .in('keyword_text', keywords.map(k => k.keyword_text))
      
      if (existingKeywords.data) {
        existingKeywords.data.forEach(kw => {
          keywordMap.set(kw.keyword_text, kw.id)
        })
      }
      
      // Find new keywords to insert
      const newKeywords = keywords.filter(k => !keywordMap.has(k.keyword_text))
      
      if (newKeywords.length > 0) {
        const { data: insertedKeywords, error } = await supabaseServer
          .from(TABLES.KEYWORDS)
          .insert(newKeywords.map(k => ({
            keyword_text: k.keyword_text,
            search_volume: k.search_volume,
            cpc: k.cpc
          })))
          .select('id, keyword_text')
        
        if (error) {
          Logger.error('Failed to insert keywords batch', error)
          throw error
        }
        
        if (insertedKeywords) {
          insertedKeywords.forEach(kw => {
            keywordMap.set(kw.keyword_text, kw.id)
          })
        }
      }
      
      return keywordMap
    } catch (error) {
      Logger.error('Keywords batch insert failed', error)
      throw error
    }
  },
  
  /**
   * Insert rankings in batches
   */
  async insertRankingsBatch(rankings: Array<{
    session_id: string
    asin: string
    keyword_id: string
    ranking_position: number | null
    traffic_percentage: number | null
  }>): Promise<void> {
    try {
      const batchSize = 1000
      
      for (let i = 0; i < rankings.length; i += batchSize) {
        const batch = rankings.slice(i, i + batchSize)
        
        const { error } = await supabaseServer
          .from(TABLES.RANKINGS)
          .insert(batch.map(r => ({
            session_id: r.session_id,
            asin: r.asin,
            keyword_id: r.keyword_id,
            ranking_position: r.ranking_position,
            traffic_percentage: r.traffic_percentage,
            recorded_at: new Date().toISOString()
          })))
        
        if (error) {
          Logger.error(`Failed to insert rankings batch ${i}-${i + batch.length}`, error)
          throw error
        }
      }
    } catch (error) {
      Logger.error('Rankings batch insert failed', error)
      throw error
    }
  }
}

// Query builders for complex operations
export const QueryBuilders = {
  /**
   * Build session list query with metadata
   */
  sessionListQuery(userId: string) {
    return supabaseServer
      .from(TABLES.SESSIONS)
      .select(`
        id,
        name,
        created_at,
        updated_at,
        settings,
        research_asins!inner(asin, is_user_product, order_index)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  },
  
  /**
   * Build complete session reconstruction query
   */
  sessionReconstructQuery(sessionId: string) {
    return {
      // Session metadata
      session: supabaseServer
        .from(TABLES.SESSIONS)
        .select('*')
        .eq('id', sessionId)
        .single(),
        
      // ASINs in order
      asins: supabaseServer
        .from(TABLES.ASINS)
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index'),
        
      // Keywords with rankings
      rankings: supabaseServer
        .from(TABLES.RANKINGS)
        .select(`
          *,
          keyword_research_keywords (
            keyword_text,
            search_volume,
            cpc
          )
        `)
        .eq('session_id', sessionId),
        
      // Opportunities
      opportunities: supabaseServer
        .from(TABLES.OPPORTUNITIES)
        .select(`
          *,
          keyword_research_keywords (
            keyword_text,
            search_volume,
            cpc
          )
        `)
        .eq('session_id', sessionId),
        
      // Gap analysis
      gaps: supabaseServer
        .from(TABLES.GAPS)
        .select(`
          *,
          keyword_research_keywords (
            keyword_text,
            search_volume,
            cpc
          )
        `)
        .eq('session_id', sessionId)
    }
  }
}

// Error handling helpers
export const ErrorHelpers = {
  isConnectionError(error: any): boolean {
    return error?.message?.includes('connection') || 
           error?.message?.includes('network') ||
           error?.code === 'PGRST301'
  },
  
  isRLSError(error: any): boolean {
    return error?.message?.includes('RLS') || 
           error?.message?.includes('permission') ||
           error?.code === 'PGRST116'
  },
  
  isForeignKeyError(error: any): boolean {
    return error?.message?.includes('foreign key') ||
           error?.code === '23503'
  },
  
  formatError(error: any): string {
    if (this.isConnectionError(error)) {
      return 'Database connection failed. Please try again.'
    }
    if (this.isRLSError(error)) {
      return 'Access denied. Please check your permissions.'
    }
    if (this.isForeignKeyError(error)) {
      return 'Data integrity error. Please contact support.'
    }
    return error?.message || 'An unexpected database error occurred.'
  }
}

// Health check function
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer
      .from(TABLES.KEYWORDS)
      .select('count')
      .limit(1)
    
    return !error
  } catch (error) {
    Logger.error('Supabase health check failed', error)
    return false
  }
}