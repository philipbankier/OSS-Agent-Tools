# Management Plane — Research Compilation

> **Source**: External research provided by the project owner, covering OpenClaw ecosystem, multi-agent management approaches, case studies, and security considerations as of mid-February 2026.
>
> **Purpose**: Complete reference for the planning/building session. This is raw research context, not filtered conclusions.

---

## Overview — State of the Ecosystem (February 15-16, 2026)

OpenClaw's ecosystem has seen accelerated releases of orchestration tools, heightened security scrutiny, and continued growth in agent societies. Key stats:
- GitHub stars for OpenClaw: ~150k-175k
- ClawHub community skills: 5,705+
- Moltbook agents: 1.5-1.6 million
- Exposed instances (security concern): 40,000+

New management layers focus on:
- Real-time dashboards
- Intelligent scheduling for LLM quota management (e.g., Claude Code Max)
- Tighter OpenClaw Gateway integrations via WebSockets and Server-Sent Events (SSE)

---

## Taxonomy of Management Plane Approaches

### 1. Workflow Engine / Kanban + Traces
- Enhanced with AI-guided planning (Q&A flows)
- Drag-and-drop boards (e.g., crshdn/mission-control)
- Real-time updates via SSE or WebSocket

### 2. Agent OS / Hierarchical ("Godfather" Orchestrator)
- Central coordinator with satellite workers
- Slack-native visibility (jontsai Command Center)
- Scheduling primitives mimic OS concepts (run-if-idle, priority queues, conflict avoidance)

### 3. Swarm with Arbitration & Shared Memory
- Convex DB for real-time sync, Kanban, and agent-to-agent messaging
- Moltbook-style emergent societies with on-chain elements

### 4. Event-Driven / Queue-Based
- Heartbeat schedulers
- Cron-style tasks with quota awareness
- Lane queues for serial execution

### 5. Blockchain Coordination
- USDC hackathons and agent hiring/payment experiments on Base/MoltRoad
- Still experimental with governance gaps

---

## Tool / Repo Matrix

| Tool Name | Target Agent | Orchestration Model | UI/Dashboard? | Maturity | Best For | Gotchas |
|-----------|-------------|-------------------|---------------|----------|----------|---------|
| **OpenClaw Command Center** (jontsai) | OpenClaw | Hierarchical + Quota Scheduling | Y (SSE) | New (Feb 12), active | 24/7 swarms, cost control | Slack dependency |
| **crshdn/mission-control** | OpenClaw | Kanban + AI Planning | Y (Next.js) | ~382 stars, v1.0.1 | Task decomposition & tracking | SQLite single-file DB |
| **openclaw-dashboard** (tug) | OpenClaw | Monitoring + Cron | Y (vanilla) | Recent, zero-deps | Observability on low-resource | Limited orchestration |
| **Convex Claw Integration** | OpenClaw | Shared Memory / Real-time | Y | Growing adoption | Multi-agent collab | External DB dependency |
| **Custom Practitioner MCs** | OpenClaw | Hybrid (templates, inter-agent chat) | Y | Community-driven | Replacing Jira/Project mgmt | Fragmented, varying security |

---

## Detailed Pattern Library

### Pattern: Godfather / Central Planner with Quota Routing
- Coordinates multiple master instances and satellites
- Uses model routing (Opus for reasoning, local for cheap tasks)
- Scheduling primitives like `run-if-not-run-since`
- Works for 24/7 coding/ops
- Fails on single-point bottlenecks
- Example: jontsai Command Center
- Defaults: token budgets, off-peak batching

### Pattern: Real-Time Dashboard + WebSocket
- Kanban with dynamic agent creation and deliverable tracking
- Example: crshdn/mission-control
- Human approvals at REVIEW stage

### Pattern: Slack-Native Observability
- Mission control inside existing Slack threads
- Low-friction steering
- Reduces context switching
- Platform lock-in risk

---

## Expanded Case Studies

### Case Study 1: Quota-Aware Swarm Orchestration (jontsai Command Center, Feb 12, 2026)

**Initial problem**: Hitting Claude Code Max quotas mid-week despite $200/month plan.

**Design**:
- Godfather orchestrator over 5 master instances + 10 satellites
- Slack threading for native habitat
- SSE dashboard ("Cerebro") for sessions, topics, vitals
- Tasks use scheduling primitives (run-if-idle, priority queues) and model routing

**Evaluation**: Real-time cost tracking and history. Human role: Visibility + occasional Slack overrides.

**Post-failure changes**: Quota-aware batching to off-peak hours.

**Outcomes**: ~$10k/month savings, 24/7 execution, estimated 1000x productivity multiplier. Deployed on Mac Studio/Minis via clawhub install.

### Case Study 2: Kanban Dashboard for Dynamic Agent Teams (crshdn/mission-control)

**Problem**: Manual task assignment and tracking across agents.

**Design**:
- Next.js Kanban (PLANNING → REVIEW → DONE) with AI Q&A planning
- WebSocket to OpenClaw Gateway (port 18789)
- SQLite state
- Dynamic agent creation

**Evaluation**: Deliverable URLs and review stage. Human approvals/gates.

**Post-failure**: Added multi-machine support via Tailscale.

**Outcomes**: Streamlined workflows; ~382 stars. Docker-friendly, env-based gateway token.

### Case Study 3: Security Hardening (CrowdStrike & Exposure Reports, early Feb 2026)

**Problem**: 40,000+ exposed instances, Moltbook database leaks (1.5M tokens, 35k emails), prompt injection (wallet-draining posts).

**Design issues**: Initial loose configs.

**Changes**: Patches (post-CVE-2026-25253), sandbox=all, localhost binding, AIDR-style guardrails, removal packs.

**Evaluation**: SIEM dashboards for DNS/process visibility.

**Outcomes**: Enterprises gained inventory/remediation; underscores need for management-plane monitoring.

**Key stats**:
- CVE-2026-25253: CVSS 8.8, one-click RCE via token exfiltration
- Affected versions: before 2026.1.29
- 135,000 instances scanned, 63% vulnerable
- Fixed in v2026.1.29 (Jan 30, 2026), TLS 1.3 in v2026.2.1

### Case Study 4: Ops Monitoring with Veritas-Kanban

**Problem**: Stuck tasks in 14-agent marketing swarm caused 5% downtime.

**Design**:
- File-based (Markdown/YAML) with REST/WebSocket API
- Integrates with OpenClaw via sessions_spawn
- Boards track via columns; agents update via endpoints
- YAML frontmatter for metadata
- CLI (vk begin/done) for lifecycle

**Evaluation**: Regex/JSON checks; error learning with similarity search.

**Human involvement**: Approval gates; permission tiers (Intern/Lead).

**Post-failure**: Added multi-agent dedup after thrash; vacation delegation.

**Outcomes**: Uptime to 95%; real-time dashboards cut micromanagement. Deployed on $5 VPS with Docker.

### Case Study 5: Dev Team Orchestration (DevClaw)

**Problem**: Manual code reviews and task handoffs delayed deployments, context loss inflated token costs.

**Design**:
- TypeScript module plugging into OpenClaw
- Role-based workers: Junior (Haiku), Medior (Sonnet), Senior (Opus)
- QA reviewers in feedback loop
- GitHub issues as state source, labels drive transitions (Planning → To Do → Doing → To Test → Done)
- Sessions persist per project for context reuse
- Token-free scheduler (work_heartbeat every 60s), up to 4 parallel workers

**Task tracking**: Issues via API; tools like work_start/work_finish enforce atomic updates with rollbacks. Audit logs in NDJSON.

**Evaluation**: QA loops refute/review; failures revert to "To Improve" for re-assignment. Self-critique via role instructions (dev.md, qa.md).

**Post-failure changes**: Feb 2026 updates restricted orchestrator to planning-only, fixing bottlenecks; added health checks for stuck workers (>2h).

**Outcomes**: Completed 5 issues overnight across web/API projects, boosting speed by 70%. Tradeoffs: Relies on external trackers, vulnerable to API rate limits.

### Case Study 6: Emergent Agent Society (Moltbook USDC Hackathon & Base experiments)

**Problem**: Lack of coordination/governance in swarms.

**Design**: On-chain voting, payments, hiring via Base/USDC; agents post/debate on platform. Community upvotes, on-chain outcomes.

**Post-failure changes**: Governance additions after scams/injections; GATO layers (Model RLHF, Agent Ethos values, Network zero-trust RBAC).

**Outcomes**: 200+ communities; live economic layers but gas/trust issues persist. 770k agents in early 2026.

### Case Study 7: Agent Society on Clawcaster with Base

**Problem**: No governance for agent markets, leading to scams.

**Design**: Farcaster-like with on-chain identities; wallets for transactions. Prediction markets use upvotes for norms. Composable social features, 200+ communities, governance through upvotes and RBAC.

**Post-failure changes**: Credential revocation and audit trails post-injection attacks.

**Outcomes**: 770k agents, enabled economies but with gas/trust issues.

---

## Key Practical Recommendations from Research

### Immediate Actions
1. Adopt tools like OpenClaw Command Center or crshdn/mission-control for observability and task routing
2. Use heartbeat schedulers, lane queues, and OS-inspired primitives (run-if-idle) for long-running work
3. Implement strict sandboxing, localhost binding, and monitoring for security

### Security Mitigations
- Aggressive sandboxing
- Token rotation
- Runtime guardrails (AIDR-like filters)
- Least-privilege access
- VirusTotal for skill scanning
- TLS 1.3 enforcement
- Localhost binding for management plane gateway
- Monitor DNS to agent endpoints

### What Works
- Kanban + WebSocket for real-time observability
- Hierarchical models for structured tasks
- File-based state for simplicity and security
- Approval gates for human-in-the-loop
- Role-based access control

### What Doesn't Work
- Full agent autonomy without governance
- Default open configurations
- Scaling beyond ~20 agents without state compaction
- Generic dashboards (practitioners keep building custom)
- Swarms without arbitration

---

## Open Research Gaps

1. Governance for agent economies on blockchain remains nascent
2. Real-time state compaction at scale (>20 agents) underdeveloped
3. Robust self-modification controls underdeveloped
4. Interoperability between custom dashboards and core gateway improving but fragmented
5. Security tooling is reactive; proactive management-plane standards needed
6. Emergent behaviors in agent societies require governance layers that are still maturing
