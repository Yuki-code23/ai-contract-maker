-- Add payment_date column to billings table
ALTER TABLE billings
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Add comment
COMMENT ON COLUMN billings.payment_date IS '入金日 - Date when payment was received';
