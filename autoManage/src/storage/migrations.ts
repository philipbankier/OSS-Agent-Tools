export const BASE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  workspace_path TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  current_task TEXT,
  last_event_at TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  approvals_pending INTEGER NOT NULL DEFAULT 0,
  tool_calls INTEGER NOT NULL DEFAULT 0,
  run_duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  summary TEXT,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(agent_id) REFERENCES agents(agent_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_events_agent_id ON recent_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_recent_events_timestamp ON recent_events(timestamp);
`;
