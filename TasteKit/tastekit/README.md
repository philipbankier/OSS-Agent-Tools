# TasteKit v0.5

[![CI](https://github.com/yourusername/tastekit/workflows/CI/badge.svg)](https://github.com/yourusername/tastekit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.0-orange.svg)](https://pnpm.io/)

**Domain-Focused Agent Builder with Skills, MCP, and Drift Detection**

TasteKit is an open-source CLI tool and library that compiles a single user's "taste" into portable, versioned artifacts and a Skills library with progressive disclosure. It binds tools via the Model Context Protocol (MCP), enforces guardrails and approvals, instruments trace-first logs, and supports continuous drift maintenance and evaluations.

## Features

- **Artifact-first compilation**: Everything compiles into files; adapters only map files to runtime
- **Progressive disclosure**: Global taste summary is small; Skills pull deeper context only when invoked
- **MCP-first tool binding**: Uses Model Context Protocol for all tool integrations
- **Trust-by-default**: Pin MCP servers and skill sources; no silent enabling of new tools
- **Trace-first logging**: All runs produce machine-readable traces for analysis and evaluation
- **Built-in maintenance**: Drift detection, consolidation, and staleness checks are core features

## Installation

```bash
pnpm install
pnpm build
```

## Quick Start

```bash
# Initialize a new TasteKit workspace
tastekit init

# Run the onboarding wizard
tastekit onboard --depth guided

# Compile taste artifacts
tastekit compile

# Add and bind MCP tools
tastekit mcp add <server_url>
tastekit mcp bind --interactive

# List generated skills
tastekit skills list

# Run drift detection
tastekit drift detect
```

## Project Structure

```
tastekit/
├── packages/
│   ├── core/          # Core library (schemas, compiler, skills, MCP, trust, tracing)
│   ├── cli/           # Command-line interface
│   └── adapters/      # Runtime adapters (Claude Code, Manus, OpenClaw, Autopilots)
├── examples/          # Example agent projects
├── docs/              # Documentation
└── community/         # Contributing guidelines and RFCs
```

## Documentation

See the [docs/](./docs/) directory for comprehensive documentation:

- [Overview](./docs/overview.md)
- [Quick Start](./docs/quickstart.md)
- [Schemas](./docs/schemas.md)
- [Skills](./docs/skills.md)
- [MCP Integration](./docs/mcp.md)
- [Security](./docs/security.md)
- [Tracing](./docs/tracing.md)

## Design Principles

1. **Artifact-first**: Everything compiles into files; adapters only map files to runtime
2. **Deterministic compilation**: Same inputs produce same artifacts (LLM calls recorded/hashed)
3. **Progressive disclosure**: Global taste summary is small; Skills pull deeper context only when invoked
4. **MCP-first**: Tool binding uses MCP; no custom tool protocol in core
5. **Trust-by-default**: Pin MCP servers/skills sources; no silent enabling of new tools
6. **Trace-first**: All runs produce machine-readable traces; evals operate on traces
7. **Maintenance is v1**: Drift, consolidation, and staleness checks are core features

## License

MIT

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and future direction.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./community/CONTRIBUTING.md) for guidelines.

## Community

- **Issues**: [GitHub Issues](https://github.com/yourusername/tastekit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tastekit/discussions)
- **RFCs**: [community/RFC/](./community/RFC/)
