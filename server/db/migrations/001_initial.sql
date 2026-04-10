CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  billing_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_config (
  id SERIAL PRIMARY KEY,
  standard_daily NUMERIC(10,2) NOT NULL,
  standard_monthly NUMERIC(10,2) NOT NULL,
  kingdom_addon_daily NUMERIC(10,2) NOT NULL,
  kingdom_addon_monthly NUMERIC(10,2) NOT NULL,
  gpu_daily NUMERIC(10,2) NOT NULL,
  gpu_monthly NUMERIC(10,2) NOT NULL,
  setup_fee NUMERIC(10,2) NOT NULL,
  fair_use_threshold_days INT DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id),
  display_name TEXT NOT NULL,
  email TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('standard', 'kingdom', 'gpu')),
  status TEXT NOT NULL CHECK (status IN ('active', 'pending_removal', 'removed')) DEFAULT 'active',
  added_date DATE NOT NULL,
  end_date DATE,
  removed_date DATE,
  setup_fee_charged BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS client_users (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id),
  type TEXT NOT NULL CHECK (type IN ('add', 'remove', 'change_type')),
  requested_by INT REFERENCES client_users(id),
  user_id INT REFERENCES users(id),
  requested_user_name TEXT,
  requested_user_email TEXT,
  requested_user_type TEXT,
  requested_end_date DATE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ,
  actioned_by INT REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS billing_periods (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  line_items JSONB,
  total NUMERIC(10,2),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by INT REFERENCES admin_users(id)
);
