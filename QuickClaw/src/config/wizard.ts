import inquirer from 'inquirer';
import { buildDefaultConfig, QuickClawConfigSchema, type QuickClawConfigV1 } from './schema.js';

function parseList(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function runWizard(): Promise<QuickClawConfigV1> {
  const base = buildDefaultConfig();

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || base.project.timezone;

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'agentName',
      message: 'Agent name',
      default: base.project.agentName,
    },
    {
      type: 'input',
      name: 'workspace',
      message: 'OpenClaw workspace path',
      default: base.project.workspace,
    },
    {
      type: 'input',
      name: 'timezone',
      message: 'Timezone',
      default: timezone,
    },
    {
      type: 'list',
      name: 'authChoice',
      message: 'OpenClaw auth choice for onboard --non-interactive',
      default: base.openclaw.authChoice,
      choices: [
        'apiKey',
        'anthropic-api-key',
        'openai-api-key',
        'openai-code-oauth',
        'custom-api-key',
      ],
    },
    {
      type: 'number',
      name: 'gatewayPort',
      message: 'Gateway port',
      default: base.openclaw.gatewayPort,
    },
    {
      type: 'list',
      name: 'gatewayBind',
      message: 'Gateway bind mode',
      default: base.openclaw.gatewayBind,
      choices: ['loopback', 'lan', 'tailnet'],
    },
    {
      type: 'input',
      name: 'role',
      message: 'Identity role',
      default: base.identity.role,
    },
    {
      type: 'input',
      name: 'vibe',
      message: 'Identity vibe',
      default: base.identity.vibe,
    },
    {
      type: 'input',
      name: 'toneKeywords',
      message: 'Tone keywords (comma separated)',
      default: base.identity.toneKeywords.join(', '),
    },
    {
      type: 'input',
      name: 'antiPatterns',
      message: 'Anti-patterns (comma separated)',
      default: base.identity.antiPatterns.join(', '),
    },
    {
      type: 'input',
      name: 'boundaries',
      message: 'Boundaries (comma separated)',
      default: base.identity.boundaries.join(', '),
    },
    {
      type: 'input',
      name: 'nightlyExtractionCron',
      message: 'Nightly extraction cron expression',
      default: base.memory.nightlyExtractionCron,
    },
    {
      type: 'input',
      name: 'dailyCheckinCron',
      message: 'Daily check-in cron expression',
      default: base.memory.dailyCheckinCron,
    },
    {
      type: 'input',
      name: 'longTermRules',
      message: 'Long-term memory rules (comma separated)',
      default: base.memory.longTermRules.join(', '),
    },
    {
      type: 'input',
      name: 'knowledgePaths',
      message: 'Layer-3 knowledge paths (comma separated, optional)',
      default: base.memory.knowledgePaths.join(', '),
    },
    {
      type: 'number',
      name: 'decayHotDays',
      message: 'Memory decay hot window (days)',
      default: base.memory.decay.hotDays,
    },
    {
      type: 'number',
      name: 'decayWarmDays',
      message: 'Memory decay warm window (days)',
      default: base.memory.decay.warmDays,
    },
    {
      type: 'input',
      name: 'trustedCommandChannels',
      message: 'Trusted command channels (comma separated)',
      default: base.safety.trustedCommandChannels.join(', '),
    },
    {
      type: 'input',
      name: 'approvalRequired',
      message: 'Approval-required categories (comma separated)',
      default: base.safety.approvalRequired.join(', '),
    },
    {
      type: 'input',
      name: 'autonomousAllowed',
      message: 'Autonomous categories (comma separated)',
      default: base.safety.autonomousAllowed.join(', '),
    },
    {
      type: 'list',
      name: 'trustLadderLevel',
      message: 'Trust ladder level',
      default: base.safety.trustLadderLevel,
      choices: ['read-only', 'draft-approve', 'bounded-act'],
    },
    {
      type: 'input',
      name: 'worktreeRoot',
      message: 'Coding ops worktree root',
      default: base.codingOps.worktreeRoot,
    },
    {
      type: 'input',
      name: 'tmuxSocket',
      message: 'Coding ops tmux socket path',
      default: base.codingOps.tmuxSocket,
    },
    {
      type: 'number',
      name: 'stalledCheckWindowMinutes',
      message: 'Coding ops stalled check window (minutes)',
      default: base.codingOps.stalledCheckWindowMinutes,
    },
    {
      type: 'number',
      name: 'maxRestartsPerSession',
      message: 'Coding ops max restarts per session',
      default: base.codingOps.maxRestartsPerSession,
    },
    {
      type: 'input',
      name: 'sentryOrg',
      message: 'Sentry organization slug',
      default: base.sentry.org,
    },
    {
      type: 'input',
      name: 'sentryProject',
      message: 'Sentry project slug',
      default: base.sentry.project,
    },
    {
      type: 'input',
      name: 'sentryAuthTokenEnv',
      message: 'Sentry auth token env var',
      default: base.sentry.authTokenEnv,
    },
    {
      type: 'input',
      name: 'slackChannelId',
      message: 'Slack bugs channel target (channel:<id>)',
      default: base.sentry.slackChannelId,
    },
    {
      type: 'input',
      name: 'webhookPath',
      message: 'OpenClaw sentry webhook path (without /hooks/)',
      default: base.sentry.webhookPath,
    },
    {
      type: 'list',
      name: 'sentryMode',
      message: 'Sentry ingestion mode',
      default: base.sentry.mode,
      choices: ['slack-first', 'webhook-direct'],
    },
    {
      type: 'confirm',
      name: 'autoInstallMissingCli',
      message: 'Auto-install missing CLIs during preflight?',
      default: base.automation.autoInstallMissingCli,
    },
    {
      type: 'confirm',
      name: 'allowGlobalConfigWrites',
      message: 'Allow writes to global OpenClaw config on this host?',
      default: base.automation.allowGlobalConfigWrites,
    },
  ]);

  const config = {
    version: 'quickclaw.v1',
    project: {
      agentName: answers.agentName,
      workspace: answers.workspace,
      timezone: answers.timezone,
    },
    openclaw: {
      mode: 'local',
      authChoice: answers.authChoice,
      gatewayPort: Number(answers.gatewayPort),
      gatewayBind: answers.gatewayBind,
      advanced: base.openclaw.advanced,
    },
    identity: {
      role: answers.role,
      vibe: answers.vibe,
      toneKeywords: parseList(answers.toneKeywords),
      antiPatterns: parseList(answers.antiPatterns),
      boundaries: parseList(answers.boundaries),
    },
    memory: {
      longTermRules: parseList(answers.longTermRules),
      nightlyExtractionCron: answers.nightlyExtractionCron,
      dailyCheckinCron: answers.dailyCheckinCron,
      knowledgePaths: parseList(answers.knowledgePaths),
      decay: {
        hotDays: Number(answers.decayHotDays),
        warmDays: Number(answers.decayWarmDays),
      },
    },
    safety: {
      profile: 'balanced',
      trustedCommandChannels: parseList(answers.trustedCommandChannels),
      approvalRequired: parseList(answers.approvalRequired),
      autonomousAllowed: parseList(answers.autonomousAllowed),
      trustLadderLevel: answers.trustLadderLevel,
    },
    codingOps: {
      enabled: true,
      planningEngine: 'claude',
      executionEngine: 'codex',
      worktreeRoot: answers.worktreeRoot,
      tmuxSocket: answers.tmuxSocket,
      stalledCheckWindowMinutes: Number(answers.stalledCheckWindowMinutes),
      maxRestartsPerSession: Number(answers.maxRestartsPerSession),
    },
    sentry: {
      enabled: true,
      org: answers.sentryOrg,
      project: answers.sentryProject,
      authTokenEnv: answers.sentryAuthTokenEnv,
      slackChannelId: answers.slackChannelId,
      webhookPath: answers.webhookPath,
      mode: answers.sentryMode,
    },
    automation: {
      autoInstallMissingCli: Boolean(answers.autoInstallMissingCli),
      allowGlobalConfigWrites: Boolean(answers.allowGlobalConfigWrites),
    },
    credentials: base.credentials,
  };

  return QuickClawConfigSchema.parse(config);
}
