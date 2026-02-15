# Comprehensive Review: TasteKit + AutoClaw

**Date**: February 15, 2026
**Reviewer**: Claude (Opus 4.6)
**Scope**: Full codebase review, architecture analysis, market research validation

---

## Executive Summary

TasteKit and AutoClaw together address a genuine gap: no open-source project combines portable agent profiles, drift detection, version-controlled personality, and interactive onboarding into one system. The thesis is market-validated. The architecture is sound. The implementation needs significant work before either project is usable.

**TasteKit** is ~35% functional. Schemas are excellent. MCP client is a hollow stub. Eval system returns hardcoded results. 7 of 11 CLI commands do nothing. Zero tests exist.

**AutoClaw** is pure documentation. The PRD is thorough and the positioning (PicoClaw's efficiency + TasteKit's intelligence) is correct, but AutoClaw depends on TasteKit functionality that doesn't exist yet.

**Recommendation**: Focus all effort on making TasteKit work end-to-end before starting AutoClaw development.

---

## TasteKit: Implementation Status

### What Works (Production-Quality)

| Module | Files | Assessment |
|--------|-------|------------|
| **Schemas** | 11 Zod schema files | Excellent. Well-versioned, properly typed, comprehensive |
| **Trust** | manager.ts, auditor.ts | Solid. Server/source pinning, fingerprinting, audit validation |
| **Tracing** | tracer.ts, reader.ts | Good. JSONL format, proper event types, filtering API |
| **Utils** | filesystem.ts, hash.ts, yaml.ts | Excellent. Atomic writes, deterministic hashing |
| **Adapters** | 4 runtime adapters | Working. Claude Code, Manus, OpenClaw, Autopilots |
| **Content Domain** | domain.ts, questions.ts, 2 skills | Well-done. 21 questions, progressive disclosure |
| **Interview** | questions.ts, session.ts | Functional. 10 base questions, resumable sessions |

### What Doesn't Work (Stubs / Non-Functional)

| Module | Issue | Severity |
|--------|-------|----------|
| **MCP Client** | All methods are TODOs (connect, listTools, callTool) | CRITICAL |
| **Evaluation** | Judge returns hardcoded scores; runner uses mock data | CRITICAL |
| **CLI Commands** | simulate, mcp, trust, skills, drift, eval, export, import are stubs | HIGH |
| **Compiler** | Skills library and playbook generation are TODOs | HIGH |
| **Domains** | Research, sales, support, development are 7-line stubs | MEDIUM |
| **Drift Consolidation** | Merge detection not implemented | MEDIUM |
| **Skills Packer** | ZIP format throws error | LOW |

### Missing Entirely

- Test suite (zero test files)
- Error handling in compiler
- Logging/debug output
- CI/CD pipeline (YAML exists but no tests to run)

---

## AutoClaw: Documentation Assessment

### Strengths

- Correct decision to fork PicoClaw over OpenClaw
- Well-structured 5-layer architecture
- Realistic performance targets (<15MB, <2s boot, $10 hardware)
- Thorough competitive analysis

### Issues

- Name inconsistency ("ClawKit" vs "AutoClaw" vs "Enhanced PicoClaw")
- 14-week timeline is unrealistic for all 7 phases
- TasteKit dependency on unfinished code
- TypeScript-Go bridge (CLI subprocess) risks Node.js runtime dependency
- Feature overlap with emerging standards (A2A, Agent Spec)

---

## Market Research Findings (February 2026)

### MCP Ecosystem

- **17,665+ MCP servers** cataloged on mcp.so
- **97 million monthly SDK downloads**
- Official SDKs exist in TypeScript (v1.26.0, 25K+ dependents) and Go (co-maintained with Google)
- Adopted by Claude, ChatGPT, Gemini, VS Code, Cursor, Copilot
- Donated to Linux Foundation's AAIF (co-founded by OpenAI + Anthropic)
- **Implication**: Don't build MCP from scratch. Wrap the official SDK.

### Agent Personality / Memory

- **Letta** launched Agent File (.af) + Context Repositories (git-backed memory versioning)
- **OpenClaw** SOUL.md ecosystem: souls.directory, soul.md tooling
- **Anthropic** allows memory export to other chatbots
- **AGENTS.md** standard: 20,000+ repos, stewarded by AAIF
- **Drift detection**: No open-source solution exists. TasteKit's genuine blue ocean.

### PicoClaw

- Launched February 9, 2026 (6 days ago)
- 8,600+ stars, 873 forks
- v0.1.1 (very early, explosive growth)
- No enhanced forks with traction yet

---

## Architectural Decisions: Assessment

| Decision | Choice | Verdict |
|----------|--------|---------|
| Fork PicoClaw, not OpenClaw | PicoClaw | **Correct** |
| TasteKit in TypeScript | TypeScript | **Correct** |
| Artifact-first (files, not DB) | Files | **Correct** |
| MCP-first tool binding | MCP | **Correct** |
| Trust-by-default with pinning | Pinning | **Correct** |
| Build MCP client from scratch | Custom | **Wrong** - use official SDK |
| TasteKit as AutoClaw runtime dependency | Subprocess | **Risky** - use build-time only |
| Custom memory format | JSON | **Fine** - add import/export bridges |
| 14-week full launch | All phases | **Unrealistic** - plan 14 weeks to Phase 3 |
| Content-agent first domain | Content | **Correct** |

---

## Recommendations

### Priority 1: Make TasteKit Actually Work

1. Replace MCP stub with `@modelcontextprotocol/sdk` wrapper
2. Fix evaluation system (real deterministic/schema rules, real LLM judge)
3. Complete CLI commands (export, import, drift detect, skills list/lint)
4. Add test suite (schemas, compiler, drift detection - target 80% core coverage)
5. Add interop with existing formats (SOUL.md import, AGENTS.md export, Agent File .af)

### Priority 2: Ship TasteKit v1.0 Standalone

TasteKit has value independent of AutoClaw. Users of Claude Code, Cursor, and OpenClaw can use it today (once the code works). Ship early. Get feedback.

### Priority 3: Start AutoClaw Minimal

1. PicoClaw fork + TasteKit artifact loading (read JSON/YAML, no Node.js dependency)
2. MCP in Go using official Go SDK
3. Basic drift detection (your differentiator)
4. Save orchestration, A/B testing, marketplace for later

### Priority 4: Align with AAIF Standards

- Output AGENTS.md from TasteKit artifacts
- Support Agent File (.af) import/export
- Consider A2A protocol for multi-agent orchestration
- Contribute to AAIF if project gains traction

### Priority 5: Naming

- Verify "TasteKit" against existing trademark (taste-kit.com exists)
- Avoid "Claw" in AutoClaw name (trademark sensitivity in this space)
- Choose distinctive, independent names for both projects

---

## What Would Make These Great Open Source Tools

1. **Working code beats docs.** Ship 3 commands that work flawlessly over 11 stubs.
2. **Drift detection is your differentiator.** No OSS project does this. Make it work first.
3. **Interop is your moat.** Embrace every standard (AGENTS.md, .af, Agent Skills, MCP, A2A).
4. **Meet users where they are.** Fix the export path for Claude Code / OpenClaw users.
5. **Ship early, iterate publicly.** PicoClaw hit 8,600 stars in 6 days because it worked.

---

*Generated from full codebase review (131 files) and market research across MCP ecosystem, agent personalization landscape, and PicoClaw/OpenClaw communities.*
