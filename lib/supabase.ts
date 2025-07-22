import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side Supabase client using SSR package
export const supabase = typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Server-side Supabase client with service role key (only available on server)
export const supabaseAdmin = typeof window === 'undefined' && supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    })
  : null

// Auth helpers
export const auth = supabase?.auth

// Database helpers
export const db = supabase
export const dbAdmin = supabaseAdmin

// Database types
export interface Product {
  id: string
  asin: string
  title: string
  brand?: string
  price: number
  bsr?: number
  reviews: number
  rating: number
  monthly_sales?: number
  monthly_revenue?: number
  profit_estimate?: number
  grade?: string
  created_at: string
  updated_at: string
}

export interface Keyword {
  id: string
  keyword: string
  search_volume?: number
  competition_score?: number
  avg_cpc?: number
  created_at: string
}

export interface ProductKeyword {
  product_id: string
  keyword_id: string
  ranking_position?: number
  traffic_percentage?: number
}

export interface AIAnalysis {
  id: string
  product_id: string
  risk_classification: string
  consistency_rating: string
  estimated_dimensions?: string
  estimated_weight?: string
  opportunity_score: number
  market_insights?: any
  risk_factors?: any
  created_at: string
}

// Authentication types
export interface InvitationCode {
  id: string
  code: string
  email?: string
  used_by?: string
  used_at?: string
  created_at: string
  expires_at?: string
  created_by?: string
  is_active: boolean
}

export interface UserProfile {
  id: string
  full_name: string
  company?: string
  invitation_code?: string
  role: string
  subscription_tier: string
  subscription_status?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_current_period_start?: string
  subscription_current_period_end?: string
  subscription_cancel_at_period_end?: boolean
  payment_method_last4?: string
  payment_method_brand?: string
  created_at: string
  updated_at: string
}