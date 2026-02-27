import { describe, expect, it } from 'vitest';
import { parseTraceLines } from '../../src/ingest/parser';

describe('parseTraceLines', () => {
  it('parses valid lines and tolerates unknown data payload keys', () => {
    const result = parseTraceLines([
      JSON.stringify({
        schema_version: 'trace_event.v1',
        run_id: 'run-1',
        timestamp: '2026-02-27T00:00:00.000Z',
        actor: 'agent',
        event_type: 'plan',
        data: {
          task: 'Build feature',
          unexpected_nested: { keep: true },
        },
        unexpected_top_level: 'ignored-but-tolerated',
      }),
    ]);

    expect(result.events).toHaveLength(1);
    expect(result.stats.parsedEvents).toBe(1);
    expect(result.stats.invalidEvents).toBe(0);
  });

  it('counts malformed and unknown-version lines as skipped', () => {
    const result = parseTraceLines([
      '{bad json',
      JSON.stringify({
        schema_version: 'trace_event.v2',
        run_id: 'run-1',
        timestamp: '2026-02-27T00:00:00.000Z',
      }),
    ]);

    expect(result.events).toHaveLength(0);
    expect(result.stats.malformedLines).toBe(1);
    expect(result.stats.unknownSchemaVersion).toBe(1);
  });
});
