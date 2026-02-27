import type { TraceEvent } from '../contracts/trace';
import type { AgentStatus } from '../ingest/types';

export interface DerivedStatus {
  status: AgentStatus;
  currentTask: string | null;
  lastEventAt: string | null;
  errorCount: number;
  approvalsPending: number;
  toolCalls: number;
  runDurationMs: number;
}

function parseTimestamp(timestamp: string): number {
  return new Date(timestamp).getTime();
}

export function deriveStatus(events: TraceEvent[], nowMs = Date.now(), stalenessMs = 60_000): DerivedStatus {
  if (events.length === 0) {
    return {
      status: 'idle',
      currentTask: null,
      lastEventAt: null,
      errorCount: 0,
      approvalsPending: 0,
      toolCalls: 0,
      runDurationMs: 0,
    };
  }

  const ordered = [...events].sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));
  const firstEvent = ordered[0];
  const lastEvent = ordered[ordered.length - 1];

  const errorCount = ordered.filter((event) => event.event_type === 'error').length;
  const toolCalls = ordered.filter((event) => event.event_type === 'tool_call').length;

  const approvalRequests = ordered.filter((event) => event.event_type === 'approval_requested').length;
  const approvalResponses = ordered.filter((event) => event.event_type === 'approval_response').length;
  const approvalsPending = Math.max(0, approvalRequests - approvalResponses);

  let currentTask: string | null = null;
  const latestToolCall = [...ordered].reverse().find((event) => event.event_type === 'tool_call' && event.tool_ref);
  if (latestToolCall?.tool_ref) {
    currentTask = latestToolCall.tool_ref;
  }

  const latestPlan = [...ordered].reverse().find((event) => event.event_type === 'plan');
  const planTask = latestPlan?.data && typeof latestPlan.data === 'object'
    ? ((latestPlan.data as Record<string, unknown>).task ?? (latestPlan.data as Record<string, unknown>).goal)
    : null;

  if (typeof planTask === 'string' && planTask.trim().length > 0) {
    currentTask = planTask;
  }

  const lastTimestampMs = parseTimestamp(lastEvent.timestamp);
  const runDurationMs = Math.max(0, parseTimestamp(lastEvent.timestamp) - parseTimestamp(firstEvent.timestamp));

  let status: AgentStatus;
  if (lastEvent.event_type === 'error') {
    status = 'error';
  } else if (approvalsPending > 0) {
    status = 'blocked';
  } else if (lastEvent.event_type === 'session_end') {
    status = 'completed';
  } else if (nowMs - lastTimestampMs > stalenessMs) {
    status = 'idle';
  } else {
    status = 'running';
  }

  return {
    status,
    currentTask,
    lastEventAt: lastEvent.timestamp,
    errorCount,
    approvalsPending,
    toolCalls,
    runDurationMs,
  };
}
