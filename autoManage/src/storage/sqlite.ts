import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { AgentSnapshot, StoredEvent } from '../ingest/types';
import { BASE_SCHEMA_SQL } from './migrations';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const SQL_JS_DIST_DIR = join(MODULE_DIR, '..', '..', 'node_modules', 'sql.js', 'dist');

async function loadSqlJs(): Promise<SqlJsStatic> {
  return await initSqlJs({
    locateFile: (file) => join(SQL_JS_DIST_DIR, file),
  });
}

export interface SQLiteStoreOptions {
  dbPath?: string;
  retentionPerAgent?: number;
}

export class SQLiteStore {
  private constructor(
    private readonly db: Database,
    private readonly options: Required<SQLiteStoreOptions>,
  ) {}

  static async create(options: SQLiteStoreOptions = {}): Promise<SQLiteStore> {
    const resolved: Required<SQLiteStoreOptions> = {
      dbPath: options.dbPath ?? '',
      retentionPerAgent: options.retentionPerAgent ?? 1000,
    };

    const SQL = await loadSqlJs();

    let db: Database;
    if (resolved.dbPath && existsSync(resolved.dbPath)) {
      db = new SQL.Database(readFileSync(resolved.dbPath));
    } else {
      db = new SQL.Database();
    }

    db.run(BASE_SCHEMA_SQL);
    return new SQLiteStore(db, resolved);
  }

  upsertAgent(snapshot: AgentSnapshot): void {
    const now = new Date().toISOString();
    this.db.run(
      `
      INSERT INTO agents (
        agent_id,
        workspace_path,
        display_name,
        status,
        current_task,
        last_event_at,
        error_count,
        approvals_pending,
        tool_calls,
        run_duration_ms,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET
        workspace_path = excluded.workspace_path,
        display_name = excluded.display_name,
        status = excluded.status,
        current_task = excluded.current_task,
        last_event_at = excluded.last_event_at,
        error_count = excluded.error_count,
        approvals_pending = excluded.approvals_pending,
        tool_calls = excluded.tool_calls,
        run_duration_ms = excluded.run_duration_ms,
        updated_at = excluded.updated_at
      `,
      [
        snapshot.agentId,
        snapshot.workspacePath,
        snapshot.displayName,
        snapshot.status,
        snapshot.currentTask,
        snapshot.lastEventAt,
        snapshot.errorCount,
        snapshot.approvalsPending,
        snapshot.toolCalls,
        snapshot.runDurationMs,
        now,
        now,
      ],
    );

    this.persist();
  }

  appendEvents(events: Array<Omit<StoredEvent, 'id'>>): void {
    const now = new Date().toISOString();
    const touchedAgents = new Set<string>();

    for (const event of events) {
      touchedAgents.add(event.agentId);
      this.db.run(
        `
        INSERT INTO recent_events (
          agent_id,
          run_id,
          event_type,
          timestamp,
          summary,
          raw_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          event.agentId,
          event.runId,
          event.eventType,
          event.timestamp,
          event.summary,
          JSON.stringify(event.rawEvent),
          now,
        ],
      );
    }

    for (const agentId of touchedAgents) {
      this.db.run(
        `
        DELETE FROM recent_events
        WHERE agent_id = ?
          AND id NOT IN (
            SELECT id
            FROM recent_events
            WHERE agent_id = ?
            ORDER BY id DESC
            LIMIT ?
          )
        `,
        [agentId, agentId, this.options.retentionPerAgent],
      );
    }

    this.persist();
  }

  listAgents(): AgentSnapshot[] {
    const stmt = this.db.prepare(
      `
      SELECT
        agent_id,
        workspace_path,
        display_name,
        status,
        current_task,
        last_event_at,
        error_count,
        approvals_pending,
        tool_calls,
        run_duration_ms
      FROM agents
      ORDER BY updated_at DESC
      `,
    );

    const rows: AgentSnapshot[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      rows.push({
        agentId: String(row.agent_id),
        workspacePath: String(row.workspace_path),
        displayName: String(row.display_name),
        status: String(row.status) as AgentSnapshot['status'],
        currentTask: row.current_task ? String(row.current_task) : null,
        lastEventAt: row.last_event_at ? String(row.last_event_at) : null,
        errorCount: Number(row.error_count),
        approvalsPending: Number(row.approvals_pending),
        toolCalls: Number(row.tool_calls),
        runDurationMs: Number(row.run_duration_ms),
      });
    }

    stmt.free();
    return rows;
  }

  listRecentEvents(agentId: string, limit = 100): StoredEvent[] {
    const stmt = this.db.prepare(
      `
      SELECT id, agent_id, run_id, event_type, timestamp, summary, raw_json
      FROM recent_events
      WHERE agent_id = ?
      ORDER BY id DESC
      LIMIT ?
      `,
      [agentId, limit],
    );

    const rows: StoredEvent[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      let rawEvent: unknown;
      try {
        rawEvent = JSON.parse(String(row.raw_json));
      } catch {
        rawEvent = null;
      }

      rows.push({
        id: Number(row.id),
        agentId: String(row.agent_id),
        runId: String(row.run_id),
        eventType: String(row.event_type),
        timestamp: String(row.timestamp),
        summary: row.summary ? String(row.summary) : null,
        rawEvent,
      });
    }

    stmt.free();
    return rows;
  }

  close(): void {
    this.persist();
    this.db.close();
  }

  private persist(): void {
    if (!this.options.dbPath) {
      return;
    }

    mkdirSync(dirname(this.options.dbPath), { recursive: true });
    const bytes = this.db.export();
    writeFileSync(this.options.dbPath, Buffer.from(bytes));
  }
}
