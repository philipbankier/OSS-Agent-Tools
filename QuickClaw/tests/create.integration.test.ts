import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultConfig } from '../src/config/schema.js';

const preflightMocks = vi.hoisted(() => ({
  runPreflight: vi.fn(),
  assertPreflight: vi.fn(),
  missingBinaries: vi.fn(),
  autoInstallMissingBinaries: vi.fn(),
}));

vi.mock('../src/core/preflight.js', () => ({
  runPreflight: preflightMocks.runPreflight,
  assertPreflight: preflightMocks.assertPreflight,
  missingBinaries: preflightMocks.missingBinaries,
  autoInstallMissingBinaries: preflightMocks.autoInstallMissingBinaries,
}));

async function runCreate(args: string[]): Promise<void> {
  const { createCommand } = await import('../src/commands/create.js');
  const command = createCommand();
  await command.parseAsync(args, { from: 'user' });
}

describe('quickclaw create integration (mocked preflight)', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(os.tmpdir(), 'quickclaw-create-test-'));
    preflightMocks.runPreflight.mockReset();
    preflightMocks.assertPreflight.mockReset();
    preflightMocks.missingBinaries.mockReset();
    preflightMocks.autoInstallMissingBinaries.mockReset();
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('preview writes plan report but does not materialize workspace docs', async () => {
    const workspace = path.join(tempRoot, 'workspace');
    const config = buildDefaultConfig({
      project: {
        agentName: 'Preview Agent',
        workspace,
        timezone: 'America/New_York',
      },
    });
    const configPath = path.join(tempRoot, 'quickclaw.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    preflightMocks.runPreflight.mockResolvedValue({
      openclawBinary: 'openclaw',
      checks: [{ name: 'node_version', ok: true }],
    });
    preflightMocks.missingBinaries.mockReturnValue([]);

    await runCreate(['--config', configPath, '--preview']);

    expect(existsSync(path.join(workspace, '.quickclaw', 'plan-report.v1.json'))).toBe(true);
    expect(existsSync(path.join(workspace, 'AGENTS.md'))).toBe(false);
    expect(preflightMocks.autoInstallMissingBinaries).not.toHaveBeenCalled();
  });

  it('runs auto-install when enabled and binaries are missing', async () => {
    const workspace = path.join(tempRoot, 'workspace');
    const config = buildDefaultConfig({
      project: {
        agentName: 'Auto Install Agent',
        workspace,
        timezone: 'America/New_York',
      },
      automation: {
        autoInstallMissingCli: true,
      },
    });
    const configPath = path.join(tempRoot, 'quickclaw.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    preflightMocks.runPreflight
      .mockResolvedValueOnce({
        openclawBinary: null,
        checks: [{ name: 'binary_tastekit', ok: false }],
      })
      .mockResolvedValueOnce({
        openclawBinary: 'openclaw',
        checks: [{ name: 'binary_tastekit', ok: true }],
      });
    preflightMocks.missingBinaries.mockReturnValue(['tastekit']);
    preflightMocks.autoInstallMissingBinaries.mockResolvedValue({
      attempted: ['tastekit'],
      installed: ['tastekit'],
      failed: [],
    });

    await runCreate(['--config', configPath, '--preview', '--json']);

    expect(preflightMocks.runPreflight).toHaveBeenCalledTimes(2);
    expect(preflightMocks.autoInstallMissingBinaries).toHaveBeenCalledTimes(1);
  });

  it('fails hard with explicit diagnostics when required full-ops secrets are missing', async () => {
    const workspace = path.join(tempRoot, 'workspace');
    const config = buildDefaultConfig({
      project: {
        agentName: 'Failure Agent',
        workspace,
        timezone: 'America/New_York',
      },
    });
    const configPath = path.join(tempRoot, 'quickclaw.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    preflightMocks.runPreflight.mockResolvedValue({
      openclawBinary: 'openclaw',
      checks: [{ name: 'secret_OPENAI_API_KEY', ok: false, details: 'OPENAI_API_KEY missing' }],
    });
    preflightMocks.missingBinaries.mockReturnValue([]);
    preflightMocks.assertPreflight.mockImplementation(() => {
      throw new Error('Preflight failed:\nsecret_OPENAI_API_KEY: OPENAI_API_KEY missing');
    });

    await expect(runCreate(['--config', configPath])).rejects.toThrow('OPENAI_API_KEY missing');
  });
});
