import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTrialInfo } from '@/lib/trial-utils'

export async function GET(request: NextRequest) {
  try {
    // Use the imported supabase client

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