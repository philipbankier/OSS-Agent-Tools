import { describe, expect, it } from 'vitest';
import { GET } from '../../app/api/stream/route';
import { formatSseEvent } from '../../src/runtime/sse';

describe('SSE route contract', () => {
  it('formats SSE events correctly', () => {
    const encoded = formatSseEvent('agent_updated', { ok: true });
    expect(encoded).toBe('event: agent_updated\ndata: {"ok":true}\n\n');
  });

  it('returns text/event-stream with ready handshake event', async () => {
    const response = await GET();

    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const first = await reader!.read();
    expect(first.done).toBe(false);

    const text = new TextDecoder().decode(first.value);
    expect(text).toContain('event: ready');
    expect(text).toContain('"ok":true');

    await reader!.cancel();
  });
});
