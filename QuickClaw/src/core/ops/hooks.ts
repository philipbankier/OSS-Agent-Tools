import { runShell } from '../shell.js';

export interface HookEnableResult {
  hook: string;
  ok: boolean;
  details?: string;
}

const REQUIRED_HOOKS = ['session-memory', 'command-logger', 'boot-md', 'bootstrap-extra-files'] as const;

export async function setupHooks(openclawBinary: 'openclaw' | 'clawdbot'): Promise<HookEnableResult[]> {
  const results: HookEnableResult[] = [];

  for (const hook of REQUIRED_HOOKS) {
    try {
      await runShell(openclawBinary, ['hooks', 'enable', hook], { allowFailure: false });
      results.push({ hook, ok: true, details: 'enabled' });
    } catch (error) {
      results.push({ hook, ok: false, details: (error as Error).message });
    }
  }

  return results;
}

export async function checkHooks(openclawBinary: 'openclaw' | 'clawdbot'): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const result = await runShell(openclawBinary, ['hooks', 'check'], { allowFailure: true });
  return {
    ok: result.code === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
