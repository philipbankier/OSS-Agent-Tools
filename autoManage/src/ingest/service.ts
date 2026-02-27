import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { resolveTraceDirectory } from '../contracts/paths';
import { parseTraceEvent, type TraceEvent } from '../contracts/trace';
import { streamEventBus } from '../runtime/events';
import { deriveStatus } from '../status/derive';
import type { SQLiteStore } from '../storage/sqlite';
import { parseTraceLines } from './parser';
import type { AgentSnapshot, ParserStats, StoredEvent } from './types';
import { TraceWatcher } from './watcher';

function summarizeEvent(event: TraceEvent): string {
  if (event.event_type === 'error' && event.error) {
    return event.error;
  }
  if (event.event_type === 'tool_call' && event.tool_ref) {
    return `tool_call:${event.tool_ref}`;
  }
  if (event.event_type === 'approval_requested') {
    return 'approval requested';
  }
  return event.event_type;
}

function extractWorkspaceFromTracePath(filePath: string): string {
  const marker = `${sep}.tastekit${sep}`;
  const markerIndex = filePath.indexOf(marker);

  if (markerIndex === -1) {
    return dirname(dirname(filePath));
  }

  return filePath.slice(0, markerIndex);
}

function toStoredEvents(agentId: string, events: TraceEvent[]): Array<Omit<StoredEvent, 'id'>> {
  return events.map((event) => ({
    agentId,
    runId: event.run_id,
    eventType: event.event_type,
    timestamp: event.timestamp,
    summary: summarizeEvent(event),
    rawEvent: event,
  }));
}

function mergeParserStats(target: ParserStats, update: ParserStats): void {
  target.totalLines += update.totalLines;
  target.parsedEvents += update.parsedEvents;
  target.malformedLines += update.malformedLines;
  target.invalidEvents += update.invalidEvents;
  target.unknownSchemaVersion += update.unknownSchemaVersion;
}

export interface IngestionServiceOptions {
  store: SQLiteStore;
  stalenessMs?: number;
  now?: () => number;
}

export class IngestionService {
  private readonly stalenessMs: number;
  private readonly now: () => number;
  private readonly cumulativeParserStats: ParserStats = {
    totalLines: 0,
    parsedEvents: 0,
    malformedLines: 0,
    invalidEvents: 0,
    unknownSchemaVersion: 0,
  };
  private readonly watcher: TraceWatcher;
  private watchedDirectories: string[] = [];

  constructor(private readonly options: IngestionServiceOptions) {
    this.stalenessMs = options.stalenessMs ?? 60_000;
    this.now = options.now ?? (() => Date.now());
    this.watcher = new TraceWatcher({
      onLines: async (filePath, lines) => {
        await this.ingestLines(filePath, lines);
      },
    });
  }

  async startWatchingDirectories(traceDirectories: string[]): Promise<void> {
    this.watchedDirectories = traceDirectories;
    await this.watcher.start(traceDirectories);
  }

  async stopWatching(): Promise<void> {
    await this.watcher.close();
    this.watchedDirectories = [];
  }

  async ingestWorkspace(workspacePath: string): Promise<void> {
    const traceDirectory = resolveTraceDirectory(workspacePath);

    if (!existsSync(traceDirectory)) {
      return;
    }

    const files = readdirSync(traceDirectory)
      .filter((name) => name.endsWith('.jsonl'))
      .sort();

    for (const name of files) {
      const filePath = join(traceDirectory, name);
      const lines = readFileSync(filePath, 'utf-8').split('\n');
      await this.ingestLines(filePath, lines);
    }
  }

  async ingestLines(filePath: string, lines: string[]): Promise<void> {
    const parsed = parseTraceLines(lines);
    mergeParserStats(this.cumulativeParserStats, parsed.stats);

    if (parsed.events.length === 0) {
      return;
    }

    const workspacePath = extractWorkspaceFromTracePath(filePath);
    const agentId = workspacePath;
    const displayName = basename(workspacePath) || workspacePath;

    const existingRawEvents = this.options.store
      .listRecentEvents(agentId, 1000)
      .map((event) => parseTraceEvent(event.rawEvent))
      .filter((result): result is { ok: true; event: TraceEvent } => result.ok)
      .map((result) => result.event)
      .reverse();

    const combined = [...existingRawEvents, ...parsed.events];
    const derived = deriveStatus(combined, this.now(), this.stalenessMs);

    const snapshot: AgentSnapshot = {
      agentId,
      workspacePath,
      displayName,
      status: derived.status,
      currentTask: derived.currentTask,
      lastEventAt: derived.lastEventAt,
      errorCount: derived.errorCount,
      approvalsPending: derived.approvalsPending,
      toolCalls: derived.toolCalls,
      runDurationMs: derived.runDurationMs,
    };

    this.options.store.upsertAgent(snapshot);
    this.options.store.appendEvents(toStoredEvents(agentId, parsed.events));

    streamEventBus.publish('agent_updated', { agent: snapshot });
    for (const event of parsed.events) {
      streamEventBus.publish('new_event', {
        agentId,
        event: {
          runId: event.run_id,
          eventType: event.event_type,
          timestamp: event.timestamp,
          summary: summarizeEvent(event),
        },
      });
    }

    if (snapshot.status === 'blocked' || snapshot.status === 'error') {
      streamEventBus.publish('alert', {
        id: `${agentId}-${Date.now()}-${snapshot.status}`,
        level: snapshot.status === 'error' ? 'error' : 'warning',
        message:
          snapshot.status === 'error'
            ? `Agent ${snapshot.displayName} reported an error.`
            : `Agent ${snapshot.displayName} is waiting on approval.`,
        agentId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  listAgents(): AgentSnapshot[] {
    return this.options.store.listAgents();
  }

  listAgentEvents(agentId: string, limit = 100): StoredEvent[] {
    return this.options.store.listRecentEvents(agentId, limit);
  }

  getHealth(): {
    ok: true;
    parserStats: ParserStats;
    watchedDirectories: string[];
    stalenessMs: number;
  } {
    return {
      ok: true,
      parserStats: { ...this.cumulativeParserStats },
      watchedDirectories: [...this.watchedDirectories],
      stalenessMs: this.stalenessMs,
    };
  }
}
