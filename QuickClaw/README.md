# QuickClaw

QuickClaw provisions and verifies OpenClaw workspaces with full ops scaffolding.

## Commands

1. `quickclaw create`
2. `quickclaw verify`
3. `quickclaw export-config`

## Install

```bash
cd '/Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools/QuickClaw'
pnpm install
pnpm build
```

## Quick start

```bash
quickclaw export-config --out quickclaw.config.yaml
quickclaw create --config quickclaw.config.yaml
quickclaw verify --config quickclaw.config.yaml
```

## Claude Code Handoff

Use `/Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools/QuickClaw/HANDOFF_CLAUDE_CODE.md` as the canonical copy/paste brief for bringing up a new target machine end-to-end.

## Config contract (`quickclaw.v1`)

Required top-level sections:

- `version: "quickclaw.v1"`
- `project`
- `openclaw`
- `identity`
- `memory`
- `safety`
- `codingOps`
- `sentry`
- `automation`
- `credentials`

Notable defaults:

- `automation.autoInstallMissingCli: false`
- `automation.allowGlobalConfigWrites: false`
- `safety.profile: balanced`
- `safety.trustLadderLevel: draft-approve`
- `sentry.mode: slack-first`
- `memory.decay.hotDays: 7`
- `memory.decay.warmDays: 30`

Additive optional config blocks:

- `memory.knowledgePaths: string[]`
- `codingOps.stalledCheckWindowMinutes`
- `codingOps.maxRestartsPerSession`
- `openclaw.advanced.{multiAgentScaffold,tailscaleNotes,modelAliasTemplate}`

## `quickclaw create`

Flags:

- `--config <path>`
- `--workspace <path>`
- `--preview`
- `--confirm`
- `--json`
- `--engine-policy <claude-plan-codex-exec|claude-only|codex-only>`

Behavior:

- Default mode is automatic apply.
- `--preview` is strictly non-mutating (no auto-install, onboard, hooks/cron/sentry apply, or workspace materialization).
- Missing CLIs fail fast with install commands unless `automation.autoInstallMissingCli: true`.
- Global OpenClaw config writes are blocked by default; QuickClaw emits `<workspace>/.quickclaw/openclaw.config.patch.json` instead.

JSON output keys:

- Preview: `workspace`, `planReport`, `checks`, `generatedArtifacts`, `hostMutationsSkipped`
- Apply: `workspace`, `planReport`, `applyReport`, `checks`, `success`, `actions`, `policyWarnings`

## Full-ops env checklist

Set these for full apply:

- one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (when `openclaw.authChoice=apiKey`)
- `SENTRY_AUTH_TOKEN`
- `OPENCLAW_HOOKS_TOKEN`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

## Examples

Preview only:

```bash
quickclaw create --config quickclaw.config.yaml --preview --json
```

Apply:

```bash
quickclaw create --config quickclaw.config.yaml --json
```

Verify:

```bash
quickclaw verify --config quickclaw.config.yaml --json
```

## Reports

QuickClaw writes reports under `<workspace>/.quickclaw/`:

- `plan-report.v1.json`
- `apply-report.v1.json`
- `verification-report.v1.json`

## Notes

- OpenClaw is canonical runtime target.
- `clawdbot` is supported as compatibility alias.
