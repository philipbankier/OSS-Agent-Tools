# Project Roadmap & Status

Last updated: 2026-02-19

This roadmap has three parallel tracks:
- **Track A**: TasteKit + AutoClaw (taste compiler → agent runtime)
- **Track B**: autoManage (management dashboard for agent oversight)
- **Track C**: QuickClaw (full-auto OpenClaw setup + ops provisioning)

Track B depends only on Track A Phase 1 (complete). It can proceed independently.
Track C depends on stable OpenClaw CLI and partial TasteKit reuse. It can proceed independently.

---

# Track C: QuickClaw

## Phase 1: Core CLI Foundation (IN PROGRESS)

Goal: `quickclaw create|verify|export-config` command surface exists with schema validation and report outputs.

- [x] Scaffold top-level TypeScript CLI project (`QuickClaw/`)
- [x] Implement config schema (`quickclaw.v1`) with zod validation
- [x] Add wizard intake + config file mode
- [x] Add report outputs under `<workspace>/.quickclaw/`
- [x] Implement preflight checks (binaries, Node version, secrets)

## Phase 2: Full Provisioning Flow (IN PROGRESS)

Goal: `quickclaw create` provisions OpenClaw and materializes workspace files.

- [x] Run `openclaw onboard --non-interactive`
- [x] Generate SOUL/AGENTS/MEMORY/IDENTITY/USER/HEARTBEAT workspace files
- [x] Remove one-time `BOOTSTRAP.md` after materialization
- [x] Add TasteKit bridge (`tastekit import` + `tastekit export` best-effort reuse)

## Phase 3: Ops Enablement (IN PROGRESS)

Goal: Generated setup includes coding ops, hooks/cron, and Sentry pipeline scaffolding.

- [x] Generate coding scripts (worktree, ralph-loop, tmux health, notifier)
- [x] Enable OpenClaw bundled hooks (`session-memory`, `command-logger`, `boot-md`, `bootstrap-extra-files`)
- [x] Configure recurring cron jobs for extraction/check-in/monitoring
- [x] Configure Slack + webhook transform + Sentry validation hooks

## Phase 4: Verification & Quality (IN PROGRESS)

Goal: Deterministic verification and tests for required behavior.

- [x] Implement `quickclaw verify` with health/hooks/cron/route checks
- [x] Add unit tests for config, preflight helpers, templates, parser logic, cron schedule conversion, and sentry transform
- [ ] Add mocked integration tests for full `quickclaw create` execution path
- [ ] Add sandboxed end-to-end tests for fresh + existing workspace scenarios

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

---

## Phase 2: Complete TasteKit v1.0

Goal: TasteKit is feature-complete as a standalone tool.

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
- [x] Adapter-specific guides (docs/adapters/ — Claude Code, Manus, OpenClaw, Autopilots)
- [x] Fix docs formatting (remove triple-quote wrapping from 6 docs files)
- [x] Update domains.md (all 5 domains fully implemented, not stubs)
- [x] Flesh out example projects (minimal-agent, content-agent, newsletter-agent)

---

## Phase 2.5: arscontexta-Informed Enhancements (COMPLETE)

Goal: Absorb best ideas from [arscontexta](https://github.com/agenticnotetaking/arscontexta) to make TasteKit maximally useful. See detailed plan in `.claude/plans/proud-purring-moler.md`.

### Phase A: Foundation (COMPLETE)
- [x] Fix ESM/CJS bugs in claude-code and autopilots adapters
- [x] Add development-agent skills (code-review, refactor-plan) and wire into compiler
- [x] Implement DerivationState schema + read/write (context resilience protocol)
- [x] Implement three-space workspace layout (self/, knowledge/, ops/) + migration
- [x] Rewrite compiler with derivation-first, new paths, and `--resume` support

### Phase C: Intelligence (COMPLETE)
- [x] Confidence-weighted signal extraction in interviewer (replaces binary coverage)
- [x] Cascade resolution between rubric dimensions
- [x] Add observation/tension event types to trace schema
- [x] Implement all 7 drift signal types + observation/tension aggregation
- [x] Type all `any` fields in drift proposals

### Phase B: Output (COMPLETE)
- [x] Compositional CLAUDE.md generator (7 mandatory + 4 conditional blocks)
- [x] Enhanced hooks generator (5 lifecycle scripts including guard)
- [x] Vocabulary transformation for all 5 domains
- [x] Rewrite Claude Code adapter to generate CLAUDE.md + hooks (v2.0.0)

### Phase D: Skill Graph (COMPLETE)
- [x] Skill relationship fields (prerequisites, feeds_into, alternatives, pipeline_phase, context_model, model_hint)
- [x] Skill graph analyzer (density, orphans, hubs, pipelines, cycles, missing refs)
- [x] `tastekit skills graph` CLI command
- [x] Wire pipeline relationships into generated CLAUDE.md skills section

---

## Phase 3: Start AutoClaw Development (IN PROGRESS)

Goal: Fork PicoClaw + TasteKit integration + MCP + drift detection.

### 3.1 Foundation
- [x] Fork PicoClaw repository into AutoClaw
- [x] Rename picoclaw → autoclaw throughout codebase (module path, imports, config, workspace)
- [x] Create `internal/` directory structure for new packages
- [x] Extend config with TasteKit and multi-agent routing fields
- [x] Multi-agent routing scaffold with OpenClaw's 8-tier binding resolution (`internal/routing/`)
- [x] Session key format adopts OpenClaw pattern from day one (`agent:<id>:<rest>`)
- [ ] Full binary build (blocked on Go 1.25 for telego dependency)

### 3.2 TasteKit Artifact Loading
- [x] Go structs for all 9 TasteKit artifact types (`internal/artifact/`) — 21 tests
- [x] `LoadWorkspace()` loads constitution (JSON, required) + optional YAML artifacts
- [x] Validation: required fields, enum values, float ranges
- [x] Generate PicoClaw workspace files (SOUL.md, IDENTITY.md, AGENTS.md, USER.md, TOOLS.md) from artifacts (`internal/workspace/`) — 9 tests
- [x] Migration utility: `MigrateFromPicoClaw()` reads flat markdown → minimal ConstitutionV1
- [x] No Node.js dependency — static artifact loading only

### 3.3 MCP Integration (Go)
- [x] MCP client interface + MockClient for testing (`internal/mcpclient/`)
- [x] MCPBridgeTool implements PicoClaw's `Tool` interface — zero agent loop changes (`pkg/tools/mcp.go`) — 9 tests
- [x] File-based server registry (`.mcp/servers.json`)
- [x] Trust manager with fingerprint pinning (strict/warn modes)
- [x] Auditor cross-references trust policy vs registry — 18 tests total
- [x] Wrap existing PicoClaw tools as MCP ToolInfo for discovery (`internal/mcpclient/builtin_wrapper.go`) — 2 tests
- [ ] Wire real MCP Go SDK behind the Client interface (deferred to Go 1.25)

### 3.4 Basic Drift Detection
- [x] Port drift detector logic to Go (`internal/drift/`) — matches TasteKit TypeScript algorithms
- [x] Detection: repeated rejections + error accumulation, threshold ≥3, risk rating (low/medium/high)
- [x] Proposal store: file-based persistence with accept/reject workflow
- [x] Memory consolidation: retention by age/salience, Jaccard similarity merge (≥0.6)
- [x] Tokenizer + similarity utilities — 27 tests total
- [x] Wire into cron system for weekly drift analysis (`internal/cli/driftcron.go`)
- [x] CLI commands: detect, review, accept, reject, cron-setup (`internal/cli/drift.go`) — 16 tests

### 3.5 CLI Layer
- [x] `autoclaw drift detect [--since] [--skill]` — load traces, run detector, save proposals
- [x] `autoclaw drift review` — list pending proposals with risk badges
- [x] `autoclaw drift accept/reject <id>` — update proposal status
- [x] `autoclaw drift cron-setup [expr]` — register recurring drift detection
- [x] `autoclaw mcp list` — display registered MCP servers
- [x] `autoclaw mcp pin <name> <fp> [--mode]` — create/update trust pins
- [x] `autoclaw mcp audit` — cross-reference trust policy vs registry
- [x] `autoclaw import-taste [--dir] [--workspace]` — load artifacts, generate workspace markdown

---

## Phase 4: AutoClaw Memory & Orchestration (IN PROGRESS)

Goal: Tiered memory and multi-agent coordination.

### 4.1 Tiered Memory System
- [x] MemoryProvider interface + backward-compatible flat MemoryStore (`pkg/agent/memory_provider.go`)
- [x] MemoryLayer/WritableLayer interfaces + MemoryEntry types + JSONL helpers (`internal/memory/`)
- [x] Constitution layer — immutable, from TasteKit ConstitutionV1 (`internal/memory/constitution.go`) — 5 tests
- [x] Working memory layer — 30-day rolling JSONL window, prune/replace (`internal/memory/working.go`) — 9 tests
- [x] Preferences layer — versioned snapshots, rollback, diff (`internal/memory/preferences.go`) — 11 tests
- [x] Performance layer — tool/skill success-failure metrics (`internal/memory/performance.go`) — 6 tests
- [x] TieredMemoryStore orchestrator — budget-allocated context, 4-layer composition (`internal/memory/tiered.go`) — 7 tests
- [x] Memory consolidation — prune/merge/promote via drift.Consolidator (`internal/memory/consolidate.go`) — 7 tests
- [x] Agent loop integration — SetMemoryProvider + performance tracking hook (`pkg/agent/loop.go`)
- [x] CLI commands: status, consolidate, rollback, diff (`internal/cli/memory.go`, `cmd/autoclaw/main.go`)
- [x] Import-taste generates tiered memory directory structure (`internal/cli/importtaste.go`)

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

### 5.3 Polish
- [ ] Comprehensive documentation
- [ ] Example workflows
- [ ] Migration guides from PicoClaw and OpenClaw

---

# Release & Polish

After first versions of TasteKit, AutoClaw, and autoManage are working together — use all three for a week, fix low-hanging improvements, then release.

## R.1: CI & Infrastructure
- [ ] CI pipeline runs TasteKit tests on PR
- [ ] CI/CD for AutoClaw (Go tests, builds)
- [ ] CI for autoManage (Next.js build, lint)

## R.2: TasteKit Release
- [ ] npm publish @tastekit/core and @tastekit/cli
- [ ] GitHub release with changelog
- [ ] Video walkthrough
- [ ] Announce to relevant communities

## R.3: AutoClaw Release
- [ ] GitHub release with changelog
- [ ] Binary distribution
- [ ] Launch announcement

## R.4: autoManage Release
- [ ] npm publish or Docker image
- [ ] GitHub release with changelog
- [ ] Setup guide

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
- [ ] Quick-start preset system (`tastekit init --quick` with domain preset defaults)
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
