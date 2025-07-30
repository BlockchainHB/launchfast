import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getTrialInfo } from '@/lib/trial-utils'

export async function GET(request: NextRequest) {
  try {
    // Create server client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // Read-only endpoint - no cookie setting needed
          },
          remove() {
            // Read-only endpoint - no cookie removal needed
          },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get trial information for the user
    const trialInfo = await getTrialInfo(user.id)

    return NextResponse.json(trialInfo)

  } catch (error) {
    console.error('Trial info API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}