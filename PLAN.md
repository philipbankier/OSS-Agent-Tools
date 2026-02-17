# Project Roadmap & Status

Last updated: 2026-02-16

This roadmap has two parallel tracks:
- **Track A**: TasteKit + AutoClaw (taste compiler → agent runtime)
- **Track B**: autoManage (management dashboard for agent oversight)

Track B depends only on Track A Phase 1 (complete). It can proceed independently.

---

# Track A: TasteKit + AutoClaw

## Phase 1: Make TasteKit Functional (COMPLETE)

Goal: Every CLI command works end-to-end. A user can init, onboard, compile, export, and manage drift.

### 1.1 Core Infrastructure Fixes
- [x] Replace MCP stub with `@modelcontextprotocol/sdk` wrapper (`packages/core/mcp/client.ts`)
- [x] Fix evaluation system - real deterministic, schema, and LLM judge rules (`packages/core/eval/judge.ts`)
- [x] Fix eval runner - accept execution function instead of mock data (`packages/core/eval/runner.ts`)
- [x] Implement memory consolidation merge detection (`packages/core/drift/consolidator.ts`)

### 1.2 CLI Commands
- [x] `tastekit export --target <adapter>` - wire up adapter export (`packages/cli/src/commands/export.ts`)
- [x] `tastekit import --target <adapter>` - wire up adapter import + SOUL.md import (`packages/cli/src/commands/import.ts`)
- [x] `tastekit drift detect` - wire up drift detector (`packages/cli/src/commands/drift.ts`)
- [x] `tastekit drift apply` - apply drift proposals to artifacts
- [x] `tastekit drift memory-consolidate` - wire up consolidator
- [x] `tastekit skills list` - read and display manifest (`packages/cli/src/commands/skills.ts`)
- [x] `tastekit skills lint` - wire up linter
- [x] `tastekit skills pack` - wire up packer
- [x] `tastekit trust init` - create default trust policy (`packages/cli/src/commands/trust.ts`)
- [x] `tastekit trust pin-mcp` - wire up trust manager
- [x] `tastekit trust pin-skill-source` - wire up trust manager
- [x] `tastekit trust audit` - wire up trust auditor
- [x] `tastekit mcp add` - register MCP server (`packages/cli/src/commands/mcp.ts`)
- [x] `tastekit mcp list` - list registered servers
- [x] `tastekit mcp inspect` - wire up inspector
- [x] `tastekit mcp bind` - wire up binder
- [x] `tastekit eval run` - wire up eval runner (`packages/cli/src/commands/eval.ts`)
- [x] `tastekit eval replay` - wire up replay

### 1.3 Interop Formats
- [x] SOUL.md import (convert OpenClaw SOUL.md/IDENTITY.md into TasteKit constitution)
- [x] AGENTS.md export (generate AGENTS.md from TasteKit artifacts)
- [x] Agent File (.af) import/export (Letta format v2 — persona/soul blocks ↔ constitution)

### 1.4 Quality
- [x] Add test suite for schemas (pure function validation) — 30 tests
- [x] Add test suite for compiler (constitution, guardrails, memory) — 20 tests
- [x] Add test suite for drift detection (consolidator: retention, merge, edge cases) — 11 tests
- [x] Add test suite for eval judge (deterministic, regex, schema, LLM mock) — 16 tests
- [ ] CI pipeline runs tests on PR

---

## Phase 2: Ship TasteKit v1.0

Goal: TasteKit is usable by real users as a standalone tool.

### 2.0 LLM-Driven Onboarding System
- [x] LLM Provider Interface — Anthropic, OpenAI, Ollama (packages/core/llm/)
- [x] Domain Rubric Format — dimensions not questions (packages/core/interview/rubric.ts)
- [x] Universal Rubric — 7 shared dimensions across all domains (packages/core/interview/universal-rubric.ts)
- [x] Content Agent Rubric — 16 domain-specific dimensions (packages/core/domains/content-agent/rubric.ts)
- [x] Development Agent Rubric — 24 hybrid dimensions (packages/core/domains/development-agent/rubric.ts)
- [x] Session & Schema Extensions — backward compatible (packages/core/schemas/workspace.ts)
- [x] Interviewer Engine — LLM-driven adaptive interview with coverage tracking (packages/core/interview/interviewer.ts)
- [x] Constitution Compiler — dual-path: rich structured answers + legacy flat answers (packages/core/compiler/constitution-compiler.ts)
- [x] `tastekit init` — domain selection, depth selection, LLM auto-detection
- [x] `tastekit onboard` — LLM interview with resume support
- [x] `tastekit compile` — wired to real compiler (no longer a stub)

### 2.1 Complete Domains
- [x] Research agent domain (18 rubric dimensions, 2 skills, 2 playbooks, questions)
- [x] Sales agent domain (18 rubric dimensions, 2 skills, 2 playbooks, questions)
- [x] Support agent domain (18 rubric dimensions, 2 skills, 2 playbooks, questions)
- [x] Development agent domain (rubric complete)
- [x] Content agent domain (rubric complete)

### 2.2 Compiler Completions
- [x] Skills library compilation (domain-aware skills compiler with SKILL.md + manifest generation)
- [x] Playbook generation (domain-specific playbooks: simple-post, research-and-post, content-calendar)
- [x] Rich constitution generation (structured answers path with rationale, examples, evidence, taboos)

### 2.3 Developer Experience
- [x] LLM-driven onboarding interview (replaces basic inquirer wizard)
- [x] Rich CLI output with formatting and colors (shared ui.ts module, table formatting)
- [x] Better error messages with actionable suggestions (unified handleError, hint system)
- [x] Tab completion for CLI commands (bash/zsh/fish via `tastekit completion`)

### 2.4 Documentation
- [x] Update README with working examples (CLI commands table, artifact tree, domain table)
- [x] Quick-start tutorial (init -> onboard -> compile -> export, updated for LLM interview)
- [ ] Video walkthrough
- [x] Adapter-specific guides (docs/adapters/ — Claude Code, Manus, OpenClaw, Autopilots)
- [x] Fix docs formatting (remove triple-quote wrapping from 6 docs files)
- [x] Update domains.md (all 5 domains fully implemented, not stubs)
- [x] Flesh out example projects (minimal-agent, content-agent, newsletter-agent)

### 2.5 Release
- [ ] npm publish @tastekit/core and @tastekit/cli
- [ ] GitHub release with changelog
- [ ] Announce to relevant communities

---

## Phase 3: Start AutoClaw Development

Goal: Minimal viable AutoClaw fork with TasteKit artifact loading and MCP.

### 3.1 Foundation
- [ ] Fork PicoClaw repository
- [ ] Set up Go module structure
- [ ] CI/CD pipeline
- [ ] Rename and rebrand (avoid "Claw" in name)

### 3.2 TasteKit Artifact Loading
- [ ] Read `.tastekit/` artifacts (JSON/YAML) in Go
- [ ] Generate PicoClaw workspace files (AGENTS.md, IDENTITY.md, SOUL.md, USER.md) from artifacts
- [ ] Migration utility for existing PicoClaw users
- [ ] No Node.js dependency - static artifact loading only

### 3.3 MCP Integration (Go)
- [ ] Use official Go MCP SDK (`github.com/modelcontextprotocol/go-sdk`)
- [ ] Replace PicoClaw custom tools with MCP protocol
- [ ] Trust management (pinning, auditing)
- [ ] Wrap existing PicoClaw tools as MCP servers for backward compatibility

### 3.4 Basic Drift Detection
- [ ] Port drift detector logic to Go
- [ ] Weekly drift analysis of working memory
- [ ] Drift proposal generation and review CLI
- [ ] Accept/reject proposals with version bumps

---

## Phase 4: AutoClaw Memory & Orchestration

Goal: Tiered memory and multi-agent coordination.

### 4.1 Tiered Memory System
- [ ] Constitution layer (immutable, from TasteKit)
- [ ] Preferences layer (semi-mutable, drift-tracked)
- [ ] Working memory layer (auto-updating, last 30 days)
- [ ] Performance layer (read-only metrics)
- [ ] Memory consolidation (working -> preferences)
- [ ] Memory rollback and diff commands

### 4.2 Multi-Agent Orchestration
- [ ] Shared memory pools
- [ ] Team workflows (YAML definitions)
- [ ] Role-based access control
- [ ] Consider A2A protocol compatibility

---

## Phase 5: AutoClaw Observability & Polish

Goal: Production-grade monitoring. Ship AutoClaw v1.0.

### 5.1 Observability
- [ ] Trace-first JSONL logging
- [ ] Performance analytics
- [ ] Drift visualization

### 5.2 A/B Testing
- [ ] A/B test framework for taste profile versions
- [ ] Random assignment, metric tracking
- [ ] Statistical significance calculation

### 5.3 Polish & Launch
- [ ] Comprehensive documentation
- [ ] Example workflows
- [ ] Migration guides from PicoClaw and OpenClaw
- [ ] Launch

---

## Parking Lot (Future Considerations)

These are ideas worth tracking but not committed to any phase:

- [ ] Agent File (.af) full support (Letta interop)
- [ ] A2A protocol integration for orchestration
- [ ] Agent Skills format (Anthropic) interop
- [ ] Web UI for onboarding
- [ ] VSCode extension for SKILL.md authoring
- [ ] Skills marketplace/registry
- [ ] AI-assisted onboarding (conversational instead of forms)
- [ ] Smart skill generation from task descriptions
- [ ] Enterprise features (RBAC, SSO, compliance)
- [ ] Trademark verification for "TasteKit" name
- [ ] Naming decision for AutoClaw (avoid "Claw")
- [ ] Trace file pruning (`tastekit traces prune` CLI command)
- [ ] Approval timeout in guardrails schema (`timeout_seconds` field)
- [ ] TracerStream decorator for EventEmitter-based streaming (v1.1 autoManage integration)

---

# Track B: autoManage (Management Dashboard)

Parallel track. Depends only on Track A Phase 1 (complete). See `autoManage/Planning/` for full design docs.

---

## B.1: File-Watching Dashboard

Goal: A working dashboard that monitors local TasteKit agents in real-time by watching trace files.

- [ ] Next.js project scaffold (TypeScript, Tailwind, SQLite)
- [ ] SQLite schema (agents, recent_events tables)
- [ ] chokidar file watcher for `.tastekit/traces/` directories
- [ ] Trace parser using TasteKit's `TraceReader`
- [ ] Status deriver (trace events → agent status: idle/running/blocked/error/completed)
- [ ] Agent cards grid with real-time updates via SSE
- [ ] Basic trace viewer (click card → event list with filters)
- [ ] Approval queue display (read-only)
- [ ] Status bar with agent counts and alerts
- [ ] Configuration: watched directories, alert thresholds
- [ ] Dark mode UI

---

## B.2: Suggestions & Approvals

Goal: Dashboard proactively surfaces problems and suggests interventions.

- [ ] Rule-based suggestion engine (stuck detection, loop detection, error rate, long-running approvals)
- [ ] Suggestions panel in dashboard with dismiss/acknowledge actions
- [ ] Suggestion history
- [ ] Alert notifications for critical suggestions (optional, configurable)
- [ ] Recent events cleanup job (configurable retention)

---

## B.3: WebSocket + Remote Agents

Goal: Remote agents can stream to autoManage. Bidirectional commands work.

- [ ] WebSocket server alongside Next.js app
- [ ] Agent reporter library (TypeScript, npm package)
- [ ] Protocol schemas in `autoManage/src/protocol/` (Zod)
- [ ] AgentStatusReport messages (doubles as heartbeat)
- [ ] ManagementCommand messages (pause/resume/stop/approve/deny)
- [ ] Token-based authentication for remote connections
- [ ] Connection management (reconnect with exponential backoff + jitter)
- [ ] Dashboard shows connection type per agent (file-watch vs WebSocket)
- [ ] Optional TracerStream wrapper for TasteKit (decorator pattern)
- [ ] Actionable approval queue (send approve/deny commands)

---

## B.4: Management Agent

Goal: AI-powered agent oversight. Operator manages agents through conversation.

- [ ] Built-in AI agent that monitors other agents
- [ ] Natural language interface ("what's agent-3 working on?", "restart the research bot")
- [ ] TasteKit taste profile for management style preferences
- [ ] AI-powered suggestion quality (beyond rule-based)
- [ ] OverseerSuggestion schema (designed from implementation)
- [ ] Chat panel in dashboard
