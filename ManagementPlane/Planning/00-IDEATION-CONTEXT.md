# Management Plane — Ideation & Full Context Transfer Document

> **Purpose**: This document captures the complete ideation session for adding a Management Plane to the OSS-Agent-Tools monorepo. It is designed to give a fresh planning/building session full context to continue the work without information loss.
>
> **Date**: February 15, 2026
> **Status**: Ideation phase — no code written yet. Design decisions still open.

---

## Table of Contents

1. [Project Context — The Monorepo Today](#1-project-context)
2. [The Vision — Why a Management Plane](#2-the-vision)
3. [Design Decisions Made So Far](#3-design-decisions-made)
4. [Open Design Questions](#4-open-design-questions)
5. [Key Concepts & Terminology](#5-key-concepts)
6. [Architecture Direction](#6-architecture-direction)
7. [Relationship to Existing Projects](#7-relationship-to-existing-projects)
8. [External Research Summary](#8-external-research-summary)
9. [Next Steps](#9-next-steps)

---

## 1. Project Context — The Monorepo Today {#1-project-context}

The OSS-Agent-Tools monorepo contains two projects:

### AutoClaw (Planning Phase — Not Yet Implemented)
- **What**: An enhanced fork of PicoClaw (Go runtime) that combines ultra-lightweight agent efficiency with sophisticated management capabilities through TasteKit integration.
- **Status**: Documentation and planning only. Contains PRD, architecture analysis, and design docs.
- **Architecture**: 7-layer stack — CLI → Observability → Orchestration → MCP → TasteKit → Core Runtime → Security Sandbox
- **Key planned features**: TasteKit integration, tiered memory, MCP tool protocol, multi-agent orchestration, observability/analytics.
- **Location**: `/AutoClaw/AutoClaw-Planning-Documentation/`
- **Files**: `AutoClaw-PRD.md`, `picoclaw-analysis.md`, `enhanced-picoclaw-design.md`, `openclaw-vs-picoclaw-comparison.md`

### TasteKit (Implemented — v0.5.0)
- **What**: CLI-first tool for capturing, compiling, and managing portable agent "taste" profiles with built-in drift detection, skill management, MCP integration, and trace-first observability.
- **Status**: Released v0.5.0, functional.
- **Tech Stack**: TypeScript 5.6.0 (strict), Node.js 18+, pnpm v10.29.2 monorepo, Vitest, ESLint, Prettier.
- **Location**: `/TasteKit/tastekit/`
- **Key packages**:
  - `@tastekit/core` — Schemas (Zod), compiler, interview, skills, MCP client, trust, tracing (JSONL), drift detection, eval, domain-specific flows
  - `@tastekit/cli` — Commander.js CLI (init, onboard, compile, simulate, mcp, trust, skills, drift, eval, export, import)
  - `packages/adapters/` — Runtime adapters (openclaw implemented; claude-code, manus, autopilots are stubs)
- **Architecture patterns**:
  - **Artifact-first**: Everything compiles to versioned JSON/YAML files
  - **Progressive disclosure**: Minimal context loaded initially, deeper context on demand
  - **MCP-first**: All tool integration through Model Context Protocol (JSON-RPC 2.0)
  - **Trace-first**: Every operation produces structured JSONL traces
  - **Drift detection**: Analyzes traces for deviations, generates consolidation proposals
  - **Portable profiles**: Export adapters convert artifacts to any runtime format
- **Artifact types**: Constitution, Guardrails, Memory Policy, Skills, Bindings, Trust, Traces
- **Workspace structure**: `.tastekit/` directory with `artifacts/`, `skills/`, `traces/`, `compiled/`, `session.json`, `tastekit.yaml`

### Monorepo Infrastructure
- **Package manager**: pnpm v10.29.2 with workspaces
- **Build**: TypeScript compiler (tsc)
- **CI/CD**: GitHub Actions (Node 18/20/22 matrix)
- **Testing**: Vitest v2.0
- **Config format**: YAML primary, JSON for compiled artifacts

---

## 2. The Vision — Why a Management Plane {#2-the-vision}

### The Problem (from the user's own experience)

> "Everybody is getting a lot better results by having it build a management console and even just a simple kanban board where I can see, especially once you have more than one agent working, it's very helpful. It just gives you at a glance where they're at, if they're stuck, stuff like that."

**Core pain points:**
1. **Lack of visibility**: When running multiple agents, there's no unified view of what they're all doing. You have to check each agent individually.
2. **Micromanagement trap**: Without good tooling, operators end up constantly checking on agents, context-switching between them, and manually intervening. This defeats the purpose of agents.
3. **Log diving is painful**: Current platforms either don't expose agent activity well, or require digging through verbose logs to understand what happened.
4. **No executive overview**: No tool exists that can take in someone's high-level goal, see where agents actually are, understand the *reasons* for their current state, and surface only what matters.
5. **Multi-agent coordination gaps**: When agents overlap, conflict, or one depends on another's output, there's no easy way to see or manage this.

### The Vision

A management plane that provides:

1. **At-a-glance visibility** — See all your agents, their current status, what they're working on, if they're stuck, their progress toward goals.
2. **Easy activity visualization** — Make it trivial to see what agents are actually doing without diving into logs. Not logging per se, but structured, human-friendly activity feeds.
3. **A management agent (the "overseer")** — An agent whose sole focus is understanding the high-level picture across all other agents. It:
   - Takes in the operator's high-level goal
   - Monitors what each agent is doing and why
   - Makes executive-level assessments of progress
   - Only intervenes when truly necessary (these working agents are very capable)
   - Acts as a better first layer than the human constantly checking in
   - Suggests interventions with human approval (not autonomous action)
4. **Reduced micromanagement** — The whole point is to free the operator from constantly babysitting agents. The management plane should make it so you can trust your agents are on track and only pay attention when something actually needs you.
5. **Multi-agent awareness** — Designed from the start for the reality that people run multiple agents, not just one.

### What This Is NOT

- Not a full project management replacement (not rebuilding Jira)
- Not a logging/observability platform (not rebuilding Datadog)
- Not an agent framework (that's AutoClaw)
- Not a taste/profile system (that's TasteKit)

It's the **control surface** — the place where an operator sits to understand and steer their fleet of agents.

---

## 3. Design Decisions Made So Far {#3-design-decisions-made}

These were explicitly confirmed by the user during ideation:

### 3.1 Primary User Persona
**Solo operator with multiple agents.**
- Starting point: 2-5 agents
- Growth path: Scale beyond that, likely introducing hierarchies and other coordination patterns
- Team support is a later concern, not MVP

### 3.2 Management Agent Autonomy Level
**Suggest + Approve.**
- The management agent observes and suggests interventions (e.g., "Agent X is stuck, recommend restarting with different approach")
- Requires human approval before taking any action
- Does NOT autonomously restart, reprioritize, or reassign agents
- The operator stays in control but doesn't have to do the monitoring work

### 3.3 Tech Stack
**TypeScript + Next.js.**
- Consistent with TasteKit's TypeScript ecosystem
- Shared types and schemas possible
- Next.js for the dashboard/web UI
- This keeps the monorepo in one language family

### 3.4 Agent System Coupling
**Agnostic but opinionated.**
- Design a standard protocol/interface that any agent system can implement to report status
- Ship with deep AutoClaw integration as the reference implementation
- Other agent systems (OpenClaw, Claude Code, custom agents) can integrate via the protocol
- Follows TasteKit's adapter pattern as a model

---

## 4. Open Design Questions {#4-open-design-questions}

These questions were posed but NOT yet answered. The planning/building session should work through these:

### 4.1 Data Source — How Does the Management Plane Get Agent Information?
Options to evaluate (not mutually exclusive):
- **Agent push (API)**: Agents push status updates via a lightweight API/protocol (webhook, SSE, etc.)
- **File/log polling**: Management plane reads agent logs/traces from the filesystem (like TasteKit's JSONL traces)
- **Process monitoring**: Watch agent processes at the OS level (PID, stdout, resource usage)
- **LLM API telemetry**: Integrate with LLM API layer to see token usage, model calls, costs in real time

Likely answer: A combination. TasteKit already has JSONL traces, so file-based ingestion is natural. Agent push gives real-time updates. Process monitoring adds health checks. LLM telemetry adds cost awareness.

### 4.2 MVP Scope — What Gets Built First?
Options to evaluate:
- **Visualization first**: Dashboard only. See agent status and history. No management agent.
- **Agent-brain first**: Management agent that reasons about state. UI comes later.
- **Both, minimal**: Simple board + simple management agent.
- **Protocol first**: Nail down the data model and contracts. Build consumers after.

### 4.3 Deployment Model
Options to evaluate:
- **100% local**: Runs entirely on user's machine. Localhost only.
- **Local-first, cloud-optional**: Local by default, optional hosted backend for persistence/remote access.
- **Local LAN accessible**: Local backend + web UI accessible from any device on local network (e.g., check agents from phone).

### 4.4 TasteKit Integration
Options to evaluate:
- **Full TasteKit profile**: The management agent has its own taste profile governing its personality and decision-making.
- **Read agents' profiles**: Consume TasteKit artifacts from managed agents for context, but management agent doesn't need its own full profile.
- **Defer**: Not important for MVP.

### 4.5 UI Paradigm
Options to evaluate (from research):
- **Kanban board**: Columns for agent states (Planning, Working, Stuck, Done). Most commonly used pattern.
- **Timeline/activity feed**: Chronological stream of agent actions, decisions, outputs.
- **Dashboard + cards**: Agent cards with status indicators, expandable for details.
- **Hybrid**: Kanban for task tracking + activity feed for real-time updates + dashboard for overview metrics.

### 4.6 State Management & Persistence
- File-based (Markdown/YAML, like Veritas-Kanban)?
- SQLite (like crshdn/mission-control)?
- In-memory with optional persistence?
- What state needs to survive restarts?

### 4.7 Communication Protocol Design
- What's the schema for agent status reports?
- How do agents register with the management plane?
- What events matter? (task_start, task_complete, error, stuck, waiting_for_input, etc.)
- How does the management agent communicate suggestions back?

### 4.8 Management Agent Architecture
- What LLM powers the management agent?
- How does it get context about what other agents are doing without token explosion?
- How does it decide when something is worth surfacing to the human?
- What's its reasoning loop? (poll → summarize → assess → suggest?)
- How does it integrate with AutoClaw as a runtime?

---

## 5. Key Concepts & Terminology {#5-key-concepts}

| Term | Meaning |
|------|---------|
| **Management Plane** | The overall system — UI + management agent + protocols + state |
| **Management Agent / Overseer** | An AI agent focused solely on monitoring and coordinating other agents |
| **Operator** | The human user running agents. Not "user" to avoid confusion with end-users of what agents build |
| **Worker Agent** | Any agent being managed (AutoClaw, OpenClaw, Claude Code, etc.) |
| **Agent Fleet** | The set of all worker agents an operator is running |
| **Intervention** | When the management agent or operator takes action on a worker agent (restart, redirect, etc.) |
| **Status Report** | Structured data a worker agent sends about its current state |
| **Activity Feed** | Human-readable stream of what agents are doing |
| **Agent Card** | UI element showing a single agent's status, task, and health |
| **Suggest + Approve** | The autonomy model — management agent suggests, human approves |

---

## 6. Architecture Direction {#6-architecture-direction}

Based on decisions made and the existing monorepo patterns, here's the emerging architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    OPERATOR (Human)                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Next.js Web Dashboard                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │  │
│  │  │ Overview  │ │  Kanban  │ │  Activity Feed     │  │  │
│  │  │ Dashboard │ │  Board   │ │  (per-agent +      │  │  │
│  │  │          │ │          │ │   global)           │  │  │
│  │  └──────────┘ └──────────┘ └────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  Intervention Panel (approve/deny/modify)    │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
│                          ▲                                │
│                          │ WebSocket / SSE                │
│                          ▼                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Management Plane Backend               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │  │
│  │  │  Agent   │ │  State   │ │  Management      │   │  │
│  │  │ Registry │ │  Store   │ │  Agent (Overseer)│   │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  Protocol Layer (ingest + normalize)         │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
│                          ▲                                │
│            ┌─────────────┼─────────────┐                  │
│            │             │             │                  │
│            ▼             ▼             ▼                  │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────┐       │
│  │  AutoClaw    │ │  OpenClaw  │ │  Claude Code │       │
│  │  Agent #1    │ │  Agent #2  │ │  Agent #3    │       │
│  │ (reference)  │ │ (adapter)  │ │ (adapter)    │       │
│  └──────────────┘ └────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Principles (inherited from TasteKit's patterns)

1. **Protocol-first**: Define the agent status protocol before building consumers. Any agent that speaks the protocol can be managed.
2. **Adapter pattern**: Deep integration for AutoClaw, adapters for other systems (mirrors TasteKit's approach).
3. **File-friendly**: Leverage TasteKit's existing JSONL trace format as one data source. Don't force agents to adopt a new protocol if they already produce traces.
4. **Progressive detail**: Overview → Card → Detail → Full logs. Don't front-load information.
5. **Suggest, don't act**: Management agent proposes; operator decides.
6. **Local-first**: Runs on operator's machine. No cloud dependency.

### Potential Package Structure (following TasteKit conventions)

```
ManagementPlane/
├── packages/
│   ├── core/          — Protocol schemas, agent registry, state management
│   ├── overseer/      — Management agent logic (reasoning, assessment, suggestions)
│   ├── dashboard/     — Next.js web application
│   ├── adapters/      — Agent-specific integrations
│   │   ├── autoclaw/  — Reference adapter
│   │   ├── openclaw/  — OpenClaw adapter
│   │   └── generic/   — File/log based generic adapter
│   └── cli/           — Optional CLI for headless/terminal operation
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## 7. Relationship to Existing Projects {#7-relationship-to-existing-projects}

```
┌──────────────────────────────────────────────────────┐
│                  OSS-Agent-Tools                      │
│                                                       │
│  TasteKit          AutoClaw         Management Plane  │
│  ─────────         ────────         ────────────────  │
│  "What agents      "How agents      "Seeing & steering│
│   should be"        run"             agents"          │
│                                                       │
│  Compiles taste  →  Consumes taste   Observes agents  │
│  profiles           + runs agents    + suggests action│
│                                                       │
│  Schemas, drift,    Go runtime,      Dashboard, over- │
│  MCP, tracing       orchestration    seer agent, proto│
│                                                       │
│  v0.5.0 ✓           Planning only    Ideation phase   │
└──────────────────────────────────────────────────────┘
```

**Integration points:**
- Management Plane reads TasteKit traces (`.tastekit/traces/*.trace.v1.jsonl`)
- Management Plane could consume TasteKit artifacts to understand agent profiles
- Management Plane's overseer agent could itself have a TasteKit profile
- Management Plane speaks to AutoClaw via its planned orchestration layer
- All three share TypeScript, pnpm workspace conventions, Zod schemas

---

## 8. External Research Summary {#8-external-research-summary}

See `01-RESEARCH-COMPILATION.md` for the full research dump. Key takeaways:

### What's Working in the Ecosystem (Feb 2026)
1. **Kanban + real-time updates** is the most popular pattern (crshdn/mission-control, Veritas-Kanban)
2. **Hierarchical "Godfather" orchestrators** work well for structured tasks (jontsai Command Center, DevClaw)
3. **Slack-native observability** reduces context switching but ties you to a platform
4. **File-based state** (Markdown/YAML) reduces complexity and attack surface
5. **WebSocket/SSE** for real-time updates to dashboards

### What's Failing
1. **Security**: 40,000+ exposed instances, default configs are dangerous
2. **Autonomous swarms without governance**: Emergent behaviors go sideways fast
3. **Scaling beyond ~20 agents**: State compaction and context management break down
4. **Generic dashboards**: Practitioners keep building custom mission controls because generic tools don't fit

### Relevant Tools to Learn From
| Tool | Key Insight |
|------|-------------|
| crshdn/mission-control | Kanban + AI planning + WebSocket. ~382 stars. Next.js. SQLite. |
| jontsai Command Center | Quota-aware orchestration. Godfather pattern. SSE dashboard. |
| Veritas-Kanban | File-based (Markdown/YAML). No DB. REST + WebSocket. Approval gates. |
| DevClaw | Role-based workers. GitHub issues as state source. QA feedback loops. |
| tug/openclaw-dashboard | Zero-dependency monitoring. Usage heatmaps. Lightweight. |

### Security Lessons
- Sandbox everything. Localhost binding. TLS.
- Token rotation. Least privilege.
- Don't expose the management plane's gateway.
- Monitor for prompt injection in agent outputs.

---

## 9. Next Steps {#9-next-steps}

The planning/building session should:

1. **Resolve open design questions** (Section 4) — work through each systematically
2. **Define the protocol schema** — what data flows between agents and the management plane
3. **Design the management agent's reasoning loop** — how it processes agent state and decides what to surface
4. **Spec the MVP** — minimum set of features for a useful first version
5. **Create the project structure** — packages, configs, build setup within the monorepo
6. **Build iteratively** — protocol → backend → dashboard → overseer agent

### Suggested MVP Feature Set (to be validated)
- [ ] Agent registration and status tracking
- [ ] Real-time dashboard with agent cards (status, current task, health)
- [ ] Activity feed showing structured agent actions
- [ ] Simple Kanban-style view (configurable columns)
- [ ] Management agent that periodically summarizes fleet state
- [ ] Management agent that detects stuck/erroring agents and suggests interventions
- [ ] Approval UI for management agent suggestions
- [ ] File-based trace ingestion (read TasteKit JSONL traces)
- [ ] WebSocket for real-time updates

---

*This document should be read alongside:*
- `01-RESEARCH-COMPILATION.md` — Full research on multi-agent management approaches
- `02-MONOREPO-ANALYSIS.md` — Detailed analysis of the existing codebase
- `03-OPEN-QUESTIONS-DEEP-DIVE.md` — Expanded analysis of each open design question
