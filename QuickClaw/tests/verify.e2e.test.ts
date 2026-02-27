import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultConfig } from '../src/config/schema.js';

const preflightMocks = vi.hoisted(() => ({
  runPreflight: vi.fn(),
}));

const shellMocks = vi.hoisted(() => ({
  runShell: vi.fn(),
}));

const hooksMocks = vi.hoisted(() => ({
  checkHooks: vi.fn(),
}));

const cronMocks = vi.hoisted(() => ({
  verifyCron: vi.fn(),
}));

const sentryMocks = vi.hoisted(() => ({
  verifySentryEndpoint: vi.fn(),
}));

vi.mock('../src/core/preflight.js', () => ({
  runPreflight: preflightMocks.runPreflight,
}));

vi.mock('../src/core/shell.js', () => ({
  runShell: shellMocks.runShell,
}));

vi.mock('../src/core/ops/hooks.js', () => ({
  checkHooks: hooksMocks.checkHooks,
}));

vi.mock('../src/core/ops/cron.js', () => ({
  verifyCron: cronMocks.verifyCron,
}));

vi.mock('../src/core/ops/sentry.js', () => ({
  verifySentryEndpoint: sentryMocks.verifySentryEndpoint,
}));

async function runVerify(args: string[]): Promise<void> {
  const { verifyCommand } = await import('../src/commands/verify.js');
  const command = verifyCommand();
  await command.parseAsync(args, { from: 'user' });
}

describe('quickclaw verify sandboxed e2e (mocked binaries)', () => {
  let tempRoot: string;
  let workspace: string;
  let configPath: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(os.tmpdir(), 'quickclaw-verify-e2e-'));
    workspace = path.join(tempRoot, 'workspace');
    process.exitCode = 0;

    const config = buildDefaultConfig({
      project: {
        agentName: 'Verify Agent',
        workspace,
        timezone: 'America/New_York',
      },
    });
    configPath = path.join(tempRoot, 'quickclaw.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    mkdirSync(path.join(workspace, 'memory'), { recursive: true });
    mkdirSync(path.join(workspace, 'ops', 'safety'), { recursive: true });
    mkdirSync(path.join(workspace, 'ops', 'scripts'), { recursive: true });
    mkdirSync(path.join(workspace, '.quickclaw'), { recursive: true });
    writeFileSync(path.join(workspace, 'memory', 'README.md'), '# memory\n', 'utf-8');
    writeFileSync(path.join(workspace, 'ops', 'safety', 'trust-ladder.md'), '# trust\n', 'utf-8');
    writeFileSync(path.join(workspace, 'ops', 'safety', 'approval-queue.md'), '# queue\n', 'utf-8');
    writeFileSync(path.join(workspace, 'ops', 'scripts', 'tmux-heartbeat.sh'), '#!/usr/bin/env bash\n', 'utf-8');
    writeFileSync(path.join(workspace, 'ops', 'scripts', 'wake-coding-session.sh'), '#!/usr/bin/env bash\n', 'utf-8');
    writeFileSync(path.join(workspace, '.quickclaw', 'openclaw.config.patch.json'), '{}\n', 'utf-8');

    preflightMocks.runPreflight.mockReset();
    shellMocks.runShell.mockReset();
    hooksMocks.checkHooks.mockReset();
    cronMocks.verifyCron.mockReset();
    sentryMocks.verifySentryEndpoint.mockReset();

    preflightMocks.runPreflight.mockResolvedValue({
      openclawBinary: 'openclaw',
      checks: [{ name: 'openclaw_binary', ok: true, details: 'Using openclaw' }],
    });
    shellMocks.runShell.mockResolvedValue({
      code: 1,
      stdout: '',
      stderr: 'health check failed: daemon not ready',
      command: 'openclaw health',
    });
    hooksMocks.checkHooks.mockResolvedValue({
      ok: false,
      stdout: '',
      stderr: "Hook 'session-memory' is disabled",
    });
    cronMocks.verifyCron.mockResolvedValue({
      ok: false,
      stdout: '',
      stderr: 'failed to list cron jobs: missing registry file',
    });
    sentryMocks.verifySentryEndpoint.mockResolvedValue({
      ok: false,
      details: 'Missing OPENCLAW_HOOKS_TOKEN',
    });
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it('reports healthy status when hooks/cron/runtime checks succeed', async () => {
    shellMocks.runShell.mockResolvedValueOnce({
      code: 0,
      stdout: 'healthy',
      stderr: '',
      command: 'openclaw health',
    });
    hooksMocks.checkHooks.mockResolvedValueOnce({
      ok: true,
      stdout: "Hook 'session-memory' is enabled",
      stderr: '',
    });
    cronMocks.verifyCron.mockResolvedValueOnce({
      ok: true,
      stdout: [
        'quickclaw-nightly-extraction:ok',
        'quickclaw-morning-priorities:ok',
        'quickclaw-ops-monitor:ok',
        'quickclaw-coding-heartbeat:ok',
      ].join('\\n'),
      stderr: '',
    });
    sentryMocks.verifySentryEndpoint.mockResolvedValueOnce({
      ok: true,
      details: 'Sentry endpoint reachable',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runVerify(['--config', configPath, '--workspace', workspace, '--json']);
    const output = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? '{}')) as {
      ok: boolean;
      checks: Array<{ name: string; ok: boolean }>;
      verificationReport: string;
    };
    logSpy.mockRestore();

    expect(output.ok).toBe(true);
    expect(existsSync(output.verificationReport)).toBe(true);
    expect(output.checks.some((check) => check.name === 'openclaw_health' && check.ok)).toBe(true);
    expect(output.checks.some((check) => check.name === 'openclaw_hooks_check' && check.ok)).toBe(true);
    expect(output.checks.some((check) => check.name === 'openclaw_cron_list' && check.ok)).toBe(true);
    expect(output.checks.some((check) => check.name === 'openclaw_cron_required_jobs' && check.ok)).toBe(true);
    expect(output.checks.some((check) => check.name === 'sentry_webhook_route_test' && check.ok)).toBe(true);
    expect(process.exitCode ?? 0).toBe(0);
  });

  it('reports actionable hook/cron/runtime failures in --json output and report file', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runVerify(['--config', configPath, '--workspace', workspace, '--json']);
    const output = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? '{}')) as {
      ok: boolean;
      verificationReport: string;
      checks: Array<{ name: string; ok: boolean; details?: string }>;
    };
    logSpy.mockRestore();

    expect(output.ok).toBe(false);
    expect(existsSync(output.verificationReport)).toBe(true);

    const health = output.checks.find((check) => check.name === 'openclaw_health');
    const hooks = output.checks.find((check) => check.name === 'openclaw_hooks_check');
    const cron = output.checks.find((check) => check.name === 'openclaw_cron_list');
    const sentry = output.checks.find((check) => check.name === 'sentry_webhook_route_test');
    expect(health?.ok).toBe(false);
    expect(health?.details).toContain('daemon not ready');
    expect(hooks?.ok).toBe(false);
    expect(hooks?.details).toContain('session-memory');
    expect(cron?.ok).toBe(false);
    expect(cron?.details).toContain('failed to list cron jobs');
    expect(sentry?.ok).toBe(false);
    expect(sentry?.details).toContain('OPENCLAW_HOOKS_TOKEN');

    const persisted = JSON.parse(readFileSync(output.verificationReport, 'utf-8')) as {
      checks: Array<{ name: string; ok: boolean; details?: string }>;
    };
    expect(persisted.checks.some((check) => check.name === 'openclaw_hooks_check' && check.ok === false)).toBe(true);
    expect(persisted.checks.some((check) => check.name === 'openclaw_cron_list' && check.ok === false)).toBe(true);
  });
});
