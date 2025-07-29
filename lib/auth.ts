import { supabase, supabaseAdmin, UserProfile } from './supabase'
import { AuthError, User } from '@supabase/supabase-js'
import { getTrialInfo, TrialInfo } from './trial-utils'

// Authentication helper functions
export const authHelpers = {

  // Sign up
  async signUp(email: string, password: string, userData?: {
    full_name?: string
    company?: string
    promo_code?: string
  }): Promise<{
    user?: User
    error?: string
  }> {
    try {
      // Use our custom signup endpoint that sends custom emails
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: userData?.full_name || '',
          company: userData?.company || '',
          promo_code: userData?.promo_code || ''
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Failed to sign up' }
      }

      return { user: data.user }
    } catch (error) {
      return { error: 'Failed to sign up' }
    }
  },

  // Sign in
  async signIn(email: string, password: string): Promise<{
    user?: User
    error?: string
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { error: error.message }
      }

      return { user: data.user }
    } catch (error) {
      return { error: 'Failed to sign in' }
    }
  },

  // Sign out
  async signOut(): Promise<{ error?: string }> {
    try {
      if (!supabase) {
        // If supabase client is not available, just clear local storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.replace(/\./g, '-') + '-auth-token')
        }
        return {}
      }

      const { error } = await supabase.auth.signOut()
      if (error && error.message !== 'Auth session missing!') {
        return { error: error.message }
      }
      
      // Clear any remaining local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.replace(/\./g, '-') + '-auth-token')
      }
      
      return {}
    } catch (error) {
      // Even if logout fails, clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.replace(/\./g, '-') + '-auth-token')
      }
      return { error: 'Failed to sign out' }
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      return null
    }
  },

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        return null
      }

      return profile
    } catch (error) {
      return null
    }
  },

  // Get user profile with trial information
  async getUserProfileWithTrial(userId: string): Promise<{
    profile: UserProfile | null
    trialInfo: TrialInfo
  }> {
    try {
      const [profile, trialInfo] = await Promise.all([
        this.getUserProfile(userId),
        getTrialInfo(userId)
      ])

      return { profile, trialInfo }
    } catch (error) {
      return { 
        profile: null, 
        trialInfo: {
          isActive: false,
          daysRemaining: 0,
          hoursRemaining: 0,
          trialEndDate: null,
          status: 'none',
          urgencyLevel: 'low',
          promoCodeUsed: null,
          redemptionId: null
        }
      }
    }
  },

  // Create or update user profile
  async upsertUserProfile(
    userId: string,
    profileData: Partial<UserProfile>
  ): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: 'Failed to update profile' }
    }
  }
}

// Auth state management
export const useAuthState = () => {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      // User signed in
      console.log('User signed in:', session?.user?.email)
    } else if (event === 'SIGNED_OUT') {
      // User signed out
      console.log('User signed out')
    }
  })
}