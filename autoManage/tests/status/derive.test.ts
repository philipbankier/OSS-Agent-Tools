import { describe, expect, it } from 'vitest';
import { deriveStatus } from '../../src/status/derive';
import type { TraceEvent } from '../../src/contracts/trace';

function event(partial: Partial<TraceEvent>): TraceEvent {
  return {
    schema_version: 'trace_event.v1',
    run_id: 'run-1',
    timestamp: '2026-02-27T00:00:00.000Z',
    actor: 'agent',
    event_type: 'plan',
    ...partial,
  };
}

describe('deriveStatus', () => {
  it('prioritizes error status', () => {
    const derived = deriveStatus([
      event({ event_type: 'tool_call', timestamp: '2026-02-27T00:00:01.000Z', tool_ref: 'mcp.fs' }),
      event({ event_type: 'error', timestamp: '2026-02-27T00:00:02.000Z', error: 'boom' }),
    ]);

    expect(derived.status).toBe('error');
    expect(derived.errorCount).toBe(1);
  });

  it('marks blocked when approvals are pending', () => {
    const derived = deriveStatus([
      event({ event_type: 'approval_requested', timestamp: '2026-02-27T00:00:01.000Z' }),
    ]);

    expect(derived.status).toBe('blocked');
    expect(derived.approvalsPending).toBe(1);
  });

  it('marks idle when stale', () => {
    const derived = deriveStatus(
      [event({ event_type: 'tool_call', timestamp: '2026-02-27T00:00:00.000Z', tool_ref: 'mcp.http' })],
      new Date('2026-02-27T00:05:00.000Z').getTime(),
      60_000,
    );

    expect(derived.status).toBe('idle');
  });

  it('marks completed when session_end is latest event', () => {
    const derived = deriveStatus([
      event({ event_type: 'plan', timestamp: '2026-02-27T00:00:00.000Z' }),
      event({ event_type: 'session_end', timestamp: '2026-02-27T00:00:10.000Z' }),
    ]);

    expect(derived.status).toBe('completed');
  });
});
