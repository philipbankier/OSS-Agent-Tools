import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '../../app/api/stream/route';
import { IngestionService } from '../../src/ingest/service';
import { streamEventBus, type StreamEventType, type StreamEventMap } from '../../src/runtime/events';
import { SQLiteStore } from '../../src/storage/sqlite';
import { applyStreamEvent, createDashboardState } from '../../src/ui/state';

function parseSseChunk(text: string): { eventType: string; payload: unknown } | null {
  const lines = text.trim().split('\n');
  const eventLine = lines.find((line) => line.startsWith('event: '));
  const dataLine = lines.find((line) => line.startsWith('data: '));

  if (!eventLine || !dataLine) {
    return null;
  }

  try {
    return {
      eventType: eventLine.slice('event: '.length).trim(),
      payload: JSON.parse(dataLine.slice('data: '.length)),
    };
  } catch {
    return null;
  }
}

async function readChunkWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs = 1000,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return await Promise.race([
    reader.read(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timed out waiting for SSE chunk')), timeoutMs);
    }),
  ]);
}

let store: SQLiteStore | null = null;

afterEach(() => {
  store?.close();
  store = null;
});

describe('ingestion -> db -> sse -> ui state integration', () => {
  it('propagates new trace lines through backend and stream events', async () => {
    store = await SQLiteStore.create({ retentionPerAgent: 1000 });
    const service = new IngestionService({
      store,
      now: () => new Date('2026-02-27T00:00:01.000Z').getTime(),
    });

    const response = await GET();
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    // Initial ready event
    await readChunkWithTimeout(reader!);

    await service.ingestLines('/tmp/demo/.tastekit/ops/traces/run.trace.v1.jsonl', [
      JSON.stringify({
        schema_version: 'trace_event.v1',
        run_id: 'run-123',
        timestamp: '2026-02-27T00:00:00.000Z',
        actor: 'agent',
        event_type: 'tool_call',
        tool_ref: 'mcp.fs',
      }),
    ]);

    const agents = service.listAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0]?.status).toBe('running');

    let dashboardState = createDashboardState();
    const seenEvents = new Set<string>();

    for (let i = 0; i < 4; i += 1) {
      const chunk = await readChunkWithTimeout(reader!);
      if (chunk.done || !chunk.value) {
        continue;
      }

      const parsed = parseSseChunk(new TextDecoder().decode(chunk.value));
      if (!parsed) {
        continue;
      }

      if (parsed.eventType === 'agent_updated' || parsed.eventType === 'new_event' || parsed.eventType === 'alert') {
        seenEvents.add(parsed.eventType);
        dashboardState = applyStreamEvent(
          dashboardState,
          parsed.eventType as StreamEventType,
          parsed.payload as StreamEventMap[StreamEventType],
        );
      }

      if (seenEvents.has('agent_updated') && seenEvents.has('new_event')) {
        break;
      }
    }

    expect(seenEvents.has('agent_updated')).toBe(true);
    expect(seenEvents.has('new_event')).toBe(true);
    expect(dashboardState.agents).toHaveLength(1);
    expect(dashboardState.eventsByAgent['/tmp/demo']?.length).toBe(1);

    await reader!.cancel();
  });
});
