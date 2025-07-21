-- SellerSprite Dashboard Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asin VARCHAR(10) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  brand VARCHAR(255),
  price DECIMAL(10,2) NOT NULL,
  bsr INTEGER,
  reviews INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  monthly_sales INTEGER,
  monthly_revenue DECIMAL(12,2),
  profit_estimate DECIMAL(10,2),
  grade VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keywords table
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  competition_score DECIMAL(3,2),
  avg_cpc DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(keyword)
);

-- Product-Keywords junction table
CREATE TABLE IF NOT EXISTS product_keywords (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
  ranking_position INTEGER,
  traffic_percentage DECIMAL(5,2),
  PRIMARY KEY (product_id, keyword_id)
);

-- AI Analysis table
CREATE TABLE IF NOT EXISTS ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  risk_classification VARCHAR(50) NOT NULL,
  consistency_rating VARCHAR(50) NOT NULL,
  estimated_dimensions VARCHAR(100),
  estimated_weight VARCHAR(50),
  opportunity_score DECIMAL(3,1) NOT NULL,
  market_insights JSONB,
  risk_factors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Search sessions table (for tracking user searches)
CREATE TABLE IF NOT EXISTS search_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  filters JSONB,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_asin ON products(asin);
CREATE INDEX IF NOT EXISTS idx_products_grade ON products(grade);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_product_id ON ai_analysis(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert on products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on products" ON products FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on keywords" ON keywords FOR SELECT USING (true);
CREATE POLICY "Allow public insert on keywords" ON keywords FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on product_keywords" ON product_keywords FOR SELECT USING (true);
CREATE POLICY "Allow public insert on product_keywords" ON product_keywords FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on ai_analysis" ON ai_analysis FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ai_analysis" ON ai_analysis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on ai_analysis" ON ai_analysis FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on search_sessions" ON search_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on search_sessions" ON search_sessions FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Product Overrides table for batch edits and manual adjustments
CREATE TABLE IF NOT EXISTS product_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- Add user authentication later
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  asin VARCHAR(10) NOT NULL,
  
  -- Override fields (all nullable - only override what's changed)
  title TEXT,
  brand VARCHAR(255),
  price DECIMAL(10,2),
  bsr INTEGER,
  reviews INTEGER,
  rating DECIMAL(3,2),
  
  -- Sales Data fields
  monthly_sales INTEGER,
  monthly_revenue DECIMAL(12,2),
  cogs DECIMAL(10,2),
  margin DECIMAL(5,4), -- 4 decimal precision for percentages (0.1234)
  
  -- Calculated Metrics fields
  daily_revenue DECIMAL(10,2),
  fulfillment_fees DECIMAL(10,2),
  launch_budget DECIMAL(12,2),
  profit_per_unit_after_launch DECIMAL(10,2),
  variations INTEGER,
  
  -- CPC and Weight
  avg_cpc DECIMAL(6,3), -- 3 decimal precision for CPC ($12.345)
  weight DECIMAL(8,3), -- 3 decimal precision for weight (123.456 lbs)
  
  -- Legacy fields
  profit_estimate DECIMAL(10,2),
  grade VARCHAR(3), -- Changed to VARCHAR(3) for grades like A10, B5, etc.
  
  -- AI Analysis overrides
  risk_classification VARCHAR(50),
  consistency_rating VARCHAR(50),
  opportunity_score DECIMAL(3,1),
  
  -- Metadata
  override_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)
);

-- Indexes for overrides table
CREATE INDEX IF NOT EXISTS idx_product_overrides_user_id ON product_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_product_overrides_product_id ON product_overrides(product_id);
CREATE INDEX IF NOT EXISTS idx_product_overrides_asin ON product_overrides(asin);
CREATE INDEX IF NOT EXISTS idx_product_overrides_created_at ON product_overrides(created_at);

-- Enable RLS for overrides
ALTER TABLE product_overrides ENABLE ROW LEVEL SECURITY;

-- Policies for product_overrides (user-specific access)
CREATE POLICY "Users can read their own overrides" ON product_overrides FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own overrides" ON product_overrides FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own overrides" ON product_overrides FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own overrides" ON product_overrides FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger for overrides updated_at
CREATE TRIGGER update_product_overrides_updated_at 
  BEFORE UPDATE ON product_overrides 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Market Overrides table for aggregated market recalculation
CREATE TABLE IF NOT EXISTS market_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  market_id UUID NOT NULL, -- References markets table (create as needed)
  keyword TEXT NOT NULL,
  
  -- Aggregated financial metrics
  avg_price DECIMAL(10,2),
  avg_monthly_sales INTEGER,
  avg_monthly_revenue DECIMAL(12,2),
  avg_daily_revenue DECIMAL(10,2),
  avg_profit_margin DECIMAL(5,4),
  avg_profit_per_unit DECIMAL(10,2),
  
  -- Performance metrics
  avg_reviews INTEGER,
  avg_rating DECIMAL(3,2),
  avg_bsr INTEGER,
  avg_cpc DECIMAL(6,3),
  avg_launch_budget DECIMAL(12,2),
  
  -- Market scoring/classification
  market_grade VARCHAR(3),
  market_consistency_rating VARCHAR(50),
  market_risk_classification VARCHAR(50),
  opportunity_score DECIMAL(3,1),
  
  -- Metadata
  total_products_analyzed INTEGER DEFAULT 0,
  products_verified INTEGER DEFAULT 0,
  override_reason TEXT,
  recalculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, market_id)
);

-- Indexes for market_overrides table
CREATE INDEX IF NOT EXISTS idx_market_overrides_user_id ON market_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_market_overrides_market_id ON market_overrides(market_id);
CREATE INDEX IF NOT EXISTS idx_market_overrides_keyword ON market_overrides(keyword);
CREATE INDEX IF NOT EXISTS idx_market_overrides_created_at ON market_overrides(created_at);

-- Enable RLS for market_overrides
ALTER TABLE market_overrides ENABLE ROW LEVEL SECURITY;

-- Policies for market_overrides (user-specific access)
CREATE POLICY "Users can read their own market overrides" ON market_overrides FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own market overrides" ON market_overrides FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own market overrides" ON market_overrides FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own market overrides" ON market_overrides FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger for market_overrides updated_at
CREATE TRIGGER update_market_overrides_updated_at 
  BEFORE UPDATE ON market_overrides 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();