CREATE TABLE IF NOT EXISTS activation_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','active','expired','revoked')),
  created_at INTEGER NOT NULL,
  activated_at INTEGER,
  expires_at INTEGER,
  device_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_activation_keys_created ON activation_keys(created_at DESC);
