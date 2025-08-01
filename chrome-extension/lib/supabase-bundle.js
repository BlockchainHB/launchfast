/**
 * Supabase Client Bundle for Chrome Extension
 * Includes Supabase client with Chrome storage adapter
 */

// This would normally be a build output from bundling @supabase/supabase-js
// For now, we'll create a simplified client that handles the core auth functionality

class SupabaseExtensionAuth {
  constructor() {
    // LaunchFast Supabase credentials (anon key is safe for client-side)
    this.supabaseUrl = 'https://nodcoywsdlxgjtptpmnz.supabase.co'
    this.anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZGNveXdzZGx4Z2p0cHRwbW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkzNTcsImV4cCI6MjA2ODM3NTM1N30.wvkjSzLLTr95w4OaWYukQgM0En5X59swq0pPQtiGXzQ'
    this.session = null
    this.authStateCallbacks = new Set()
    
    this.init()
  }

  async init() {
    console.log('🚀 LaunchFast: Initializing Supabase auth')
    
    // Load existing session from storage
    await this.loadSession()
    
    // Check if session is valid and refresh if needed
    if (this.session) {
      await this.validateAndRefreshSession()
    }
  }

  /**
   * Load session from Chrome storage
   */
  async loadSession() {
    try {
      const result = await chrome.storage.local.get(['supabase_session'])
      if (result.supabase_session) {
        this.session = result.supabase_session
        console.log('📱 Session loaded from storage:', this.session.user?.email)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  /**
   * Save session to Chrome storage
   */
  async saveSession(session) {
    try {
      this.session = session
      await chrome.storage.local.set({ 
        'supabase_session': session,
        'user_authenticated': !!session
      })
      console.log('💾 Session saved to storage')
      this.notifyAuthStateChange('SIGNED_IN', session)
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  /**
   * Clear session from storage
   */
  async clearSession() {
    try {
      this.session = null
      await chrome.storage.local.remove(['supabase_session', 'user_authenticated'])
      console.log('🗑️ Session cleared from storage')
      this.notifyAuthStateChange('SIGNED_OUT', null)
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    if (!this.session) {
      await this.loadSession()
    }
    return this.session
  }

  /**
   * Get current user
   */
  async getUser() {
    const session = await this.getSession()
    return session?.user || null
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const session = await this.getSession()
    if (!session) return false
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now) {
      // Try to refresh token
      const refreshed = await this.refreshSession()
      return !!refreshed
    }
    
    return !!(session.access_token && session.user)
  }

  /**
   * Get access token for API requests
   */
  async getAccessToken() {
    const session = await this.getSession()
    if (!session) return null
    
    // Check if token needs refresh
    const now = Math.floor(Date.now() / 1000)
    const bufferTime = 60 // Refresh 1 minute before expiry
    
    if (session.expires_at && session.expires_at < (now + bufferTime)) {
      console.log('🔄 Token expiring soon, refreshing...')
      const refreshed = await this.refreshSession()
      return refreshed?.access_token || null
    }
    
    return session.access_token
  }

  /**
   * Check authentication using LaunchFast API endpoint
   */
  async checkAuthWithAPI() {
    try {
      console.log('🔐 Extension: Checking auth with LaunchFast API')
      
      const response = await fetch('https://launchfastlegacyx.com/api/auth/user', {
        method: 'GET',
        credentials: 'include', // Important: includes HTTP-only cookies
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Extension: User authenticated via API:', data.user?.email)
        
        // Create a session object from the API response
        const session = {
          user: data.user,
          // We don't get tokens from this endpoint, but we know the user is authenticated
          authenticated: true,
          timestamp: Date.now()
        }
        
        // Save to Chrome storage for caching
        await this.saveSession(session)
        
        return { success: true, user: data.user }
      } else if (response.status === 401) {
        console.log('❌ Extension: User not authenticated')
        return { error: 'Not authenticated' }
      } else {
        throw new Error(`API request failed: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Extension: API auth check failed:', error)
      return { error: error.message }
    }
  }


  /**
   * Handle OAuth callback with tokens
   */
  async handleOAuthCallback(url) {
    try {
      console.log('🎯 Handling OAuth callback:', url)
      
      // Parse tokens from URL hash
      const urlObj = new URL(url)
      const hashParams = new URLSearchParams(urlObj.hash.substring(1))
      
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const expiresIn = hashParams.get('expires_in')
      const tokenType = hashParams.get('token_type') || 'bearer'
      
      if (!accessToken || !refreshToken) {
        throw new Error('Missing tokens in callback URL')
      }
      
      // Calculate expiry time
      const expiresAt = Math.floor(Date.now() / 1000) + parseInt(expiresIn || '3600')
      
      // Get user info from token
      const user = await this.getUserFromToken(accessToken)
      
      if (!user) {
        throw new Error('Failed to get user info from token')
      }
      
      // Create session object
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: parseInt(expiresIn || '3600'),
        expires_at: expiresAt,
        token_type: tokenType,
        user: user
      }
      
      // Save session
      await this.saveSession(session)
      
      console.log('✅ OAuth authentication successful:', user.email)
      return { success: true, session, user }
    } catch (error) {
      console.error('OAuth callback handling failed:', error)
      return { error: error.message }
    }
  }

  /**
   * Get user info from access token
   */
  async getUserFromToken(accessToken) {
    try {
      const response = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': this.anonKey
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get user from token:', error)
      return null
    }
  }

  /**
   * Refresh session token
   */
  async refreshSession() {
    try {
      const session = await this.getSession()
      if (!session || !session.refresh_token) {
        console.log('❌ No refresh token available')
        return null
      }
      
      console.log('🔄 Refreshing session token')
      
      const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.anonKey
        },
        body: JSON.stringify({
          refresh_token: session.refresh_token
        })
      })
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Update session with new tokens
      const newSession = {
        ...session,
        access_token: data.access_token,
        refresh_token: data.refresh_token || session.refresh_token,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in
      }
      
      await this.saveSession(newSession)
      
      console.log('✅ Session refreshed successfully')
      return newSession
    } catch (error) {
      console.error('Session refresh failed:', error)
      
      // Clear invalid session
      await this.clearSession()
      return null
    }
  }

  /**
   * Validate and refresh session if needed
   */
  async validateAndRefreshSession() {
    const session = await this.getSession()
    if (!session) return false
    
    const now = Math.floor(Date.now() / 1000)
    const bufferTime = 300 // 5 minutes
    
    if (session.expires_at && session.expires_at < (now + bufferTime)) {
      console.log('🔄 Session expiring, refreshing...')
      const refreshed = await this.refreshSession()
      return !!refreshed
    }
    
    return true
  }

  /**
   * Sign out user
   */
  async signOut() {
    try {
      const session = await this.getSession()
      
      if (session && session.access_token) {
        // Call Supabase logout endpoint
        await fetch(`${this.supabaseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': this.anonKey
          }
        })
      }
      
      // Clear local session regardless of API call result
      await this.clearSession()
      
      console.log('👋 User signed out')
      return { success: true }
    } catch (error) {
      // Clear session even if API call fails
      await this.clearSession()
      console.error('Sign out error:', error)
      return { error: error.message }
    }
  }

  /**
   * Add auth state change listener
   */
  onAuthStateChange(callback) {
    this.authStateCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.authStateCallbacks.delete(callback)
    }
  }

  /**
   * Notify auth state change callbacks
   */
  notifyAuthStateChange(event, session) {
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(event, session)
      } catch (error) {
        console.error('Auth state callback error:', error)
      }
    })
  }

  /**
   * Get authentication status for UI - tries cache first, then API
   */
  async getAuthStatus() {
    try {
      // First try cached session
      const session = await this.getSession()
      
      // If we have a recent cached session, use it
      if (session && session.authenticated && session.timestamp) {
        const cacheAge = Date.now() - session.timestamp
        const maxCacheAge = 5 * 60 * 1000 // 5 minutes
        
        if (cacheAge < maxCacheAge) {
          console.log('📱 Extension: Using cached auth status')
          return {
            authenticated: true,
            user: session.user,
            session: session
          }
        }
      }
      
      // Cache expired or no session, check with API
      console.log('🔄 Extension: Cache expired, checking auth with API')
      const apiResult = await this.checkAuthWithAPI()
      
      if (apiResult.success) {
        return {
          authenticated: true,
          user: apiResult.user,
          session: { authenticated: true, timestamp: Date.now() }
        }
      } else {
        // Clear any stale session
        await this.clearSession()
        return {
          authenticated: false,
          user: null,
          session: null,
          error: apiResult.error
        }
      }
    } catch (error) {
      console.error('Failed to get auth status:', error)
      return {
        authenticated: false,
        user: null,
        session: null,
        error: error.message
      }
    }
  }
}

// Create global instance - works in both content scripts (window) and service workers (globalThis)
const globalScope = typeof window !== 'undefined' ? window : globalThis;
globalScope.LaunchFastSupabase = new SupabaseExtensionAuth();

console.log('🚀 LaunchFast Supabase auth loaded in:', typeof window !== 'undefined' ? 'content script' : 'service worker');