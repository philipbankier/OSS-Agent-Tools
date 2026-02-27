import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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

describe('SQLiteStore', () => {
  it('persists agent snapshots and events to disk', async () => {
    const root = mkdtempSync(join(tmpdir(), 'automanage-sqlite-'));
    dirs.push(root);

    const dbPath = join(root, 'db.sqlite');
    const store = await SQLiteStore.create({ dbPath, retentionPerAgent: 1000 });

    store.upsertAgent({
      agentId: 'agent-1',
      workspacePath: '/tmp/workspace',
      displayName: 'workspace',
      status: 'running',
      currentTask: 'task',
      lastEventAt: '2026-02-27T00:00:00.000Z',
      errorCount: 0,
      approvalsPending: 0,
      toolCalls: 1,
      runDurationMs: 1000,
    });

    store.appendEvents([
      {
        agentId: 'agent-1',
        runId: 'run-1',
        eventType: 'plan',
        timestamp: '2026-02-27T00:00:00.000Z',
        summary: 'plan',
        rawEvent: { schema_version: 'trace_event.v1' },
      },
    ]);

    store.close();

    const reopened = await SQLiteStore.create({ dbPath, retentionPerAgent: 1000 });
    expect(reopened.listAgents()).toHaveLength(1);
    expect(reopened.listRecentEvents('agent-1', 10)).toHaveLength(1);
    reopened.close();
  });

  it('enforces per-agent retention in recent_events', async () => {
    const store = await SQLiteStore.create({ retentionPerAgent: 2 });

    store.appendEvents([
      {
        agentId: 'agent-1',
        runId: 'run-1',
        eventType: 'plan',
        timestamp: '2026-02-27T00:00:00.000Z',
        summary: null,
        rawEvent: { n: 1 },
      },
      {
        agentId: 'agent-1',
        runId: 'run-1',
        eventType: 'think',
        timestamp: '2026-02-27T00:00:01.000Z',
        summary: null,
        rawEvent: { n: 2 },
      },
      {
        agentId: 'agent-1',
        runId: 'run-1',
        eventType: 'tool_call',
        timestamp: '2026-02-27T00:00:02.000Z',
        summary: null,
        rawEvent: { n: 3 },
      },
    ]);

    const kept = store.listRecentEvents('agent-1', 10);
    expect(kept).toHaveLength(2);
    expect(kept[0]?.eventType).toBe('tool_call');
    expect(kept[1]?.eventType).toBe('think');

    store.close();
  });
});
