import { streamEventBus } from '../../../src/runtime/events';
import { formatSseEvent } from '../../../src/runtime/sse';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (eventName: 'ready' | 'agent_updated' | 'new_event' | 'alert', payload: unknown): void => {
        controller.enqueue(encoder.encode(formatSseEvent(eventName, payload)));
      };

      write('ready', {
        ok: true,
        connectedAt: new Date().toISOString(),
      });

      const unsubscribers = [
        streamEventBus.subscribe('agent_updated', (payload) => write('agent_updated', payload)),
        streamEventBus.subscribe('new_event', (payload) => write('new_event', payload)),
        streamEventBus.subscribe('alert', (payload) => write('alert', payload)),
      ];

      const heartbeat = setInterval(() => {
        write('ready', {
          ok: true,
          heartbeatAt: new Date().toISOString(),
        });
      }, 25_000);

      cleanup = (): void => {
        clearInterval(heartbeat);
        for (const unsubscribe of unsubscribers) {
          unsubscribe();
        }
      };
    },
    cancel() {
      cleanup?.();
      cleanup = null;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
