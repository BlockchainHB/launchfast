-- Fix market_grade field length to support all grade types
-- Current: VARCHAR(3) - too short for grades like "AVOID" 
-- New: VARCHAR(10) - supports all current and future grade types

ALTER TABLE markets 
ALTER COLUMN market_grade TYPE VARCHAR(10);

-- Verify the change
\d markets;