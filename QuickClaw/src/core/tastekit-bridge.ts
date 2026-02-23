import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { runShell } from './shell.js';

export interface TasteKitBridgeResult {
  ok: boolean;
  details: string;
}

/**
 * Reuses the existing TasteKit SOUL import pipeline when available.
 * This is intentionally best-effort; OpenClaw workspace provisioning does not depend on it.
 */
export async function runTasteKitBridge(workspace: string): Promise<TasteKitBridgeResult> {
  try {
    const exportDir = path.join(workspace, 'ops', 'tastekit-export');
    mkdirSync(exportDir, { recursive: true });

    await runShell('tastekit', ['import', '--target', 'soul-md', '--source', workspace], {
      cwd: workspace,
      allowFailure: false,
    });

    await runShell('tastekit', ['export', '--target', 'agents-md', '--out', exportDir], {
      cwd: workspace,
      allowFailure: false,
    });

    return {
      ok: true,
      details: `TasteKit bridge complete: ${exportDir}`,
    };
  } catch (error) {
    return {
      ok: false,
      details: `TasteKit bridge skipped: ${(error as Error).message}`,
    };
  }
}
