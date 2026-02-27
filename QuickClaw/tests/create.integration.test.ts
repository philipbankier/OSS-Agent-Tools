import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultConfig } from '../src/config/schema.js';
import type { GeneratedDocuments } from '../src/core/templates.js';

const preflightMocks = vi.hoisted(() => ({
  runPreflight: vi.fn(),
  assertPreflight: vi.fn(),
  missingBinaries: vi.fn(),
  autoInstallMissingBinaries: vi.fn(),
}));

const onboardMocks = vi.hoisted(() => ({
  runOpenClawOnboard: vi.fn(),
}));

const templatesMocks = vi.hoisted(() => ({
  generateDocuments: vi.fn(),
  generateDeterministicDocuments: vi.fn(),
}));

const codingMocks = vi.hoisted(() => ({
  setupCodingOps: vi.fn(),
}));

const hooksMocks = vi.hoisted(() => ({
  setupHooks: vi.fn(),
}));

const cronMocks = vi.hoisted(() => ({
  setupCronJobs: vi.fn(),
}));

const sentryMocks = vi.hoisted(() => ({
  setupSentryPipeline: vi.fn(),
}));

const tastekitMocks = vi.hoisted(() => ({
  runTasteKitBridge: vi.fn(),
}));

vi.mock('../src/core/preflight.js', () => ({
  runPreflight: preflightMocks.runPreflight,
  assertPreflight: preflightMocks.assertPreflight,
  missingBinaries: preflightMocks.missingBinaries,
  autoInstallMissingBinaries: preflightMocks.autoInstallMissingBinaries,
}));

vi.mock('../src/core/openclaw-onboard.js', () => ({
  runOpenClawOnboard: onboardMocks.runOpenClawOnboard,
}));

vi.mock('../src/core/templates.js', () => ({
  generateDocuments: templatesMocks.generateDocuments,
  generateDeterministicDocuments: templatesMocks.generateDeterministicDocuments,
}));

vi.mock('../src/core/ops/coding.js', () => ({
  setupCodingOps: codingMocks.setupCodingOps,
}));

vi.mock('../src/core/ops/hooks.js', () => ({
  setupHooks: hooksMocks.setupHooks,
}));

vi.mock('../src/core/ops/cron.js', () => ({
  setupCronJobs: cronMocks.setupCronJobs,
}));

vi.mock('../src/core/ops/sentry.js', () => ({
  setupSentryPipeline: sentryMocks.setupSentryPipeline,
}));

vi.mock('../src/core/tastekit-bridge.js', () => ({
  runTasteKitBridge: tastekitMocks.runTasteKitBridge,
}));

async function runCreate(args: string[]): Promise<void> {
  const { createCommand } = await import('../src/commands/create.js');
  const command = createCommand();
  await command.parseAsync(args, { from: 'user' });
}

function docsFixture(tag: string): GeneratedDocuments {
  return {
    'AGENTS.md': `# AGENTS.md\n${tag}\n`,
    'SOUL.md': `# SOUL.md\n${tag}\n`,
    'IDENTITY.md': `# IDENTITY.md\n${tag}\n`,
    'USER.md': `# USER.md\n${tag}\n`,
    'MEMORY.md': `# MEMORY.md\n${tag}\n`,
    'HEARTBEAT.md': `# HEARTBEAT.md\n${tag}\n`,
    'memory-seed': `# Memory Seed\n${tag}\n`,
    'ops/coding-policy.md': `# Coding Policy\n${tag}\n`,
    'memory/README.md': `# Memory Architecture\n${tag}\n`,
    'ops/safety/trust-ladder.md': `# Trust Ladder\n${tag}\n`,
    'ops/safety/approval-queue.md': `# Approval Queue\n${tag}\n`,
    'ops/sentry/triage-policy.md': `# Sentry Triage\n${tag}\n`,
    'ops/sentry/staging-vs-production.md': `# Sentry Environment\n${tag}\n`,
  };
}

describe('quickclaw create integration (mocked preflight)', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(os.tmpdir(), 'quickclaw-create-test-'));
    preflightMocks.runPreflight.mockReset();
    preflightMocks.assertPreflight.mockReset();
    preflightMocks.missingBinaries.mockReset();
    preflightMocks.autoInstallMissingBinaries.mockReset();
    onboardMocks.runOpenClawOnboard.mockReset();
    templatesMocks.generateDocuments.mockReset();
    templatesMocks.generateDeterministicDocuments.mockReset();
    codingMocks.setupCodingOps.mockReset();
    hooksMocks.setupHooks.mockReset();
    cronMocks.setupCronJobs.mockReset();
    sentryMocks.setupSentryPipeline.mockReset();
    tastekitMocks.runTasteKitBridge.mockReset();

    preflightMocks.assertPreflight.mockImplementation(() => {});
    preflightMocks.missingBinaries.mockReturnValue([]);
    preflightMocks.autoInstallMissingBinaries.mockResolvedValue({
      attempted: [],
      installed: [],
      failed: [],
    });
    onboardMocks.runOpenClawOnboard.mockResolvedValue('onboard ok');
    templatesMocks.generateDocuments.mockResolvedValue(docsFixture('apply-docs'));
    templatesMocks.generateDeterministicDocuments.mockReturnValue(docsFixture('preview-docs'));
    codingMocks.setupCodingOps.mockReturnValue({
      files: ['/tmp/ops/scripts/create-worktree.sh'],
    });
    hooksMocks.setupHooks.mockResolvedValue([
      { hook: 'session-memory', ok: true, details: 'enabled' },
      { hook: 'command-logger', ok: true, details: 'enabled' },
    ]);
    cronMocks.setupCronJobs.mockResolvedValue([
      { name: 'quickclaw-nightly-extraction', ok: true, details: 'created' },
      { name: 'quickclaw-morning-priorities', ok: true, details: 'created' },
    ]);
    sentryMocks.setupSentryPipeline.mockResolvedValue({
      configPath: '/tmp/openclaw.json',
      transformPath: '/tmp/hook-transform.js',
      sentryApiValidated: true,
      alertRuleConfigured: true,
      webhookSmokeTest: true,
      globalConfigWriteBlocked: false,
      policyWarnings: [],
      details: ['sentry ok'],
    });
    tastekitMocks.runTasteKitBridge.mockResolvedValue({
      ok: true,
      details: 'bridge ok',
    });
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it('preview writes plan report but does not materialize workspace docs', async () => {
    const workspace = path.join(tempRoot, 'workspace');
    const config = buildDefaultConfig({
      project: {
        agentName: 'Preview Agent',
        workspace,
        timezone: 'America/New_York',
      },
      automation: {
        autoInstallMissingCli: true,
      },
    });
    const configPath = path.join(tempRoot, 'quickclaw.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    preflightMocks.runPreflight.mockResolvedValue({
      openclawBinary: 'openclaw',
      checks: [{ name: 'node_version', ok: true }],
    });
    preflightMocks.missingBinaries.mockReturnValue([]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCreate(['--config', configPath, '--preview', '--json']);
    const output = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? '{}')) as {
      mode: string;
      hostMutationsSkipped: string[];
    };
    logSpy.mockRestore();

    expect(existsSync(path.join(workspace, '.quickclaw', 'plan-report.v1.json'))).toBe(true);
    expect(existsSync(path.join(workspace, 'AGENTS.md'))).toBe(false);
    expect(output.mode).toBe('preview');
    expect(output.hostMutationsSkipped).toContain('auto_install_cli');
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

    await runCreate(['--config', configPath, '--json']);

    expect(preflightMocks.runPreflight).toHaveBeenCalledTimes(2);
    expect(preflightMocks.autoInstallMissingBinaries).toHaveBeenCalledTimes(1);
  });

  it('executes full apply path and persists both plan/apply reports', async () => {
    const workspace = path.join(tempRoot, 'workspace');
    const config = buildDefaultConfig({
      project: {
        agentName: 'Apply Agent',
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

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCreate(['--config', configPath, '--json']);
    const output = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? '{}')) as {
      workspace: string;
      planReport: string;
      applyReport: string;
      success: boolean;
    };
    logSpy.mockRestore();

    expect(output.success).toBe(true);
    expect(output.workspace).toBe(path.resolve(workspace));
    expect(existsSync(output.planReport)).toBe(true);
    expect(existsSync(output.applyReport)).toBe(true);

    expect(preflightMocks.assertPreflight).toHaveBeenCalledTimes(1);
    expect(onboardMocks.runOpenClawOnboard).toHaveBeenCalledTimes(1);
    expect(templatesMocks.generateDocuments).toHaveBeenCalledTimes(1);
    expect(hooksMocks.setupHooks).toHaveBeenCalledWith('openclaw');
    expect(cronMocks.setupCronJobs).toHaveBeenCalledTimes(1);
    expect(tastekitMocks.runTasteKitBridge).toHaveBeenCalledWith(path.resolve(workspace));
  });

  it('marks sentry step failed when webhook smoke test is false', async () => {
    const workspace = path.join(tempRoot, 'workspace');
    const config = buildDefaultConfig({
      project: {
        agentName: 'Sentry Gate Agent',
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
    sentryMocks.setupSentryPipeline.mockResolvedValueOnce({
      configPath: '/tmp/openclaw.json',
      transformPath: '/tmp/hook-transform.js',
      sentryApiValidated: true,
      alertRuleConfigured: true,
      webhookSmokeTest: false,
      globalConfigWriteBlocked: false,
      policyWarnings: [],
      details: ['webhook smoke test failed'],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCreate(['--config', configPath, '--json']);
    const output = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? '{}')) as {
      success: boolean;
      actions: Array<{ id: string; ok: boolean; details?: string }>;
    };
    logSpy.mockRestore();

    expect(output.success).toBe(false);
    expect(output.actions.some((action) => action.id === 'sentry_pipeline' && action.ok === false)).toBe(true);
  });

  it('includes policyWarnings when global writes are blocked by config policy', async () => {
    const workspace = path.join(tempRoot, 'workspace');
    const config = buildDefaultConfig({
      project: {
        agentName: 'Policy Warning Agent',
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
    sentryMocks.setupSentryPipeline.mockResolvedValueOnce({
      patchPath: path.join(workspace, '.quickclaw', 'openclaw.config.patch.json'),
      transformPath: '/tmp/hook-transform.js',
      sentryApiValidated: true,
      alertRuleConfigured: true,
      webhookSmokeTest: false,
      globalConfigWriteBlocked: true,
      policyWarnings: ['Global OpenClaw config writes are disabled by policy.'],
      details: ['policy blocked'],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCreate(['--config', configPath, '--json']);
    const output = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? '{}')) as {
      success: boolean;
      policyWarnings: string[];
    };
    logSpy.mockRestore();

    expect(output.success).toBe(false);
    expect(output.policyWarnings).toContain('Global OpenClaw config writes are disabled by policy.');
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
