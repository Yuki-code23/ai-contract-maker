-- Migration for Enhanced Invoice System (v2/Fixed 2)

-- 1. Create billings table if it doesn't exist
CREATE TABLE IF NOT EXISTS billings (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    issue_date DATE,
    payment_deadline DATE,
    amount NUMERIC,
    status TEXT DEFAULT 'Planned',
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Update billings table columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billings' AND column_name = 'invoice_number') THEN
        ALTER TABLE billings ADD COLUMN invoice_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billings' AND column_name = 'items') THEN
        ALTER TABLE billings ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billings' AND column_name = 'client_info') THEN
        ALTER TABLE billings ADD COLUMN client_info JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billings' AND column_name = 'subtotal') THEN
        ALTER TABLE billings ADD COLUMN subtotal NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billings' AND column_name = 'tax_total') THEN
        ALTER TABLE billings ADD COLUMN tax_total JSONB DEFAULT '{"tax8": 0, "tax10": 0}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billings' AND column_name = 'total') THEN
        ALTER TABLE billings ADD COLUMN total NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 3. Create or Update user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    user_email TEXT PRIMARY KEY, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist in user_settings
DO $$
BEGIN
    -- user_id (Must exist for RLS)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'user_id') THEN
        ALTER TABLE user_settings ADD COLUMN user_id TEXT;
    END IF;

    -- company_profile and other settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'company_profile') THEN
        ALTER TABLE user_settings ADD COLUMN company_profile JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'bank_info') THEN
        ALTER TABLE user_settings ADD COLUMN bank_info JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'seal_url') THEN
        ALTER TABLE user_settings ADD COLUMN seal_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'gemini_api_key') THEN
        ALTER TABLE user_settings ADD COLUMN gemini_api_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'google_client_id') THEN
        ALTER TABLE user_settings ADD COLUMN google_client_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'google_api_key') THEN
        ALTER TABLE user_settings ADD COLUMN google_api_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'google_drive_folder_id') THEN
        ALTER TABLE user_settings ADD COLUMN google_drive_folder_id TEXT;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'party_b_info') THEN
        ALTER TABLE user_settings ADD COLUMN party_b_info JSONB DEFAULT '{}'::jsonb;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'quick_access') THEN
        ALTER TABLE user_settings ADD COLUMN quick_access JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. Enable Row Level Security and Policies
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billings' AND policyname = 'Users can manage their own billings') THEN
        CREATE POLICY "Users can manage their own billings" ON billings
            FOR ALL
            USING (auth.jwt() ->> 'email' = user_email)
            WITH CHECK (auth.jwt() ->> 'email' = user_email);
    END IF;
END $$;

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policy if it exists to update it safely or avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own settings" ON user_settings;

-- Create policy using user_id if present, fallback to checking email if user_id is null? 
-- Simplest is to rely on user_id being populated or allow based on email as backup.
-- This checks: matches auth.uid OR matches auth.email
CREATE POLICY "Users can manage their own settings" ON user_settings
    FOR ALL
    USING (
        (auth.uid()::text = user_id) OR 
        (auth.jwt() ->> 'email' = user_email)
    )
    WITH CHECK (
        (auth.uid()::text = user_id) OR 
        (auth.jwt() ->> 'email' = user_email)
    );
