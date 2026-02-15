# Management Plane — Existing Monorepo Analysis

> **Purpose**: Detailed technical analysis of the existing codebase so the planning/building session understands exactly what exists, what patterns to follow, and what to integrate with.

---

## Repository Structure

```
/home/user/OSS-Agent-Tools/
├── README.md                                    (minimal — just project name)
├── AutoClaw/                                    (Planning/documentation only)
│   └── AutoClaw-Planning-Documentation/
│       ├── AutoClaw-PRD.md                     (Product Requirements Document)
│       ├── picoclaw-analysis.md                (PicoClaw architecture analysis)
│       ├── enhanced-picoclaw-design.md         (Design for AutoClaw integration)
│       └── openclaw-vs-picoclaw-comparison.md  (Competitive analysis)
├── TasteKit/                                    (Implemented — v0.5.0)
│   └── tastekit/                                (pnpm monorepo root)
│       ├── package.json                         (workspace root)
│       ├── pnpm-workspace.yaml                  (workspace config)
│       ├── tsconfig.json                        (TypeScript root config)
│       ├── README.md
│       ├── ROADMAP.md
│       ├── OPENCLAW_GUIDE.md
│       ├── packages/
│       │   ├── core/                            (@tastekit/core)
│       │   ├── cli/                             (@tastekit/cli)
│       │   └── adapters/                        (Runtime adapters)
│       ├── examples/
│       ├── docs/
│       ├── community/
│       └── .github/workflows/
└── ManagementPlane/                             (NEW — this project)
    └── Planning/
```

---

## TasteKit Deep Dive (The Model to Follow)

### Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.6.0 (strict mode) |
| Runtime | Node.js | 18.x / 20.x / 22.x |
| Package Manager | pnpm | 10.29.2 |
| CLI Framework | Commander.js | 12.0.0 |
| Interactive Prompts | Inquirer | 10.0.0 |
| Validation | Zod | 3.23.0 |
| JSON Schema Validation | AJV | 8.12.0 |
| YAML | yaml | 2.8.2 |
| Testing | Vitest | 2.0.0 |
| Linting | ESLint | 9.0.0 |
| Formatting | Prettier | 3.3.0 |
| Terminal Colors | Chalk | 5.3.0 |
| Spinners | Ora | 8.0.0 |
| Unique IDs | uuid | 13.0.0 |

### pnpm Workspace Configuration
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'packages/adapters/*'
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### Package Scripts (root)
```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "clean": "pnpm -r clean"
  }
}
```

### Core Package Architecture (`@tastekit/core`)

**Module structure:**
```
packages/core/src/
├── index.ts                    (barrel exports)
├── schemas/                    (Zod schemas for all artifact types)
│   ├── constitution.ts
│   ├── guardrails.ts
│   ├── memory.ts
│   ├── bindings.ts
│   ├── trust.ts
│   ├── playbook.ts
│   ├── evalpack.ts
│   ├── skills.ts
│   ├── trace.ts
│   ├── workspace.ts
│   └── validators.ts
├── compiler/                   (Artifact compilation)
│   ├── compiler.ts
│   ├── constitution-compiler.ts
│   ├── guardrails-compiler.ts
│   └── memory-compiler.ts
├── interview/                  (Onboarding session)
│   ├── questions.ts
│   ├── session.ts
│   └── index.ts
├── skills/                     (Skill management)
│   ├── generator.ts
│   ├── packer.ts
│   └── linter.ts
├── mcp/                        (Model Context Protocol)
│   ├── client.ts
│   ├── binder.ts
│   ├── inspector.ts
│   └── index.ts
├── trust/                      (Cryptographic trust)
│   ├── manager.ts
│   ├── auditor.ts
│   └── index.ts
├── tracing/                    (JSONL trace observability)
│   ├── tracer.ts
│   ├── reader.ts
│   └── index.ts
├── drift/                      (Drift detection)
│   ├── detector.ts
│   ├── proposal.ts
│   ├── consolidator.ts
│   └── index.ts
├── eval/                       (Evaluation framework)
│   ├── judge.ts
│   ├── runner.ts
│   ├── replay.ts
│   └── index.ts
├── domains/                    (Domain-specific flows)
│   ├── content-agent/          (fully implemented)
│   ├── research-agent/         (stub)
│   ├── sales-agent/            (stub)
│   ├── development-agent/      (stub)
│   └── support-agent/          (stub)
└── utils/                      (Shared utilities)
    ├── filesystem.ts           (ensureDir, writeFileSafe, atomicWrite)
    ├── hash.ts                 (Object hashing)
    ├── yaml.ts                 (YAML helpers)
    └── index.ts
```

### Adapter Interface (key pattern for Management Plane)

```typescript
// packages/adapters/adapter-interface.ts
export interface TasteKitAdapter {
  id: string;
  version: string;
  detect(target: string): Promise<boolean>;
  export(profilePath: string, outDir: string, opts: ExportOpts): Promise<void>;
  install(outDir: string, target: string, opts: InstallOpts): Promise<void>;
  runSimulation?(skillId: string, opts: SimOpts): Promise<SimResult>;
  mapMemoryPolicy?(policy: MemoryV1): Promise<MappedMemoryPolicy>;
  emitTrace?(event: TraceEvent): Promise<void>;
}
```

**Implemented adapters**: OpenClaw (full), Claude Code (stub), Manus (stub), Autopilots (stub)

### Trace Schema (critical for Management Plane integration)

TasteKit already produces structured JSONL traces with:
- `schema_version` — Versioning
- `run_id` — Groups related events
- `timestamp` — ISO timestamp
- `actor` — Who/what generated the event
- `event_type` — Typed event categorization
- `data` — Event payload

These traces live in `.tastekit/traces/*.trace.v1.jsonl` and are the natural ingestion point for the Management Plane.

### Workspace Artifact Structure
```
.tastekit/
├── artifacts/
│   ├── constitution.v1.json    (Principles, tone, tradeoffs, evidence, taboos)
│   ├── guardrails.v1.yaml      (Hard behavioral constraints)
│   ├── memory-policy.v1.yaml   (Tiered memory config)
│   ├── bindings.v1.json        (MCP tool-to-skill mappings)
│   ├── trust.v1.json           (Cryptographic pins)
│   ├── playbooks/              (Workflow definitions)
│   └── evalpacks/              (Evaluation configs)
├── skills/                      (Domain skills)
├── traces/                      (JSONL trace logs)
├── compiled/                    (Compiled outputs)
├── session.json                 (Onboarding session state)
└── tastekit.yaml                (Workspace config)
```

### CI/CD Pipeline
GitHub Actions (`.github/workflows/ci.yml`):
- Triggers: push to main/develop, pull requests
- Matrix: Node 18.x, 20.x, 22.x
- Steps: Checkout → pnpm setup → install (cached) → build → lint → test → markdown link validation

---

## AutoClaw Analysis (What It Plans to Be)

### Planned Architecture (7 layers)
```
CLI Interface
  └── Observability Layer (tracing, analytics, A/B testing)
      └── Orchestration Layer (memory pools, workflows, roles)
          └── MCP Layer (client, trust manager, tool binder)
              └── TasteKit Layer (compiler, drift detector, version control)
                  └── Core Runtime (from PicoClaw — Go)
                      └── Security Sandbox
```

### Planned Workspace Artifacts
```
.tastekit/          — TasteKit artifacts
.mcp/               — MCP servers registry and trust
memory/             — Tiered memory (constitution, preferences, working, performance)
AGENTS.md           — Agent definitions
IDENTITY.md         — Agent identity
SOUL.md             — Core values
USER.md             — User profile
TOOLS.md            — Available tools
```

### Planned Features Relevant to Management Plane
1. **Session persistence** — Agents maintain state across restarts
2. **Heartbeat** — Regular health pings
3. **Spawn** — Create child agents
4. **Multi-agent orchestration** — Shared memory pools, team workflows, role-based access
5. **Observability** — Trace logging, performance tracking

These are natural integration points for the Management Plane.

---

## Key Patterns the Management Plane Should Follow

1. **pnpm workspaces** — Same monorepo tooling
2. **TypeScript strict mode** — Same language config
3. **Zod schemas** — Same validation approach
4. **Versioned artifacts** — v1 suffix, structured JSON/YAML
5. **Adapter pattern** — Core protocol + per-system adapters
6. **JSONL traces** — Same observability format
7. **Commander.js CLI** — If adding CLI component
8. **Vitest** — Same test framework
9. **ES2022 / ESNext modules** — Same build target
10. **Barrel exports** — `index.ts` re-exporting modules

---

## Integration Opportunities

### Data the Management Plane Can Already Access
- TasteKit traces (`.tastekit/traces/`)
- TasteKit artifacts (constitution, guardrails, memory policy — for understanding agent profiles)
- TasteKit workspace config (`tastekit.yaml`)

### Shared Code Possibilities
- Zod schemas for agent status could extend TasteKit's schema patterns
- TasteKit's `utils/filesystem.ts` for safe file operations
- TasteKit's `tracing/reader.ts` for reading existing JSONL traces
- TasteKit's adapter interface pattern for agent system adapters

### Future Integration with AutoClaw
- AutoClaw's heartbeat → Management Plane health monitoring
- AutoClaw's spawn → Management Plane agent creation tracking
- AutoClaw's orchestration layer → Management Plane as the coordination brain
- AutoClaw's observability layer → Management Plane as the visualization layer
