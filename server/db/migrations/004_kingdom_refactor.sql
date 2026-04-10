-- Kingdom usage tracking table
CREATE TABLE IF NOT EXISTS kingdom_usage (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  usage_date DATE NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);
CREATE INDEX IF NOT EXISTS idx_kingdom_usage_user_date ON kingdom_usage (user_id, usage_date);

-- Add kingdom_license boolean flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS kingdom_license BOOLEAN DEFAULT FALSE;

-- Migrate existing kingdom users to standard + kingdom_license
UPDATE users SET kingdom_license = TRUE WHERE user_type = 'kingdom';
UPDATE users SET user_type = 'standard' WHERE user_type = 'kingdom';

-- Update user_type constraint: only standard and gpu
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('standard', 'gpu'));

-- Add paused status
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'paused', 'pending_removal', 'removed'));

-- Add kingdom_license flag to requests
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requested_kingdom_license BOOLEAN;
