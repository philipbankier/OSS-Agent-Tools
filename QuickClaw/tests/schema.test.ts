import { describe, expect, it } from 'vitest';
import { buildDefaultConfig, parseConfigText, QuickClawConfigSchema } from '../src/config/schema.js';

describe('config schema', () => {
  it('accepts default config', () => {
    const config = buildDefaultConfig();
    const parsed = QuickClawConfigSchema.parse(config);
    expect(parsed.version).toBe('quickclaw.v1');
    expect(parsed.safety.profile).toBe('balanced');
    expect(parsed.automation.autoInstallMissingCli).toBe(false);
    expect(parsed.automation.allowGlobalConfigWrites).toBe(false);
    expect(parsed.memory.decay.hotDays).toBe(7);
    expect(parsed.memory.decay.warmDays).toBe(30);
    expect(parsed.safety.trustLadderLevel).toBe('draft-approve');
    expect(parsed.sentry.mode).toBe('slack-first');
    expect(parsed.openclaw.advanced.multiAgentScaffold).toBe(true);
  });

  it('rejects invalid profile', () => {
    const base = buildDefaultConfig();
    const invalid = {
      ...base,
      safety: {
        ...base.safety,
        profile: 'strict',
      },
    };

    const result = QuickClawConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('parses YAML and JSON text', () => {
    const base = buildDefaultConfig();
    const yamlText = `version: quickclaw.v1\nproject:\n  agentName: ${base.project.agentName}\n  workspace: ${base.project.workspace}\n  timezone: ${base.project.timezone}\nopenclaw:\n  mode: local\n  authChoice: ${base.openclaw.authChoice}\n  gatewayPort: ${base.openclaw.gatewayPort}\n  gatewayBind: ${base.openclaw.gatewayBind}\nidentity:\n  role: ${base.identity.role}\n  vibe: ${base.identity.vibe}\n  toneKeywords: [${base.identity.toneKeywords.map((v) => `"${v}"`).join(', ')}]\n  antiPatterns: ["${base.identity.antiPatterns[0]}"]\n  boundaries: ["${base.identity.boundaries[0]}"]\nmemory:\n  longTermRules: ["${base.memory.longTermRules[0]}"]\n  nightlyExtractionCron: "${base.memory.nightlyExtractionCron}"\n  dailyCheckinCron: "${base.memory.dailyCheckinCron}"\nsafety:\n  profile: balanced\n  trustedCommandChannels: ["${base.safety.trustedCommandChannels[0]}"]\n  approvalRequired: ["${base.safety.approvalRequired[0]}"]\n  autonomousAllowed: ["${base.safety.autonomousAllowed[0]}"]\ncodingOps:\n  enabled: true\n  planningEngine: claude\n  executionEngine: codex\n  worktreeRoot: "${base.codingOps.worktreeRoot}"\n  tmuxSocket: "${base.codingOps.tmuxSocket}"\nsentry:\n  enabled: true\n  org: "${base.sentry.org}"\n  project: "${base.sentry.project}"\n  authTokenEnv: "${base.sentry.authTokenEnv}"\n  slackChannelId: "${base.sentry.slackChannelId}"\n  webhookPath: "${base.sentry.webhookPath}"\ncredentials:\n  refs:\n    openclaw_hook_token: OPENCLAW_HOOKS_TOKEN\n    sentry_auth_token: SENTRY_AUTH_TOKEN\n`;

    const fromYaml = parseConfigText(yamlText, 'quickclaw.config.yaml');
    expect(fromYaml.version).toBe('quickclaw.v1');
    expect(fromYaml.automation.autoInstallMissingCli).toBe(false);

    const fromJson = parseConfigText(JSON.stringify(base), 'quickclaw.config.json');
    expect(fromJson.project.agentName).toBe(base.project.agentName);
  });
});
