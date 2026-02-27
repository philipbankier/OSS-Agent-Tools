import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { IngestionService } from '../../src/ingest/service';
import { SQLiteStore } from '../../src/storage/sqlite';

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function traceLine(partial: Record<string, unknown>): string {
  return JSON.stringify({
    schema_version: 'trace_event.v1',
    run_id: 'run-1',
    timestamp: '2026-02-27T00:00:00.000Z',
    actor: 'agent',
    event_type: 'plan',
    ...partial,
  });
}

describe('IngestionService', () => {
  it('ingests traces from canonical and legacy workspace layouts', async () => {
    const root = mkdtempSync(join(tmpdir(), 'automanage-ingest-'));
    dirs.push(root);

    const canonicalWorkspace = join(root, 'canonical-workspace');
    const canonicalDir = join(canonicalWorkspace, '.tastekit', 'ops', 'traces');
    mkdirSync(canonicalDir, { recursive: true });
    writeFileSync(
      join(canonicalDir, 'run-a.trace.v1.jsonl'),
      `${traceLine({ run_id: 'run-a', event_type: 'tool_call', tool_ref: 'mcp.fs' })}\n`,
    );

    const legacyWorkspace = join(root, 'legacy-workspace');
    const legacyDir = join(legacyWorkspace, '.tastekit', 'traces');
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, 'run-b.trace.v1.jsonl'),
      `${traceLine({ run_id: 'run-b', event_type: 'approval_requested' })}\n`,
    );

    const store = await SQLiteStore.create({ retentionPerAgent: 1000 });
    const service = new IngestionService({
      store,
      now: () => new Date('2026-02-27T00:00:01.000Z').getTime(),
    });

    await service.ingestWorkspace(canonicalWorkspace);
    await service.ingestWorkspace(legacyWorkspace);

    const agents = service.listAgents();
    expect(agents).toHaveLength(2);
    expect(agents.find((agent) => agent.workspacePath === canonicalWorkspace)?.status).toBe('running');
    expect(agents.find((agent) => agent.workspacePath === legacyWorkspace)?.status).toBe('blocked');

    const health = service.getHealth();
    expect(health.parserStats.parsedEvents).toBe(2);

    store.close();
  });
});
