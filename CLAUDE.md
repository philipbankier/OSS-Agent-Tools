# CLAUDE.md - Project Context for AI Sessions

## What Is This Repo?

Three open-source projects sharing a monorepo during early development:

1. **TasteKit** (`/TasteKit/tastekit/`) - CLI tool + library that compiles a user's "taste" (preferences, personality, principles) into portable, versioned artifacts for AI agents. Works across runtimes (Claude Code, OpenClaw, Manus, Autopilots). TypeScript monorepo.

2. **AutoClaw** (`/AutoClaw/`) - Enhanced fork of PicoClaw (ultra-lightweight Go agent runtime). Currently in planning/documentation phase only. Will integrate TasteKit for taste profiles, MCP for tools, tiered memory, and multi-agent orchestration.

3. **autoManage** (`/autoManage/`) - Lightweight management dashboard for solo operators running AI agents. Monitors agents by watching TasteKit trace files (v1.0), with WebSocket support for remote agents planned for v1.1. Currently in planning phase only.

## Current Status

See `PLAN.md` for the full prioritized roadmap and current progress.

**TasteKit**: v0.5.0. Schemas are solid. Core compiler works. Adapters work. MCP client, evaluation system, and most CLI commands have been upgraded from stubs to real implementations. Drift detection and trust modules are functional.

**AutoClaw**: Planning phase. Four design documents plus architectural decisions in `AutoClaw/AutoClaw-Planning-Documentation/`. No code yet. Depends on TasteKit reaching v1.0 first.

**autoManage**: Planning phase. Three design documents in `autoManage/Planning/`. No code yet. Depends on TasteKit Phase 1 (complete). Can start immediately as a parallel track.

## Key Architectural Decisions

- **TasteKit is TypeScript** (Zod schemas, MCP SDK, CLI via commander)
- **AutoClaw will be Go** (forking PicoClaw for efficiency)
- **TasteKit is build-time only for AutoClaw** - compile artifacts once, AutoClaw loads static JSON/YAML. No Node.js runtime dependency.
- **MCP integration wraps the official `@modelcontextprotocol/sdk`** - don't build transport from scratch
- **Artifact-first** - everything compiles to files (constitution, guardrails, memory-policy, bindings, trust)
- **Interop matters** - support SOUL.md import, AGENTS.md export, Agent File (.af) format
- **autoManage is file-watching first** - v1.0 monitors agents by watching TasteKit trace JSONL files. Zero agent-side changes. WebSocket added in v1.1 for remote agents.
- **autoManage protocol schemas live in autoManage**, not TasteKit - management-plane concepts don't belong in a taste compiler. TraceEventSchema is the integration seam.

## Repo Structure

```
OSS-Agent-Tools/
├── CLAUDE.md              # This file
├── PLAN.md                # Prioritized roadmap with status tracking (Track A + Track B)
├── REVIEW.md              # Comprehensive initial review
├── TasteKit/tastekit/     # TasteKit source (TypeScript monorepo)
│   ├── packages/core/     # Core library (schemas, compiler, MCP, drift, eval, trust, tracing)
│   ├── packages/cli/      # CLI commands
│   ├── packages/adapters/ # Runtime adapters
│   ├── docs/              # Documentation
│   └── examples/          # Example agent projects
├── AutoClaw/              # AutoClaw planning docs (no code yet)
│   └── AutoClaw-Planning-Documentation/
└── autoManage/            # Management dashboard planning docs (no code yet)
    └── Planning/          # Vision, architecture, protocol design docs
```

## Common Tasks

- **"Where are we in the plan?"** - Read `PLAN.md`, look for the `[x]` vs `[ ]` markers
- **"What's next?"** - Read `PLAN.md`, find the first unchecked item in the current phase
- **"Work on TasteKit"** - The code is in `/TasteKit/tastekit/packages/`
- **"Work on AutoClaw"** - Planning docs are in `/AutoClaw/AutoClaw-Planning-Documentation/`
- **"Work on autoManage"** - Planning docs are in `/autoManage/Planning/`

## Important Context

- PicoClaw (the base for AutoClaw) uses <10MB RAM, <1s boot, runs on $10 hardware. AutoClaw must stay under <15MB RAM, <2s boot.
- MCP is now under the Linux Foundation's AAIF (co-founded by OpenAI + Anthropic). It's the standard.
- Drift detection is TasteKit's genuine differentiator - no other OSS project does personality-level drift detection.
- The existing product at taste-kit.com is unrelated (recommendations-as-a-service). Trademark check needed.
