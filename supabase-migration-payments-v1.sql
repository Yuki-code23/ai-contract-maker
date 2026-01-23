
-- Add billing_type column to distinguish between receivables and payables
-- Default to 'receivable' for existing records
ALTER TABLE billings ADD COLUMN billing_type text NOT NULL DEFAULT 'receivable' CHECK (billing_type IN ('receivable', 'payable'));

-- Comment on column
COMMENT ON COLUMN billings.billing_type IS 'receivable: 請求書 (Inflow), payable: 支払通知書 (Outflow)';
