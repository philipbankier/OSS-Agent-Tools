# QuickClaw

QuickClaw is a full-auto OpenClaw setup/provisioning CLI.

## Commands

1. `quickclaw create`
2. `quickclaw verify`
3. `quickclaw export-config`

## Install (local repo)

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

## Config contract (`quickclaw.v1`)

QuickClaw validates config via Zod and expects:

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

Default automation behavior:

- `automation.autoInstallMissingCli: false`
- Missing CLIs fail fast with exact install commands unless auto-install is explicitly enabled.

## `quickclaw create`

Flags:

- `--config <path>`
- `--workspace <path>`
- `--preview`
- `--confirm`
- `--json`
- `--engine-policy <claude-plan-codex-exec|claude-only|codex-only>`

Default mode is automatic apply. Use `--preview` for dry-run and `--confirm` to require confirmation before apply.

`quickclaw create` preflight behavior:

- By default, missing CLIs fail fast with explicit install commands.
- Set `automation.autoInstallMissingCli: true` in config to auto-install missing CLIs before apply.

`--json` output keys:

- `workspace`
- `planReport`
- `checks`
- `generatedArtifacts` (preview mode)
- `applyReport`, `success`, `actions` (apply mode)

## Full-ops env checklist

Set these before full apply:

- `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY` depending on `openclaw.authChoice`)
- `SENTRY_AUTH_TOKEN`
- `OPENCLAW_HOOKS_TOKEN`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

## Example workflows

Preview only:

```bash
quickclaw create --config quickclaw.config.yaml --preview --json
```

Automatic apply:

```bash
quickclaw create --config quickclaw.config.yaml --json
```

Require manual confirmation before apply:

```bash
quickclaw create --config quickclaw.config.yaml --confirm
```

Verification:

```bash
quickclaw verify --config quickclaw.config.yaml --json
```

## Report outputs

QuickClaw writes reports under `<workspace>/.quickclaw/`:

- `plan-report.v1.json`
- `apply-report.v1.json`
- `verification-report.v1.json`

## Notes

- OpenClaw is treated as canonical runtime target.
- `clawdbot` is recognized as legacy CLI alias for compatibility.
- Full-ops setup validates required secrets and fails if missing.
