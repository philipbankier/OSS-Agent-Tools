import { describe, expect, it } from 'vitest';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit simulate', () => {
  it('returns explicit not-implemented contract with non-zero exit', async () => {
    const root = makeTempWorkspace('simulate');

    try {
      const result = await runCli(['simulate', '--skill', 'demo-skill'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('Simulate command not yet implemented');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
