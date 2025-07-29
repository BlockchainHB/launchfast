import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'
import { 
  trialReminderEmail, 
  trialExpiredEmail, 
  trialWelcomeEmail 
} from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Verify this is called from a trusted source (add API key check in production)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const results = {
      welcome: 0,
      reminder: 0,
      expired: 0,
      errors: [] as string[]
    }

    console.log('🔄 Starting trial email reminder job...')

    // Get all active trial users with their trial info
    const { data: activeTrials, error } = await supabaseAdmin
      .from('promo_code_redemptions')
      .select(`
        *,
        promo_codes (
          code,
          description,
          trial_days
        )
      `)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching active trials:', error)
      return NextResponse.json(
        { error: 'Failed to fetch trials' },
        { status: 500 }
      )
    }

    if (!activeTrials || activeTrials.length === 0) {
      console.log('ℹ️ No active trials found')
      return NextResponse.json({ 
        message: 'No active trials found',
        results 
      })
    }

    console.log(`📧 Processing ${activeTrials.length} active trials...`)

    for (const trial of activeTrials) {
      try {
        // Get user profile to get email
        const { data: userProfile, error: userError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', trial.user_id)
          .single()

        if (userError || !userProfile) {
          console.error(`User profile not found for trial ${trial.id}:`, userError)
          results.errors.push(`User profile not found for trial ${trial.id}`)
          continue
        }

        // Get user auth record for email
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(trial.user_id)
        if (authError || !user?.email) {
          console.error(`User auth record not found for trial ${trial.id}:`, authError)
          results.errors.push(`User auth record not found for trial ${trial.id}`)
          continue
        }

        const now = new Date()
        const trialEndDate = new Date(trial.trial_end_date)
        const trialStartDate = new Date(trial.trial_start_date)
        const msUntilExpiry = trialEndDate.getTime() - now.getTime()
        const daysRemaining = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24))
        const hoursFromStart = (now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60)

        // Check if trial just started (within first 2 hours) - send welcome email
        if (hoursFromStart <= 2 && hoursFromStart >= 0) {
          const welcomeEmailSent = await checkEmailSent(trial.id, 'welcome')
          if (!welcomeEmailSent) {
            await resend.emails.send({
              from: 'Launch Fast <noreply@updates.launchfastlegacyx.com>',
              to: user.email,
              subject: '🎉 Your LaunchFast Trial is Active - Start Exploring!',
              html: trialWelcomeEmail(
                trial.promo_codes?.code || '', 
                trial.trial_end_date,
                user.email
              )
            })

            await recordEmailSent(trial.id, 'welcome')
            results.welcome++
            console.log(`✅ Welcome email sent to ${user.email}`)
          }
        }

        // Check if trial has expired
        if (daysRemaining <= 0) {
          const expiredEmailSent = await checkEmailSent(trial.id, 'expired')
          if (!expiredEmailSent) {
            await resend.emails.send({
              from: 'Launch Fast <noreply@updates.launchfastlegacyx.com>',
              to: user.email,
              subject: '🚨 Your LaunchFast Trial Has Expired - Reactivate Now',
              html: trialExpiredEmail(
                trial.promo_codes?.code || '',
                user.email
              )
            })

            await recordEmailSent(trial.id, 'expired')
            results.expired++
            console.log(`⚠️ Expired email sent to ${user.email}`)
          }
          continue
        }

        // Send reminder emails at specific intervals
        const shouldSendReminder = (
          daysRemaining === 5 ||
          daysRemaining === 3 ||
          daysRemaining === 1
        )

        if (shouldSendReminder) {
          const reminderType = `reminder_day_${daysRemaining}`
          const reminderEmailSent = await checkEmailSent(trial.id, reminderType)
          
          if (!reminderEmailSent) {
            let subject = ''
            if (daysRemaining === 1) {
              subject = '🚨 FINAL NOTICE: Your LaunchFast Trial Expires Tomorrow!'
            } else if (daysRemaining === 3) {
              subject = '⚠️ Only 3 Days Left in Your LaunchFast Trial'
            } else {
              subject = '✨ 5 Days Remaining in Your LaunchFast Trial'
            }

            await resend.emails.send({
              from: 'Launch Fast <noreply@updates.launchfastlegacyx.com>',
              to: user.email,
              subject: subject,
              html: trialReminderEmail(
                daysRemaining,
                trial.promo_codes?.code || '',
                user.email
              )
            })

            await recordEmailSent(trial.id, reminderType)
            results.reminder++
            console.log(`📬 Reminder (${daysRemaining}d) sent to ${user.email}`)
          }
        }

      } catch (emailError) {
        console.error(`Error processing trial ${trial.id}:`, emailError)
        results.errors.push(`Error processing trial ${trial.id}: ${emailError}`)
      }
    }

    console.log('✅ Trial email job completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Trial reminder emails processed',
      results
    })

  } catch (error) {
    console.error('Trial reminder job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to check if email was already sent
async function checkEmailSent(trialId: string, emailType: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('trial_email_log')
      .select('id')
      .eq('trial_id', trialId)
      .eq('email_type', emailType)
      .single()

    return !error && !!data
  } catch (error) {
    return false
  }
}

// Helper function to record that email was sent
async function recordEmailSent(trialId: string, emailType: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('trial_email_log')
      .insert({
        trial_id: trialId,
        email_type: emailType,
        sent_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error recording email sent:', error)
  }
}

// Manual trigger endpoint for testing
export async function GET(request: NextRequest) {
  // Only allow in development or with proper auth
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Use POST with proper authentication' },
      { status: 405 }
    )
  }

  // Trigger the same logic as POST
  return POST(request)
}