# autoManage: Architecture & Phased Roadmap

Last updated: 2026-02-16

See `00-vision-and-decisions.md` for all design decisions referenced here.

---

## System Overview

autoManage is a local-first dashboard that monitors AI agents by consuming their trace output. It has two architectural phases:

- **v1.0**: File-watching. Reads JSONL trace files from disk. Zero agent-side changes.
- **v1.1+**: WebSocket. Agents embed a reporter library for remote streaming and bidirectional commands.

```
┌─────────────────────────────────────────────────────┐
│                    v1.0 Architecture                │
│                                                     │
│  Agent 1 ──writes──▶ .tastekit/ops/traces/run1.trace.v1.jsonl │
│  Agent 2 ──writes──▶ .tastekit/ops/traces/run2.trace.v1.jsonl │
│  Agent 3 ──writes──▶ .tastekit/ops/traces/run3.trace.v1.jsonl │
│                          │                          │
│                    chokidar watches                  │
│                          │                          │
│                          ▼                          │
│                ┌─────────────────┐                  │
│                │ autoManage      │                  │
│                │ Server (Next.js)│                  │
│                │                 │                  │
│                │ - File watcher  │                  │
│                │ - Trace parser  │                  │
│                │ - Status deriver│                  │
│                │ - SQLite store  │                  │
│                └────────┬────────┘                  │
│                         │ SSE                       │
│                         ▼                           │
│                ┌─────────────────┐                  │
│                │ Dashboard (React)│                 │
│                │ - Agent cards    │                 │
│                │ - Trace viewer   │                 │
│                │ - Approval queue │                 │
│                └─────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

---

## v1.0 Architecture: File-Watching

### Components

#### 1. File Watcher
- Uses `chokidar` to watch resolved trace directories (prefer `.tastekit/ops/traces/`, fallback `.tastekit/traces/`)
- Configurable watch paths: reads TasteKit workspace configs (`tastekit.yaml`) to discover trace directories, or accepts explicit paths
- On file change: reads new lines appended since last read (tail-follow pattern)
- On new file: registers a new run, begins tailing

#### 2. Trace Parser
- Reuses TasteKit's `TraceReader` class (`packages/core/tracing/reader.ts`) for JSONL parsing
- Validates each event against `TraceEventSchema` — skips malformed lines gracefully
- Handles version checking: expects `schema_version: 'trace_event.v1'`, logs warning for unknown versions

#### 3. Status Deriver
Transforms raw trace events into agent status:

| Derived Field | Source |
|--------------|--------|
| `status` | Last event type: `error` → error, `approval_requested` without response → blocked, recent `tool_call` → running, no events for >60s → idle, all done → completed |
| `current_task` | Most recent `plan` event's data, or most recent `tool_call` tool_ref |
| `last_activity` | Timestamp of most recent event |
| `error_count` | Count of `error` event types in current run |
| `approvals_pending` | Count of `approval_requested` without matching `approval_response` |
| `tool_calls` | Count of `tool_call` events in current run |
| `run_duration` | Time from first to last event |

Agent identity comes from TasteKit artifacts:
- `self/constitution.v1.json` (canonical) or legacy `artifacts/constitution.v1.json` → agent name, principles (for display)
- `tastekit.yaml` → project name

#### 4. SQLite Store
Lightweight persistence. Two tables for v1.0:

```sql
CREATE TABLE agents (
  agent_id TEXT PRIMARY KEY,      -- derived from workspace path or run_id
  workspace_path TEXT NOT NULL,   -- path to .tastekit/ directory
  display_name TEXT,              -- from constitution or project name
  status TEXT DEFAULT 'idle',     -- idle|running|blocked|error|completed
  current_task TEXT,
  last_event_at TEXT,             -- ISO8601
  error_count INTEGER DEFAULT 0,
  approvals_pending INTEGER DEFAULT 0,
  tool_calls INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE recent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,        -- ISO8601
  summary TEXT,                   -- human-readable summary of event
  raw_json TEXT,                  -- full event JSON for detail view
  created_at TEXT NOT NULL
);

-- Keep only last N events per agent to prevent unbounded growth
-- Cleanup job runs periodically (configurable, default: keep last 1000 per agent)
```

#### 5. SSE to Dashboard
- Server-Sent Events (SSE) from Next.js API routes to the React frontend
- Simpler than WebSocket for server→browser push (unidirectional is sufficient)
- Browser reconnects automatically on disconnect (built into EventSource API)
- Events: `agent_updated` (status change), `new_event` (trace event arrived), `alert` (suggestion)

#### 6. Dashboard UI
See "Dashboard Design" section below.

### Data Flow (v1.0)

```
Agent writes JSONL line
  → chokidar detects file change
  → Read new lines from file
  → Parse each line as TraceEvent
  → Update status deriver (in-memory state)
  → Write to SQLite (agents + recent_events tables)
  → Push SSE event to connected dashboard
  → React updates agent card
```

Latency: File-watch typically fires within 100-500ms of write. Total end-to-end under 1 second for local agents.

### Technology Choices

| Choice | Rationale |
|--------|-----------|
| **Next.js** | Full-stack TypeScript. Server components for initial render, API routes for SSE, React for dashboard. Single framework, single deploy. |
| **SQLite** | Zero-config, file-based. Perfect for solo operator. No separate database process. Could swap to Postgres later if needed (but unlikely for 1-5 agents). |
| **chokidar** | Battle-tested file watcher for Node.js. Handles cross-platform differences. Used by Vite, webpack, etc. |
| **SSE** (not WebSocket to browser) | Dashboard only needs server→browser push. SSE is simpler (auto-reconnect, works with HTTP/2, no upgrade handshake). WebSocket to browser would be overkill for v1.0. |
| **better-sqlite3** | Synchronous SQLite driver for Node.js. Faster than async drivers for small datasets. No connection pool needed. |

---

## v1.1 Architecture: WebSocket + Remote Agents

### What Changes

v1.1 adds a second data path alongside file-watching:

```
┌──────────────────────────────────────────────────────────┐
│                    v1.1 Architecture                     │
│                                                          │
│  Local agents ──file-watching──▶ autoManage Server       │
│                                      ▲                   │
│  Remote agents ──WebSocket────────────┘                  │
│                      ◀── commands ────┘                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **Agent Reporter Library** (TypeScript): Lightweight module agents embed. Connects to autoManage via WebSocket. Sends periodic `AgentStatusReport` messages derived from trace events. Receives `ManagementCommand` messages.
- **WebSocket Server**: Runs alongside the Next.js app. Accepts agent connections, authenticates via shared token, routes status reports to the same status deriver used by file-watching.
- **Protocol schemas**: Defined in `autoManage/src/protocol/schemas.ts` (Zod). See `02-future-protocol.md` for full specification.
- **Optional TracerStream**: A decorator around TasteKit's `Tracer` that adds `EventEmitter` support without modifying the core class. Agents can use it to emit events to both JSONL and the reporter library.
- **Bidirectional commands**: Dashboard can send pause/resume/stop commands to connected agents.
- **File-watching fallback**: Local agents without the reporter library continue to work via file-watching.

---

## Dashboard Design

### Main View: Agent Cards Grid

```
┌─────────────────────────────────────────────────────────┐
│  autoManage                              3 agents  │ ⚙ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ 🟢 Research Bot │  │ 🟡 Code Review  │              │
│  │                 │  │                 │              │
│  │ Searching for   │  │ Waiting for     │              │
│  │ API docs...     │  │ approval        │              │
│  │                 │  │                 │              │
│  │ 47 events       │  │ 23 events       │              │
│  │ 0 errors        │  │ 0 errors        │              │
│  │ Last: 3s ago    │  │ Last: 2m ago    │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  ┌─────────────────┐                                   │
│  │ 🔴 Deploy Agent │                                   │
│  │                 │                                   │
│  │ Error: npm      │                                   │
│  │ install failed  │                                   │
│  │                 │                                   │
│  │ 89 events       │                                   │
│  │ 3 errors        │                                   │
│  │ Last: 30s ago   │                                   │
│  └─────────────────┘                                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Alerts: 1 approval pending │ 1 agent errored          │
└─────────────────────────────────────────────────────────┘
```

### Agent Card States

| Status | Color | Indicator | Meaning |
|--------|-------|-----------|---------|
| **idle** | Gray | Dim dot | No recent events. Agent may be finished or not started. |
| **running** | Green | Pulsing dot | Active tool calls or thinking events in last 60s. |
| **blocked** | Yellow/Amber | Steady dot | `approval_requested` with no matching response. |
| **error** | Red | Steady dot | Most recent event is `error` type. |
| **completed** | Blue | Checkmark | Agent emitted completion signal or run ended cleanly. |

### Trace Viewer (click agent card)

- Scrollable event list, most recent at top
- Each event shows: timestamp, event_type badge, summary
- Filter bar: filter by event_type (plan, think, tool_call, error, etc.)
- Tool calls show: tool_ref, input/output summary, duration
- Errors highlighted in red with full error message
- Approval events show request data with "Pending" / "Approved" / "Denied" badge

### Approval Queue

- List of all pending `approval_requested` events across all agents
- Each shows: agent name, request data, risk_score if present, time waiting
- v1.0: Display-only (user manually approves via agent's own interface)
- v1.1: "Approve" / "Deny" buttons that send commands back to agent

### Status Bar

- Left: Total agents, active count, idle count
- Center: Alerts (pending approvals, errored agents)
- Right: Connection status (watching N directories / N agents connected)

### Design Principles

- **Dark mode default** — developer tool, expected to run alongside IDE
- **No auth in v1.0** — local-only, single user, no login
- **Responsive but desktop-first** — optimized for laptop screen, usable on tablet
- **Minimal chrome** — information density over decoration
- **Real-time** — updates within 1 second of agent activity

---

## Phased Roadmap (Track B)

autoManage runs as a parallel track alongside the main TasteKit/AutoClaw development.

### B.1: File-Watching Dashboard

**Depends on**: TasteKit Phase 1 (complete)
**Can start**: Immediately

**Scope**:
- [ ] Next.js project scaffold (TypeScript, Tailwind, SQLite)
- [ ] SQLite schema (agents, recent_events tables)
- [ ] chokidar file watcher for resolved trace directories (`.tastekit/ops/traces/` canonical)
- [ ] Trace parser using TasteKit's `TraceReader`
- [ ] Status deriver (trace events → agent status)
- [ ] Agent cards grid (real-time via SSE)
- [ ] Basic trace viewer (click card → event list with filters)
- [ ] Approval queue display (read-only)
- [ ] Status bar with agent counts and alerts
- [ ] Configuration: watched directories, alert thresholds
- [ ] Dark mode UI

**Deliverable**: A working dashboard that monitors local TasteKit agents in real-time.

### B.2: Suggestions & Approvals

**Depends on**: B.1

**Scope**:
- [ ] Rule-based suggestion engine:
  - Stuck detection: no new events for configurable duration (default 5 min)
  - Loop detection: same tool_call repeated N times (default 3)
  - Error rate: more than N errors in M minutes
  - Long-running approval: waiting for approval > configurable threshold
- [ ] Suggestions panel in dashboard with "Dismiss" / "Noted" actions
- [ ] Suggestion history (what was suggested, was it acted on)
- [ ] Alert sounds/notifications for critical suggestions (optional, configurable)
- [ ] Recent events cleanup job (prune old events, configurable retention)

**Deliverable**: Dashboard proactively surfaces problems and suggests interventions.

### B.3: WebSocket + Remote Agents

**Depends on**: B.2

**Scope**:
- [ ] WebSocket server alongside Next.js app
- [ ] Agent reporter library (TypeScript, npm package)
- [ ] Protocol schemas (`autoManage/src/protocol/schemas.ts`)
- [ ] AgentStatusReport messages (doubles as heartbeat)
- [ ] ManagementCommand messages (pause/resume/stop/approve/deny)
- [ ] Authentication (shared token)
- [ ] Connection management (reconnect with exponential backoff + jitter)
- [ ] Dashboard shows connection type per agent (file-watch vs WebSocket)
- [ ] Optional `TracerStream` wrapper for TasteKit (decorator, not modifying Tracer)
- [ ] Approval queue becomes actionable (send approve/deny commands)

**Deliverable**: Remote agents can stream to autoManage. Bidirectional commands work.

### B.4: Management Agent

**Depends on**: B.3

**Scope**:
- [ ] Built-in AI agent that monitors other agents
- [ ] Natural language interface ("what's agent-3 working on?", "restart the research bot")
- [ ] Uses TasteKit taste profile for management style (aggressive/hands-off, etc.)
- [ ] Suggestion quality improves (AI-powered analysis vs rule-based)
- [ ] OverseerSuggestion schema designed from implementation experience
- [ ] Chat panel in dashboard for interacting with management agent

**Deliverable**: AI-powered agent oversight. Operator manages agents through conversation.

---

## Integration Points

### TasteKit → autoManage (v1.0)

| TasteKit Component | What autoManage Uses | How |
|---|---|---|
| `TraceEventSchema` (`schemas/trace.ts`) | Event format contract | Import type, validate parsed events |
| `TraceReader` (`tracing/reader.ts`) | JSONL parser | Import class, reuse for parsing trace files |
| `WorkspaceConfig` (`schemas/workspace.ts`) | Discover trace directories | Read `tastekit.yaml` and resolve canonical `.tastekit/ops/traces/` (fallback supported) |
| Constitution artifacts | Agent display name, principles | Read canonical JSON from `.tastekit/self/constitution.v1.json` (fallback supported) |
| Guardrails artifacts | Approval rules context | Display what the approval is for |

**Key constraint**: autoManage v1.0 makes ZERO changes to TasteKit. It is a pure consumer.

### autoManage → TasteKit (v1.1+)

| Change | What | Why |
|---|---|---|
| `TracerStream` wrapper | Decorator around `Tracer` with `EventEmitter` | Enables real-time event streaming to reporter library without modifying core `Tracer` |
| `traces.max_age_days` config | Optional field in `WorkspaceConfig` | Enables trace file pruning (benefits TasteKit users too) |
| Approval timeout | Optional `timeout_seconds` in guardrails | Prevents indefinite blocking (benefits TasteKit users too) |

**Note**: These are optional enhancements that benefit TasteKit independently. autoManage does not require them.

### AutoClaw → autoManage (future)

| Integration | How |
|---|---|
| Trace monitoring | AutoClaw writes TasteKit-format traces → autoManage file-watches them (same as any TasteKit agent) |
| WebSocket streaming | Go reporter library (v1.1+) for remote AutoClaw instances |
| Workspace discovery | AutoClaw's workspace structure will include `.tastekit/` directory per agent |
