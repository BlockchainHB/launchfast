-- Create supplier_save_batches table for grouping saved suppliers by search context
CREATE TABLE IF NOT EXISTS supplier_save_batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Market-driven search context (fixed to use UUID to match markets table)
  market_id UUID REFERENCES markets(id),
  keyword TEXT, -- The original keyword from market research
  
  -- Search context
  search_query TEXT NOT NULL, -- What was actually searched
  search_source TEXT CHECK (search_source IN ('market_research', 'direct_search')),
  
  -- Batch information
  batch_name TEXT NOT NULL,
  total_suppliers_saved INTEGER DEFAULT 0,
  suppliers_skipped INTEGER DEFAULT 0,
  
  -- Market context data (JSON)
  market_context JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS (Row Level Security)
ALTER TABLE supplier_save_batches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own save batches
CREATE POLICY "Users can view own save batches" ON supplier_save_batches
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own save batches" ON supplier_save_batches
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own save batches" ON supplier_save_batches
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Indexes for performance
CREATE INDEX idx_supplier_save_batches_user_id ON supplier_save_batches(user_id);
CREATE INDEX idx_supplier_save_batches_market_id ON supplier_save_batches(market_id);
CREATE INDEX idx_supplier_save_batches_created_at ON supplier_save_batches(created_at DESC);
CREATE INDEX idx_supplier_save_batches_search_source ON supplier_save_batches(search_source);

-- Add save_batch_id column to supplier_relationships table
ALTER TABLE supplier_relationships ADD COLUMN IF NOT EXISTS save_batch_id TEXT REFERENCES supplier_save_batches(id);

-- Add market context columns to supplier_relationships (if not already exist)
ALTER TABLE supplier_relationships ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES markets(id);
ALTER TABLE supplier_relationships ADD COLUMN IF NOT EXISTS profit_projection DECIMAL(10,2);
ALTER TABLE supplier_relationships ADD COLUMN IF NOT EXISTS market_grade TEXT;

-- Index for the new relationship
CREATE INDEX IF NOT EXISTS idx_supplier_relationships_save_batch_id ON supplier_relationships(save_batch_id);
CREATE INDEX IF NOT EXISTS idx_supplier_relationships_market_id ON supplier_relationships(market_id);