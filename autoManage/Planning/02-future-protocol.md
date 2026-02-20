# autoManage: WebSocket Protocol Specification (v1.1+)

Last updated: 2026-02-16

> **This document describes the v1.1 protocol design. It is NOT implemented in v1.0.**
> v1.0 uses file-watching exclusively. See `01-architecture-and-phases.md` for the v1.0 architecture.
> This document exists to inform v1.0 architecture decisions and ensure forward-compatibility.

---

## Overview

In v1.1, autoManage adds a WebSocket transport for:
1. **Remote agents** that don't share a filesystem with the dashboard
2. **Bidirectional commands** — dashboard can send pause/resume/stop/approve/deny to agents
3. **Lower-latency streaming** than file-watching for high-throughput agents

File-watching continues to work for local agents. WebSocket is additive, not a replacement.

## Connection Lifecycle

```
Agent                              autoManage Server
  │                                       │
  │──── WebSocket connect ────────────────▶│
  │                                       │
  │──── auth { agent_id, token } ────────▶│
  │                                       │
  │◀─── auth_ok / auth_fail ─────────────│
  │                                       │
  │──── status_report (periodic) ────────▶│
  │──── status_report ───────────────────▶│
  │──── status_report ───────────────────▶│
  │                                       │
  │◀─── command (on user action) ────────│
  │                                       │
  │──── disconnect ───────────────────────▶│
  │                                       │
```

### Authentication
- Agents authenticate with `agent_id` (string) and `token` (shared secret)
- Token is configured in both autoManage server config and agent's reporter config
- No auth is required for `localhost` connections (same security model as v1.0)
- For remote connections, token-based auth is the minimum. TLS (wss://) strongly recommended.

### Reconnection
- On disconnect, agents reconnect with exponential backoff: 1s, 2s, 4s, 8s, 16s (cap at 30s)
- Add random jitter (0-25% of delay) to avoid reconnection storms
- Buffer up to 100 status reports during disconnection; send on reconnect
- At 1-5 agent scale, reconnection storms are a non-issue, but good hygiene to implement from the start

---

## Message Format

All messages are JSON objects sent as WebSocket text frames. Every message has a `type` field for routing.

```typescript
// Envelope — every message matches this shape
{
  type: "status_report" | "command" | "auth" | "auth_response" | "error",
  payload: { ... }
}
```

---

## Message Types

### `status_report` (Agent → Server)

Sent by agents at a configurable interval (default: 5 seconds). Doubles as heartbeat — if no report arrives within `3 * interval`, the agent is considered unresponsive.

```typescript
{
  type: "status_report",
  payload: {
    schema_version: "agent_status_report.v1",
    agent_id: string,           // Unique agent identifier
    run_id: string,             // Current run ID (maps to trace file)
    timestamp: string,          // ISO8601

    status: "idle" | "running" | "blocked" | "error" | "completed",
    current_task: string | null,      // Human-readable summary of current activity
    last_event_type: string | null,   // Most recent TraceEvent event_type
    error: string | null,             // Error message if status is "error"

    metrics: {
      total_events: number,       // Total trace events this run
      tool_calls: number,         // Tool call count this run
      errors: number,             // Error count this run
      approvals_pending: number,  // Unresolved approval requests
      uptime_ms: number,          // Time since run started
    }
  }
}
```

**Status derivation** (same logic as file-watching status deriver):
- `running`: Agent has emitted a `tool_call`, `think`, or `plan` event within the last 60 seconds
- `blocked`: An `approval_requested` event exists without a matching `approval_response`
- `error`: Most recent event is `error` type
- `completed`: Agent signaled completion or run ended cleanly
- `idle`: None of the above (no recent events, no pending approvals, no errors)

### `command` (Server → Agent)

Sent when the operator takes an action in the dashboard. Agents must implement a command handler.

```typescript
{
  type: "command",
  payload: {
    schema_version: "management_command.v1",
    command_id: string,           // Unique command ID for tracking
    agent_id: string,             // Target agent
    timestamp: string,            // ISO8601

    action: "pause" | "resume" | "stop" | "approve" | "deny",
    parameters: {
      // For "approve" / "deny":
      approval_request_id?: string,   // Which approval to respond to
      reason?: string,                // Why (for audit trail)

      // For "reconfigure" (future):
      config?: Record<string, any>,
    } | null
  }
}
```

**Command semantics**:
- `pause`: Agent should stop taking new actions but preserve state. Resume-able.
- `resume`: Agent resumes from paused state.
- `stop`: Agent should terminate gracefully (save state, close connections).
- `approve`: Respond to a pending `approval_requested` event with approval.
- `deny`: Respond to a pending `approval_requested` event with denial.

**Command acknowledgment**: Agent sends a `status_report` reflecting the new state. No separate ACK message needed (keeping the protocol simple).

### `auth` (Agent → Server)

Sent immediately after WebSocket connection is established.

```typescript
{
  type: "auth",
  payload: {
    agent_id: string,
    token: string,          // Shared secret
    reporter_version: string,   // Reporter library version
    capabilities: string[],     // ["status_report", "commands"] — what this agent supports
  }
}
```

### `auth_response` (Server → Agent)

```typescript
{
  type: "auth_response",
  payload: {
    success: boolean,
    error: string | null,             // Reason for failure
    report_interval_ms: number,       // Server-configured reporting interval
  }
}
```

### `error` (Bidirectional)

For protocol-level errors (malformed message, unknown command, etc.).

```typescript
{
  type: "error",
  payload: {
    code: string,             // e.g., "INVALID_MESSAGE", "UNKNOWN_AGENT", "AUTH_REQUIRED"
    message: string,
    related_message_type: string | null,   // Which message caused the error
  }
}
```

---

## Schema Location

Protocol schemas will be defined as Zod schemas in `autoManage/src/protocol/schemas.ts`.

They are NOT placed in `@tastekit/core/schemas` because:
1. TasteKit schemas map to taste artifacts (constitution, guardrails, etc.) — protocol types are operational
2. AutoClaw (Go) would need to parse types it never uses
3. Keeps TasteKit's package boundary clean

autoManage imports `TraceEventSchema` from `@tastekit/core` (the one shared type it needs).

---

## Agent Reporter Library

A lightweight npm package (`@automanage/reporter` or similar) that agents embed.

### API Surface (minimal)

```typescript
import { createReporter } from '@automanage/reporter';

const reporter = createReporter({
  serverUrl: 'ws://localhost:3001',   // autoManage WebSocket endpoint
  agentId: 'research-bot',
  token: 'shared-secret',
  reportIntervalMs: 5000,             // Override server default
});

// Option A: Manual status updates
reporter.updateStatus('running', { currentTask: 'Searching API docs' });
reporter.reportError('npm install failed');

// Option B: Wrap TasteKit Tracer (if using TasteKit)
// TracerStream decorator emits events to both JSONL and reporter
import { TracerStream } from '@tastekit/core/tracing';
const stream = new TracerStream(tracer);
reporter.attachToStream(stream);

// Cleanup
reporter.disconnect();
```

### Design Principles
- **Tiny**: No heavy dependencies. Just `ws` and Zod.
- **Opt-in**: Agents work fine without it (file-watching fallback).
- **Non-blocking**: Status reports are fire-and-forget. Reporter never blocks the agent.
- **Resilient**: Buffers during disconnection, reconnects automatically.

---

## Deferred to B.4 (Management Agent)

The following are intentionally NOT specified in this protocol document:

### OverseerSuggestion
A message type for AI-generated suggestions (e.g., "Agent X appears stuck, consider restarting"). This will be designed when the management agent (B.4) is implemented, based on real usage patterns rather than speculation.

### Agent-to-Agent Communication
If the management agent needs to coordinate between agents, the protocol may need to be extended. Design this from implementation experience, not upfront.

### Batch Operations
Commands that target multiple agents simultaneously. Not needed at 1-5 agent scale. If autoManage grows to handle more agents, batch operations can be added as syntactic sugar over individual commands.

---

## Compatibility Notes

### Versioning
- All messages include `schema_version` in their payload
- Server accepts messages with known schema versions, rejects unknown ones with an `error` message
- Protocol is additive: new message types can be added without breaking existing agents
- Breaking changes require a version bump and migration period

### Relationship to TasteKit Trace Events
- `AgentStatusReport.metrics` is a summary derived from `TraceEvent` data — not a replacement
- The full trace JSONL is still the source of truth for detailed analysis
- autoManage stores full trace events (via file-watching or streaming) alongside status summaries

### Go Reporter (AutoClaw)
- The protocol is language-agnostic (JSON over WebSocket)
- A Go reporter library can implement the same protocol for AutoClaw agents
- This is a future concern — design the Go library when AutoClaw development begins
