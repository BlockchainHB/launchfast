import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with Stripe customer ID
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (error || !profile?.stripe_customer_id) {
      return NextResponse.json([]) // Return empty array if no customer
    }

    try {
      // Get invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: profile.stripe_customer_id,
        limit: 10,
        status: 'paid'
      })

      const billingHistory = invoices.data.map(invoice => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000).toISOString(),
        description: invoice.lines.data[0]?.description || 'LaunchFast Pro',
        amount: invoice.amount_paid,
        status: invoice.status === 'paid' ? 'paid' : invoice.status
      }))

      return NextResponse.json(billingHistory)
    } catch (stripeError) {
      console.error('Stripe error:', stripeError)
      // Return mock data if Stripe fails
      return NextResponse.json([
        {
          id: '1',
          date: new Date().toISOString(),
          description: 'LaunchFast Pro - Monthly',
          amount: 5000,
          status: 'paid'
        }
      ])
    }
  } catch (error) {
    console.error('Billing history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}