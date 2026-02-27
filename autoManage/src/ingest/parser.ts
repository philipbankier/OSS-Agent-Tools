import {
  hasExpectedTraceSchemaVersion,
  parseTraceEvent,
  type TraceEvent,
} from '../contracts/trace';
import type { TraceBatchParseResult } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseTraceLines(lines: string[]): TraceBatchParseResult {
  const events: TraceEvent[] = [];
  let malformedLines = 0;
  let invalidEvents = 0;
  let unknownSchemaVersion = 0;
  let totalLines = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    totalLines += 1;

    let decoded: unknown;
    try {
      decoded = JSON.parse(line);
    } catch {
      malformedLines += 1;
      continue;
    }

    if (!isObject(decoded) || !hasExpectedTraceSchemaVersion(decoded.schema_version)) {
      unknownSchemaVersion += 1;
      continue;
    }

    const parsed = parseTraceEvent(decoded);
    if (!parsed.ok) {
      invalidEvents += 1;
      continue;
    }

    events.push(parsed.event);
  }

  return {
    events,
    stats: {
      totalLines,
      parsedEvents: events.length,
      malformedLines,
      invalidEvents,
      unknownSchemaVersion,
    },
  };
}
