-- Make contract_id nullable to support standalone invoices
ALTER TABLE billings ALTER COLUMN contract_id DROP NOT NULL;
