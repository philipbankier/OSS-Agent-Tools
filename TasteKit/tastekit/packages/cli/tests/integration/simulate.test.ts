import { describe, expect, it } from 'vitest';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit simulate', () => {
  it('shows planned-for-v1.1 message with zero exit', async () => {
    const root = makeTempWorkspace('simulate');

    try {
      const result = await runCli(['simulate', '--skill', 'demo-skill'], { cwd: root });
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('planned for TasteKit v1.1');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
