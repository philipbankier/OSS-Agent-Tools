#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "[contracts] running core contract conformance tests"
cd "$ROOT_DIR"

pnpm --filter @tastekit/core exec vitest run \
  utils/__tests__/contract-paths.test.ts \
  tracing/__tests__/compat.test.ts \
  schemas/__tests__/contract-conformance.test.ts

echo "[contracts] running adapters contract conformance tests"
pnpm --filter @tastekit/adapters exec vitest run \
  __tests__/claude-code-contracts.test.ts

echo "[contracts] running cli contract conformance tests"
pnpm --filter @tastekit/cli exec vitest run \
  tests/integration/mcp-contracts.test.ts \
  tests/integration/trust-contracts.test.ts \
  tests/integration/session-paths.test.ts

echo "[contracts] contract conformance passed"
