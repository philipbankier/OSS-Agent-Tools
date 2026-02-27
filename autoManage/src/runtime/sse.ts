import type { StreamEventType } from './events';

export function formatSseEvent(type: StreamEventType | 'ready', payload: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
}
