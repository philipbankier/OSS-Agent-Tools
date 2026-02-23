import { describe, expect, it } from 'vitest';
import {
  assertPreflight,
  gteVersion,
  installCommandForBinary,
  missingBinaries,
  parseVersion,
  type PreflightResult,
} from '../src/core/preflight.js';

describe('preflight version checks', () => {
  it('parses semantic versions', () => {
    expect(parseVersion('v22.12.1')).toEqual([22, 12, 1]);
    expect(parseVersion('20.18.0')).toEqual([20, 18, 0]);
  });

  it('compares versions', () => {
    expect(gteVersion([22, 12, 0], [22, 12, 0])).toBe(true);
    expect(gteVersion([22, 12, 1], [22, 12, 0])).toBe(true);
    expect(gteVersion([22, 11, 9], [22, 12, 0])).toBe(false);
  });

  it('returns install command hints for known binaries', () => {
    expect(installCommandForBinary('openclaw')).toBe('npm install -g openclaw');
    expect(installCommandForBinary('tmux')).toBe('brew install tmux');
    expect(installCommandForBinary('unknown-binary')).toBeUndefined();
  });

  it('extracts unique missing binaries from failing checks', () => {
    const result: PreflightResult = {
      openclawBinary: null,
      checks: [
        { name: 'openclaw_binary', ok: false },
        { name: 'binary_tastekit', ok: false },
        { name: 'binary_tastekit', ok: false },
        { name: 'binary_codex', ok: true },
      ],
    };

    expect(missingBinaries(result).sort()).toEqual(['openclaw', 'tastekit']);
  });

  it('fails with detailed diagnostics', () => {
    const result: PreflightResult = {
      openclawBinary: null,
      checks: [
        {
          name: 'openclaw_binary',
          ok: false,
          details: 'Neither openclaw nor clawdbot is installed. Install: npm install -g openclaw',
        },
      ],
    };

    expect(() => assertPreflight(result)).toThrow('Install: npm install -g openclaw');
  });
});
