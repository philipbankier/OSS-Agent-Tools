# System Contract Map (TasteKit → AutoClaw → autoManage)

## Purpose
Single source of truth for integration contracts across the three-project system.

## Upstream Producer: TasteKit
Canonical workspace contract (`.tastekit/`):
- `self/constitution.v1.json`
- `self/guardrails.v1.yaml`
- `self/memory.v1.yaml`
- `knowledge/skills/manifest.v1.yaml`
- `knowledge/playbooks/*.v1.yaml`
- `ops/session.json`
- `ops/derivation.v1.yaml`
- `ops/traces/*.trace.v1.jsonl`
- `trust.v1.json`
- `bindings.v1.json`

## Consumer: AutoClaw
Consumes TasteKit artifacts and traces as input contracts.

- Must prefer canonical v2 paths.
- May read legacy paths for compatibility during development.
- Must treat trace parsing as runtime-tolerant and validation/conformance as CI-strict.

## Consumer: autoManage
Consumes trace and identity contracts for dashboarding and status derivation.

- Preferred trace watch path: `.tastekit/ops/traces/`
- Preferred identity source: `.tastekit/self/constitution.v1.json`
- Parser policy: tolerate unknown fields and future event payload extensions.

## Contract Discipline
- Runtime: tolerant consumers
- CI: strict conformance fixtures
- Schema versions: unchanged in Wave CH-1
