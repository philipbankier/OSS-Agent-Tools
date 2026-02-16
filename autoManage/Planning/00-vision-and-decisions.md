# autoManage: Vision & Design Decisions

Last updated: 2026-02-16

---

## Purpose

**autoManage** is a lightweight management dashboard for solo developers and operators running 1-5 AI agents. It provides at-a-glance oversight of agent activity without requiring you to dive into logs or micromanage each agent individually.

## Pain Points This Solves

1. **"What are my agents doing right now?"** — No centralized view of agent status. You have to check each agent's terminal/logs individually.
2. **"Is this agent stuck?"** — Agents can silently loop, hit errors, or wait for approvals with no notification. You only discover problems when you manually check.
3. **"I have to dig through logs"** — Trace files are JSONL. Understanding what happened requires parsing raw files or writing ad-hoc scripts.
4. **"It's hard not to micromanage"** — Without visibility, the temptation is to constantly check on agents, which defeats the purpose of automation.

## Target Persona

A solo developer or operator who:
- Runs 1-5 AI agents on their local machine (or small network)
- Uses TasteKit to define agent taste profiles
- Wants to "fire and forget" agents but still needs a safety net
- Has moderate technical skill (comfortable with CLI, but prefers a UI for monitoring)
- Is NOT managing a fleet of 100+ enterprise agents

## Non-Goals

- **Enterprise fleet management**: autoManage is for solo operators, not platform teams managing hundreds of agents
- **Fully autonomous operation**: The "Suggest + Approve" model means a human is always in the loop
- **Replacing agent runtimes**: autoManage observes and suggests — it does not execute tasks
- **Cross-cloud orchestration**: Agents are local or on a small network, not distributed across cloud regions
- **Managing non-TasteKit agents in v1.0**: The integration seam is TasteKit's trace format; agents that don't produce TasteKit traces aren't visible

## Relationship to Sibling Projects

### TasteKit (the integration seam)
- autoManage **consumes TasteKit trace files** (`.tastekit/traces/*.trace.v1.jsonl`). This is the primary data source.
- autoManage reads TasteKit **artifacts** (constitution, workspace config) for agent identity display.
- autoManage uses TasteKit's `TraceEventSchema` as the data contract and `TraceReader` as a reusable parser.
- **No changes to TasteKit are required for autoManage v1.0.** The existing trace format is sufficient.

### AutoClaw (optimized-for, not required)
- AutoClaw will write TasteKit-format traces, so autoManage can monitor AutoClaw agents automatically.
- In v1.1+, a Go reporter library could provide WebSocket-based real-time streaming from AutoClaw.
- autoManage does NOT depend on AutoClaw. It works with any agent that writes TasteKit traces.

---

## Design Decisions

### D1: Target User — Solo Operator (1-5 agents)
**Decision**: Design for a single person managing a handful of local agents.
**Rationale**: This is our own use case. Enterprise fleet management is a different product with different requirements (multi-tenancy, RBAC, audit trails). Starting small keeps scope achievable.
**Implication**: SQLite is fine (no Postgres needed). No auth in v1.0. No multi-user support.

### D2: Autonomy Model — Suggest + Approve
**Decision**: autoManage suggests actions but never acts autonomously on agents.
**Rationale**: Trust needs to be built incrementally. Users need to see that suggestions are good before granting more autonomy. The dashboard surfaces information; the human decides.
**Implication**: No "auto-restart on error" or "auto-approve" in v1.0. Every intervention requires explicit human approval.

### D3: v1.0 Transport — File-Watching (not WebSocket)
**Decision**: v1.0 monitors agents by watching their JSONL trace files on disk, not via WebSocket.
**Rationale**: TasteKit's `Tracer` already writes structured JSONL to `.tastekit/traces/`. For local agents, `chokidar` file-watching achieves real-time monitoring with:
- Zero changes to TasteKit
- Zero changes to agents (no reporter library to embed)
- Zero new protocol to design or implement
**Implication**: v1.0 only works for agents on the same filesystem. Remote agents require v1.1's WebSocket transport.

### D4: v1.1+ Transport — WebSocket
**Decision**: v1.1 adds WebSocket for remote agents and bidirectional commands.
**Rationale**: File-watching doesn't work across machines. WebSocket enables real-time streaming from remote agents and sending commands (pause/resume/stop) back to them.
**Implication**: Protocol schemas will be defined in `autoManage/src/protocol/` (not in TasteKit core). An optional `TracerStream` wrapper (decorator pattern) can be added to TasteKit without modifying the core `Tracer` class.

### D5: Management Agent — Hybrid (Dashboard First, Agent Later)
**Decision**: v1.0 is a pure dashboard (no AI). v1.1 adds a built-in management agent for natural-language oversight.
**Rationale**: Building the dashboard first ensures we understand the information model before adding AI analysis. The management agent can then be layered on top of proven data flows.
**Implication**: v1.0 has no "intelligent" features — just data display and simple rule-based alerts. The management agent in v1.1 will use TasteKit taste profiles for management style preferences.

### D6: Protocol Schemas — In autoManage (not TasteKit)
**Decision**: Management-plane protocol schemas (AgentStatusReport, ManagementCommand) live in `autoManage/`, not `@tastekit/core/schemas`.
**Rationale**: TasteKit is a taste compiler. Its schemas map to taste artifacts (constitution, guardrails, memory, etc.). Management-plane concepts (status reports, commands, suggestions) are operational — they don't belong in a taste compiler. The existing `TraceEventSchema` is the correct integration seam.
**Implication**: autoManage imports `TraceEventSchema` from TasteKit. It defines its own protocol types internally.

### D7: Roadmap — Parallel Track
**Decision**: autoManage is Track B in the roadmap, running in parallel with the main TasteKit/AutoClaw phases.
**Rationale**: autoManage depends only on TasteKit Phase 1 (which is complete). It has no dependency on AutoClaw. Making it sequential (Phases 6-9) would create a false dependency and delay useful work.
**Implication**: Work on autoManage can begin immediately, independent of TasteKit v1.0 or AutoClaw development.

### D8: v1.0 Is Read-Only
**Decision**: v1.0 can observe agents but cannot send commands to them.
**Rationale**: Bidirectional commands require agents to implement a command receiver, which varies by runtime. No agent runtime currently supports this. Designing a command protocol before implementations exist risks building the wrong abstraction.
**Implication**: If an agent is stuck, the user sees it in the dashboard and manually intervenes (e.g., Ctrl+C). Commands come in v1.1 with WebSocket.

### D9: Heartbeat = Status Report
**Decision**: No separate heartbeat mechanism. Status reports at a configurable interval serve as liveness signals.
**Rationale**: A separate heartbeat adds a second timer, second detection path, and second timeout to configure — all redundant. If a status report hasn't arrived within `N * interval`, the agent is unresponsive.
**Implication**: Simpler protocol, fewer moving parts.

### D10: Location — Separate Top-Level Directory
**Decision**: autoManage lives at `/autoManage/` in the monorepo, not inside TasteKit.
**Rationale**: autoManage is a distinct product with its own tech stack (Next.js + SQLite). Nesting it inside TasteKit would create false coupling.
**Implication**: `autoManage/` has its own `package.json`, `tsconfig.json`, etc. It imports `@tastekit/core` as a dependency.

---

## Known Concerns & Mitigations

### Trace File Growth
**Concern**: Agents write JSONL indefinitely. Over time, trace files accumulate and consume disk.
**Mitigation**:
- Each run creates a new file (`${runId}.trace.v1.jsonl`), so individual files are bounded by run length.
- A future `tastekit traces prune` CLI command (or workspace config `traces.max_age_days`) should handle cleanup.
- autoManage dashboard could show a "disk usage" warning when traces exceed a threshold.

### Approval Timeout
**Concern**: An agent waiting for approval blocks indefinitely if the user isn't watching the dashboard.
**Mitigation**: This is a TasteKit concern, not autoManage-specific. The guardrails schema (`packages/core/schemas/guardrails.ts`) should gain an optional `timeout_seconds` field for approval rules. autoManage can surface "agent waiting for approval for X minutes" alerts.

### Schema Evolution
**Concern**: If TasteKit's `TraceEventSchema` changes, autoManage's file watcher may break.
**Mitigation**: Trace events are versioned (`schema_version: 'trace_event.v1'`). autoManage should validate events against the expected version and gracefully skip unknown versions. When TasteKit bumps to v2, autoManage adds a v2 parser alongside v1.
