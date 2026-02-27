import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { QuickClawConfigV1 } from '../../config/schema.js';

export interface CodingOpsResult {
  files: string[];
}

function writeExecutable(filePath: string, content: string): void {
  writeFileSync(filePath, content, 'utf-8');
  chmodSync(filePath, 0o755);
}

export function setupCodingOps(workspace: string, config: QuickClawConfigV1): CodingOpsResult {
  const scriptsDir = path.join(workspace, 'ops', 'scripts');
  mkdirSync(scriptsDir, { recursive: true });

  const createWorktreePath = path.join(scriptsDir, 'create-worktree.sh');
  writeExecutable(
    createWorktreePath,
    `#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <repo> <scope> [base]"
  exit 1
fi

REPO="$1"
SCOPE="$2"
BASE="${'$'}{3:-main}"
ROOT="${config.codingOps.worktreeRoot}"
BRANCH="codex/${'$'}{SCOPE}"
PATH_OUT="${'$'}{ROOT}/${'$'}{SCOPE}"

mkdir -p "${'$'}{ROOT}"

git -C "${'$'}{REPO}" worktree add -b "${'$'}{BRANCH}" "${'$'}{PATH_OUT}" "${'$'}{BASE}"
echo "Created ${'$'}{PATH_OUT}"
`,
  );

  const ralphLoopPath = path.join(scriptsDir, 'ralph-loop.sh');
  writeExecutable(
    ralphLoopPath,
    `#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <prd_file> <workdir>"
  exit 1
fi

PRD="$1"
WORKDIR="$2"
MAX_RUNS="${'$'}{MAX_RUNS:-20}"
SLEEP_SECS="${'$'}{SLEEP_SECS:-3}"

for ((i=1; i<=MAX_RUNS; i++)); do
  echo "[ralph-loop] run ${'$'}i/${'$'}MAX_RUNS"
  (cd "${'$'}WORKDIR" && codex exec --json --skip-git-repo-check - "Implement remaining items in ${'$'}PRD. Write failing tests first, then make tests pass.") || true

  if ! rg -q "^- \[ \]" "${'$'}PRD"; then
    echo "[ralph-loop] All checklist items complete"
    exit 0
  fi

  sleep "${'$'}SLEEP_SECS"
done

echo "[ralph-loop] max runs reached without completion"
exit 1
`,
  );

  const verifyChecklistPath = path.join(scriptsDir, 'verify-prd-checklist.sh');
  writeExecutable(
    verifyChecklistPath,
    `#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <prd_file>"
  exit 1
fi

PRD="$1"
if rg -q "^- \\[ \\]" "$PRD"; then
  echo "[verify-prd] unchecked tasks remain in $PRD"
  rg "^- \\[ \\]" "$PRD" || true
  exit 2
fi

echo "[verify-prd] all checklist items complete"
`,
  );

  const healthCheckPath = path.join(scriptsDir, 'tmux-health-check.sh');
  writeExecutable(
    healthCheckPath,
    `#!/usr/bin/env bash
set -euo pipefail

SOCKET="${config.codingOps.tmuxSocket}"
SESSION="$1"

if ! tmux -S "${'$'}SOCKET" has-session -t "${'$'}SESSION" 2>/dev/null; then
  echo "dead"
  exit 2
fi

OUT="$(tmux -S "${'$'}SOCKET" capture-pane -p -J -t "${'$'}SESSION":0.0 -S -40)"
echo "${'$'}OUT"
`,
  );

  const notifyPath = path.join(scriptsDir, 'notify-complete.sh');
  writeExecutable(
    notifyPath,
    `#!/usr/bin/env bash
set -euo pipefail

MESSAGE="${'$'}{1:-Ralph loop finished}"
if command -v openclaw >/dev/null 2>&1; then
  openclaw system event --text "${'$'}MESSAGE" --mode now || true
else
  echo "${'$'}MESSAGE"
fi
`,
  );

  const heartbeatPath = path.join(scriptsDir, 'tmux-heartbeat.sh');
  writeExecutable(
    heartbeatPath,
    `#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <session> <restart_command>"
  exit 1
fi

SOCKET="${config.codingOps.tmuxSocket}"
SESSION="$1"
RESTART_CMD="$2"
WINDOW_MINS="${config.codingOps.stalledCheckWindowMinutes}"
MAX_RESTARTS="${config.codingOps.maxRestartsPerSession}"
STATE_DIR="${'$'}{TMPDIR:-/tmp}/quickclaw-heartbeat"
STATE_FILE="${'$'}STATE_DIR/${'$'}SESSION.state"
NOW_EPOCH="$(date +%s)"
mkdir -p "${'$'}STATE_DIR"

touch "${'$'}STATE_FILE"
IFS='|' read -r LAST_HASH LAST_STALE_SINCE LAST_RESTARTS < "${'$'}STATE_FILE" || true
LAST_HASH="${'$'}{LAST_HASH:-}"
LAST_STALE_SINCE="${'$'}{LAST_STALE_SINCE:-0}"
LAST_RESTARTS="${'$'}{LAST_RESTARTS:-0}"

if ! tmux -S "${'$'}SOCKET" has-session -t "${'$'}SESSION" 2>/dev/null; then
  if (( LAST_RESTARTS >= MAX_RESTARTS )); then
    echo "[heartbeat] session ${'$'}SESSION dead and restart budget exhausted"
    exit 3
  fi
  tmux -S "${'$'}SOCKET" new -d -s "${'$'}SESSION" "${'$'}RESTART_CMD"
  echo "dead|${'$'}NOW_EPOCH|$((LAST_RESTARTS + 1))" > "${'$'}STATE_FILE"
  echo "[heartbeat] restarted dead session ${'$'}SESSION"
  exit 0
fi

OUT="$(tmux -S "${'$'}SOCKET" capture-pane -p -J -t "${'$'}SESSION":0.0 -S -120)"
HASH="$(printf '%s' "${'$'}OUT" | shasum | awk '{print $1}')"
if [[ "${'$'}HASH" == "${'$'}LAST_HASH" ]]; then
  STALE_SINCE="${'$'}LAST_STALE_SINCE"
  if [[ "${'$'}STALE_SINCE" == "0" ]]; then
    STALE_SINCE="${'$'}NOW_EPOCH"
  fi
  ELAPSED_MINS=$(( (NOW_EPOCH - STALE_SINCE) / 60 ))
  if (( ELAPSED_MINS < WINDOW_MINS )); then
    echo "${'$'}HASH|${'$'}STALE_SINCE|${'$'}LAST_RESTARTS" > "${'$'}STATE_FILE"
    echo "[heartbeat] unchanged output for ${'$'}ELAPSED_MINS min (<${'$'}WINDOW_MINS), no restart"
    exit 0
  fi
  if (( LAST_RESTARTS >= MAX_RESTARTS )); then
    echo "[heartbeat] stalled session ${'$'}SESSION and restart budget exhausted"
    exit 4
  fi
  tmux -S "${'$'}SOCKET" kill-session -t "${'$'}SESSION" || true
  tmux -S "${'$'}SOCKET" new -d -s "${'$'}SESSION" "${'$'}RESTART_CMD"
  echo "${'$'}HASH|${'$'}NOW_EPOCH|$((LAST_RESTARTS + 1))" > "${'$'}STATE_FILE"
  echo "[heartbeat] restarted stalled session ${'$'}SESSION (window=${'$'}WINDOW_MINS min)"
  exit 0
fi

echo "${'$'}HASH|0|${'$'}LAST_RESTARTS" > "${'$'}STATE_FILE"
echo "[heartbeat] healthy session ${'$'}SESSION"
`,
  );

  const wakeSessionPath = path.join(scriptsDir, 'wake-coding-session.sh');
  writeExecutable(
    wakeSessionPath,
    `#!/usr/bin/env bash
set -euo pipefail

MESSAGE="${'$'}{1:-Coding session requires attention}"
if command -v openclaw >/dev/null 2>&1; then
  openclaw system event --text "${'$'}MESSAGE" --mode now || true
elif command -v clawdbot >/dev/null 2>&1; then
  clawdbot system event --text "${'$'}MESSAGE" --mode now || true
else
  echo "[wake-coding-session] ${'$'}MESSAGE"
fi
`,
  );

  const nightlyExtractPath = path.join(scriptsDir, 'nightly-memory-extract.sh');
  writeExecutable(
    nightlyExtractPath,
    `#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${'$'}{1:-$(pwd)}"
TODAY="$(date +%F)"
TARGET="${'$'}WORKSPACE/memory/${'$'}TODAY.md"
mkdir -p "$(dirname "${'$'}TARGET")"

{
  echo "# ${'$'}TODAY"
  echo
  echo "## Nightly Extraction"
  echo "- Review today's conversations and extract durable facts."
  echo "- Update MEMORY.md with stable preferences, rules, and trust boundaries."
  echo "- Keep transient chatter out of long-term memory."
} >> "${'$'}TARGET"

echo "[nightly-memory] updated ${'$'}TARGET"
`,
  );

  return {
    files: [
      createWorktreePath,
      ralphLoopPath,
      verifyChecklistPath,
      healthCheckPath,
      notifyPath,
      heartbeatPath,
      wakeSessionPath,
      nightlyExtractPath,
    ],
  };
}
