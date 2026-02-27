# autoManage

Local-first management dashboard for TasteKit-powered agents.

## Scope for B1

- Watch TasteKit traces from `.tastekit/ops/traces/` (fallback `.tastekit/traces/`).
- Parse trace contracts from `@tastekit/core`.
- Derive agent status and expose dashboard APIs/UI.

## Current API (PR2)

- `GET /api/health`
- `GET /api/agents`
- `GET /api/agents/:agentId/events?limit=100`

Set `AUTOMANAGE_TRACE_DIRS` as a comma-separated directory list to enable file watching.

## Local checks

```bash
pnpm --dir ../TasteKit/tastekit --filter @tastekit/core build
pnpm install
pnpm build
pnpm test
```
