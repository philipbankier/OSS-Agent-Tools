import { spawn } from 'node:child_process';

export interface ShellResult {
  code: number;
  stdout: string;
  stderr: string;
  command: string;
}

export interface RunShellOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  allowFailure?: boolean;
}

export async function runShell(command: string, args: string[], options: RunShellOptions = {}): Promise<ShellResult> {
  return new Promise<ShellResult>((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (error) => {
      reject(new Error(`Failed to run ${command}: ${error.message}`));
    });

    proc.on('close', (code) => {
      const result: ShellResult = {
        code: code ?? 0,
        stdout,
        stderr,
        command: [command, ...args].join(' '),
      };

      if (!options.allowFailure && result.code !== 0) {
        reject(new Error(`${result.command} failed (${result.code}): ${result.stderr || result.stdout}`));
        return;
      }

      resolve(result);
    });

    if (options.input) {
      proc.stdin.write(options.input);
    }
    proc.stdin.end();
  });
}

export async function commandExists(binary: string): Promise<boolean> {
  try {
    await runShell('bash', ['-lc', `command -v ${binary}`]);
    return true;
  } catch {
    return false;
  }
}
