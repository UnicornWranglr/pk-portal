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

-- Update user_type constraint: only standard and gpu (drop all check constraints on user_type)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'users'::regclass
      AND con.contype = 'c'
      AND att.attname = 'user_type'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('standard', 'gpu'));

-- Add paused status (drop all check constraints on status)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'users'::regclass
      AND con.contype = 'c'
      AND att.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'paused', 'pending_removal', 'removed'));

-- Add kingdom_license flag to requests
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requested_kingdom_license BOOLEAN;
