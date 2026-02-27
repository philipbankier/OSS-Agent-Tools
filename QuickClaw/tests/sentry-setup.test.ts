import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildDefaultConfig } from '../src/config/schema.js';
import { setupSentryPipeline } from '../src/core/ops/sentry.js';

describe('sentry setup policy behavior', () => {
  let tempRoot: string;
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(os.tmpdir(), 'quickclaw-sentry-test-'));
    envBackup = { ...process.env };
    delete process.env.SENTRY_AUTH_TOKEN;
    delete process.env.OPENCLAW_HOOKS_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_APP_TOKEN;
    delete process.env.OPENCLAW_CONFIG;
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    process.env = { ...envBackup };
  });

  it('writes workspace patch artifact and blocks global config writes by default', async () => {
    const workspace = path.join(tempRoot, 'workspace');
    const globalConfigPath = path.join(tempRoot, 'openclaw.json');
    process.env.OPENCLAW_CONFIG = globalConfigPath;

    const config = buildDefaultConfig({
      project: {
        agentName: 'Policy Agent',
        workspace,
        timezone: 'America/New_York',
      },
      automation: {
        allowGlobalConfigWrites: false,
      },
    });

    const result = await setupSentryPipeline(workspace, config);

    expect(result.globalConfigWriteBlocked).toBe(true);
    expect(result.configPath).toBeUndefined();
    expect(result.patchPath).toBe(path.join(workspace, '.quickclaw', 'openclaw.config.patch.json'));
    expect(result.policyWarnings.length).toBeGreaterThan(0);
    expect(existsSync(result.patchPath!)).toBe(true);
    expect(existsSync(globalConfigPath)).toBe(false);
    expect(existsSync(result.transformPath)).toBe(true);
    expect(existsSync(path.join(workspace, 'ops', 'sentry', 'resolve-sentry-issue.sh'))).toBe(true);
  });

  it('writes global OpenClaw config only when explicitly enabled', async () => {
    const workspace = path.join(tempRoot, 'workspace-global');
    const globalConfigPath = path.join(tempRoot, 'openclaw-global.json');
    process.env.OPENCLAW_CONFIG = globalConfigPath;

    const config = buildDefaultConfig({
      project: {
        agentName: 'Global Agent',
        workspace,
        timezone: 'America/New_York',
      },
      automation: {
        allowGlobalConfigWrites: true,
      },
    });

    const result = await setupSentryPipeline(workspace, config);

    expect(result.globalConfigWriteBlocked).toBe(false);
    expect(result.configPath).toBe(globalConfigPath);
    expect(result.patchPath).toBeUndefined();
    expect(result.policyWarnings).toEqual([]);
    expect(existsSync(globalConfigPath)).toBe(true);

    const persisted = JSON.parse(readFileSync(globalConfigPath, 'utf-8')) as {
      hooks?: { mappings?: Array<{ id?: string }> };
    };
    const hasSentryMapping = (persisted.hooks?.mappings ?? []).some((mapping) => mapping.id === 'sentry');
    expect(hasSentryMapping).toBe(true);
  });
});
