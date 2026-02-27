import { TraceEventSchema, type TraceEvent } from '@tastekit/core/schemas';

export const TRACE_EVENT_SCHEMA_VERSION = 'trace_event.v1' as const;

export type { TraceEvent };

export function parseTraceEvent(payload: unknown):
  | { ok: true; event: TraceEvent }
  | { ok: false; error: string } {
  const parsed = TraceEventSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => issue.message).join('; '),
    };
  }

  return { ok: true, event: parsed.data };
}

export function parseTraceLine(line: string):
  | { ok: true; event: TraceEvent }
  | { ok: false; error: string } {
  try {
    const decoded = JSON.parse(line) as unknown;
    return parseTraceEvent(decoded);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON line',
    };
  }
}

export function hasExpectedTraceSchemaVersion(value: unknown): value is typeof TRACE_EVENT_SCHEMA_VERSION {
  return value === TRACE_EVENT_SCHEMA_VERSION;
}
