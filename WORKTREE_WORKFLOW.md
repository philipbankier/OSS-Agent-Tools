# Worktree Workflow

This repository uses a trunk + short-lived feature worktree model.

## Conventions
- Trunk branch: `claude/review-tastekit-openclaw-rWH3Y`
- Feature branch format: `codex/<scope>`
- Worktree root: `/Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools-worktrees/`

## Create a new worktree
Use the helper script:

```bash
./scripts/new-worktree.sh <scope>
```

Examples:

```bash
./scripts/new-worktree.sh stabilize-tastekit-phase25
./scripts/new-worktree.sh autoclaw-phase-4-2
```

This creates:
- Branch: `codex/<scope>`
- Worktree path: `/Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools-worktrees/<scope>`
- Base branch default: `claude/review-tastekit-openclaw-rWH3Y`

## Day-to-day usage
- Keep the trunk worktree clean.
- Do one scoped change per `codex/*` branch.
- Rebase feature branches onto the latest trunk before opening a PR.
- Remove finished worktrees after merge:

```bash
git worktree remove "/Users/philipbankier/Development/OSS/Taste OSS/OSS-Agent-Tools-worktrees/<scope>"
git branch -d "codex/<scope>"
```
