-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  client_user_id INT NOT NULL REFERENCES client_users(id),
  request_id INT REFERENCES requests(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications (client_user_id, read, created_at DESC);

-- Add new columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_office_license BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS project_id INT REFERENCES projects(id);

-- Add new columns to requests
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requested_office_license BOOLEAN;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requested_project_id INT REFERENCES projects(id);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requested_start_date DATE;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Rename 'approved' status to 'actioned' in requests
UPDATE requests SET status = 'actioned' WHERE status = 'approved';

-- Drop ALL check constraints on requests.status (inline constraint has auto-generated name)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'requests'::regclass
      AND con.contype = 'c'
      AND att.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE requests DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE requests ADD CONSTRAINT requests_status_check
  CHECK (status IN ('pending', 'actioned', 'rejected'));
