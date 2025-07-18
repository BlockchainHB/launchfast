import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side operations
)

export async function POST(request: NextRequest) {
  try {
    const { email, metadata } = await request.json()

    // Validate email format
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Extract metadata from request (referrer, UTM params, etc.)
    const requestMetadata = {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      timestamp: new Date().toISOString(),
      ...metadata
    }

    // Insert into waitlist table
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        {
          email: email.toLowerCase().trim(),
          status: 'pending',
          metadata: requestMetadata
        }
      ])
      .select('id, email, created_at')
      .single()

    if (error) {
      // Check if it's a duplicate email error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Email already registered for waitlist' },
          { status: 409 }
        )
      }
      
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined waitlist!',
      data: {
        id: data.id,
        email: data.email,
        joinedAt: data.created_at
      }
    })

  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get waitlist stats (public endpoint for showing total count)
    const { data: stats, error } = await supabase
      .from('waitlist_stats')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching waitlist stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: stats.pending_count + stats.invited_count + stats.registered_count,
        pending: stats.pending_count,
        invited: stats.invited_count,
        registered: stats.registered_count,
        lastUpdated: stats.last_updated
      }
    })

  } catch (error) {
    console.error('Waitlist stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}