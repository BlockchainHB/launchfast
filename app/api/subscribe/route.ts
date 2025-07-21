import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // User not authenticated, redirect to login with return URL
      const returnUrl = encodeURIComponent('/api/subscribe')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/login?redirect=${returnUrl}&signup=true`)
    }

    // User is authenticated, redirect to the authenticated checkout endpoint
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}/api/stripe/create-checkout?plan=pro`)

  } catch (error) {
    console.error('Subscribe redirect error:', error)
    
    // Redirect back to home with error
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfastlegacyx.com'}?error=auth_failed`)
  }
}