import { describe, expect, it } from 'vitest';
import { buildDefaultConfig } from '../src/config/schema.js';
import { buildOnboardCommand } from '../src/core/openclaw-onboard.js';

describe('openclaw onboard command builder', () => {
  it('builds command with openclaw binary and workspace override', () => {
    const config = buildDefaultConfig();
    const command = buildOnboardCommand(config, {
      openclawBinary: 'openclaw',
      workspaceOverride: '/tmp/workspace',
    });

    expect(command.cmd).toBe('openclaw');
    expect(command.args).toContain('--workspace');
    expect(command.args).toContain('/tmp/workspace');
    expect(command.args).toContain('--non-interactive');
  });

  it('supports legacy clawdbot binary alias', () => {
    const config = buildDefaultConfig();
    const command = buildOnboardCommand(config, {
      openclawBinary: 'clawdbot',
    });

    expect(command.cmd).toBe('clawdbot');
    expect(command.args[0]).toBe('onboard');
  });
});
