-- Fix grade columns to accept 3 characters (A10, B7, F1, etc.)

-- Update markets table
ALTER TABLE markets ALTER COLUMN market_grade TYPE VARCHAR(3);

-- Update products table  
ALTER TABLE products ALTER COLUMN grade TYPE VARCHAR(3);