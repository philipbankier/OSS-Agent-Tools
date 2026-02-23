import { runShell } from '../shell.js';

interface CodexJsonLine {
  type?: string;
  result?: string;
}

export function parseCodexOutput(stdout: string): string {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]) as CodexJsonLine;
      if (parsed.type === 'result' && parsed.result) {
        return parsed.result.trim();
      }
    } catch {
      // keep scanning
    }
  }

  throw new Error('Unable to parse Codex JSON result output');
}

export async function runCodexPrompt(prompt: string, model?: string): Promise<string> {
  const args = ['exec', '--json', '--skip-git-repo-check', '--color', 'never'];
  if (model) {
    args.push('-m', model);
  }
  args.push('-');

  const result = await runShell('codex', args, {
    input: prompt,
    allowFailure: false,
  });

  return parseCodexOutput(result.stdout);
}
