# Enhanced PicoClaw: Architecture Design

## Project Name: **ClawKit**

> PicoClaw's efficiency + TasteKit's intelligence = The ultimate lightweight agent platform

---

## Vision

Build the **most advanced yet lightweight** AI agent platform by combining:
- PicoClaw's ultra-efficient Go runtime (<10MB RAM, 1s boot)
- TasteKit's sophisticated agent management (taste profiles, drift detection, version control)
- Advanced features (MCP, multi-agent orchestration, observability)

**Target**: Runs on $10 hardware while offering enterprise-grade agent management.

---

## Core Design Principles

1. **Efficiency First**: Never sacrifice PicoClaw's lightweight nature
2. **Backward Compatible**: ClawKit can import existing PicoClaw workspaces
3. **TasteKit Native**: Deep integration, not just a plugin
4. **MCP Standard**: Replace custom tools with MCP protocol
5. **Observable**: Trace-first logging for all operations
6. **Portable**: Taste profiles work across any runtime

---

## Architecture Overview

```
ClawKit
├── Core Runtime (from PicoClaw)
│   ├── Agent Loop
│   ├── Provider Integrations
│   ├── Channel Integrations
│   └── Security Sandbox
│
├── TasteKit Layer (NEW)
│   ├── Taste Profile Compiler
│   ├── Drift Detector
│   ├── Memory Consolidator
│   └── Version Control
│
├── MCP Layer (NEW)
│   ├── MCP Client
│   ├── Trust Manager
│   ├── Tool Binder
│   └── Inspector
│
├── Orchestration Layer (NEW)
│   ├── Multi-Agent Coordinator
│   ├── Shared Memory Pools
│   ├── Team Workflows
│   └── Role Manager
│
└── Observability Layer (NEW)
    ├── Trace Logger
    ├── Performance Tracker
    ├── Drift Visualizer
    └── A/B Testing Framework
```

---

## Enhanced Workspace Structure

```
~/.clawkit/workspace/
├── .tastekit/                    # TasteKit artifacts (NEW)
│   ├── artifacts/
│   │   ├── constitution.v1.json
│   │   ├── guardrails.v1.json
│   │   ├── memory-policy.v1.json
│   │   ├── bindings.v1.json
│   │   └── trust.v1.json
│   ├── skills/
│   │   └── [domain-specific skills]
│   ├── traces/
│   │   └── [JSONL trace logs]
│   └── versions/
│       └── [git-like version history]
│
├── .mcp/                         # MCP configuration (NEW)
│   ├── servers.json              # MCP server registry
│   ├── trust.json                # Trust pins
│   └── bindings/                 # Tool bindings
│
├── memory/                       # Enhanced memory system (ENHANCED)
│   ├── constitution/             # Immutable core (from TasteKit)
│   ├── preferences/              # Semi-mutable (drift-tracked)
│   ├── working/                  # Auto-updating (last 30 days)
│   └── performance/              # Read-only metrics
│
├── sessions/                     # Conversation sessions (EXISTING)
├── state/                        # Persistent state (EXISTING)
├── cron/                         # Scheduled jobs (EXISTING)
│
├── AGENTS.md                     # Generated from TasteKit (ENHANCED)
├── IDENTITY.md                   # Generated from TasteKit (ENHANCED)
├── SOUL.md                       # Generated from TasteKit (ENHANCED)
├── USER.md                       # Generated from TasteKit (ENHANCED)
├── TOOLS.md                      # Generated from MCP (ENHANCED)
├── HEARTBEAT.md                  # Periodic tasks (EXISTING)
└── MEMORY.md                     # Consolidated memory view (ENHANCED)
```

---

## Key Enhancements

### 1. TasteKit Integration

**Onboarding Flow**:
```bash
# New onboarding with TasteKit
clawkit onboard --domain content

# This runs:
# 1. tastekit init (creates .tastekit/)
# 2. tastekit onboard --depth guided (domain-specific questions)
# 3. tastekit compile (generates artifacts)
# 4. clawkit import-taste (imports into workspace)
```

**Workspace Import**:
- Read TasteKit artifacts from `.tastekit/`
- Generate `AGENTS.md`, `IDENTITY.md`, `SOUL.md`, `USER.md` from compiled artifacts
- Set up memory tiers (constitution → preferences → working)

**Drift Detection**:
```bash
# Automatic drift detection
clawkit drift detect

# Review proposals
clawkit drift review

# Accept/reject changes
clawkit drift accept <proposal-id>
clawkit drift reject <proposal-id>

# Rollback to previous version
clawkit taste rollback v1.2
```

**Version Control**:
```bash
# List versions
clawkit taste versions

# Diff versions
clawkit taste diff v1.2 v1.5

# Export taste profile
clawkit taste export --out ./my-agent-taste.tar.gz

# Import taste profile
clawkit taste import ./my-agent-taste.tar.gz
```

---

### 2. Tiered Memory System

**Constitution Layer** (Immutable):
- Core values and principles
- Compiled from TasteKit onboarding
- Requires full re-onboarding to change
- Version controlled with major versions (1.0, 2.0)

**Preferences Layer** (Semi-Mutable):
- Learned behaviors and patterns
- Drift detection runs weekly
- Proposals shown in `clawkit drift review`
- Creates minor versions (1.1, 1.2)

**Working Memory Layer** (Auto-Updating):
- Last 30 days of activity
- Auto-consolidates into preferences if patterns emerge
- Cleared on `clawkit memory consolidate`

**Performance Layer** (Read-Only):
- Tracks what works (success/failure rates)
- Informs drift proposals
- Never directly changes taste

**Commands**:
```bash
# Memory management
clawkit memory status              # Show all layers
clawkit memory consolidate         # Merge working → preferences
clawkit memory rollback <version>  # Revert to previous state
clawkit memory diff v1.2 v1.5      # Compare versions
clawkit memory export              # Export memory snapshot
```

---

### 3. MCP Integration

**Replace Custom Tools with MCP**:
- Current: PicoClaw has custom `tools/` module
- New: ClawKit uses MCP protocol for all tools
- Migration: Wrap existing tools as MCP servers

**MCP Server Registry**:
```json
{
  "servers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--workspace", "~/.clawkit/workspace"],
      "trust": "pinned",
      "version": "1.2.0"
    },
    "web-search": {
      "command": "mcp-server-brave-search",
      "env": {"BRAVE_API_KEY": "..."},
      "trust": "pinned",
      "version": "0.9.0"
    }
  }
}
```

**Trust Management**:
```bash
# Pin a tool
clawkit mcp pin filesystem@1.2.0

# Audit tools
clawkit mcp audit

# Inspect tool capabilities
clawkit mcp inspect web-search

# List all tools
clawkit mcp list
```

**Auto-Discovery**:
- ClawKit scans for MCP servers on startup
- Prompts user to trust new servers
- Generates `TOOLS.md` from MCP server capabilities

---

### 4. Multi-Agent Orchestration

**Shared Memory Pools**:
```bash
# Create a shared memory pool
clawkit team create-pool "content-team"

# Add agents to pool
clawkit team add-agent personal-brand content-team
clawkit team add-agent autopilot-brand content-team

# Agents can now share:
# - Working memory
# - Performance metrics
# - Learned patterns
```

**Team Workflows**:
```yaml
# .clawkit/workflows/content-pipeline.yaml
name: Weekly Content Pipeline
trigger: cron("0 9 * * 1")  # Every Monday 9am

agents:
  - name: research-agent
    role: researcher
    task: "Research trending topics in AI"
    output: topics.json
  
  - name: personal-brand
    role: writer
    depends_on: research-agent
    task: "Write 3 Twitter threads based on {topics.json}"
    output: personal-threads.json
  
  - name: autopilot-brand
    role: writer
    depends_on: research-agent
    task: "Write 1 LinkedIn article based on {topics.json}"
    output: autopilot-article.json
  
  - name: review-agent
    role: reviewer
    depends_on: [personal-brand, autopilot-brand]
    task: "Review all content for quality and brand consistency"
    output: review-report.json
```

**Commands**:
```bash
# Run a workflow
clawkit workflow run content-pipeline

# List workflows
clawkit workflow list

# Show workflow status
clawkit workflow status content-pipeline

# Cancel workflow
clawkit workflow cancel content-pipeline
```

---

### 5. Observability & Analytics

**Trace-First Logging**:
- Every operation produces a JSONL trace
- Stored in `.tastekit/traces/`
- Queryable with `clawkit trace query`

**Performance Tracking**:
```bash
# Show performance metrics
clawkit analytics performance

# Compare versions
clawkit analytics compare v1.2 v1.5

# Show drift over time
clawkit analytics drift --since 30d

# Export analytics
clawkit analytics export --format csv
```

**A/B Testing**:
```bash
# Create an A/B test
clawkit ab create "test-new-tone" \
  --control v1.2 \
  --variant v1.3 \
  --metric "engagement_rate" \
  --duration 7d

# Check A/B test results
clawkit ab results test-new-tone

# Promote winner
clawkit ab promote test-new-tone
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Fork PicoClaw repository
- Set up project structure
- Create TasteKit adapter
- Implement workspace migration

### Phase 2: TasteKit Integration (Weeks 3-4)
- Integrate TasteKit CLI
- Implement onboarding flow
- Build drift detection
- Add version control

### Phase 3: Memory System (Weeks 5-6)
- Implement tiered memory
- Build consolidation logic
- Add memory commands
- Create memory visualizer

### Phase 4: MCP Integration (Weeks 7-8)
- Build MCP client
- Wrap existing tools as MCP servers
- Implement trust management
- Add MCP commands

### Phase 5: Orchestration (Weeks 9-10)
- Build shared memory pools
- Implement team workflows
- Add workflow engine
- Create workflow commands

### Phase 6: Observability (Weeks 11-12)
- Implement trace logging
- Build analytics engine
- Add A/B testing framework
- Create visualization tools

### Phase 7: Polish & Launch (Weeks 13-14)
- Comprehensive documentation
- Example workflows
- Migration guides
- Launch website

---

## Technical Decisions

### Language
- **Go** (maintain PicoClaw's efficiency)
- TasteKit integration via CLI subprocess calls
- MCP via JSON-RPC over stdio

### Storage
- **File-based** (maintain PicoClaw's simplicity)
- SQLite for analytics (optional, only if needed)
- Git for version control

### Performance Targets
- **Memory**: <15MB (50% increase from PicoClaw is acceptable)
- **Startup**: <2s (2x PicoClaw is acceptable)
- **Cost**: Still runs on $10 hardware

### Backward Compatibility
- Import existing PicoClaw workspaces
- Gradual migration path
- Opt-in for advanced features

---

## Competitive Positioning

| Feature | PicoClaw | OpenClaw | ClawKit |
|:--------|:---------|:---------|:--------|
| RAM | <10MB | >1GB | <15MB |
| Startup | <1s | >500s | <2s |
| Cost | $10+ | $599+ | $10+ |
| Taste Profiles | ❌ | ❌ | ✅ |
| Drift Detection | ❌ | ❌ | ✅ |
| Version Control | ❌ | ❌ | ✅ |
| MCP Standard | ❌ | ❌ | ✅ |
| Multi-Agent | Basic | ❌ | Advanced |
| Observability | Basic | Basic | Advanced |

**Value Proposition**: 
> "The only agent platform that's both lightweight enough for $10 hardware AND sophisticated enough for enterprise teams."

---

## Success Metrics

**Technical**:
- Memory footprint <15MB
- Startup time <2s
- Runs on $10 hardware
- 100% backward compatible with PicoClaw

**User Experience**:
- Onboarding in <5 minutes
- Drift detection accuracy >90%
- Version rollback in <1 second
- Workflow creation in <10 minutes

**Community**:
- 10k stars in 6 months
- 100+ contributors
- 50+ community workflows
- 20+ MCP server integrations

---

## Next Steps

1. Create project repository
2. Set up Go module structure
3. Implement TasteKit adapter
4. Build proof-of-concept
5. Write comprehensive documentation
6. Launch to community
