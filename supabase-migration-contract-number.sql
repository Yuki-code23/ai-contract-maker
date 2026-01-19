-- Migration to add contract_number to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_number TEXT;
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);

-- Update existing contracts with a default number if needed
UPDATE contracts SET contract_number = 'CNT-' || id WHERE contract_number IS NULL;
