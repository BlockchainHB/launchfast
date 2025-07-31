-- Enhance supplier_relationships table with rich Alibaba supplier data
-- This migration adds comprehensive supplier intelligence columns

-- 1. Pricing data columns
ALTER TABLE supplier_relationships 
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS price_min NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_max NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS payment_terms TEXT[];

-- 2. Alibaba ratings and performance columns
ALTER TABLE supplier_relationships 
ADD COLUMN IF NOT EXISTS alibaba_rating NUMERIC(3,2) CHECK (alibaba_rating >= 0 AND alibaba_rating <= 5),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_rate INTEGER CHECK (response_rate >= 0 AND response_rate <= 100),
ADD COLUMN IF NOT EXISTS on_time_delivery INTEGER CHECK (on_time_delivery >= 0 AND on_time_delivery <= 100);

-- 3. Additional supplier metrics columns
ALTER TABLE supplier_relationships 
ADD COLUMN IF NOT EXISTS supplier_assessment NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS transaction_level TEXT,
ADD COLUMN IF NOT EXISTS trade_assurance_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS main_products TEXT[],
ADD COLUMN IF NOT EXISTS total_products INTEGER,
ADD COLUMN IF NOT EXISTS certifications TEXT[],
ADD COLUMN IF NOT EXISTS established_year INTEGER,
ADD COLUMN IF NOT EXISTS employees_range TEXT,
ADD COLUMN IF NOT EXISTS annual_revenue_range TEXT,
ADD COLUMN IF NOT EXISTS export_percentage INTEGER;

-- 4. Enhanced contact and business info columns
ALTER TABLE supplier_relationships 
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS trade_manager TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS company_profile TEXT,
ADD COLUMN IF NOT EXISTS average_lead_time INTEGER;

-- Add indexes for performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_supplier_relationships_alibaba_rating ON supplier_relationships(alibaba_rating);
CREATE INDEX IF NOT EXISTS idx_supplier_relationships_unit_price ON supplier_relationships(unit_price);
CREATE INDEX IF NOT EXISTS idx_supplier_relationships_established_year ON supplier_relationships(established_year);
CREATE INDEX IF NOT EXISTS idx_supplier_relationships_response_rate ON supplier_relationships(response_rate);

-- Add comments for documentation
COMMENT ON COLUMN supplier_relationships.unit_price IS 'Current unit price from supplier';
COMMENT ON COLUMN supplier_relationships.price_min IS 'Minimum price from price range';
COMMENT ON COLUMN supplier_relationships.price_max IS 'Maximum price from price range';
COMMENT ON COLUMN supplier_relationships.alibaba_rating IS 'Supplier rating on Alibaba (0-5 stars)';
COMMENT ON COLUMN supplier_relationships.review_count IS 'Number of reviews on Alibaba';
COMMENT ON COLUMN supplier_relationships.response_rate IS 'Supplier response rate percentage';
COMMENT ON COLUMN supplier_relationships.on_time_delivery IS 'On-time delivery percentage';
COMMENT ON COLUMN supplier_relationships.supplier_assessment IS 'Overall supplier assessment score';
COMMENT ON COLUMN supplier_relationships.trade_assurance_amount IS 'Trade assurance coverage amount in USD';
COMMENT ON COLUMN supplier_relationships.main_products IS 'Array of main product categories';
COMMENT ON COLUMN supplier_relationships.certifications IS 'Array of supplier certifications';
COMMENT ON COLUMN supplier_relationships.company_profile IS 'Detailed company profile/description';
COMMENT ON COLUMN supplier_relationships.average_lead_time IS 'Average lead time in days';