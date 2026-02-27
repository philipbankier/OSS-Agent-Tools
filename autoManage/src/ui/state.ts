import type { AgentSnapshot } from '../ingest/types';
import type { StreamEventMap, StreamEventType } from '../runtime/events';

export interface DashboardEvent {
  runId: string;
  eventType: string;
  timestamp: string;
  summary: string | null;
}

export interface DashboardState {
  agents: AgentSnapshot[];
  eventsByAgent: Record<string, DashboardEvent[]>;
  alerts: StreamEventMap['alert'][];
}

export function createDashboardState(agents: AgentSnapshot[] = []): DashboardState {
  return {
    agents,
    eventsByAgent: {},
    alerts: [],
  };
}

export function applyStreamEvent<T extends StreamEventType>(
  state: DashboardState,
  eventType: T,
  payload: StreamEventMap[T],
): DashboardState {
  if (eventType === 'agent_updated') {
    const incoming = payload as StreamEventMap['agent_updated'];
    const nextAgents = [...state.agents];
    const existingIndex = nextAgents.findIndex((agent) => agent.agentId === incoming.agent.agentId);

    if (existingIndex >= 0) {
      nextAgents[existingIndex] = incoming.agent;
    } else {
      nextAgents.unshift(incoming.agent);
    }

    return {
      ...state,
      agents: nextAgents,
    };
  }

  if (eventType === 'new_event') {
    const incoming = payload as StreamEventMap['new_event'];
    const existing = state.eventsByAgent[incoming.agentId] ?? [];
    const nextEvents = [incoming.event, ...existing].slice(0, 200);

    return {
      ...state,
      eventsByAgent: {
        ...state.eventsByAgent,
        [incoming.agentId]: nextEvents,
      },
    };
  }

  const incomingAlert = payload as StreamEventMap['alert'];
  return {
    ...state,
    alerts: [incomingAlert, ...state.alerts].slice(0, 50),
  };
}
