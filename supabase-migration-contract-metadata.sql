-- Add metadata column to contracts table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'metadata') THEN
        ALTER TABLE contracts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
