-- 初始建表
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  registration_date TEXT,
  expiration_date TEXT,
  system TEXT,
  system_url TEXT,
  register_account TEXT,
  groups TEXT,
  renewal_period INTEGER,
  renewal_unit TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_expiration ON domains(expiration_date);
