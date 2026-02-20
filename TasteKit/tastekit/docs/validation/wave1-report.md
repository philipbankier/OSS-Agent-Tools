# Wave-1 Validation Report

## Run Metadata
- Date: 2026-02-20
- Branch: `codex/tastekit-validation-wave1`
- Fixture root: `fixtures/validation/wave1/domains/`
- Live provider used: local Ollama (`huihui_ai/qwen3-vl-abliterated:8b-instruct`)
- API keys were not required for this wave.

## Scope Completed
- Domains validated:
  - `development-agent`
  - `content-agent`
  - `research-agent`
- End-to-end flow executed per domain:
  - `init`
  - `onboard` (live)
  - `compile`
  - `skills graph`
  - `export --target claude-code`
  - `export --target openclaw`
  - `export --target manus`
- Resume/interruption flow checked per domain:
  - `onboard --resume` + `/skip` + `/save`
- Deterministic fixture replay script added:
  - `scripts/validation/wave1-check.sh`

## Evidence Pointers
- Development agent:
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/init.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/onboard.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/onboard-resume.log`
  - `fixtures/validation/wave1/domains/development-agent/workspace/logs/compile.log`
- Content agent:
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/init.log`
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/onboard.log`
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/onboard-resume.log`
  - `fixtures/validation/wave1/domains/content-agent/workspace/logs/compile.log`
- Research agent:
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/init.log`
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/onboard.log`
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/onboard-resume.log`
  - `fixtures/validation/wave1/domains/research-agent/workspace/logs/compile.log`

## Domain Outcomes
| Domain | Init | Onboard (Live) | Resume Flow | Compile | Skills Graph | Exports |
|---|---|---|---|---|---|---|
| development-agent | Pass | Pass (`Connected to ollama`) | Pass (`Resuming previous session`, `/skip`, `/save`) | Pass | Pass | Pass (3/3) |
| content-agent | Pass | Pass (`Connected to ollama`) | Pass (`Resuming previous session`, `/skip`, `/save`) | Pass | Pass | Pass (3/3) |
| research-agent | Pass | Pass (`Connected to ollama`) | Pass (`Resuming previous session`, `/skip`, `/save`) | Pass | Pass | Pass (3/3) |

## UX + Reliability Findings

### P1
- `drift detect` path mismatch with v2 layout.
  - Current command reads `.tastekit/traces`, while v2 layout creates `.tastekit/ops/traces`.
  - Impact: drift detection can silently miss traces unless users mirror files into legacy path.
- `onboard --provider ollama` discards configured model selection.
  - Overriding provider in CLI bypasses configured `llm_provider.model` from `.tastekit/tastekit.yaml`.
  - Impact: onboarding fails when default `llama3.1` is unavailable despite a valid configured model.

### P2
- Session write path is still legacy in onboarding.
  - Onboarding writes `.tastekit/session.json` even for v2 three-space workspaces instead of `.tastekit/ops/session.json`.
  - Impact: layout inconsistency and extra fallback behavior complexity.
- `--json` behavior is global-only and easy to misuse.
  - `tastekit <command> --json` does not consistently produce JSON; global `tastekit --json <command>` is required.
  - Impact: scripting friction and surprising CLI behavior.

## Defect Backlog (Actionable PR Slices)
1. `codex/tastekit-wave1-fix-drift-paths`:
   - migrate `drift detect` to `resolveTracesPath`
   - add regression tests for v1 + v2 trace locations
2. `codex/tastekit-wave1-fix-provider-model-override`:
   - preserve configured `llm_provider.model` when `--provider` is used
   - add onboarding tests for provider override with custom model
3. `codex/tastekit-wave1-fix-session-path`:
   - write/read session in `ops/session.json` for v2
   - keep v1 backward-compatible fallback
4. `codex/tastekit-wave1-cli-json-ergonomics`:
   - support command-local `--json` aliasing or clearer error/help guidance

## Recommendation Before Feature Expansion
Ship P1 slices above before starting AutoClaw 4.2 or autoManage B.1 implementation work.
