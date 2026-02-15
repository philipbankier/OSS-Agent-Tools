# Management Plane — Open Design Questions Deep Dive

> **Purpose**: Each open design question is expanded with tradeoff analysis, recommendations from research, and relevant precedents so the planning/building session can make informed decisions.

---

## Question 1: Data Source — How Does the Management Plane Get Agent Information?

### Options

#### A. Agent Push (API)
Agents actively push status updates to the management plane via HTTP/WebSocket/SSE.

**Pros:**
- Real-time updates (sub-second latency)
- Agents control what they share (structured, intentional)
- Works across machines/networks
- Natural for the "protocol-first" approach

**Cons:**
- Requires agents to implement the push protocol (adoption barrier)
- Agents need to know the management plane's address
- Network dependency
- Agent failure means no updates (silent failure)

**Precedent:** crshdn/mission-control uses WebSocket to OpenClaw Gateway (port 18789). jontsai Command Center uses SSE.

#### B. File/Log Polling
Management plane reads agent logs/traces from the filesystem.

**Pros:**
- Zero changes required to agents that already produce logs
- TasteKit already produces JSONL traces — free integration
- Simple, reliable, no network dependency
- Works even if agent crashes (logs persist)
- Offline/async analysis possible

**Cons:**
- Higher latency (polling interval)
- Filesystem access required (same machine or shared mount)
- Doesn't scale across machines without file sync
- Parsing overhead if formats vary

**Precedent:** Veritas-Kanban uses file-based (Markdown/YAML) state. TasteKit traces are JSONL.

#### C. Process Monitoring
Watch agent processes at the OS level (PID, stdout, resource usage).

**Pros:**
- No agent cooperation needed (fully external)
- Catches crashes, hangs, resource runaway
- Health check without agent support
- Can detect "stuck" by CPU/memory patterns

**Cons:**
- OS-specific implementation
- Limited semantic understanding (knows process is alive, not what it's doing)
- Invasive; may need elevated permissions
- Doesn't work across machines without additional tooling

**Precedent:** DevClaw health checks for stuck workers (>2h). CrowdStrike-style detection for security monitoring.

#### D. LLM API Telemetry
Integrate with the LLM API layer to see token usage, model calls, costs.

**Pros:**
- Cost awareness (critical for quota management)
- Model usage patterns (which models, how often)
- Can detect runaway spending
- Useful for the "quota-aware" pattern from research

**Cons:**
- Requires access to API keys or billing data
- Provider-specific (Anthropic API vs OpenAI API vs local models)
- Doesn't tell you *what* the agent is doing, just how much it's using
- Privacy/security considerations with API key access

**Precedent:** jontsai Command Center tracks cost in real-time; estimated ~$10k/month savings from quota-aware batching.

### Recommendation
**Start with B (file/log polling) + A (agent push) as a two-tier approach.**
- Tier 1: Read TasteKit JSONL traces and any structured logs agents produce (zero effort for existing agents).
- Tier 2: Define a push protocol for agents that want real-time reporting (opt-in, higher fidelity).
- Defer C and D to later iterations.

---

## Question 2: MVP Scope — What Gets Built First?

### Options

#### A. Visualization First
Build the dashboard. Show agent status, history, activity. No management agent.

**Pros:**
- Immediately useful (solves the "I can't see what my agents are doing" problem)
- Lower complexity
- Can iterate on UI before adding AI reasoning
- Validates the data model through real use

**Cons:**
- No intelligent oversight (just a prettier log viewer)
- Doesn't address the micromanagement problem (human still watches the board)

#### B. Agent-Brain First
Build the management agent (overseer). It reasons about state and generates suggestions. UI comes later.

**Pros:**
- Addresses the core value proposition (reduce micromanagement)
- Forces the protocol design early
- Can work via terminal/notifications before a dashboard exists

**Cons:**
- Hard to validate without seeing the data it's reasoning about
- Higher complexity for MVP
- Management agent without visualization is hard to trust

#### C. Both, Minimal
Simple board + simple management agent that reads state and suggests actions.

**Pros:**
- Delivers both halves of the value prop
- Tight feedback loop between visualization and agent
- More compelling as an open source project

**Cons:**
- Larger MVP surface area
- Risk of doing both things poorly

#### D. Protocol First
Define the data model and contracts. Build consumers after.

**Pros:**
- Gets the abstraction right before committing to implementation
- Enables community to build their own dashboards/agents on the protocol
- Most architecturally sound

**Cons:**
- Nothing usable for a while
- Hard to validate protocols without consumers
- Risk of over-designing

### Recommendation
**C (Both, Minimal) with a protocol-aware foundation (D).**
- Week 1: Define the protocol schemas (agent status report, event types, registry)
- Week 2-3: Build a minimal dashboard that can ingest file-based traces and display agent cards + activity feed
- Week 3-4: Add a simple management agent that periodically scans agent states and generates "stuck" / "needs attention" alerts
- This gives you something usable fast while building on solid abstractions.

---

## Question 3: Deployment Model

### Options

#### A. 100% Local (localhost only)
**Pros:** Maximum security, zero network exposure, simplest setup
**Cons:** Can't check on agents from phone/other devices

#### B. Local-First, Cloud-Optional
**Pros:** Flexibility, optional remote access
**Cons:** Complexity of optional cloud integration

#### C. Local LAN Accessible
**Pros:** Check from phone/tablet on same network, still no internet exposure
**Cons:** LAN security considerations, need to handle network binding

### Recommendation
**A (100% local) for MVP, designed so C (LAN) is trivial to enable later.**
- Next.js dev server on localhost:3000
- Add a `--host 0.0.0.0` flag or environment variable for LAN access when desired
- No cloud components in MVP
- Security by default (localhost binding) per research lessons from CVE-2026-25253

---

## Question 4: TasteKit Integration

### Options

#### A. Full TasteKit Profile for Management Agent
The overseer agent has its own constitution, guardrails, and taste profile.

**Pros:**
- Consistent with the monorepo philosophy
- Management agent's decision-making style is configurable and inspectable
- Operators can tune how aggressive/passive the overseer is
- Dogfooding TasteKit

**Cons:**
- Additional onboarding step
- Overkill for MVP

#### B. Read Agents' Profiles
Management plane reads TasteKit artifacts from managed agents to understand their purpose and constraints.

**Pros:**
- Gives the overseer context about what each agent *should* be doing
- Can detect misalignment between agent's constitution and its actual behavior
- Natural integration with existing artifacts

**Cons:**
- Read-only; overseer doesn't get its own personality

#### C. Defer
Not important for MVP.

**Pros:** Simpler MVP
**Cons:** Misses integration opportunity

### Recommendation
**B (Read agents' profiles) for MVP, A (full profile) as a fast-follow.**
- The overseer reading managed agents' constitutions and guardrails is immediately useful for reasoning about their behavior.
- A full TasteKit profile for the overseer itself is a great v2 feature that enables operators to tune its personality.

---

## Question 5: UI Paradigm

### Options

#### A. Kanban Board
Columns for agent states (e.g., Idle, Working, Stuck, Waiting, Done).

**Pros:** Familiar mental model, proven in research (crshdn/mission-control, Veritas-Kanban)
**Cons:** Can be limiting for complex agent states; doesn't show time dimension

#### B. Timeline / Activity Feed
Chronological stream of agent actions, decisions, outputs.

**Pros:** Natural for understanding "what just happened"; shows cause and effect
**Cons:** Overwhelming at scale; no structural overview

#### C. Dashboard + Agent Cards
Overview metrics + expandable cards for each agent.

**Pros:** At-a-glance overview; progressive disclosure; scales well
**Cons:** Less task-oriented; may not show workflows

#### D. Hybrid
Combination: Overview dashboard (metrics) + Kanban (task tracking) + Activity feed (real-time updates).

**Pros:** Best of all worlds; different views for different needs
**Cons:** More UI to build; potential UX complexity

### Recommendation
**D (Hybrid) with a primary focus on C (Dashboard + Agent Cards) for MVP.**
- **Primary view**: Dashboard with agent cards showing status, current task, health indicator
- **Secondary view**: Activity feed (global + per-agent filterable)
- **Later**: Kanban view for task-oriented workflows
- Agent cards should expand to show recent activity, suggestions from overseer, and action buttons

---

## Question 6: State Management & Persistence

### Options

#### A. File-Based (Markdown/YAML/JSON)
**Pros:** Simple, inspectable, git-friendly, no DB dependency, proven (Veritas-Kanban)
**Cons:** Scaling limits, no query capability, concurrent write risks

#### B. SQLite
**Pros:** Real queries, ACID transactions, single file, proven (crshdn/mission-control)
**Cons:** Binary file (not git-friendly), migration management

#### C. In-Memory with Optional Persistence
**Pros:** Fast, simple for MVP
**Cons:** Data loss on restart

### Recommendation
**B (SQLite) for structured state + A (JSONL files) for trace/event ingestion.**
- SQLite for: Agent registry, current status, intervention history, configuration
- JSONL files for: Activity events, trace ingestion (consistent with TasteKit)
- This mirrors how the research tools split: structured state in a DB, events in files

---

## Question 7: Communication Protocol Design

### Key Schema Decisions

#### Agent Status Report
```typescript
// Proposed schema (to be refined)
interface AgentStatusReport {
  agent_id: string;           // Unique agent identifier
  agent_type: string;         // "autoclaw" | "openclaw" | "claude-code" | "custom"
  name: string;               // Human-readable name
  status: AgentStatus;        // "idle" | "working" | "stuck" | "error" | "waiting" | "completed"
  current_task?: {
    id: string;
    description: string;
    started_at: string;       // ISO timestamp
    progress?: number;        // 0-100 if deterministic
  };
  health: {
    last_heartbeat: string;   // ISO timestamp
    uptime_seconds: number;
    error_count: number;
    resource_usage?: {
      tokens_used?: number;
      cost_usd?: number;
    };
  };
  recent_activity: ActivityEvent[];  // Last N events
  metadata?: Record<string, unknown>;  // Agent-specific data
}
```

#### Event Types
```typescript
type EventType =
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "status_changed"
  | "error_occurred"
  | "waiting_for_input"
  | "decision_made"
  | "tool_called"
  | "output_produced"
  | "heartbeat"
  | "agent_registered"
  | "agent_deregistered";
```

#### Agent Registration
```typescript
interface AgentRegistration {
  agent_id: string;
  agent_type: string;
  name: string;
  capabilities: string[];
  tastekit_profile_path?: string;  // Path to .tastekit/ directory
  reporting_mode: "push" | "file" | "both";
  push_endpoint?: string;         // If push mode
  trace_path?: string;            // If file mode
}
```

### Transport Options
- **File-based**: Drop JSONL files in a watched directory
- **HTTP POST**: Push events to management plane API
- **WebSocket**: Bidirectional for real-time
- **SSE**: Server-sent events for dashboard updates

### Recommendation
Support all four, with file-based as the lowest-barrier entry point and WebSocket for the dashboard.

---

## Question 8: Management Agent Architecture

### Reasoning Loop

```
┌─────────────────────────────────────────────────┐
│                 OVERSEER LOOP                    │
│                                                   │
│  1. OBSERVE                                       │
│     - Poll agent statuses (file + push)           │
│     - Read recent activity events                 │
│     - Check heartbeats for liveness               │
│                                                   │
│  2. SYNTHESIZE                                    │
│     - Build a summary of fleet state              │
│     - Compare to operator's stated goals          │
│     - Identify anomalies (stuck, error, drift)    │
│                                                   │
│  3. ASSESS                                        │
│     - Is any agent stuck? (no progress in X min)  │
│     - Is any agent erroring repeatedly?           │
│     - Are agents duplicating work?                │
│     - Is anything blocking progress?              │
│     - Is cost running away?                       │
│                                                   │
│  4. SUGGEST (if needed)                           │
│     - Generate human-readable suggestion          │
│     - Include reasoning (why this matters)        │
│     - Include proposed action                     │
│     - Queue for human approval                    │
│                                                   │
│  5. WAIT                                          │
│     - Sleep for interval (configurable)           │
│     - Or trigger on significant event             │
│                                                   │
│  → Repeat                                         │
└─────────────────────────────────────────────────┘
```

### Key Design Considerations

1. **Context efficiency**: The overseer needs to reason about multiple agents without exploding token usage. Use structured summaries, not raw logs. Compress agent state into compact representations.

2. **LLM choice**: Could use a smaller/cheaper model (Haiku) for routine checks, escalate to a larger model (Sonnet/Opus) only when something complex needs reasoning. This mirrors the DevClaw pattern of Junior/Medior/Senior roles.

3. **Trigger modes**:
   - **Polling**: Check every N seconds (simple, predictable cost)
   - **Event-driven**: React to specific events (stuck detected, error threshold crossed)
   - **Hybrid**: Poll at low frequency, react to events immediately

4. **Suggestion format**:
   ```typescript
   interface OverseerSuggestion {
     id: string;
     severity: "info" | "warning" | "critical";
     agent_id: string;
     summary: string;           // "Agent #3 appears stuck on API integration"
     reasoning: string;         // "No progress in 15 minutes, 3 failed tool calls"
     proposed_action: string;   // "Restart with alternative approach: use REST instead of GraphQL"
     action_type: "restart" | "redirect" | "escalate" | "pause" | "dismiss";
     created_at: string;
     status: "pending" | "approved" | "denied" | "expired";
   }
   ```

5. **Goal awareness**: The overseer should know the operator's high-level objective (e.g., "build a landing page with auth") so it can assess whether agents are actually making progress toward the goal, not just staying busy.

---

## Summary: Recommended Decisions for MVP

| Question | Recommended Answer |
|----------|-------------------|
| Data source | File polling (TasteKit traces) + agent push API (opt-in) |
| MVP scope | Both minimal (dashboard + simple overseer) with protocol schemas first |
| Deployment | 100% local (localhost), designed for easy LAN extension |
| TasteKit integration | Read agents' profiles; defer overseer's own profile |
| UI paradigm | Dashboard + agent cards (primary) + activity feed (secondary) |
| State management | SQLite for structured state + JSONL for events |
| Protocol | Define schemas in Zod, support file + HTTP + WebSocket transports |
| Management agent | Polling + event-driven hybrid; Haiku for routine, escalate for complex |

These are recommendations, not decisions. The planning/building session should validate these against the actual requirements and adjust as needed.
