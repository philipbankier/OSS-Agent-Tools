import { describe, expect, it, vi } from 'vitest';
import { buildDefaultConfig } from '../src/config/schema.js';

const shellMocks = vi.hoisted(() => ({
  runShell: vi.fn(),
}));

vi.mock('../src/core/shell.js', () => ({
  runShell: shellMocks.runShell,
}));

import { setupCronJobs } from '../src/core/ops/cron.js';

describe('cron setup idempotency', () => {
  it('adds missing jobs and keeps existing jobs', async () => {
    shellMocks.runShell.mockReset();
    shellMocks.runShell
      .mockResolvedValueOnce({
        code: 0,
        stdout: JSON.stringify([{ name: 'quickclaw-nightly-extraction' }]),
        stderr: '',
        command: 'openclaw cron list --json',
      })
      .mockResolvedValue({
        code: 0,
        stdout: '',
        stderr: '',
        command: 'openclaw cron add',
      });

    const config = buildDefaultConfig();
    const results = await setupCronJobs('openclaw', config);

    expect(results.some((result) => result.name === 'quickclaw-nightly-extraction' && result.details === 'already exists')).toBe(true);
    expect(results.some((result) => result.name === 'quickclaw-coding-heartbeat' && result.ok)).toBe(true);

    const addCalls = shellMocks.runShell.mock.calls.filter((call) => call[1]?.[0] === 'cron' && call[1]?.[1] === 'add');
    expect(addCalls.length).toBe(3);
  });

  it('is fully idempotent when all expected jobs already exist', async () => {
    shellMocks.runShell.mockReset();
    shellMocks.runShell.mockResolvedValueOnce({
      code: 0,
      stdout: JSON.stringify([
        { name: 'quickclaw-nightly-extraction' },
        { name: 'quickclaw-morning-priorities' },
        { name: 'quickclaw-ops-monitor' },
        { name: 'quickclaw-coding-heartbeat' },
      ]),
      stderr: '',
      command: 'openclaw cron list --json',
    });

    const results = await setupCronJobs('openclaw', buildDefaultConfig());

    expect(results.every((result) => result.details === 'already exists')).toBe(true);
    expect(shellMocks.runShell).toHaveBeenCalledTimes(1);
  });
});
