import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeEmail, isValidEmail, PRICE_IDS } from '@/lib/customer-utils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    let normalizedEmail: string;
    try {
      normalizedEmail = normalizeEmail(email);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid email provided' },
        { status: 400 }
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email exists in legacyx_customers table
    const { data: legacyCustomer, error } = await supabaseAdmin
      .from('legacyx_customers')
      .select('id, customer_name, customer_email')
      .eq('customer_email', normalizedEmail)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const isLegacyCustomer = !!legacyCustomer;
    const priceId = isLegacyCustomer 
      ? PRICE_IDS.LEGACY_CUSTOMER // Legacy customer discount
      : PRICE_IDS.NEW_CUSTOMER; // Regular price

    return NextResponse.json({
      isLegacyCustomer,
      priceId,
      customerName: legacyCustomer?.customer_name || null,
      message: isLegacyCustomer 
        ? 'Welcome back! You qualify for our legacy customer discount.'
        : 'New customer pricing applied.'
    });

  } catch (error) {
    console.error('Customer verification error:', error);
    
    // Return safe defaults on any error to ensure checkout can proceed
    return NextResponse.json({
      isLegacyCustomer: false,
      priceId: PRICE_IDS.NEW_CUSTOMER,
      customerName: null,
      message: 'Verification unavailable, using regular pricing',
      error: 'Verification service temporarily unavailable'
    }, { 
      status: 200 // Return 200 so checkout can proceed with default pricing
    });
  }
}