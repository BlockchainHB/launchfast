import { supabase, supabaseAdmin, UserProfile, InvitationCode } from './supabase'
import { AuthError, User } from '@supabase/supabase-js'

// Authentication helper functions
export const authHelpers = {
  // Validate invitation code
  async validateInvitationCode(code: string): Promise<{
    isValid: boolean
    error?: string
    invitation?: InvitationCode
  }> {
    try {
      const { data: invitation, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .is('used_by', null)
        .single()

      if (error) {
        return {
          isValid: false,
          error: 'Invalid invitation code'
        }
      }

      // Check if code is expired
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return {
          isValid: false,
          error: 'Invitation code has expired'
        }
      }

      return {
        isValid: true,
        invitation
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate invitation code'
      }
    }
  },

  // Sign up with invitation code
  async signUpWithInvitation(
    email: string,
    password: string,
    fullName: string,
    company: string,
    invitationCode: string
  ): Promise<{
    user?: User
    error?: string
  }> {
    try {
      // Use API route for server-side signup operations
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          company,
          invitationCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Failed to create account' }
      }

      // Now sign in the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        return { error: authError.message }
      }

      return { user: authData.user }
    } catch (error) {
      return { error: 'Failed to create account' }
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
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { error: error.message }
      }
      return {}
    } catch (error) {
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