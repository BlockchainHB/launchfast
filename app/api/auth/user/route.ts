import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// CORS headers for Chrome extension access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for Chrome extensions
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
}

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200, 
    headers: corsHeaders 
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {}, // Empty for API routes
          remove() {}, // Empty for API routes
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: corsHeaders 
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    }, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('❌ Auth user error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get user'
    }, { 
      status: 500,
      headers: corsHeaders 
    })
  }
}