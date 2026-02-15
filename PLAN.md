# Project Roadmap & Status

Last updated: 2026-02-15

---

## Phase 1: Make TasteKit Functional (CURRENT)

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
- [ ] Agent File (.af) import/export (Letta format - lower priority)

### 1.4 Quality
- [ ] Add test suite for schemas (pure function validation)
- [ ] Add test suite for compiler
- [ ] Add test suite for drift detection
- [ ] Add test suite for eval judge
- [ ] CI pipeline runs tests on PR

---

## Phase 2: Ship TasteKit v1.0

Goal: TasteKit is usable by real users as a standalone tool.

### 2.1 Complete Domains
- [ ] Research agent domain (questions, skills, playbooks)
- [ ] Sales agent domain
- [ ] Support agent domain
- [ ] Development agent domain

### 2.2 Compiler Completions
- [ ] Skills library compilation (compiler.ts TODO)
- [ ] Playbook generation (compiler.ts TODO)
- [ ] Better constitution generation (error handling, richer output)

### 2.3 Developer Experience
- [ ] Interactive TUI for onboarding (beyond basic inquirer)
- [ ] Rich CLI output with formatting and colors
- [ ] Better error messages with actionable suggestions
- [ ] Tab completion for CLI commands

### 2.4 Documentation
- [ ] Update README with working examples
- [ ] Quick-start tutorial (init -> onboard -> compile -> export)
- [ ] Video walkthrough
- [ ] Adapter-specific guides (how to use with Claude Code, OpenClaw, etc.)

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
