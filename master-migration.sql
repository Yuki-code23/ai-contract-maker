-- Consolidated Migration for Invoice & Contract Linking Features

-- 1. Update billings table for Recurring Billing
ALTER TABLE IF EXISTS billings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS billings ADD COLUMN IF NOT EXISTS recurring_interval TEXT;

-- 2. Make contract_id nullable for Standalone Invoices
ALTER TABLE IF EXISTS billings ALTER COLUMN contract_id DROP NOT NULL;

-- 3. Update contracts table for Management Numbers and Metadata
ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS contract_number TEXT;
ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);

-- 4. Backfill existing contracts with default numbers
UPDATE contracts SET contract_number = 'CNT-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(id::text, 3, '0') 
WHERE contract_number IS NULL;

-- 5. Refresh PostgREST schema cache (Supabase specific)
-- Note: This is usually done via NOTIFY or restarting the project but we include it as a comment reminder
-- NOTIFY pgrst, 'reload schema';
