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

  return {
    files: [createWorktreePath, ralphLoopPath, healthCheckPath, notifyPath],
  };
}
