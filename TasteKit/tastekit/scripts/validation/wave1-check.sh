#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FIXTURE_ROOT="$ROOT_DIR/fixtures/validation/wave1/domains"
CLI=(node "$ROOT_DIR/packages/cli/dist/cli.js")
DOMAINS=(development-agent content-agent research-agent)
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/tastekit-wave1-check.XXXXXX")"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

require_dir() {
  local path="$1"
  if [[ ! -d "$path" ]]; then
    echo "Missing required directory: $path" >&2
    exit 1
  fi
}

echo "[wave1] root: $ROOT_DIR"

echo "[wave1] install/build/test gates"
cd "$ROOT_DIR"
pnpm install
pnpm -r build
pnpm --filter @tastekit/core test
pnpm --filter @tastekit/cli build
pnpm node -e "import('@tastekit/adapters/claude-code').then(m=>{if(!m.ClaudeCodeAdapter) process.exit(1);})"

echo "[wave1] cli smoke"
"${CLI[@]}" --help >/dev/null
"${CLI[@]}" init --help >/dev/null
"${CLI[@]}" onboard --help >/dev/null
"${CLI[@]}" compile --help >/dev/null
"${CLI[@]}" export --help >/dev/null
"${CLI[@]}" skills --help >/dev/null
"${CLI[@]}" drift --help >/dev/null

echo "[wave1] deterministic replay"
for domain in "${DOMAINS[@]}"; do
  src="$FIXTURE_ROOT/$domain/workspace"
  replay="$TMP_ROOT/$domain"

  require_dir "$src"
  require_dir "$src/.tastekit"
  require_file "$src/.tastekit/session.json"
  require_file "$src/.tastekit/tastekit.yaml"

  cp -R "$src" "$replay"

  (
    cd "$replay"

    # Resume-style compilation should be idempotent on fixture state.
    "${CLI[@]}" compile --resume >/dev/null
    "${CLI[@]}" compile --resume >/dev/null

    # Skills graph smoke.
    "${CLI[@]}" skills graph >/dev/null

    # Export compatibility checks.
    for target in claude-code openclaw manus; do
      out="$replay/replay-exports/$target"
      "${CLI[@]}" export --target "$target" --out "$out" >/dev/null
    done

    # Drift loop sanity on synthetic traces.
    "${CLI[@]}" drift detect >/dev/null || true
  )

  require_file "$replay/.tastekit/self/constitution.v1.json"
  require_file "$replay/.tastekit/self/guardrails.v1.yaml"
  require_file "$replay/.tastekit/self/memory.v1.yaml"
  require_file "$replay/.tastekit/knowledge/skills/manifest.v1.yaml"
  if ! find "$replay/.tastekit/knowledge/playbooks" -maxdepth 1 -type f | grep -q .; then
    echo "Missing generated playbooks for domain: $domain" >&2
    exit 1
  fi

  require_file "$replay/replay-exports/claude-code/CLAUDE.md"
  require_file "$replay/replay-exports/claude-code/.claude/settings.local.json"
  require_file "$replay/replay-exports/openclaw/openclaw.config.json"
  require_file "$replay/replay-exports/manus/README.md"

echo "[wave1] domain ok: $domain"
done

echo "[wave1] all checks passed"
