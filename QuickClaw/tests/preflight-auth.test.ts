import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultConfig } from '../src/config/schema.js';

const shellMocks = vi.hoisted(() => ({
  commandExists: vi.fn(async () => true),
}));

vi.mock('../src/core/shell.js', () => ({
  commandExists: shellMocks.commandExists,
  runShell: vi.fn(),
}));

import { runPreflight } from '../src/core/preflight.js';

describe('preflight auth parity', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    shellMocks.commandExists.mockReset();
    shellMocks.commandExists.mockResolvedValue(true);

    process.env.SENTRY_AUTH_TOKEN = 'test-sentry';
    process.env.OPENCLAW_HOOKS_TOKEN = 'test-hook';
    process.env.SLACK_BOT_TOKEN = 'test-slack-bot';
    process.env.SLACK_APP_TOKEN = 'test-slack-app';
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('accepts anthropic-only key when authChoice=apiKey', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';

    const config = buildDefaultConfig({
      openclaw: {
        ...buildDefaultConfig().openclaw,
        authChoice: 'apiKey',
      },
    });

    const result = await runPreflight(config);
    const providerCheck = result.checks.find((check) => check.name === 'secret_apiKey_provider');

    expect(providerCheck?.ok).toBe(true);
    expect(providerCheck?.details).toContain('ANTHROPIC_API_KEY');
  });

  it('fails apiKey auth when neither provider key is set', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const config = buildDefaultConfig({
      openclaw: {
        ...buildDefaultConfig().openclaw,
        authChoice: 'apiKey',
      },
    });

    const result = await runPreflight(config);
    const providerCheck = result.checks.find((check) => check.name === 'secret_apiKey_provider');

    expect(providerCheck?.ok).toBe(false);
    expect(providerCheck?.details).toContain('ANTHROPIC_API_KEY or OPENAI_API_KEY');
  });
});
