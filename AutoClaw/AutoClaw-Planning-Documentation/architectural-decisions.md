# AutoClaw: Architectural Decision Records

**Date**: February 15, 2026
**Status**: Approved

These decisions update and supersede conflicting details in the original PRD.

---

## ADR-001: TasteKit as Build-Time Only Dependency

### Decision

TasteKit will be used as a **build-time tool only**, not a runtime dependency. AutoClaw (Go) will read pre-compiled TasteKit artifacts (JSON/YAML files) directly. It will NOT shell out to Node.js/TasteKit at runtime.

### Context

The original PRD described TasteKit integration via "CLI subprocess calls" where AutoClaw would invoke `tastekit` commands at runtime. This creates a Node.js runtime dependency.

### Problem

- Node.js alone uses 30-50MB of RAM, which would push AutoClaw past its <15MB target
- Subprocess calls add latency and fragile error handling across process boundaries
- Node.js as a runtime dependency undermines the "runs on $10 hardware" promise
- Many target environments (embedded, IoT, minimal VMs) won't have Node.js installed

### Solution

```
User workflow:
1. Install TasteKit (npm) on their dev machine
2. Run `tastekit init && tastekit onboard && tastekit compile`
3. TasteKit outputs static artifacts to `.tastekit/artifacts/`
4. AutoClaw reads these artifacts directly (pure Go JSON/YAML parsing)
5. For drift detection: AutoClaw implements its own Go-native analyzer
6. For recompilation: user runs TasteKit again on their dev machine
```

### Implications

- AutoClaw needs a Go-native YAML/JSON reader for TasteKit artifact formats
- Drift detection logic must be ported to Go (or simplified for Go)
- The `autoclaw onboard` command should delegate to `tastekit onboard` with clear instructions
- Users need TasteKit installed on their dev machine, but NOT on the deployment target

---

## ADR-002: Use Official Go MCP SDK

### Decision

AutoClaw will use the official Go MCP SDK (`github.com/modelcontextprotocol/go-sdk`) for all MCP functionality. No custom transport implementation.

### Context

The original PRD described building MCP client support. The official Go SDK (co-maintained by Google and the MCP team) provides production-grade stdio and HTTP transports with full spec compliance.

### Implications

- Reduces development effort significantly
- Guarantees spec compliance as the protocol evolves
- Matches TasteKit's approach (which wraps the official TypeScript SDK)
- The SDK is MIT licensed and actively maintained

---

## ADR-003: Realistic Phasing

### Decision

The development timeline is restructured into phases focused on shipping incremental value, with no fixed time estimates.

### Context

The original PRD proposed 7 phases in 14 weeks. This was unrealistic given the scope of each phase and the dependency on TasteKit reaching v1.0 first.

### Revised Phases

**Phase 1: TasteKit v1.0** (prerequisite - separate project)
- Complete TasteKit CLI, MCP integration, eval system, interop formats
- Ship TasteKit as standalone npm package

**Phase 2: AutoClaw Foundation**
- Fork PicoClaw
- Add TasteKit artifact loading (Go-native JSON/YAML)
- Generate AGENTS.md/SOUL.md/IDENTITY.md from TasteKit artifacts
- Basic CI/CD

**Phase 3: MCP Integration**
- Integrate official Go MCP SDK
- Replace PicoClaw custom tools with MCP protocol
- Add trust management (pinning, auditing)
- Backward-compatible wrappers for existing PicoClaw tools

**Phase 4: Memory & Drift**
- Tiered memory architecture
- Go-native drift detection
- Memory consolidation
- Version control for taste profiles

**Phase 5: Orchestration**
- Shared memory pools
- Team workflows
- Consider A2A protocol compatibility

**Phase 6: Observability & Launch**
- Trace-first logging
- Performance analytics
- Comprehensive docs
- Ship v1.0

### Implications

- A/B testing moves to post-v1.0 (nice-to-have, not launch-critical)
- Each phase ships independently usable value
- TasteKit must reach v1.0 before Phase 2 begins

---

## ADR-004: Naming

### Decision

The final product name should NOT include "Claw." A distinct name will be chosen before public launch.

### Context

- "ClawdBot" was renamed due to Anthropic trademark concerns
- The "Claw" naming space is crowded (OpenClaw, PicoClaw, ClawKit, AutoClaw)
- A distinctive name reduces confusion and legal risk
- The project should stand on its own identity, not as "yet another Claw fork"

### Action

- Use "AutoClaw" as a working title during development
- Choose final name before Phase 2 public release
- Candidates should be distinctive, memorable, and available as npm/go package names

---

## ADR-005: Standards Alignment

### Decision

AutoClaw will align with AAIF (Agentic AI Foundation) standards wherever applicable.

### Standards to Support

| Standard | Body | Use |
|----------|------|-----|
| **MCP** | AAIF/Linux Foundation | Tool integration (via Go SDK) |
| **AGENTS.md** | AAIF/Linux Foundation | Generated from TasteKit artifacts |
| **A2A** | Google/Linux Foundation | Consider for orchestration layer |
| **Agent File (.af)** | Letta | Consider for import/export |
| **SOUL.md** | OpenClaw community | Import support via TasteKit |

### Implications

- Don't invent proprietary formats where standards exist
- Monitor AAIF for new specifications
- Consider contributing AutoClaw's drift detection approach as a proposal to AAIF
