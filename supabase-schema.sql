-- user_settings テーブルのみ作成（認証はNextAuth.jsのJWTで管理）

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT UNIQUE NOT NULL,
  gemini_api_key TEXT,
  google_client_id TEXT,
  google_api_key TEXT,
  google_drive_folder_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが自分のメールアドレスに基づいてアクセス可能
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');
