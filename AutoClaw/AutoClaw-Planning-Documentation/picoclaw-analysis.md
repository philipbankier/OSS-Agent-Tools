# PicoClaw Architecture Analysis

## Overview

**PicoClaw** is an ultra-lightweight AI assistant framework written in Go, designed to run on $10 hardware with <10MB RAM footprint. It's a complete rewrite of OpenClaw (TypeScript) with 99% less memory usage and 400x faster startup.

### Key Stats
- **Language**: Go (98.3%)
- **Memory**: <10MB (vs >1GB for OpenClaw)
- **Startup**: <1s on 0.6GHz single core (vs >500s for OpenClaw)
- **Cost**: Runs on $10 hardware (vs $599 Mac Mini)
- **Stars**: 7.9k (launched Feb 2026)

---

## Architecture Components

### 1. Core Modules (`pkg/`)

| Module | Purpose |
|:-------|:--------|
| `agent/` | Core agent loop, context management, memory |
| `providers/` | LLM provider integrations (OpenRouter, Zhipu, Anthropic, etc.) |
| `tools/` | Tool system (file ops, exec, web search, etc.) |
| `channels/` | Multi-platform chat integrations (Telegram, Discord, QQ, etc.) |
| `session/` | Conversation session management |
| `memory/` | Long-term memory system |
| `skills/` | Custom skills system |
| `cron/` | Scheduled tasks / reminders |
| `heartbeat/` | Periodic task execution |
| `state/` | Persistent state management |
| `config/` | Configuration management |
| `bus/` | Event bus for inter-component communication |
| `auth/` | OAuth and authentication |
| `voice/` | Voice transcription (Whisper via Groq) |
| `devices/` | Hardware device integrations |
| `migrate/` | Data migration utilities |

### 2. Workspace Structure

PicoClaw uses a file-based workspace for agent configuration:

```
~/.picoclaw/workspace/
├── AGENTS.md         # Agent behavior guide (like AAIF)
├── IDENTITY.md       # Agent identity
├── SOUL.md           # Agent personality/soul
├── USER.md           # User preferences
├── MEMORY.md         # Long-term memory
├── TOOLS.md          # Tool descriptions
├── HEARTBEAT.md      # Periodic tasks
├── sessions/         # Conversation history
├── memory/           # Memory storage
├── state/            # Persistent state
├── cron/             # Scheduled jobs
└── skills/           # Custom skills
```

### 3. Security Model

- **Workspace Sandboxing**: All file/command operations restricted to workspace by default
- **Dangerous Command Blocking**: Blocks `rm -rf`, `format`, `dd`, `shutdown`, etc.
- **Consistent Boundaries**: Same restrictions apply to main agent, subagents, and heartbeat tasks

### 4. Key Features

**Heartbeat System**:
- Reads `HEARTBEAT.md` every 30 minutes (configurable)
- Can spawn async subagents for long-running tasks
- Subagents communicate directly with user via `message` tool

**Spawn Tool**:
- Creates independent subagents with their own context
- Non-blocking for long tasks (web search, API calls)
- Subagents have access to all tools

**Cron System**:
- One-time reminders: "Remind me in 10 minutes"
- Recurring tasks: "Remind me every 2 hours"
- Cron expressions: "Remind me at 9am daily"

**Multi-Channel Support**:
- Telegram, Discord, QQ, DingTalk, LINE, Slack, WhatsApp, OneBot
- Unified interface via `channels/` module

---

## Comparison: PicoClaw vs OpenClaw

| Feature | OpenClaw | PicoClaw |
|:--------|:---------|:---------|
| Language | TypeScript | Go |
| RAM | >1GB | <10MB |
| Startup (0.8GHz) | >500s | <1s |
| Cost | Mac Mini $599 | Any Linux $10+ |
| Distribution | npm package | Single binary |
| Architectures | x86/ARM | RISC-V/ARM/x86 |
| Bootstrap | Human-written | 95% AI-generated |

---

## What's Missing (Opportunities for Enhancement)

### 1. **No TasteKit Integration**
- PicoClaw uses flat markdown files (AGENTS.md, IDENTITY.md, SOUL.md, USER.md)
- No version control for agent personality
- No drift detection
- No portable taste profiles
- No domain-specific onboarding

### 2. **Basic Memory System**
- Single `MEMORY.md` file
- No tiered memory (constitution → preferences → working memory)
- No memory consolidation
- No performance tracking

### 3. **Limited Skills System**
- Basic skills directory
- No progressive disclosure
- No skill marketplace
- No skill versioning

### 4. **No Multi-Agent Orchestration**
- Spawn creates independent subagents
- No coordination between agents
- No shared memory pools
- No team workflows

### 5. **No Analytics/Observability**
- No performance metrics
- No A/B testing
- No drift proposals
- No trace-first logging

### 6. **No MCP Integration**
- Custom tool system instead of MCP standard
- No trust management
- No tool marketplace

---

## Enhancement Opportunities

### Phase 1: TasteKit Integration
1. Replace flat markdown files with TasteKit artifacts
2. Add `tastekit compile` to onboarding flow
3. Version control for agent personality
4. Drift detection and proposals

### Phase 2: Advanced Memory
1. Implement tiered memory system
2. Add memory consolidation
3. Performance tracking
4. Cross-session learning

### Phase 3: MCP Standard
1. Replace custom tools with MCP protocol
2. Add trust management
3. Tool marketplace integration
4. Pinning and auditing

### Phase 4: Multi-Agent Orchestration
1. Shared memory pools
2. Agent coordination protocols
3. Team workflows
4. Role-based access

### Phase 5: Observability
1. Trace-first logging
2. Performance analytics
3. A/B testing framework
4. Drift visualization

---

## Strategic Positioning

**PicoClaw's Strength**: Ultra-lightweight, fast, portable, runs anywhere
**PicoClaw's Weakness**: Basic agent management, no advanced features

**Our Fork's Value Proposition**:
> "PicoClaw's efficiency + TasteKit's intelligence = The best of both worlds"

We can build:
1. **Lightweight but sophisticated** agent management
2. **Portable taste profiles** that work on $10 hardware
3. **Version-controlled agents** with drift detection
4. **MCP-first** tool integration
5. **Multi-agent orchestration** without bloat

This creates a **unique position** in the market:
- More advanced than PicoClaw
- More efficient than OpenClaw
- More portable than both

---

## Next Steps

1. Fork PicoClaw repository
2. Design TasteKit adapter for PicoClaw's workspace format
3. Implement tiered memory system
4. Add MCP protocol support
5. Build multi-agent orchestration
6. Create comprehensive documentation
