/**
 * Utility functions for customer verification and email handling
 */

export interface CustomerVerificationResult {
  isLegacyCustomer: boolean;
  priceId: string;
  customerName?: string | null;
  message: string;
}

/**
 * Normalizes email address for consistent lookups
 * - Converts to lowercase
 * - Trims whitespace
 * - Validates format
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email provided');
  }
  
  return email.toLowerCase().trim();
}

/**
 * Validates email format using regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Price IDs for different customer types
 */
export const PRICE_IDS = {
  LEGACY_CUSTOMER: 'price_1RnAMaDWe1hjENea37Yg5myP', // Discounted price for legacy customers
  NEW_CUSTOMER: 'price_1RnrlBDWe1hjENea5v1s4s9H'    // Regular price for new customers
} as const;

/**
 * Customer verification with proper error handling (client-side only)
 * For server-side verification, use direct database calls instead
 */
export async function verifyCustomer(email: string): Promise<CustomerVerificationResult> {
  try {
    const normalizedEmail = normalizeEmail(email);
    
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    const response = await fetch('/api/customer/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (!response.ok) {
      throw new Error(`Verification failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Customer verification error:', error);
    
    // Return safe defaults on error
    return {
      isLegacyCustomer: false,
      priceId: PRICE_IDS.NEW_CUSTOMER,
      message: 'Verification unavailable, using regular pricing'
    };
  }
}

/**
 * Server-side customer verification using direct database access
 * Use this in API routes instead of verifyCustomer()
 */
export async function verifyCustomerServerSide(
  email: string, 
  supabaseAdmin: any
): Promise<CustomerVerificationResult> {
  try {
    const normalizedEmail = normalizeEmail(email);
    
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    const { data: legacyCustomer, error } = await supabaseAdmin
      .from('legacyx_customers')
      .select('id, customer_name, customer_email')
      .eq('customer_email', normalizedEmail)
      .single();

    const isLegacyCustomer = !error && !!legacyCustomer;
    const priceId = isLegacyCustomer ? PRICE_IDS.LEGACY_CUSTOMER : PRICE_IDS.NEW_CUSTOMER;

    return {
      isLegacyCustomer,
      priceId,
      customerName: legacyCustomer?.customer_name || null,
      message: isLegacyCustomer 
        ? 'Welcome back! You qualify for our legacy customer discount.'
        : 'New customer pricing applied.'
    };
  } catch (error) {
    console.error('Server-side customer verification error:', error);
    
    // Return safe defaults on error
    return {
      isLegacyCustomer: false,
      priceId: PRICE_IDS.NEW_CUSTOMER,
      message: 'Verification unavailable, using regular pricing'
    };
  }
}

/**
 * Get price ID for customer type
 */
export function getPriceIdForCustomer(isLegacyCustomer: boolean): string {
  return isLegacyCustomer ? PRICE_IDS.LEGACY_CUSTOMER : PRICE_IDS.NEW_CUSTOMER;
}

/**
 * Format customer type for display
 */
export function formatCustomerType(isLegacyCustomer: boolean): string {
  return isLegacyCustomer ? 'Legacy Customer' : 'New Customer';
}

/**
 * Get pricing message for customer
 */
export function getPricingMessage(isLegacyCustomer: boolean): string {
  return isLegacyCustomer 
    ? 'Welcome back! You qualify for our legacy customer discount.'
    : 'New customer pricing applied.';
}