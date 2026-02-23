import type { QuickClawConfigV1 } from '../config/schema.js';
import { runShell } from './shell.js';

export interface OnboardOptions {
  workspaceOverride?: string;
  openclawBinary: 'openclaw' | 'clawdbot';
}

const AUTH_FLAG_BY_CHOICE: Record<string, string> = {
  'anthropic-api-key': '--anthropic-api-key',
  'openai-api-key': '--openai-api-key',
  'gemini-api-key': '--gemini-api-key',
  'zai-api-key': '--zai-api-key',
  'moonshot-api-key': '--moonshot-api-key',
  'synthetic-api-key': '--synthetic-api-key',
  'ai-gateway-api-key': '--ai-gateway-api-key',
  'cloudflare-ai-gateway-api-key': '--cloudflare-ai-gateway-api-key',
  'opencode-zen': '--opencode-zen-api-key',
  'custom-api-key': '--custom-api-key',
};

function resolveAuthFlag(config: QuickClawConfigV1): { flag?: string; value?: string } {
  const choice = config.openclaw.authChoice;

  if (choice === 'apiKey') {
    const anthropicEnv = config.credentials.refs.anthropic_api_key;
    const openaiEnv = config.credentials.refs.openai_api_key;
    if (anthropicEnv && process.env[anthropicEnv]) {
      return { flag: '--anthropic-api-key', value: process.env[anthropicEnv] };
    }
    if (openaiEnv && process.env[openaiEnv]) {
      return { flag: '--openai-api-key', value: process.env[openaiEnv] };
    }
    return {};
  }

  const flag = AUTH_FLAG_BY_CHOICE[choice];
  if (!flag) {
    return {};
  }

  const envLookup: Record<string, string | undefined> = {
    '--anthropic-api-key': config.credentials.refs.anthropic_api_key,
    '--openai-api-key': config.credentials.refs.openai_api_key,
    '--custom-api-key': config.credentials.refs.custom_api_key,
    '--ai-gateway-api-key': config.credentials.refs.ai_gateway_api_key,
    '--cloudflare-ai-gateway-api-key': config.credentials.refs.cloudflare_ai_gateway_api_key,
    '--opencode-zen-api-key': config.credentials.refs.opencode_api_key,
    '--gemini-api-key': config.credentials.refs.gemini_api_key,
    '--zai-api-key': config.credentials.refs.zai_api_key,
    '--moonshot-api-key': config.credentials.refs.moonshot_api_key,
    '--synthetic-api-key': config.credentials.refs.synthetic_api_key,
  };

  const envName = envLookup[flag];
  const value = envName ? process.env[envName] : undefined;
  return { flag, value };
}

export function buildOnboardCommand(config: QuickClawConfigV1, options: OnboardOptions): { cmd: string; args: string[] } {
  const workspace = options.workspaceOverride ?? config.project.workspace;

  const args = [
    'onboard',
    '--non-interactive',
    '--json',
    '--mode',
    config.openclaw.mode,
    '--auth-choice',
    config.openclaw.authChoice,
    '--gateway-port',
    String(config.openclaw.gatewayPort),
    '--gateway-bind',
    config.openclaw.gatewayBind,
    '--workspace',
    workspace,
    '--skip-skills',
    '--install-daemon',
    '--daemon-runtime',
    'node',
  ];

  const auth = resolveAuthFlag(config);
  if (auth.flag && auth.value) {
    args.push(auth.flag, auth.value);
  }

  return {
    cmd: options.openclawBinary,
    args,
  };
}

export async function runOpenClawOnboard(config: QuickClawConfigV1, options: OnboardOptions): Promise<string> {
  const { cmd, args } = buildOnboardCommand(config, options);
  const result = await runShell(cmd, args, { allowFailure: false });
  return result.stdout;
}
