import { describe, expect, it } from 'vitest';
import {
  TRACE_EVENT_SCHEMA_VERSION,
  hasExpectedTraceSchemaVersion,
  parseTraceEvent,
  parseTraceLine,
} from '../../src/contracts/trace';

describe('trace contract helpers', () => {
  it('parses a valid trace event payload', () => {
    const result = parseTraceEvent({
      schema_version: 'trace_event.v1',
      run_id: 'run-1',
      timestamp: '2026-02-27T00:00:00.000Z',
      actor: 'agent',
      event_type: 'plan',
      data: { goal: 'test' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.schema_version).toBe(TRACE_EVENT_SCHEMA_VERSION);
    }
  });

  it('rejects malformed JSONL lines', () => {
    const result = parseTraceLine('{bad json');
    expect(result.ok).toBe(false);
  });

  it('checks schema version guard', () => {
    expect(hasExpectedTraceSchemaVersion('trace_event.v1')).toBe(true);
    expect(hasExpectedTraceSchemaVersion('trace_event.v2')).toBe(false);
  });
});
