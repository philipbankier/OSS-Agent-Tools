import type { QuickClawConfigV1 } from '../config/schema.js';
import { commandExists, runShell } from './shell.js';

export interface PreflightCheck {
  name: string;
  ok: boolean;
  details?: string;
}

export interface PreflightResult {
  checks: PreflightCheck[];
  openclawBinary: 'openclaw' | 'clawdbot' | null;
}

export interface AutoInstallResult {
  attempted: string[];
  installed: string[];
  failed: Array<{
    binary: string;
    installCommand?: string;
    error: string;
  }>;
}

const CLI_INSTALL_COMMANDS: Record<string, string> = {
  openclaw: 'npm install -g openclaw',
  tastekit: 'npm install -g @tastekit/cli',
  claude: 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex',
  tmux: 'brew install tmux',
  git: 'brew install git',
};

export function installCommandForBinary(binary: string): string | undefined {
  return CLI_INSTALL_COMMANDS[binary];
}

function withInstallHint(binary: string, base: string): string {
  const install = installCommandForBinary(binary);
  if (!install) {
    return base;
  }
  return `${base}. Install: ${install}`;
}

export function missingBinaries(result: PreflightResult): string[] {
  const missing = new Set<string>();

  for (const check of result.checks) {
    if (check.ok) {
      continue;
    }
    if (check.name === 'openclaw_binary') {
      missing.add('openclaw');
      continue;
    }
    const match = check.name.match(/^binary_(.+)$/);
    if (match?.[1]) {
      missing.add(match[1]);
    }
  }

  return [...missing];
}

export async function autoInstallMissingBinaries(result: PreflightResult): Promise<AutoInstallResult> {
  const missing = missingBinaries(result);
  const installResult: AutoInstallResult = {
    attempted: [],
    installed: [],
    failed: [],
  };

  for (const binary of missing) {
    const installCommand = installCommandForBinary(binary);
    if (!installCommand) {
      installResult.failed.push({
        binary,
        error: `No auto-install command configured for ${binary}`,
      });
      continue;
    }

    installResult.attempted.push(binary);
    try {
      await runShell('bash', ['-lc', installCommand], { allowFailure: false });
      installResult.installed.push(binary);
    } catch (error) {
      installResult.failed.push({
        binary,
        installCommand,
        error: (error as Error).message,
      });
    }
  }

  return installResult;
}

export function parseVersion(version: string): [number, number, number] {
  const normalized = version.trim().replace(/^v/, '');
  const [major = '0', minor = '0', patch = '0'] = normalized.split('.');
  return [Number(major), Number(minor), Number(patch)];
}

export function gteVersion(actual: [number, number, number], min: [number, number, number]): boolean {
  for (let i = 0; i < 3; i += 1) {
    if (actual[i] > min[i]) return true;
    if (actual[i] < min[i]) return false;
  }
  return true;
}

function requiredSecrets(config: QuickClawConfigV1): string[] {
  const required = [
    config.sentry.authTokenEnv,
    config.credentials.refs.openclaw_hook_token,
    config.credentials.refs.slack_bot_token,
    config.credentials.refs.slack_app_token,
  ].filter(Boolean) as string[];

  const authChoice = config.openclaw.authChoice;
  if (authChoice.includes('anthropic')) {
    required.push(config.credentials.refs.anthropic_api_key ?? 'ANTHROPIC_API_KEY');
  }
  if (authChoice.includes('openai') || authChoice === 'apiKey') {
    required.push(config.credentials.refs.openai_api_key ?? 'OPENAI_API_KEY');
  }

  return Array.from(new Set(required));
}

export async function runPreflight(config: QuickClawConfigV1): Promise<PreflightResult> {
  const checks: PreflightCheck[] = [];

  const hasOpenClaw = await commandExists('openclaw');
  const hasClawdbot = await commandExists('clawdbot');
  const openclawBinary = hasOpenClaw ? 'openclaw' : hasClawdbot ? 'clawdbot' : null;

  checks.push({
    name: 'openclaw_binary',
    ok: Boolean(openclawBinary),
    details: openclawBinary
      ? `Using ${openclawBinary}`
      : withInstallHint('openclaw', 'Neither openclaw nor clawdbot is installed'),
  });

  for (const binary of ['tastekit', 'claude', 'codex', 'tmux', 'git']) {
    const ok = await commandExists(binary);
    checks.push({
      name: `binary_${binary}`,
      ok,
      details: ok ? `${binary} detected` : withInstallHint(binary, `${binary} missing from PATH`),
    });
  }

  const actualNode = parseVersion(process.version);
  const minNode: [number, number, number] = [22, 12, 0];
  checks.push({
    name: 'node_version',
    ok: gteVersion(actualNode, minNode),
    details: `node=${process.version} required>=v22.12.0`,
  });

  for (const envName of requiredSecrets(config)) {
    const value = process.env[envName];
    checks.push({
      name: `secret_${envName}`,
      ok: Boolean(value),
      details: value ? `${envName} available` : `${envName} missing`,
    });
  }

  return {
    checks,
    openclawBinary,
  };
}

export function assertPreflight(result: PreflightResult): void {
  const failing = result.checks.filter((check) => !check.ok);
  if (failing.length === 0) {
    return;
  }

  const message = failing.map((check) => `${check.name}: ${check.details ?? 'failed'}`).join('\n');
  throw new Error(`Preflight failed:\n${message}`);
}
