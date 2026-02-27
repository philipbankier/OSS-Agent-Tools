import { readFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';

export const EnginePolicySchema = z.enum([
  'claude-plan-codex-exec',
  'claude-only',
  'codex-only',
]);

export type EnginePolicy = z.infer<typeof EnginePolicySchema>;

export const QuickClawConfigSchema = z.object({
  version: z.literal('quickclaw.v1'),
  project: z.object({
    agentName: z.string().min(1),
    workspace: z.string().min(1),
    timezone: z.string().min(1),
  }),
  openclaw: z.object({
    mode: z.enum(['local', 'remote']),
    authChoice: z.string().min(1),
    gatewayPort: z.number().int().min(1).max(65535),
    gatewayBind: z.enum(['loopback', 'lan', 'tailnet']),
    advanced: z
      .object({
        multiAgentScaffold: z.boolean().default(true),
        tailscaleNotes: z.boolean().default(true),
        modelAliasTemplate: z.boolean().default(true),
      })
      .default({
        multiAgentScaffold: true,
        tailscaleNotes: true,
        modelAliasTemplate: true,
      }),
  }),
  identity: z.object({
    role: z.string().min(1),
    vibe: z.string().min(1),
    toneKeywords: z.array(z.string().min(1)).min(1),
    antiPatterns: z.array(z.string().min(1)).min(1),
    boundaries: z.array(z.string().min(1)).min(1),
  }),
  memory: z.object({
    longTermRules: z.array(z.string().min(1)).min(1),
    nightlyExtractionCron: z.string().min(1),
    dailyCheckinCron: z.string().min(1),
    knowledgePaths: z.array(z.string().min(1)).default([]),
    decay: z
      .object({
        hotDays: z.number().int().min(1).default(7),
        warmDays: z.number().int().min(1).default(30),
      })
      .default({
        hotDays: 7,
        warmDays: 30,
      }),
  }),
  safety: z.object({
    profile: z.literal('balanced'),
    trustedCommandChannels: z.array(z.string().min(1)).min(1),
    approvalRequired: z.array(z.string().min(1)).min(1),
    autonomousAllowed: z.array(z.string().min(1)).min(1),
    trustLadderLevel: z.enum(['read-only', 'draft-approve', 'bounded-act']).default('draft-approve'),
  }),
  codingOps: z.object({
    enabled: z.literal(true),
    planningEngine: z.literal('claude'),
    executionEngine: z.literal('codex'),
    worktreeRoot: z.string().min(1),
    tmuxSocket: z.string().min(1),
    stalledCheckWindowMinutes: z.number().int().min(1).default(10),
    maxRestartsPerSession: z.number().int().min(1).default(3),
  }),
  sentry: z.object({
    enabled: z.literal(true),
    org: z.string().min(1),
    project: z.string().min(1),
    authTokenEnv: z.string().min(1),
    slackChannelId: z.string().min(1),
    webhookPath: z.string().min(1),
    mode: z.enum(['slack-first', 'webhook-direct']).default('slack-first'),
  }),
  automation: z
    .object({
      autoInstallMissingCli: z.boolean().default(false),
      allowGlobalConfigWrites: z.boolean().default(false),
    })
    .default({
      autoInstallMissingCli: false,
      allowGlobalConfigWrites: false,
    }),
  credentials: z.object({
    refs: z.record(z.string(), z.string().min(1)),
  }),
});

export type QuickClawConfigV1 = z.infer<typeof QuickClawConfigSchema>;

export function parseConfigText(content: string, fileHint = 'inline'): QuickClawConfigV1 {
  let parsed: unknown;
  const ext = path.extname(fileHint).toLowerCase();

  try {
    if (ext === '.json') {
      parsed = JSON.parse(content);
    } else {
      // YAML parser handles JSON as well.
      parsed = YAML.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse config ${fileHint}: ${(error as Error).message}`);
  }

  const result = QuickClawConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid quickclaw config ${fileHint}: ${issues}`);
  }

  return result.data;
}

export function loadConfigFile(configPath: string): QuickClawConfigV1 {
  const raw = readFileSync(configPath, 'utf-8');
  return parseConfigText(raw, configPath);
}

export function resolveCredentialRef(config: QuickClawConfigV1, refKey: string): string | undefined {
  const envName = config.credentials.refs[refKey];
  if (!envName) {
    return undefined;
  }
  return process.env[envName];
}

export function buildDefaultConfig(partial?: Partial<QuickClawConfigV1>): QuickClawConfigV1 {
  const defaultConfig: QuickClawConfigV1 = {
    version: 'quickclaw.v1',
    project: {
      agentName: 'QuickClaw Agent',
      workspace: `${process.env.HOME ?? '~'}/.openclaw/workspace`,
      timezone: 'America/New_York',
    },
    openclaw: {
      mode: 'local',
      authChoice: 'apiKey',
      gatewayPort: 18789,
      gatewayBind: 'loopback',
      advanced: {
        multiAgentScaffold: true,
        tailscaleNotes: true,
        modelAliasTemplate: true,
      },
    },
    identity: {
      role: 'AI Chief of Staff',
      vibe: 'Sharp, pragmatic, collaborative',
      toneKeywords: ['concise', 'direct', 'high-signal'],
      antiPatterns: ['sycophantic praise', 'hedging without evidence'],
      boundaries: ['Never execute high-risk external actions without explicit approval'],
    },
    memory: {
      longTermRules: [
        'Capture durable preferences and decision rationale in MEMORY.md',
        'Keep daily event logs in memory/YYYY-MM-DD.md',
      ],
      nightlyExtractionCron: '0 23 * * *',
      dailyCheckinCron: '0 9 * * *',
      knowledgePaths: [],
      decay: {
        hotDays: 7,
        warmDays: 30,
      },
    },
    safety: {
      profile: 'balanced',
      trustedCommandChannels: ['telegram', 'slack'],
      approvalRequired: ['external_comms', 'financial_actions', 'prod_changes'],
      autonomousAllowed: ['research', 'drafting', 'workspace_file_management'],
      trustLadderLevel: 'draft-approve',
    },
    codingOps: {
      enabled: true,
      planningEngine: 'claude',
      executionEngine: 'codex',
      worktreeRoot: `${process.env.HOME ?? '~'}/Development/agent-worktrees`,
      tmuxSocket: `${process.env.TMPDIR ?? '/tmp'}/quickclaw-tmux.sock`,
      stalledCheckWindowMinutes: 10,
      maxRestartsPerSession: 3,
    },
    sentry: {
      enabled: true,
      org: 'your-org',
      project: 'your-project',
      authTokenEnv: 'SENTRY_AUTH_TOKEN',
      slackChannelId: 'channel:C1234567890',
      webhookPath: 'sentry',
      mode: 'slack-first',
    },
    automation: {
      autoInstallMissingCli: false,
      allowGlobalConfigWrites: false,
    },
    credentials: {
      refs: {
        anthropic_api_key: 'ANTHROPIC_API_KEY',
        openai_api_key: 'OPENAI_API_KEY',
        openclaw_hook_token: 'OPENCLAW_HOOKS_TOKEN',
        sentry_auth_token: 'SENTRY_AUTH_TOKEN',
        slack_bot_token: 'SLACK_BOT_TOKEN',
        slack_app_token: 'SLACK_APP_TOKEN',
      },
    },
  };

  return {
    ...defaultConfig,
    ...partial,
    project: { ...defaultConfig.project, ...(partial?.project ?? {}) },
    openclaw: {
      ...defaultConfig.openclaw,
      ...(partial?.openclaw ?? {}),
      advanced: {
        ...defaultConfig.openclaw.advanced,
        ...(partial?.openclaw?.advanced ?? {}),
      },
    },
    identity: { ...defaultConfig.identity, ...(partial?.identity ?? {}) },
    memory: {
      ...defaultConfig.memory,
      ...(partial?.memory ?? {}),
      decay: {
        ...defaultConfig.memory.decay,
        ...(partial?.memory?.decay ?? {}),
      },
    },
    safety: { ...defaultConfig.safety, ...(partial?.safety ?? {}) },
    codingOps: { ...defaultConfig.codingOps, ...(partial?.codingOps ?? {}) },
    sentry: { ...defaultConfig.sentry, ...(partial?.sentry ?? {}) },
    automation: { ...defaultConfig.automation, ...(partial?.automation ?? {}) },
    credentials: {
      refs: {
        ...defaultConfig.credentials.refs,
        ...(partial?.credentials?.refs ?? {}),
      },
    },
  };
}
