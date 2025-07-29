import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getTrialStatus } from '@/lib/trial-utils'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check user authentication - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  // Define protected routes
  const protectedRoutes = ['/dashboard']
  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  // ACCESS CONTROL: Check subscription and trial status for authenticated users on protected routes
  if (user && isProtectedRoute) {
    try {
      // Get user profile with subscription info
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error('Error fetching user profile:', error)
        // If profile doesn't exist or error, redirect to subscribe with email
        const subscribeUrl = new URL('/api/subscribe', request.url)
        if (user.email) {
          subscribeUrl.searchParams.set('email', user.email)
        }
        return NextResponse.redirect(subscribeUrl)
      }
      
      const subscriptionTier = profile?.subscription_tier || 'expired'
      const subscriptionStatus = profile?.subscription_status || 'inactive'
      
      // Check for active paid subscription
      const hasValidSubscription = (subscriptionTier === 'pro' || subscriptionTier === 'unlimited') && subscriptionStatus === 'active'
      
      // Check for active trial
      let hasTrialAccess = false
      if (subscriptionTier === 'trial' && subscriptionStatus === 'trialing') {
        const trialStatus = await getTrialStatus(user.id)
        hasTrialAccess = trialStatus.hasAccess
        
        // If trial expired, update status and deny access
        if (!trialStatus.hasAccess && trialStatus.trialInfo.status === 'expired') {
          // Trial has expired, redirect to trial expired page
          const expiredUrl = new URL('/trial-expired', request.url)
          if (user.email) {
            expiredUrl.searchParams.set('email', user.email)
          }
          return NextResponse.redirect(expiredUrl)
        }
      }
      
      // Allow access if user has valid subscription or active trial
      const hasAccess = hasValidSubscription || hasTrialAccess
      
      if (!hasAccess) {
        // Redirect to subscription page with user email for customer verification
        const subscribeUrl = new URL('/api/subscribe', request.url)
        if (user.email) {
          subscribeUrl.searchParams.set('email', user.email)
        }
        return NextResponse.redirect(subscribeUrl)
      }
    } catch (error) {
      console.error('Middleware access check error:', error)
      // On error, redirect to subscribe to be safe
      return NextResponse.redirect(new URL('/api/subscribe', request.url))
    }
  }
  
  // If user is authenticated and trying to access auth routes
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}