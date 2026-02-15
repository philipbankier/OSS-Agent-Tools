# TasteKit Domains

TasteKit v0.5 introduces a **domain-based architecture** that provides specialized onboarding, skills, and playbooks for specific types of agents. Instead of creating a generic agent, users choose a domain that matches their use case, and TasteKit provides deep, specialized support for that domain.

## What is a Domain?

A **domain** in TasteKit is a complete package that includes:

- **Specialized onboarding questions** that dig deep into domain-specific requirements
- **Pre-built skills library** with common workflows for that domain
- **Example playbooks** that chain skills together for complex automation
- **Recommended MCP tool integrations** for the domain
- **Domain-specific guardrails** and approval workflows

## Available Domains

### Content Agent (v0.5 - Fully Implemented)

The Content Agent domain is designed for individuals and businesses that want to automate social media content creation, brand management, and audience engagement.

**Use Cases:**
- Personal brand management (Twitter, LinkedIn, TikTok, Instagram)
- Business social media accounts
- AI influencers and content creators
- Newsletter and blog content generation

**Key Features:**
- Deep onboarding about brand voice, tone, and audience
- Skills for research, ideation, content generation, and scheduling
- Platform-specific content adaptation (Twitter threads, LinkedIn articles, TikTok scripts)
- Integration with image generation, scheduling tools, and analytics

**Learn More:** [Content Agent Documentation](./domains/content-agent.md)

### Research Agent (v0.5 - Stub)

The Research Agent domain is for agents that gather, analyze, and synthesize information from various sources.

**Planned Use Cases:**
- Market research and competitive analysis
- Academic research and literature reviews
- News monitoring and trend analysis
- Due diligence and fact-checking

**Status:** Stub implementation. Community contributions welcome.

### Sales Agent (v0.5 - Stub)

The Sales Agent domain is for agents that support sales processes, from lead generation to deal closing.

**Planned Use Cases:**
- Lead qualification and outreach
- CRM management and follow-ups
- Proposal generation
- Sales analytics and forecasting

**Status:** Stub implementation. Community contributions welcome.

### Support Agent (v0.5 - Stub)

The Support Agent domain is for agents that handle customer support, troubleshooting, and user assistance.

**Planned Use Cases:**
- Customer support ticket triage and response
- Knowledge base management
- Onboarding assistance
- Escalation management

**Status:** Stub implementation. Community contributions welcome.

### Development Agent (v0.5 - Stub)

The Development Agent domain is for agents that assist with software development tasks.

**Planned Use Cases:**
- Code review and refactoring
- Documentation generation
- Bug triage and debugging assistance
- Test generation

**Status:** Stub implementation. Community contributions welcome.

## Choosing a Domain

When you run `tastekit init`, you will be prompted to choose a domain:

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

Your choice determines which specialized onboarding flow, skills, and playbooks you will receive.

## Contributing a New Domain

We welcome community contributions of new domains! To add a domain, you need to provide:

1. **Domain definition** in `packages/core/domains/<domain-name>/domain.ts`
2. **Specialized onboarding questions** in `packages/core/domains/<domain-name>/questions.ts`
3. **Skills library** in `packages/core/domains/<domain-name>/skills/`
4. **Example playbooks** in `packages/core/domains/<domain-name>/playbooks/`
5. **Documentation** in `docs/domains/<domain-name>.md`

See [CONTRIBUTING.md](../community/CONTRIBUTING.md) for detailed instructions on contributing a domain.

## Domain Architecture

Each domain is a self-contained module within the core library:

```
packages/core/domains/
├── content-agent/
│   ├── domain.ts           # Domain metadata and configuration
│   ├── questions.ts        # Specialized onboarding questions
│   ├── skills/             # Pre-built skills for this domain
│   │   ├── research-trends.ts
│   │   ├── generate-hooks.ts
│   │   ├── write-caption.ts
│   │   └── ...
│   ├── playbooks/          # Example playbooks
│   │   ├── daily-content-sprint.yaml
│   │   └── weekly-campaign.yaml
│   └── tools.ts            # Recommended MCP tool integrations
├── research-agent/         # Stub
├── sales-agent/            # Stub
├── support-agent/          # Stub
└── development-agent/      # Stub
```

This modular structure makes it easy for the community to contribute new domains without affecting existing ones.
