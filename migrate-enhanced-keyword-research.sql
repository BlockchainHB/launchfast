-- ===== ENHANCED KEYWORD RESEARCH DATABASE MIGRATION =====
-- This migration aligns the database with the enhanced keyword research interfaces
-- Run this to update your schema after the enhanced keyword research implementation

-- 1. Add enhanced fields to keyword_research_keywords table
ALTER TABLE keyword_research_keywords 
ADD COLUMN IF NOT EXISTS purchases INTEGER,
ADD COLUMN IF NOT EXISTS purchase_rate DECIMAL(8,6),
ADD COLUMN IF NOT EXISTS monopoly_click_rate DECIMAL(8,6),
ADD COLUMN IF NOT EXISTS cvs_share_rate DECIMAL(8,6),
ADD COLUMN IF NOT EXISTS products_count INTEGER,
ADD COLUMN IF NOT EXISTS ad_products_count INTEGER,
ADD COLUMN IF NOT EXISTS supply_demand_ratio DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS avg_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS avg_ratings INTEGER,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS bid_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS bid_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS title_density DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS relevancy_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS spr_rank INTEGER,
ADD COLUMN IF NOT EXISTS search_rank INTEGER,
ADD COLUMN IF NOT EXISTS departments JSONB,
ADD COLUMN IF NOT EXISTS amazon_choice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_supplement BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS keyword_cn TEXT,
ADD COLUMN IF NOT EXISTS keyword_jp TEXT,
ADD COLUMN IF NOT EXISTS marketplace VARCHAR(10) DEFAULT 'US',
ADD COLUMN IF NOT EXISTS data_month VARCHAR(6),
ADD COLUMN IF NOT EXISTS opportunity_score_enhanced DECIMAL(8,4);

-- 2. Add enhanced fields to research_opportunities table
ALTER TABLE research_opportunities 
ADD COLUMN IF NOT EXISTS purchases INTEGER,
ADD COLUMN IF NOT EXISTS purchase_rate DECIMAL(8,6),
ADD COLUMN IF NOT EXISTS monopoly_click_rate DECIMAL(8,6),
ADD COLUMN IF NOT EXISTS cvs_share_rate DECIMAL(8,6),
ADD COLUMN IF NOT EXISTS products_count INTEGER,
ADD COLUMN IF NOT EXISTS ad_products_count INTEGER,
ADD COLUMN IF NOT EXISTS avg_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS avg_ratings INTEGER,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS bid_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS bid_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS title_density DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS relevancy_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS spr_rank INTEGER,
ADD COLUMN IF NOT EXISTS search_rank INTEGER,
ADD COLUMN IF NOT EXISTS departments JSONB,
ADD COLUMN IF NOT EXISTS amazon_choice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_supplement BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS market_attractiveness_score DECIMAL(8,4);

-- 3. Create new KeywordMiningHistory table for historical data tracking
CREATE TABLE IF NOT EXISTS keyword_mining_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES keyword_research_keywords(id) ON DELETE CASCADE,
    session_id UUID REFERENCES keyword_research_sessions(id) ON DELETE CASCADE,
    
    -- Snapshot of mining data
    data_month VARCHAR(6) NOT NULL, -- 202201 format
    searches INTEGER,
    purchases INTEGER,
    purchase_rate DECIMAL(8,6),
    monopoly_click_rate DECIMAL(8,6),
    products_count INTEGER,
    ad_products_count INTEGER,
    supply_demand_ratio DECIMAL(10,2),
    avg_price DECIMAL(10,2),
    avg_ratings INTEGER,
    avg_rating DECIMAL(3,2),
    bid_min DECIMAL(10,2),
    bid_max DECIMAL(10,2),
    avg_bid DECIMAL(10,2),
    title_density DECIMAL(5,2),
    relevancy_score DECIMAL(5,2),
    word_count INTEGER,
    spr_rank INTEGER,
    search_rank INTEGER,
    amazon_choice BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add enhanced reverse ASIN fields to asin_keyword_rankings table
ALTER TABLE asin_keyword_rankings 
ADD COLUMN IF NOT EXISTS products_count INTEGER,
ADD COLUMN IF NOT EXISTS purchase_rate DECIMAL(8,6),
ADD COLUMN IF NOT EXISTS bid_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS bid_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS badges JSONB,
ADD COLUMN IF NOT EXISTS rank_overall INTEGER,
ADD COLUMN IF NOT EXISTS position_absolute INTEGER,
ADD COLUMN IF NOT EXISTS page_number INTEGER,
ADD COLUMN IF NOT EXISTS latest_1_days_ads INTEGER,
ADD COLUMN IF NOT EXISTS latest_7_days_ads INTEGER,
ADD COLUMN IF NOT EXISTS latest_30_days_ads INTEGER,
ADD COLUMN IF NOT EXISTS supply_demand_ratio DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS traffic_keyword_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS conversion_keyword_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS calculated_weekly_searches INTEGER,
ADD COLUMN IF NOT EXISTS updated_time TIMESTAMPTZ;

-- 5. Update existing indexes for performance with new fields
CREATE INDEX IF NOT EXISTS idx_keywords_supply_demand_ratio ON keyword_research_keywords(supply_demand_ratio);
CREATE INDEX IF NOT EXISTS idx_keywords_avg_price ON keyword_research_keywords(avg_price);
CREATE INDEX IF NOT EXISTS idx_keywords_purchase_rate ON keyword_research_keywords(purchase_rate);
CREATE INDEX IF NOT EXISTS idx_keywords_products_count ON keyword_research_keywords(products_count);
CREATE INDEX IF NOT EXISTS idx_keywords_opportunity_score_enhanced ON keyword_research_keywords(opportunity_score_enhanced);

CREATE INDEX IF NOT EXISTS idx_opportunities_market_attractiveness ON research_opportunities(market_attractiveness_score);
CREATE INDEX IF NOT EXISTS idx_opportunities_purchases ON research_opportunities(purchases);
CREATE INDEX IF NOT EXISTS idx_opportunities_avg_price ON research_opportunities(avg_price);

CREATE INDEX IF NOT EXISTS idx_mining_history_data_month ON keyword_mining_history(data_month);
CREATE INDEX IF NOT EXISTS idx_mining_history_keyword_id ON keyword_mining_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_mining_history_session_id ON keyword_mining_history(session_id);

CREATE INDEX IF NOT EXISTS idx_rankings_supply_demand ON asin_keyword_rankings(supply_demand_ratio);
CREATE INDEX IF NOT EXISTS idx_rankings_latest_30_days_ads ON asin_keyword_rankings(latest_30_days_ads);

-- 6. Add comments for documentation
COMMENT ON COLUMN keyword_research_keywords.purchases IS 'Monthly purchase volume from SellerSprite Keyword Mining API';
COMMENT ON COLUMN keyword_research_keywords.purchase_rate IS 'Conversion rate from searches to purchases (0.0925 = 9.25%)';
COMMENT ON COLUMN keyword_research_keywords.monopoly_click_rate IS 'Market concentration - top products click share';
COMMENT ON COLUMN keyword_research_keywords.supply_demand_ratio IS 'Supply vs demand ratio for keyword competitiveness';
COMMENT ON COLUMN keyword_research_keywords.opportunity_score_enhanced IS 'Enhanced opportunity score using comprehensive market data';

COMMENT ON COLUMN research_opportunities.market_attractiveness_score IS 'Computed market attractiveness based on purchases, conversion, price, and quality';

COMMENT ON TABLE keyword_mining_history IS 'Historical snapshots of keyword mining data for trend analysis';

-- 7. Create views for enhanced analytics
CREATE OR REPLACE VIEW enhanced_keyword_analytics AS
SELECT 
    k.id,
    k.keyword_text,
    k.search_volume,
    k.cpc,
    k.purchases,
    k.purchase_rate,
    k.supply_demand_ratio,
    k.avg_price,
    k.avg_rating,
    k.products_count,
    k.ad_products_count,
    k.opportunity_score_enhanced,
    CASE 
        WHEN k.supply_demand_ratio <= 5 THEN 'Low Competition'
        WHEN k.supply_demand_ratio <= 15 THEN 'Medium Competition'
        ELSE 'High Competition'
    END as competition_level,
    CASE 
        WHEN k.purchase_rate >= 0.08 THEN 'High Converting'
        WHEN k.purchase_rate >= 0.04 THEN 'Medium Converting'
        ELSE 'Low Converting'
    END as conversion_level
FROM keyword_research_keywords k
WHERE k.opportunity_score_enhanced IS NOT NULL;

CREATE OR REPLACE VIEW market_opportunity_summary AS
SELECT 
    o.session_id,
    COUNT(*) as total_opportunities,
    AVG(o.purchases) as avg_monthly_purchases,
    AVG(o.purchase_rate) as avg_conversion_rate,
    AVG(o.avg_price) as avg_market_price,
    AVG(o.supply_demand_ratio) as avg_competition,
    AVG(o.market_attractiveness_score) as avg_attractiveness
FROM research_opportunities o
WHERE o.market_attractiveness_score IS NOT NULL
GROUP BY o.session_id;

-- 8. Update any existing data (run with caution - backup first)
-- This sets default values for existing records
UPDATE keyword_research_keywords 
SET 
    marketplace = 'US',
    amazon_choice = FALSE,
    is_supplement = FALSE
WHERE marketplace IS NULL;

UPDATE research_opportunities 
SET 
    amazon_choice = FALSE,
    is_supplement = FALSE
WHERE amazon_choice IS NULL;

-- 9. Grant permissions (adjust role names as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_mining_history TO your_app_role;
-- GRANT SELECT ON enhanced_keyword_analytics TO your_app_role;
-- GRANT SELECT ON market_opportunity_summary TO your_app_role;

-- ===== MIGRATION COMPLETE =====
-- Your database is now aligned with the enhanced keyword research interfaces
-- You can now capture and store all the additional fields from:
-- - Enhanced Reverse ASIN API (20+ new fields)
-- - Enhanced Keyword Mining API (25+ new fields)
-- - Historical tracking for trend analysis
-- - Advanced analytics views for insights

COMMIT;