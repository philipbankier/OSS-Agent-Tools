#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <scope> [base-branch]"
  exit 1
fi

SCOPE="$1"
BASE_BRANCH="${2:-main}"
BRANCH="codex/${SCOPE}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKTREE_ROOT="/Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools-worktrees"
WORKTREE_PATH="${WORKTREE_ROOT}/${SCOPE}"

mkdir -p "${WORKTREE_ROOT}"

if git -C "${REPO_ROOT}" show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  echo "Branch already exists: ${BRANCH}"
  echo "Creating worktree from existing branch at: ${WORKTREE_PATH}"
  git -C "${REPO_ROOT}" worktree add "${WORKTREE_PATH}" "${BRANCH}"
else
  echo "Creating branch ${BRANCH} from ${BASE_BRANCH}"
  git -C "${REPO_ROOT}" worktree add -b "${BRANCH}" "${WORKTREE_PATH}" "${BASE_BRANCH}"
fi

echo "Done"
echo "  Branch:   ${BRANCH}"
echo "  Worktree: ${WORKTREE_PATH}"
echo "  Base:     ${BASE_BRANCH}"
