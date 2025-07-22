import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY!)

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ContactFormData {
  name: string
  email: string
  category: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, category, message }: ContactFormData = await request.json()

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !category || !message?.trim()) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Extract metadata from request
    const requestMetadata = {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      timestamp: new Date().toISOString()
    }

    // Format category for display
    const categoryLabels: Record<string, string> = {
      'billing': 'Billing',
      'error-report': 'Error Report',
      'customer-service': 'Customer Service',
      'feedback': 'Feedback'
    }

    const categoryLabel = categoryLabels[category] || category

    // Store contact submission in database (optional - will silently fail if table doesn't exist)
    let submission: { id?: string } = {}
    try {
      const { data, error: dbError } = await supabase
        .from('contact_submissions')
        .insert([
          {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            category,
            message: message.trim(),
            status: 'pending',
            metadata: requestMetadata
          }
        ])
        .select('id')
        .single()
      
      if (!dbError) {
        submission = data
      }
    } catch (dbError) {
      console.log('Database storage skipped - table may not exist:', dbError)
    }

    // Send email notification using Resend
    try {
      await resend.emails.send({
        from: 'Launch Fast <noreply@updates.launchfastlegacyx.com>',
        to: ['launchfastlegacyx@gmail.com'],
        replyTo: email,
        subject: `Contact Form: ${categoryLabel} - ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Category:</strong> ${categoryLabel}</p>
          <p><strong>Submission ID:</strong> ${submission?.id || 'N/A'}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          
          <h3>Message:</h3>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 16px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <hr style="margin: 32px 0;">
          <p><strong>Note:</strong> Customer was informed about Discord support for instant help.</p>
          <p style="color: #666; font-size: 14px;">
            User Agent: ${requestMetadata.userAgent}<br>
            IP Address: ${requestMetadata.ip}<br>
            Referrer: ${requestMetadata.referer}
          </p>
        `
      })
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
      // Don't fail the entire request if email fails - submission is still recorded
    }

    // Send auto-reply to user
    try {
      await resend.emails.send({
        from: 'Launch Fast Support <support@updates.launchfastlegacyx.com>',
        to: email,
        subject: 'We received your message - Launch Fast Support',
        html: `
          <h2>Thank you for contacting us!</h2>
          <p>Hi ${name},</p>
          <p>We've received your ${categoryLabel.toLowerCase()} inquiry and will get back to you within 24 hours.</p>
          
          <h3>Your message:</h3>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <p><strong>Expected Response Time:</strong> Within 24 hours</p>
          
          <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #1976d2;">Need Instant Support?</p>
            <p style="margin: 8px 0 0 0;">Join our Discord Support Server for immediate help: <a href="https://discord.gg/RnXpM6h3BG" style="color: #1976d2;">https://discord.gg/RnXpM6h3BG</a></p>
          </div>
          
          <p>Best regards,<br>
          The Launch Fast Team</p>
          
          <hr style="margin: 32px 0;">
          <p style="color: #666; font-size: 12px;">
            For immediate assistance, join our Discord server or reply to this email.
          </p>
        `
      })
    } catch (autoReplyError) {
      console.error('Failed to send auto-reply:', autoReplyError)
      // Don't fail the request if auto-reply fails
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.',
      data: {
        id: submission?.id,
        timestamp: requestMetadata.timestamp
      }
    })

  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}