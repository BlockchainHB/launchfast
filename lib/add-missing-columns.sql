-- Add missing columns to product_overrides table
-- Run this in Supabase SQL Editor to add the missing fields

-- Sales Data fields
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS cogs DECIMAL(10,2);
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS margin DECIMAL(5,4);

-- Calculated Metrics fields
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS daily_revenue DECIMAL(10,2);
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS fulfillment_fees DECIMAL(10,2);
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS launch_budget DECIMAL(12,2);
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS profit_per_unit_after_launch DECIMAL(10,2);
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS variations INTEGER;

-- CPC and Weight
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(6,3);
ALTER TABLE product_overrides ADD COLUMN IF NOT EXISTS weight DECIMAL(8,3);

-- Update grade field to support longer grades (A10, B5, etc.)
ALTER TABLE product_overrides ALTER COLUMN grade TYPE VARCHAR(3);

-- Also add these fields to the main products table for completeness (optional)
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID;
-- ALTER TABLE products ALTER COLUMN grade TYPE VARCHAR(3);