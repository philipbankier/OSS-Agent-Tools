import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultConfig, type QuickClawConfigV1 } from '../src/config/schema.js';
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
  };
}

function writeConfig(tempRoot: string, workspace: string, partial?: Partial<QuickClawConfigV1>): string {
  const config = buildDefaultConfig({
    project: {
      agentName: 'E2E Agent',
      workspace,
      timezone: 'America/New_York',
    },
    ...partial,
  });
  const configPath = path.join(tempRoot, 'quickclaw.config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return configPath;
}

describe('quickclaw create sandboxed e2e (mocked binaries)', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(os.tmpdir(), 'quickclaw-create-e2e-'));
    process.exitCode = 0;

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

    preflightMocks.runPreflight.mockResolvedValue({
      openclawBinary: 'openclaw',
      checks: [{ name: 'openclaw_binary', ok: true, details: 'Using openclaw' }],
    });
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

  it('provisions a fresh workspace and writes apply+plan reports', async () => {
    const workspace = path.join(tempRoot, 'fresh-workspace');
    const configPath = writeConfig(tempRoot, workspace);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCreate(['--config', configPath, '--json']);
    const jsonOutput = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0] ?? '{}')) as {
      workspace: string;
      planReport: string;
      applyReport: string;
      success: boolean;
    };
    logSpy.mockRestore();

    expect(jsonOutput.workspace).toBe(path.resolve(workspace));
    expect(jsonOutput.success).toBe(true);
    expect(existsSync(jsonOutput.planReport)).toBe(true);
    expect(existsSync(jsonOutput.applyReport)).toBe(true);
    expect(existsSync(path.join(workspace, 'AGENTS.md'))).toBe(true);
    expect(readFileSync(path.join(workspace, 'AGENTS.md'), 'utf-8')).toContain('apply-docs');
    expect(existsSync(path.join(workspace, 'ops', 'coding-policy.md'))).toBe(true);
  });

  it('updates an existing workspace safely and removes BOOTSTRAP.md', async () => {
    const workspace = path.join(tempRoot, 'existing-workspace');
    mkdirSync(workspace, { recursive: true });
    writeFileSync(path.join(workspace, 'AGENTS.md'), '# old agents\n', 'utf-8');
    writeFileSync(path.join(workspace, 'BOOTSTRAP.md'), '# bootstrap step\n', 'utf-8');
    const configPath = writeConfig(tempRoot, workspace);

    await runCreate(['--config', configPath]);

    expect(readFileSync(path.join(workspace, 'AGENTS.md'), 'utf-8')).toContain('apply-docs');
    expect(existsSync(path.join(workspace, 'BOOTSTRAP.md'))).toBe(false);
    expect(existsSync(path.join(workspace, '.quickclaw', 'apply-report.v1.json'))).toBe(true);
  });
});
