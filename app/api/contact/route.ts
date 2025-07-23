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
  subject: string
  message: string
  type: 'payment' | 'general'
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message, type }: ContactFormData = await request.json()

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim() || !type) {
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

    // Format type for display
    const typeLabels: Record<string, string> = {
      'payment': 'Payment Support',
      'general': 'General Inquiry'
    }

    const typeLabel = typeLabels[type] || type

    // Store contact submission in database (optional - will silently fail if table doesn't exist)
    let submission: { id?: string } = {}
    try {
      const { data, error: dbError } = await supabase
        .from('contact_submissions')
        .insert([
          {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            subject: subject.trim(),
            type,
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
        subject: `[${typeLabel.toUpperCase()}] ${subject} - ${name}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>LaunchFast Contact Form</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #6231A3 0%, #4C1D95 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
                .field { margin-bottom: 20px; }
                .label { font-weight: 600; color: #6231A3; margin-bottom: 5px; display: block; }
                .value { background: white; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; }
                .type-badge { display: inline-block; background: ${type === 'payment' ? '#3B82F6' : '#6231A3'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">LaunchFast Contact Form</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">New message received</p>
                </div>
                <div class="content">
                  <div class="type-badge">${typeLabel.toUpperCase()}</div>
                  
                  <div class="field">
                    <label class="label">From:</label>
                    <div class="value">${name} &lt;${email}&gt;</div>
                  </div>
                  
                  <div class="field">
                    <label class="label">Subject:</label>
                    <div class="value">${subject}</div>
                  </div>
                  
                  <div class="field">
                    <label class="label">Message:</label>
                    <div class="value" style="white-space: pre-wrap;">${message}</div>
                  </div>
                  
                  <div class="field">
                    <label class="label">Submission Details:</label>
                    <div class="value">
                      <strong>ID:</strong> ${submission?.id || 'N/A'}<br>
                      <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
                      <strong>IP:</strong> ${requestMetadata.ip}<br>
                      <strong>User Agent:</strong> ${requestMetadata.userAgent}
                    </div>
                  </div>
                  
                  <div class="footer">
                    <p>This message was sent through the LaunchFast contact form.</p>
                    <p>Reply directly to this email to respond to ${name}.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
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
          <p>We've received your ${typeLabel.toLowerCase()} and will get back to you within 24 hours.</p>
          
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