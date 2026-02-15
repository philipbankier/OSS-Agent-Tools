'''# Quick Start Guide

This guide will walk you through the essential steps to get started with TasteKit, from initializing your workspace to compiling your first set of taste artifacts.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [pnpm](https://pnpm.io/) (v8 or later)

## 1. Installation

First, clone the TasteKit repository and install the dependencies using `pnpm`.

```bash
# Clone the repository
git clone https://github.com/example/tastekit.git
cd tastekit

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

This will build all the internal packages and make the `tastekit` CLI available.

## 2. Initialize a Workspace

The first step in any TasteKit project is to initialize a workspace. This creates a hidden `.tastekit/` directory that will store all your artifacts, skills, and configuration.

```bash
# Run the init command in your project directory
tastekit init
```

This command creates the necessary subdirectory structure for your artifacts, skills, traces, and compiled outputs.

## 3. Onboard Your Taste

Next, run the interactive onboarding wizard. This process will ask you a series of questions to capture your core principles, communication style, and operational preferences.

```bash
# Start the guided onboarding process
tastekit onboard --depth guided
```

The wizard saves your answers to `.tastekit/session.json`. This file is resumable, so you can stop and continue the process at any time using the `--resume` flag.

## 4. Compile Artifacts

Once onboarding is complete, you can compile your session data into a set of canonical taste artifacts.

```bash
# Compile the artifacts
tastekit compile
```

This is the core of TasteKit. The compiler reads your `session.json` and deterministically generates the following key files in `.tastekit/artifacts/`:

-   `constitution.v1.json`: Your global taste profile, including principles and tone.
-   `guardrails.v1.yaml`: Default permissions and approval rules.
-   `memory.v1.yaml`: Policies for how the agent should remember and forget information.

It also generates a starter skills library in `.tastekit/skills/`.

## 5. Bind Tools with MCP

TasteKit uses the Model Context Protocol (MCP) to connect to tools. To give your agent capabilities, you need to add an MCP server and bind the tools you want it to use.

```bash
# Add a connection to an MCP server
tastekit mcp add http://localhost:8080 --name local-tools

# Inspect the server to see available tools
tastekit mcp inspect local-tools

# Bind the tools you want to use (interactively)
tastekit mcp bind --interactive
```

This process updates `.tastekit/bindings.v1.yaml` with the selected tools and automatically generates default guardrails based on the tools' risk annotations.

## 6. Export for a Runtime

Finally, export your compiled profile for a specific agent runtime using an adapter. This translates the universal TasteKit artifacts into a format the target runtime can understand.

```bash
# Export for the Manus runtime
tastekit export --target manus --out ./manus-profile

# Export for the Claude Code runtime
tastekit export --target claude-code --out ./claude-profile
```

The output directory (`./manus-profile` or `./claude-profile`) now contains the runtime-specific files needed to run an agent that embodies your compiled taste.

## What's Next?

Your TasteKit profile is now ready. As you use your agent, it will generate trace files in `.tastekit/traces/`. You can use these traces to monitor behavior and detect drift over time.

-   **Explore Skills**: Run `tastekit skills list` to see your generated skills.
-   **Audit Trust**: Use `tastekit trust audit` to check the integrity of your tool sources.
-   **Detect Drift**: Run `tastekit drift detect` to analyze traces for potential misalignments.
'''
