-- Add Stripe-related fields to user_profiles table
-- Run this in your Supabase SQL editor

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(20);

-- Create index for faster Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer 
ON user_profiles(stripe_customer_id);

-- Create index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status 
ON user_profiles(subscription_status);

-- Update subscription_tier values to match our new plan structure
-- (This is safe because it only updates if the value doesn't already exist)
UPDATE user_profiles 
SET subscription_tier = 'free' 
WHERE subscription_tier IS NULL OR subscription_tier = '';

-- Create usage tracking table for subscription limits
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
  searches_used INTEGER DEFAULT 0,
  csv_exports_used INTEGER DEFAULT 0,
  api_calls_used INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint for user_id + month_year
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_usage_unique 
ON user_usage(user_id, month_year);

-- Enable RLS on user_usage table
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_usage
CREATE POLICY "Users can view own usage data" 
ON user_usage FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert/update their own usage data
CREATE POLICY "Users can insert own usage data" 
ON user_usage FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage data" 
ON user_usage FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to get or create current month usage
CREATE OR REPLACE FUNCTION get_or_create_user_usage(user_id UUID)
RETURNS user_usage AS $$
DECLARE
  current_month VARCHAR(7) := TO_CHAR(NOW(), 'YYYY-MM');
  usage_record user_usage;
BEGIN
  -- Try to get existing record
  SELECT * INTO usage_record
  FROM user_usage
  WHERE user_usage.user_id = get_or_create_user_usage.user_id
    AND month_year = current_month;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_usage (user_id, month_year, searches_used, csv_exports_used, api_calls_used)
    VALUES (get_or_create_user_usage.user_id, current_month, 0, 0, 0)
    RETURNING * INTO usage_record;
  END IF;
  
  RETURN usage_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_or_create_user_usage(UUID) TO authenticated;

COMMENT ON TABLE user_usage IS 'Tracks monthly usage for subscription limits';
COMMENT ON FUNCTION get_or_create_user_usage(UUID) IS 'Gets or creates a usage record for the current month';