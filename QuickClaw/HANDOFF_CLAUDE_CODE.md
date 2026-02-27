# Claude Code Handoff Prompt for QuickClaw Bring-Up on a New Target Computer

This file is the canonical handoff prompt to give Claude Code when you want a brand-new machine to become a fully operational OpenClaw host via QuickClaw.

## Summary
Provide Claude Code a decision-complete execution brief to take the existing `QuickClaw` tool from source to a fully running OpenClaw agent on a new target machine (not your main machine), including config generation, full apply, verification, and remediation loops until green.

## Public Interfaces and Contracts to Preserve
- CLI commands stay unchanged:
  - `quickclaw create`
  - `quickclaw verify`
  - `quickclaw export-config`
- Config schema version:
  - `version: "quickclaw.v1"`
- Key behavior to preserve:
  - `--preview` is strictly non-mutating and emits `hostMutationsSkipped`
  - default safety is `balanced`
  - default engine split policy remains Claude-plan/Codex-exec
  - `automation.allowGlobalConfigWrites` default is `false` (must be explicitly set `true` on target host for full global runtime wiring)
- Report outputs:
  - `<workspace>/.quickclaw/plan-report.v1.json`
  - `<workspace>/.quickclaw/apply-report.v1.json`
  - `<workspace>/.quickclaw/verification-report.v1.json`

## Test Cases and Scenarios Claude Must Execute
1. Build/test gates:
   - `pnpm build`
   - `pnpm test`
2. Smoke gates:
   - `node dist/cli.js export-config ...`
   - `node dist/cli.js create ... --preview --json`
   - `node dist/cli.js create ... --json`
   - `node dist/cli.js verify ... --json`
3. Success conditions:
   - `create --json` returns `success: true`
   - `verify --json` returns `ok: true`
   - required workspace docs/scripts exist
   - required hooks/cron checks pass
   - Sentry pipeline is truly green (`sentryApiValidated`, `alertRuleConfigured`, and `webhookSmokeTest` all true)

## Assumptions and Defaults
- This run is on a new target computer where OpenClaw should run.
- Use `node dist/cli.js` (not relying on globally installed `quickclaw`) for deterministic execution.
- Full-ops setup is required (Sentry + Slack + webhook path).
- If `automation.allowGlobalConfigWrites` remains `false`, runtime wiring is patch-based and not globally activated.

## Copy/Paste Prompt for Claude Code
```text
You are my implementation/ops agent. Your goal is to get QuickClaw fully up and running on this target machine so a new OpenClaw agent is operational end-to-end.

Repository context:
- Preferred repo root: /Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools
- QuickClaw project: /Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools/QuickClaw
- If these paths do not exist on this machine, discover the repo root by locating QuickClaw/package.json and proceed.

Rules:
1) Do not change QuickClaw source code unless you hit a real blocker/bug.
2) Never commit secrets.
3) Preserve existing behavior contracts:
   - preview is non-mutating
   - config version quickclaw.v1
   - output reports under <workspace>/.quickclaw/
4) Prefer deterministic commands via node dist/cli.js from QuickClaw dir.
5) If any step fails, remediate and retry until all acceptance criteria are green.

Execution plan (perform in order):

Phase A: Environment + toolchain audit
- Confirm:
  - node >= 22.12
  - pnpm available
  - binaries: openclaw (or clawdbot), tastekit, claude, codex, tmux, git
- If missing, install with explicit commands and re-check.
- Capture exact versions in your output.

Phase B: Build/test quality gate
From QuickClaw directory:
- pnpm install
- pnpm build
- pnpm test
If either fails, fix environment/tooling issues (not product code unless absolutely necessary) and rerun until green.

Phase C: Generate and finalize runtime config
1) Export starter config:
- node dist/cli.js export-config --out /tmp/quickclaw.target.config.yaml

2) Fill /tmp/quickclaw.target.config.yaml with target-machine values:
- project.agentName: set to a concrete name
- project.workspace: set to desired workspace path on this machine
- project.timezone: local timezone
- openclaw.authChoice: choose based on available provider creds
- sentry org/project/channel/webhook path: set to real values
- automation.autoInstallMissingCli: false (unless intentionally enabling auto-install)
- IMPORTANT: because this is target host and full operational runtime wiring is needed, set:
  - automation.allowGlobalConfigWrites: true

3) Validate required env vars are present (no empty values):
- For authChoice=apiKey: at least one of ANTHROPIC_API_KEY or OPENAI_API_KEY
- SENTRY_AUTH_TOKEN
- OPENCLAW_HOOKS_TOKEN
- SLACK_BOT_TOKEN
- SLACK_APP_TOKEN

Phase D: Non-mutating preview gate
Run:
- node dist/cli.js create --config /tmp/quickclaw.target.config.yaml --preview --json | tee /tmp/quickclaw.preview.json

Validate preview JSON:
- mode == "preview"
- hostMutationsSkipped exists and is non-empty
- planReport path exists
- no workspace docs/scripts were materialized by preview

Phase E: Full apply
Run:
- node dist/cli.js create --config /tmp/quickclaw.target.config.yaml --json | tee /tmp/quickclaw.apply.json

Validate apply JSON:
- success == true
- actions include green results for:
  - onboard
  - workspace_materialization
  - coding_ops
  - hooks
  - cron
  - sentry_pipeline
  - tastekit_bridge
- sentry_pipeline is only considered green if:
  - sentryApiValidated true
  - alertRuleConfigured true
  - webhookSmokeTest true

Phase F: Verification gate
Run:
- node dist/cli.js verify --config /tmp/quickclaw.target.config.yaml --json | tee /tmp/quickclaw.verify.json

Validate:
- ok == true
- checks include passing results for:
  - openclaw_health
  - openclaw_hooks_check
  - openclaw_cron_list
  - openclaw_cron_required_jobs
  - sentry_webhook_route_test
  - workspace artifact checks (memory/safety/scripts)

Phase G: Remediation loop (if any failures)
For each failing check/action:
- identify root cause
- apply minimal fix
- rerun only necessary command(s)
- converge to all green
Common remediations:
- missing CLI/dependency
- missing env var/invalid token
- wrong sentry org/project/channel/webhook path
- gateway/hook routing mismatch
- OpenClaw daemon not healthy
- cron/hook not registered

Final deliverable format (required):
1) "Environment Summary" table with versions/binaries.
2) "Config Summary" (redact secrets, show chosen authChoice and workspace).
3) "Execution Results" with:
   - preview command + outcome
   - apply command + outcome
   - verify command + outcome
4) "Artifacts" with absolute paths to:
   - plan-report.v1.json
   - apply-report.v1.json
   - verification-report.v1.json
5) "Operational Status":
   - Explicit statement: FULLY RUNNING or NOT FULLY RUNNING
   - If not fully running, exact blockers and exact next commands to resolve.

Start now and do not stop at partial status updates; continue until fully green or until blocked by unavailable credentials/external access.
```
