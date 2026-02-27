import React from 'react';
import type { AgentSnapshot } from '../ingest/types';

function statusTone(status: AgentSnapshot['status']): string {
  switch (status) {
    case 'running':
      return 'border-emerald-500/50 bg-emerald-500/10';
    case 'blocked':
      return 'border-amber-500/50 bg-amber-500/10';
    case 'error':
      return 'border-rose-500/50 bg-rose-500/10';
    case 'completed':
      return 'border-sky-500/50 bg-sky-500/10';
    default:
      return 'border-slate-700 bg-slate-900/50';
  }
}

export function AgentCard({ agent, selected, onSelect }: {
  agent: AgentSnapshot;
  selected: boolean;
  onSelect: (agentId: string) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      data-status={agent.status}
      onClick={() => onSelect(agent.agentId)}
      className={`w-full rounded-xl border p-4 text-left transition ${statusTone(agent.status)} ${selected ? 'ring-2 ring-slate-300/40' : ''}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{agent.displayName}</h3>
        <span className="text-xs uppercase tracking-wide text-slate-300">{agent.status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-300">{agent.currentTask ?? 'No active task'}</p>
      <div className="mt-3 flex gap-3 text-xs text-slate-400">
        <span>errors: {agent.errorCount}</span>
        <span>approvals: {agent.approvalsPending}</span>
        <span>tools: {agent.toolCalls}</span>
      </div>
    </button>
  );
}
