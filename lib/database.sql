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