# TasteKit v0.5

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.0-orange.svg)](https://pnpm.io/)

**Compile your taste into portable agent artifacts.**

TasteKit is an open-source CLI tool and library that captures a user's preferences, principles, and personality through an LLM-driven interview, then compiles them into portable, versioned artifacts. These artifacts work across any agent runtime — Claude Code, OpenClaw, Manus, Autopilots, and more.

## Features

- **LLM-driven onboarding** — Adaptive interview that explores your preferences across domain-specific dimensions, not static forms
- **5 agent domains** — Content, Development, Research, Sales, and Support agents with specialized rubrics and skills
- **Artifact-first compilation** — Everything compiles into JSON/YAML files; adapters map files to runtime format
- **Skills with progressive disclosure** — SKILL.md files with three tiers: minimal context (always loaded), on-invoke, and on-demand
- **MCP-first tool binding** — Discover, inspect, and bind tools via Model Context Protocol
- **Trust & provenance** — Pin MCP server fingerprints and skill sources; audit for violations
- **Trace-first logging** — Every agent run produces machine-readable JSONL traces
- **Drift detection** — Detect when agent behavior drifts from your taste profile over time
- **Evaluation system** — Run eval packs with deterministic, regex, schema, and LLM judges
- **Multi-format interop** — Import from SOUL.md and Agent File (.af); export to AGENTS.md and 4 runtime adapters

## Installation

```bash
git clone <repo-url>
cd tastekit
pnpm install
pnpm build
```

## Quick Start

```bash
# 1. Initialize workspace — pick your domain and interview depth
tastekit init

# 2. Run the LLM-driven onboarding interview
tastekit onboard

# 3. Compile taste into artifacts
tastekit compile

# 4. Export for your runtime
tastekit export --target claude-code
tastekit export --target openclaw

# 5. (Optional) Add MCP tools
tastekit mcp add npx @anthropic/mcp-server-filesystem
tastekit mcp inspect filesystem
tastekit mcp bind

# 6. (Optional) Manage over time
tastekit drift detect
tastekit eval run --pack .tastekit/evals/tone-check.yaml
tastekit trust audit
```

## CLI Commands

| Command | Description |
|:---|:---|
| `tastekit init` | Initialize workspace with domain and depth selection |
| `tastekit onboard` | Run LLM-driven onboarding interview |
| `tastekit compile` | Compile taste artifacts from session |
| `tastekit export` | Export to Claude Code, OpenClaw, Manus, Autopilots, AGENTS.md, or Agent File |
| `tastekit import` | Import from SOUL.md or Agent File (.af) |
| `tastekit mcp add\|list\|inspect\|bind` | Manage MCP server bindings |
| `tastekit skills list\|lint\|pack` | Manage skills library |
| `tastekit trust init\|pin-mcp\|pin-skill-source\|audit` | Manage trust and provenance |
| `tastekit drift detect\|apply\|memory-consolidate` | Drift detection and memory management |
| `tastekit eval run\|replay` | Run evaluations and replay traces |
| `tastekit completion [bash\|zsh\|fish]` | Generate shell completions |

All commands support `--json` for machine-readable output and `--verbose` for debug logging.

## Generated Artifacts

After running `tastekit compile`, the `.tastekit/artifacts/` directory contains:

```
.tastekit/
├── artifacts/
│   ├── constitution.v1.json    # Principles, tone, tradeoffs, taboos
│   ├── guardrails.v1.yaml      # Permissions, approvals, rate limits
│   ├── memory.v1.yaml          # Write policy, retention, consolidation
│   ├── trust.v1.json           # Pinned servers and skill sources
│   ├── bindings.v1.json        # MCP tool bindings
│   └── playbooks/              # Domain-specific execution plans
├── skills/
│   ├── manifest.v1.yaml        # Skills index with metadata
│   └── <skill-id>/SKILL.md     # Progressive disclosure skill files
├── traces/                     # JSONL trace files from agent runs
└── session.json                # Onboarding interview state
```

## Agent Domains

TasteKit ships with 5 fully implemented domains, each with specialized rubrics, interview dimensions, skills, and playbooks:

| Domain | Rubric Dimensions | Built-in Skills | Playbooks |
|:---|:---:|:---:|:---:|
| Content Agent | 16 | 2 | 3 |
| Development Agent | 24 | 2 | 2 |
| Research Agent | 18 | 2 | 2 |
| Sales Agent | 18 | 2 | 2 |
| Support Agent | 18 | 2 | 2 |

Each domain includes quick (5 min), guided (15 min), and operator (30 min) interview depths.

## Project Structure

```
tastekit/
├── packages/
│   ├── core/          # Core library (schemas, compiler, skills, MCP, trust, tracing, drift, eval)
│   ├── cli/           # Command-line interface
│   └── adapters/      # Runtime adapters (Claude Code, Manus, OpenClaw, Autopilots)
├── examples/          # Example agent projects
├── docs/              # Documentation
│   ├── overview.md    # Architecture and concepts
│   ├── quickstart.md  # Getting started guide
│   ├── schemas.md     # Artifact schema reference
│   ├── skills.md      # Skills and progressive disclosure
│   ├── mcp.md         # MCP integration guide
│   ├── security.md    # Trust model and threat analysis
│   ├── tracing.md     # Trace format and replay
│   ├── domains.md     # Domain system architecture
│   ├── adapters/      # Per-adapter guides
│   └── domains/       # Per-domain deep dives
└── community/         # Contributing guidelines and RFCs
```

## Design Principles

1. **Artifact-first** — Everything compiles into files; adapters only map files to runtime format
2. **Deterministic compilation** — Same inputs produce same artifacts (LLM calls recorded/hashed)
3. **Progressive disclosure** — Global taste summary is small; skills pull deeper context only when invoked
4. **MCP-first** — Tool binding uses MCP; no custom tool protocol in core
5. **Trust-by-default** — Pin MCP servers and skill sources; no silent enabling of new tools
6. **Trace-first** — All runs produce machine-readable traces; evals operate on traces
7. **Maintenance is v1** — Drift detection, consolidation, and staleness checks are core features

## License

MIT

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./community/CONTRIBUTING.md) for guidelines.
