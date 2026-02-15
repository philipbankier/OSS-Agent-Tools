# TasteKit v0.5 - Project Summary

**TasteKit** is a comprehensive, open-source CLI tool and library for building domain-specific AI agents. It compiles user taste profiles into portable, versioned artifacts with specialized Skills, MCP integration, trust management, trace-first logging, and continuous drift maintenance.

## Project Status

✅ **v0.5 - Domain Architecture Complete**

This release introduces a major architectural shift from generic agents to **domain-focused agent building**. The Content Agent domain is fully implemented as the flagship example, with extensible stubs for Research, Sales, Support, and Development domains.

## What Changed from v1.0 to v0.5

Based on real-world feedback and use case analysis, we pivoted from a generic "one-size-fits-all" approach to a **domain-based architecture**. This makes TasteKit immediately useful for specific use cases rather than requiring users to figure out how to specialize a generic agent.

### Key Improvements

**Before (v1.0):** Generic onboarding → Generic skills → User figures out specialization  
**After (v0.5):** Choose domain → Specialized onboarding → Pre-built domain skills → Ready to use

This change was inspired by analyzing successful AI agents like "Larry" (an OpenClaw agent that got millions of TikTok views), which demonstrated that **the system around the agent** (specialized skills, workflows, tool integrations) is just as important as the AI model itself.

## Architecture Overview

TasteKit v0.5 follows a **monorepo structure** with domain-focused organization:

### 1. Core Library (`@tastekit/core`)

The foundation remains the same as v1.0, with the addition of the domains system:

**Existing Modules** (from v1.0):
- **Schemas**: Zod-based runtime validation for all artifact types
- **Compiler**: Transforms onboarding sessions into canonical artifacts
- **Interview**: Manages onboarding wizard and session state
- **Skills**: Agent Skills with progressive disclosure
- **MCP**: Model Context Protocol integration
- **Trust**: Security and provenance management
- **Tracing**: Trace-first logging
- **Drift**: Drift detection and memory consolidation
- **Eval**: Evaluation and judging
- **Utils**: Filesystem, hash, YAML utilities

**New in v0.5**:
- **Domains**: Domain-specific packages with specialized onboarding, skills, and playbooks

```
packages/core/domains/
├── content-agent/          # ✅ Fully implemented
│   ├── domain.ts           # Domain metadata
│   ├── questions.ts        # 20+ specialized questions
│   ├── skills/             # Pre-built skills
│   │   ├── research-trends.ts
│   │   ├── generate-post-options.ts
│   │   └── index.ts
│   └── playbooks/          # Example workflows (planned)
├── research-agent/         # 🔨 Stub
├── sales-agent/            # 🔨 Stub
├── support-agent/          # 🔨 Stub
├── development-agent/      # 🔨 Stub
└── index.ts                # Domain registry
```

### 2. CLI (`@tastekit/cli`)

The CLI remains largely unchanged, with domain selection added to the `init` command:

```bash
$ tastekit init
? What type of agent are you building?
  ❯ Content Agent - Social media, brand management, content creation
    Research Agent - Information gathering and analysis
    Sales Agent - Lead generation and deal management
    Support Agent - Customer support and assistance
    Development Agent - Software development tasks
    General Agent - Custom agent (advanced users)
```

### 3. Adapters

Runtime adapters remain the same as v1.0:
- Claude Code
- Manus
- OpenClaw
- Autopilots

## Content Agent Domain (Flagship Implementation)

The Content Agent domain is the first fully implemented domain, designed for social media content creation, brand management, and audience engagement.

### Specialized Onboarding

The Content Agent onboarding includes **20+ domain-specific questions** across six sections:

| Section | Questions | Purpose |
| :--- | :--- | :--- |
| **Brand Identity** | Brand type, name, archetypes, voice, examples, forbidden topics | Define the brand persona |
| **Target Platforms** | Platform selection, primary focus, posting frequency | Configure platform strategy |
| **Content Strategy** | Content types, goals, target audience | Set content objectives |
| **Workflow Preferences** | Mode (Simple/Assisted/Autopilot), research autonomy, approvals | Define agent behavior |
| **Tools & Integrations** | Image generation, scheduler, tool config | Connect external services |
| **Performance & Learning** | Success metrics, learning preferences | Enable continuous improvement |

### Pre-Built Skills

**Implemented:**
- `research-trends`: Analyze what's performing well in your niche
- `generate-post-options`: Create 3-5 post variations for selection

**Planned (Community Contributions Welcome):**
- `generate-hooks`: Create attention-grabbing opening lines
- `write-thread`: Compose multi-tweet threads or LinkedIn carousels
- `write-long-form`: Draft blog posts or LinkedIn articles
- `create-content-calendar`: Plan posts over time
- `analyze-performance`: Review metrics and suggest improvements
- `adapt-for-platform`: Reformat content for different social media
- `generate-image-prompt`: Create prompts for image generation tools

### Supported Platforms

Twitter, LinkedIn, TikTok, Instagram, YouTube, Facebook, Blog, Newsletter

### Brand Archetypes

Professional, Casual, Edgy, Humorous, Educational, Inspirational, Technical

### Workflow Modes

- **Simple**: Topic → 3 options → Choose
- **Assisted**: Research → Propose → Approve & refine
- **Autopilot**: Ideate → Plan → Create → Schedule (with review)

## Domain Stubs (Community Ready)

Four additional domains are implemented as stubs with clear contribution guidelines:

- **Research Agent**: Information gathering, analysis, synthesis
- **Sales Agent**: Lead generation, qualification, deal management
- **Support Agent**: Customer support, troubleshooting, assistance
- **Development Agent**: Code review, documentation, debugging, testing

Each stub includes:
- Domain definition with metadata
- Use cases and recommended tools
- TODO comments for community contributors
- Link to contribution documentation

## Design Principles (Unchanged from v1.0)

1. **Artifact-first**: Everything compiles into files
2. **Deterministic compilation**: Same inputs → same artifacts
3. **Progressive disclosure**: Minimal context by default
4. **MCP-first**: Standard protocol for tools
5. **Trust-by-default**: Explicit trust required
6. **Trace-first**: All operations logged
7. **Maintenance is v1**: Drift detection from day one

## Documentation

Complete documentation suite:

- `README.md` - Project overview and quick start
- `docs/overview.md` - Core concepts and design principles
- `docs/quickstart.md` - Step-by-step getting started guide
- `docs/schemas.md` - Complete artifact schema reference
- `docs/skills.md` - Agent Skills and progressive disclosure
- `docs/mcp.md` - MCP integration workflow
- `docs/security.md` - Security model and threat model
- `docs/tracing.md` - Trace-first philosophy and replay
- **`docs/domains.md`** - **New:** Domain architecture overview
- **`docs/domains/content-agent.md`** - **New:** Content Agent deep dive
- `docs/adapters/` - Adapter-specific documentation
- `CHANGELOG.md` - Version history
- `ROADMAP.md` - Future development plans
- `LAUNCH_GUIDE.md` - Launch preparation checklist
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policy

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js v18+
- **Package Manager**: pnpm (workspaces)
- **Validation**: Zod for runtime schema validation
- **CLI Framework**: Commander.js
- **Interactive Prompts**: Inquirer
- **Styling**: Chalk for terminal colors, Ora for spinners
- **YAML**: yaml package for canonical formatting

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Initialize a workspace (choose Content Agent)
tastekit init

# Run specialized onboarding
tastekit onboard --depth guided

# Compile artifacts
tastekit compile

# Add MCP tools
tastekit mcp add <server_url>
tastekit mcp bind --interactive

# Export for runtime
tastekit export --target manus --out ./profile
```

## What's Next

### Short-term (v0.6-v0.8)
- Complete remaining Content Agent skills
- Add Content Agent playbooks
- Implement MCP protocol (replace stub)
- Add test coverage
- Community contributions for other domains

### Medium-term (v1.0)
- At least 3 fully implemented domains
- Production-ready MCP client
- Comprehensive test suite
- VSCode extension for skill authoring
- Skills marketplace concept

### Long-term (v2.0+)
- Runtime integrations (not just export/import)
- Real-time drift detection
- Web-based dashboard
- Multi-user/team workspaces

See `ROADMAP.md` for detailed plans.

## Contributing

We welcome contributions! The domain architecture makes it easy to contribute:

1. **Add skills to existing domains** (especially Content Agent)
2. **Implement stub domains** (Research, Sales, Support, Development)
3. **Create new domains** for other use cases
4. **Improve documentation** and examples
5. **Build adapters** for additional runtimes

See `CONTRIBUTING.md` for guidelines.

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ following the TasteKit specification and real-world use case analysis**
