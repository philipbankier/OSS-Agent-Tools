// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AgentSnapshot } from '../../src/ingest/types';
import { AgentCard } from '../../src/ui/agent-card';

function baseAgent(status: AgentSnapshot['status']): AgentSnapshot {
  return {
    agentId: `agent-${status}`,
    workspacePath: `/tmp/${status}`,
    displayName: `Agent ${status}`,
    status,
    currentTask: 'Testing',
    lastEventAt: '2026-02-27T00:00:00.000Z',
    errorCount: 0,
    approvalsPending: 0,
    toolCalls: 1,
    runDurationMs: 100,
  };
}

describe('AgentCard', () => {
  it('renders all status variants', () => {
    const statuses: AgentSnapshot['status'][] = ['idle', 'running', 'blocked', 'error', 'completed'];

    for (const status of statuses) {
      const { unmount } = render(
        <AgentCard agent={baseAgent(status)} selected={false} onSelect={() => undefined} />,
      );

      const card = screen.getByRole('button');
      expect(card.getAttribute('data-status')).toBe(status);
      expect(screen.getByText(status)).toBeDefined();
      unmount();
    }
  });
});
