import { runShell } from '../shell.js';

export interface ClaudeRunOptions {
  model?: string;
  permissionMode?: 'plan' | 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions';
}

interface ClaudeJsonResult {
  type?: string;
  result?: string;
  is_error?: boolean;
}

export function parseClaudeOutput(stdout: string): string {
  let parsed: ClaudeJsonResult;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to parse Claude JSON output: ${(error as Error).message}`);
  }

  if (parsed.is_error) {
    throw new Error(`Claude returned error: ${parsed.result ?? 'unknown error'}`);
  }

  return (parsed.result ?? '').trim();
}

export async function runClaudePrompt(prompt: string, options: ClaudeRunOptions = {}): Promise<string> {
  const args = ['--permission-mode', options.permissionMode ?? 'plan', '-p', '--output-format', 'json'];
  if (options.model) {
    args.push('--model', options.model);
  }
  args.push('-');

  const result = await runShell('claude', args, {
    input: prompt,
    allowFailure: false,
  });

  return parseClaudeOutput(result.stdout);
}
