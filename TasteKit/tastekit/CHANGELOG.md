# Changelog

All notable changes to TasteKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-02-14

### Added - Domain-Based Architecture

This release introduces a major architectural shift to domain-focused agent building. Instead of creating generic agents, users now choose a specific domain (Content, Research, Sales, Support, Development) and receive specialized onboarding, skills, and playbooks for that domain.

#### Core Architecture
- **Domain System**: New `packages/core/domains/` structure for organizing domain-specific functionality
- **Domain Registry**: Central registry for discovering and loading available domains
- **Domain Selection**: Users choose their agent type during `tastekit init`

#### Content Agent Domain (Fully Implemented)
- **Specialized Onboarding**: 20+ domain-specific questions covering brand identity, platforms, content strategy, workflow preferences, tools, and performance metrics
- **Pre-built Skills**:
  - `research-trends`: Analyze what content is performing well in your niche
  - `generate-post-options`: Create 3-5 post variations for user selection
- **Platform Support**: Twitter, LinkedIn, TikTok, Instagram, YouTube, Facebook, Blog, Newsletter
- **Content Types**: Short-form text, long-form text, image posts, carousels, videos, threads, stories
- **Brand Archetypes**: Professional, casual, edgy, humorous, educational, inspirational, technical
- **Workflow Modes**: Simple (topic → options), Assisted (research → propose), Autopilot (autonomous)

#### Domain Stubs (Community Contribution Ready)
- **Research Agent**: Information gathering, analysis, and synthesis
- **Sales Agent**: Lead generation, qualification, and deal management
- **Support Agent**: Customer support and user assistance
- **Development Agent**: Software development assistance

#### Documentation
- New `docs/domains.md` explaining the domain architecture
- Domain contribution guidelines in `CONTRIBUTING.md`
- Research notes from real-world content agent use case (Larry/OpenClaw)

### Changed

- **Version**: Bumped from 1.0.0 to 0.5.0 to reflect pre-release status
- **README**: Updated to emphasize domain-focused approach
- **Project Status**: Positioned as functional but evolving, ready for community contributions

### Technical Details

The domain architecture is designed for extensibility:

```typescript
packages/core/domains/
├── content-agent/          # Fully implemented
│   ├── domain.ts           # Domain metadata
│   ├── questions.ts        # Specialized onboarding
│   ├── skills/             # Pre-built skills
│   └── playbooks/          # Example workflows
├── research-agent/         # Stub
├── sales-agent/            # Stub
├── support-agent/          # Stub
└── development-agent/      # Stub
```

Each domain is self-contained and can be developed independently by the community.

### Migration Notes

If you were using TasteKit v1.0 (unreleased):
- The core architecture remains the same (artifacts, schemas, compilation)
- New: Domain selection during initialization
- New: Domain-specific onboarding questions replace generic questions
- New: Pre-built skills for Content Agent domain

## [1.0.0] - 2026-02-13 (Unreleased)

This version was never publicly released. It has been superseded by v0.5.0 with the domain-based architecture.

### Notes

The v1.0.0 implementation included all core modules (schemas, compiler, interview, skills, MCP, trust, tracing, drift, eval) but used a generic onboarding approach. Based on user feedback, we pivoted to a domain-focused architecture to make the tool immediately useful for specific use cases.

[0.5.0]: https://github.com/yourusername/tastekit/releases/tag/v0.5.0
