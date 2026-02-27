import type { TraceEvent } from '../contracts/trace';

export type AgentStatus = 'idle' | 'running' | 'blocked' | 'error' | 'completed';

export interface ParserStats {
  totalLines: number;
  parsedEvents: number;
  malformedLines: number;
  invalidEvents: number;
  unknownSchemaVersion: number;
}

export interface AgentSnapshot {
  agentId: string;
  workspacePath: string;
  displayName: string;
  status: AgentStatus;
  currentTask: string | null;
  lastEventAt: string | null;
  errorCount: number;
  approvalsPending: number;
  toolCalls: number;
  runDurationMs: number;
}

export interface StoredEvent {
  id: number;
  agentId: string;
  runId: string;
  eventType: string;
  timestamp: string;
  summary: string | null;
  rawEvent: unknown;
}

export interface TraceBatchParseResult {
  events: TraceEvent[];
  stats: ParserStats;
}
