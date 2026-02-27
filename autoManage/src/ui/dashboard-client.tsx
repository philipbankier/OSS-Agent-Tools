'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import type { AgentSnapshot } from '../ingest/types';
import type { StreamEventType, StreamEventMap } from '../runtime/events';
import { AgentCard } from './agent-card';
import { applyStreamEvent, createDashboardState, type DashboardEvent } from './state';

interface AgentsResponse {
  agents: AgentSnapshot[];
}

interface AgentEventsResponse {
  agentId: string;
  events: Array<{
    runId: string;
    eventType: string;
    timestamp: string;
    summary: string | null;
  }>;
}

function parseStreamPayload<T extends StreamEventType>(eventType: T, raw: string): StreamEventMap[T] | null {
  try {
    return JSON.parse(raw) as StreamEventMap[T];
  } catch {
    return null;
  }
}

function dashboardReducer(
  state: ReturnType<typeof createDashboardState>,
  action:
    | { type: 'hydrate_agents'; agents: AgentSnapshot[] }
    | { type: 'hydrate_events'; agentId: string; events: DashboardEvent[] }
    | { type: 'stream_event'; eventType: StreamEventType; payload: StreamEventMap[StreamEventType] },
): ReturnType<typeof createDashboardState> {
  if (action.type === 'hydrate_agents') {
    return {
      ...state,
      agents: action.agents,
    };
  }

  if (action.type === 'hydrate_events') {
    return {
      ...state,
      eventsByAgent: {
        ...state.eventsByAgent,
        [action.agentId]: action.events,
      },
    };
  }

  return applyStreamEvent(state, action.eventType, action.payload as never);
}

export function DashboardClient(): JSX.Element {
  const [state, dispatch] = useReducer(dashboardReducer, undefined, () => createDashboardState());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const response = await fetch('/api/agents', { cache: 'no-store' });
      const json = (await response.json()) as AgentsResponse;
      if (!cancelled) {
        dispatch({ type: 'hydrate_agents', agents: json.agents });
        if (!selectedAgentId && json.agents.length > 0) {
          setSelectedAgentId(json.agents[0]?.agentId ?? null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  useEffect(() => {
    if (!selectedAgentId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const encoded = encodeURIComponent(selectedAgentId);
      const response = await fetch(`/api/agents/${encoded}/events?limit=100`, { cache: 'no-store' });
      const json = (await response.json()) as AgentEventsResponse;
      if (!cancelled) {
        dispatch({
          type: 'hydrate_events',
          agentId: selectedAgentId,
          events: json.events,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  useEffect(() => {
    const stream = new EventSource('/api/stream');

    const handlers: Array<[StreamEventType, (event: MessageEvent<string>) => void]> = [
      ['agent_updated', (event) => {
        const payload = parseStreamPayload('agent_updated', event.data);
        if (payload) {
          dispatch({ type: 'stream_event', eventType: 'agent_updated', payload });
        }
      }],
      ['new_event', (event) => {
        const payload = parseStreamPayload('new_event', event.data);
        if (payload) {
          dispatch({ type: 'stream_event', eventType: 'new_event', payload });
        }
      }],
      ['alert', (event) => {
        const payload = parseStreamPayload('alert', event.data);
        if (payload) {
          dispatch({ type: 'stream_event', eventType: 'alert', payload });
        }
      }],
    ];

    for (const [eventType, handler] of handlers) {
      stream.addEventListener(eventType, handler as EventListener);
    }

    return () => {
      for (const [eventType, handler] of handlers) {
        stream.removeEventListener(eventType, handler as EventListener);
      }
      stream.close();
    };
  }, []);

  const selectedEvents = useMemo(
    () => (selectedAgentId ? state.eventsByAgent[selectedAgentId] ?? [] : []),
    [selectedAgentId, state.eventsByAgent],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-8">
      <header className="rounded-xl border border-slate-800 bg-panel p-6">
        <h1 className="text-2xl font-semibold">autoManage</h1>
        <p className="mt-2 text-slate-300">Local-first oversight for TasteKit traces.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-medium">Agents</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {state.agents.map((agent) => (
              <AgentCard
                key={agent.agentId}
                agent={agent}
                selected={selectedAgentId === agent.agentId}
                onSelect={setSelectedAgentId}
              />
            ))}
            {state.agents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                No agents observed yet. Set `AUTOMANAGE_TRACE_DIRS` and generate traces.
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-3">
          <h2 className="text-lg font-medium">Approval Queue (Read-only)</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            {state.agents.filter((agent) => agent.approvalsPending > 0).length === 0
              ? 'No pending approvals.'
              : state.agents
                  .filter((agent) => agent.approvalsPending > 0)
                  .map((agent) => `${agent.displayName}: ${agent.approvalsPending}`)
                  .join(' | ')}
          </div>

          <h2 className="text-lg font-medium">Alerts</h2>
          <ul className="space-y-2">
            {state.alerts.slice(0, 5).map((alert) => (
              <li key={alert.id} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm">
                <div className="font-medium">{alert.level.toUpperCase()}</div>
                <div className="text-slate-300">{alert.message}</div>
              </li>
            ))}
            {state.alerts.length === 0 ? (
              <li className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                No alerts yet.
              </li>
            ) : null}
          </ul>
        </aside>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium">Trace Viewer</h2>
        <p className="mb-3 mt-1 text-sm text-slate-400">Latest events for selected agent.</p>
        <ul className="space-y-2 text-sm">
          {selectedEvents.map((event, index) => (
            <li key={`${event.runId}-${event.timestamp}-${index}`} className="rounded border border-slate-800 p-2">
              <div className="font-mono text-xs text-slate-400">{event.timestamp}</div>
              <div className="font-medium">{event.eventType}</div>
              <div className="text-slate-300">{event.summary ?? 'No summary'}</div>
            </li>
          ))}
          {selectedEvents.length === 0 ? (
            <li className="text-slate-400">No events for selected agent.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
