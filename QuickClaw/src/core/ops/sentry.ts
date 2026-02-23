import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { QuickClawConfigV1 } from '../../config/schema.js';

export interface SentrySetupResult {
  configPath: string;
  transformPath: string;
  sentryApiValidated: boolean;
  alertRuleConfigured: boolean;
  webhookSmokeTest: boolean;
  details: string[];
}

interface OpenClawConfig {
  channels?: Record<string, unknown>;
  hooks?: Record<string, unknown>;
  [key: string]: unknown;
}

function resolveOpenClawConfigPath(): string {
  if (process.env.OPENCLAW_CONFIG?.trim()) {
    return process.env.OPENCLAW_CONFIG;
  }
  return path.join(os.homedir(), '.openclaw', 'openclaw.json');
}

function loadOpenClawConfig(configPath: string): OpenClawConfig {
  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as OpenClawConfig;
  } catch {
    return {};
  }
}

function saveOpenClawConfig(configPath: string, config: OpenClawConfig): void {
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function transformSentryPayload(payload: Record<string, unknown>): { message: string; name: string; wakeMode: 'now'; deliver: true; channel: 'slack'; to: string } {
  const issue = (payload.data as Record<string, unknown> | undefined) ?? {};
  const title = typeof issue.title === 'string' ? issue.title : 'Sentry alert';
  const culprit = typeof issue.culprit === 'string' ? issue.culprit : 'unknown culprit';
  const level = typeof issue.level === 'string' ? issue.level : 'error';
  const id = typeof issue.id === 'string' ? issue.id : 'unknown';

  return {
    name: 'Sentry',
    wakeMode: 'now',
    deliver: true,
    channel: 'slack',
    to: 'last',
    message: [
      `Sentry alert received (level=${level})`,
      `Issue ID: ${id}`,
      `Title: ${title}`,
      `Culprit: ${culprit}`,
      'Apply triage policy: auto-fix low-risk code defects; escalate architecture/security/uncertain cases.',
      'If auto-fixing: create isolated worktree, write failing tests first, implement fix, run tests+linter, open PR, notify human.',
    ].join('\n'),
  };
}

function sentryTransformModuleSource(defaultChannel: string): string {
  return `
function normalize(payload) {
  const data = (payload && payload.data) || {};
  const title = typeof data.title === 'string' ? data.title : 'Sentry alert';
  const culprit = typeof data.culprit === 'string' ? data.culprit : 'unknown culprit';
  const level = typeof data.level === 'string' ? data.level : 'error';
  const issueId = typeof data.id === 'string' ? data.id : 'unknown';

  return {
    name: 'Sentry',
    wakeMode: 'now',
    deliver: true,
    channel: 'slack',
    to: '${defaultChannel}',
    message: [
      'Sentry alert received (level=' + level + ')',
      'Issue ID: ' + issueId,
      'Title: ' + title,
      'Culprit: ' + culprit,
      'Apply triage policy: auto-fix low-risk code defects; escalate architecture/security/uncertain cases.',
      'If auto-fixing: create isolated worktree, write failing tests first, implement fix, run tests+linter, open PR, notify human.'
    ].join('\\n')
  };
}

module.exports = normalize;
module.exports.default = normalize;
`;
}

async function sentryApiRequest<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sentry API ${response.status} ${url}: ${body}`);
  }

  return (await response.json()) as T;
}

async function validateSentryProject(token: string, org: string, project: string): Promise<void> {
  await sentryApiRequest<Record<string, unknown>>(token, `https://sentry.io/api/0/projects/${org}/${project}/`);
}

async function ensureAlertRule(token: string, org: string, project: string, slackChannelId: string): Promise<boolean> {
  const rules = await sentryApiRequest<Array<{ id: string; name: string }>>(
    token,
    `https://sentry.io/api/0/projects/${org}/${project}/rules/`,
  );

  const existing = rules.find((rule) => rule.name === 'QuickClaw AutoFix Alerts');
  if (existing) {
    return true;
  }

  const payload = {
    name: 'QuickClaw AutoFix Alerts',
    actionMatch: 'any',
    filterMatch: 'all',
    frequency: 5,
    conditions: [{ id: 'sentry.rules.conditions.first_seen_event.FirstSeenEventCondition' }],
    filters: [{ id: 'sentry.rules.filters.level.LevelFilter', level: '40' }],
    actions: [
      {
        id: 'sentry.rules.actions.notify_event_service.NotifyEventServiceAction',
        service: 'slack',
        channel: slackChannelId,
      },
    ],
  };

  await sentryApiRequest<Record<string, unknown>>(
    token,
    `https://sentry.io/api/0/projects/${org}/${project}/rules/`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return true;
}

async function smokeTestWebhook(config: QuickClawConfigV1, hookToken: string): Promise<boolean> {
  const endpoint = `http://127.0.0.1:${config.openclaw.gatewayPort}/hooks/${config.sentry.webhookPath.replace(/^\/+/, '')}`;
  const payload = {
    source: 'sentry',
    data: {
      id: 'quickclaw-smoke-test',
      title: 'QuickClaw webhook smoke test',
      culprit: 'quickclaw/smoke',
      level: 'error',
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hookToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.ok;
}

export async function setupSentryPipeline(workspace: string, config: QuickClawConfigV1): Promise<SentrySetupResult> {
  const details: string[] = [];
  const configPath = resolveOpenClawConfigPath();
  const transformPath = path.join(workspace, 'ops', 'hooks', 'sentry-hook', 'hook-transform.js');

  const hookTokenEnv = config.credentials.refs.openclaw_hook_token ?? 'OPENCLAW_HOOKS_TOKEN';
  const hookToken = process.env[hookTokenEnv];
  const slackBotToken = process.env[config.credentials.refs.slack_bot_token ?? 'SLACK_BOT_TOKEN'];
  const slackAppToken = process.env[config.credentials.refs.slack_app_token ?? 'SLACK_APP_TOKEN'];
  const sentryToken = process.env[config.sentry.authTokenEnv];

  const ocConfig = loadOpenClawConfig(configPath);

  const slackChannel = config.sentry.slackChannelId.startsWith('channel:')
    ? config.sentry.slackChannelId
    : `channel:${config.sentry.slackChannelId}`;

  const channelId = slackChannel.replace(/^channel:/, '');

  ocConfig.channels = {
    ...(ocConfig.channels ?? {}),
    slack: {
      enabled: true,
      mode: 'socket',
      appToken: slackAppToken,
      botToken: slackBotToken,
      groupPolicy: 'allowlist',
      channels: {
        [channelId]: {
          enabled: true,
          requireMention: false,
        },
      },
    },
  };

  const existingHooks = (ocConfig.hooks ?? {}) as Record<string, unknown>;
  const mappings = Array.isArray(existingHooks.mappings) ? [...(existingHooks.mappings as unknown[])] : [];
  const filtered = mappings.filter((item) => {
    if (!item || typeof item !== 'object') return true;
    return (item as { id?: string }).id !== 'sentry';
  });

  filtered.push({
    id: 'sentry',
    match: { path: config.sentry.webhookPath.replace(/^\/+/, '') },
    transform: { module: 'sentry-hook/hook-transform.js' },
    action: 'agent',
  });

  ocConfig.hooks = {
    ...existingHooks,
    enabled: true,
    token: hookToken,
    path: '/hooks',
    transformsDir: path.join(workspace, 'ops', 'hooks'),
    mappings: filtered,
  };

  saveOpenClawConfig(configPath, ocConfig);
  details.push(`Updated OpenClaw config at ${configPath}`);

  mkdirSync(path.dirname(transformPath), { recursive: true });
  writeFileSync(transformPath, sentryTransformModuleSource(slackChannel), 'utf-8');
  details.push(`Wrote transform module ${transformPath}`);

  let sentryApiValidated = false;
  let alertRuleConfigured = false;
  if (sentryToken) {
    try {
      await validateSentryProject(sentryToken, config.sentry.org, config.sentry.project);
      sentryApiValidated = true;
      details.push('Validated Sentry project access');
    } catch (error) {
      details.push(`Sentry project validation failed: ${(error as Error).message}`);
    }

    if (sentryApiValidated) {
      try {
        alertRuleConfigured = await ensureAlertRule(
          sentryToken,
          config.sentry.org,
          config.sentry.project,
          slackChannel,
        );
        details.push('Sentry alert rule configured or already present');
      } catch (error) {
        details.push(`Sentry alert rule configuration failed: ${(error as Error).message}`);
      }
    }
  } else {
    details.push(`Missing ${config.sentry.authTokenEnv}; Sentry API setup skipped`);
  }

  let webhookSmokeTest = false;
  if (hookToken) {
    try {
      webhookSmokeTest = await smokeTestWebhook(config, hookToken);
      details.push(`Webhook smoke test ${webhookSmokeTest ? 'passed' : 'failed'}`);
    } catch (error) {
      details.push(`Webhook smoke test error: ${(error as Error).message}`);
    }
  } else {
    details.push(`Missing ${hookTokenEnv}; webhook smoke test skipped`);
  }

  return {
    configPath,
    transformPath,
    sentryApiValidated,
    alertRuleConfigured,
    webhookSmokeTest,
    details,
  };
}

export async function verifySentryEndpoint(config: QuickClawConfigV1): Promise<{ ok: boolean; details: string }> {
  const hookTokenEnv = config.credentials.refs.openclaw_hook_token ?? 'OPENCLAW_HOOKS_TOKEN';
  const hookToken = process.env[hookTokenEnv];
  if (!hookToken) {
    return { ok: false, details: `Missing ${hookTokenEnv}` };
  }

  try {
    const ok = await smokeTestWebhook(config, hookToken);
    return { ok, details: ok ? 'Sentry webhook route test passed' : 'Sentry webhook route test failed' };
  } catch (error) {
    return { ok: false, details: (error as Error).message };
  }
}
