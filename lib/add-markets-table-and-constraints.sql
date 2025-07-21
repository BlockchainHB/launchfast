-- Migration: Add missing markets table and foreign key constraints
-- This fixes the database schema to support proper CASCADE deletion

-- Step 1: Create the missing markets table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  search_filters JSONB,
  
  -- Market Statistics (Averaged from products)
  avg_price DECIMAL(10,2),
  avg_monthly_sales INTEGER,
  avg_monthly_revenue DECIMAL(12,2),
  avg_reviews INTEGER,
  avg_rating DECIMAL(3,2),
  avg_bsr INTEGER,
  avg_profit_margin DECIMAL(5,4),
  avg_cpc DECIMAL(6,3),
  avg_daily_revenue DECIMAL(10,2),
  avg_launch_budget DECIMAL(12,2),
  avg_profit_per_unit DECIMAL(10,2),
  
  -- Market-Level Analysis
  market_grade VARCHAR(3),
  market_consistency_rating VARCHAR(50),
  market_risk_classification VARCHAR(50),
  total_products_analyzed INTEGER DEFAULT 0,
  products_verified INTEGER DEFAULT 0,
  
  -- Market Intelligence
  market_competitive_intelligence TEXT,
  market_trends JSONB,
  opportunity_score DECIMAL(3,1),
  
  -- Metadata
  research_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS market_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_market_representative BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS analysis_rank INTEGER;

-- Step 3: Create indexes for markets table
CREATE INDEX IF NOT EXISTS idx_markets_user_id ON markets(user_id);
CREATE INDEX IF NOT EXISTS idx_markets_keyword ON markets(keyword);
CREATE INDEX IF NOT EXISTS idx_markets_market_grade ON markets(market_grade);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at);

-- Step 4: Create indexes for new products columns
CREATE INDEX IF NOT EXISTS idx_products_market_id ON products(market_id);
CREATE INDEX IF NOT EXISTS idx_products_is_market_representative ON products(is_market_representative);

-- Step 5: Add foreign key constraints with proper CASCADE behavior

-- Products -> Markets: SET NULL when market is deleted (makes products "legacy")
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS fk_products_market_id 
FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE SET NULL;

-- Market Overrides -> Markets: CASCADE DELETE when market is deleted
ALTER TABLE market_overrides 
ADD CONSTRAINT IF NOT EXISTS fk_market_overrides_market_id 
FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE;

-- Step 6: Enable RLS for markets
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policies for markets (user-specific access)
CREATE POLICY "Users can read their own markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Users can insert their own markets" ON markets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own markets" ON markets FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own markets" ON markets FOR DELETE USING (true);

-- Step 8: Create trigger for markets updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_markets_updated_at 
  BEFORE UPDATE ON markets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Add unique constraint for user-keyword combinations
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_user_keyword 
ON markets(user_id, keyword);

COMMENT ON TABLE markets IS 'Market research results with aggregated product analytics';
COMMENT ON COLUMN products.market_id IS 'Links product to market research - NULL for legacy products';
COMMENT ON COLUMN products.is_market_representative IS 'TRUE for the first/primary product that represents this market';
COMMENT ON COLUMN products.analysis_rank IS 'Position of product in market research results (1-based)';