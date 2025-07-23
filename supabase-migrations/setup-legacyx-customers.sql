-- Create index on customer_email for fast lookups
CREATE INDEX IF NOT EXISTS idx_legacyx_customers_email 
ON legacyx_customers(customer_email);

-- Create index on lowercase email for case-insensitive lookups
CREATE INDEX IF NOT EXISTS idx_legacyx_customers_email_lower 
ON legacyx_customers(LOWER(customer_email));

-- Enable Row Level Security on legacyx_customers table
ALTER TABLE legacyx_customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to read all customer data
CREATE POLICY "Service role can read all customer data" ON legacyx_customers
    FOR SELECT USING (true);

-- Create policy to allow authenticated users to read their own customer data (if needed)
CREATE POLICY "Users can read their own customer data" ON legacyx_customers
    FOR SELECT USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create audit table for customer verifications
CREATE TABLE IF NOT EXISTS customer_verification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    is_legacy_customer BOOLEAN NOT NULL,
    price_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on verification logs for reporting
CREATE INDEX IF NOT EXISTS idx_verification_logs_email 
ON customer_verification_logs(email);

CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at 
ON customer_verification_logs(created_at);

-- Enable RLS on verification logs
ALTER TABLE customer_verification_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role to insert verification logs
CREATE POLICY "Service role can insert verification logs" ON customer_verification_logs
    FOR INSERT WITH CHECK (true);

-- Policy for service role to read verification logs
CREATE POLICY "Service role can read verification logs" ON customer_verification_logs
    FOR SELECT USING (true);