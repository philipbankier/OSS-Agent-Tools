import { EventEmitter } from 'node:events';
import type { AgentSnapshot } from '../ingest/types';

export type StreamEventType = 'agent_updated' | 'new_event' | 'alert';

export interface StreamEventMap {
  agent_updated: {
    agent: AgentSnapshot;
  };
  new_event: {
    agentId: string;
    event: {
      runId: string;
      eventType: string;
      timestamp: string;
      summary: string | null;
    };
  };
  alert: {
    id: string;
    level: 'warning' | 'error';
    message: string;
    agentId?: string;
    createdAt: string;
  };
}

class StreamEventBus {
  private readonly emitter = new EventEmitter();

  publish<T extends StreamEventType>(type: T, payload: StreamEventMap[T]): void {
    this.emitter.emit(type, payload);
  }

  subscribe<T extends StreamEventType>(
    type: T,
    callback: (payload: StreamEventMap[T]) => void,
  ): () => void {
    this.emitter.on(type, callback);
    return () => {
      this.emitter.off(type, callback);
    };
  }
}

export const streamEventBus = new StreamEventBus();
