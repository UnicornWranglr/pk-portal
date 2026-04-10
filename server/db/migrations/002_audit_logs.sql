CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INT,
  actor_type TEXT CHECK (actor_type IN ('admin', 'client', 'system')),
  actor_id INT,
  actor_name TEXT,
  client_id INT REFERENCES clients(id),
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_client ON audit_logs (client_id);
