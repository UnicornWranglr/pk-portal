-- Effective date on requests
ALTER TABLE requests ADD COLUMN IF NOT EXISTS effective_date DATE;

-- Billing period tracking
ALTER TABLE billing_periods ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE billing_periods ADD COLUMN IF NOT EXISTS client_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE billing_periods ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ;

-- Add 'move_project' to requests type constraint
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
      AND att.attname = 'type'
  LOOP
    EXECUTE format('ALTER TABLE requests DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE requests ADD CONSTRAINT requests_type_check
  CHECK (type IN ('add', 'remove', 'change_type', 'move_project'));

-- Backfill removed_date from end_date for historical users
UPDATE users SET removed_date = end_date
  WHERE status IN ('removed', 'pending_removal')
  AND removed_date IS NULL AND end_date IS NOT NULL;

-- Clear historical billing data — app used going forward only
TRUNCATE billing_periods;
