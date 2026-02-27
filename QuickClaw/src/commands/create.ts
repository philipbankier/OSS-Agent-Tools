import { Command } from 'commander';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import inquirer from 'inquirer';
import {
  EnginePolicySchema,
  type EnginePolicy,
  type QuickClawConfigV1,
  loadConfigFile,
} from '../config/schema.js';
import { runWizard } from '../config/wizard.js';
import {
  assertPreflight,
  autoInstallMissingBinaries,
  missingBinaries,
  runPreflight,
} from '../core/preflight.js';
import { runOpenClawOnboard } from '../core/openclaw-onboard.js';
import { runTasteKitBridge } from '../core/tastekit-bridge.js';
import {
  type GeneratedDocuments,
  generateDeterministicDocuments,
  generateDocuments,
} from '../core/templates.js';
import { setupCodingOps } from '../core/ops/coding.js';
import { setupHooks } from '../core/ops/hooks.js';
import { setupCronJobs } from '../core/ops/cron.js';
import { setupSentryPipeline } from '../core/ops/sentry.js';
import {
  type ApplyReport,
  type PlanReport,
  writeApplyReport,
  writePlanReport,
} from '../core/reports.js';

interface CreateOptions {
  config?: string;
  workspace?: string;
  preview?: boolean;
  json?: boolean;
  confirm?: boolean;
  enginePolicy?: EnginePolicy;
}

const PREVIEW_MUTATIONS_SKIPPED = [
  'auto_install_cli',
  'onboard',
  'workspace_materialization',
  'coding_ops',
  'hooks',
  'cron',
  'sentry_pipeline',
  'tastekit_bridge',
] as const;

function resolveConfig(options: CreateOptions): Promise<QuickClawConfigV1> {
  if (options.config) {
    return Promise.resolve(loadConfigFile(options.config));
  }

  return runWizard();
}

function applyWorkspaceOverride(config: QuickClawConfigV1, workspace?: string): QuickClawConfigV1 {
  if (!workspace) {
    return config;
  }

  return {
    ...config,
    project: {
      ...config.project,
      workspace,
    },
  };
}

function writeWorkspaceDocs(workspace: string, docs: GeneratedDocuments): string[] {
  const files: string[] = [];

  const workspaceFiles: Array<[string, string]> = Object.entries(docs)
    .filter(([name]) => name !== 'memory-seed')
    .map(([name, content]) => [name, content]);
  workspaceFiles.push([path.join('memory', `${new Date().toISOString().slice(0, 10)}.md`), docs['memory-seed']]);

  for (const [relPath, content] of workspaceFiles) {
    const target = path.join(workspace, relPath);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content, 'utf-8');
    files.push(target);
  }

  const bootstrapPath = path.join(workspace, 'BOOTSTRAP.md');
  if (existsSync(bootstrapPath)) {
    rmSync(bootstrapPath);
  }

  return files;
}

export function createCommand(): Command {
  return new Command('create')
    .description('Provision and customize a new OpenClaw agent end-to-end')
    .option('--config <path>', 'Run from config file')
    .option('--workspace <path>', 'Override target workspace path')
    .option('--preview', 'Generate plan/report only without mutating setup')
    .option('--confirm', 'Prompt for confirmation before apply')
    .option('--json', 'Machine-readable output')
    .option(
      '--engine-policy <policy>',
      'claude-plan-codex-exec | claude-only | codex-only',
      'claude-plan-codex-exec',
    )
    .action(async (options: CreateOptions) => {
      const policyResult = EnginePolicySchema.safeParse(options.enginePolicy);
      if (!policyResult.success) {
        throw new Error(`Invalid engine policy: ${options.enginePolicy}`);
      }
      const enginePolicy = policyResult.data;

      const rawConfig = await resolveConfig(options);
      const config = applyWorkspaceOverride(rawConfig, options.workspace);
      const workspace = path.resolve(config.project.workspace);

      mkdirSync(workspace, { recursive: true });

      let preflight = await runPreflight(config);

      const planReport: PlanReport = {
        version: 'quickclaw-report.v1',
        generatedAt: new Date().toISOString(),
        workspace,
        checks: preflight.checks,
        actions: [
          { id: 'preflight', description: 'Validate binaries/node/secrets', mode: 'plan' },
          { id: 'onboard', description: 'Run openclaw onboard --non-interactive', mode: 'apply' },
          { id: 'templates', description: 'Generate SOUL/AGENTS/MEMORY and workspace docs', mode: 'apply' },
          { id: 'coding_ops', description: 'Generate coding ops scripts and policy', mode: 'apply' },
          { id: 'hooks_cron', description: 'Enable hooks and configure cron jobs', mode: 'apply' },
          { id: 'sentry', description: 'Configure Sentry + Slack + webhook transform', mode: 'apply' },
          { id: 'tastekit_bridge', description: 'Reuse TasteKit import/export bridge', mode: 'apply' },
          ...(config.automation.autoInstallMissingCli
            ? [
                {
                  id: 'auto_install_cli',
                  description: 'Auto-install missing CLI binaries when available',
                  mode: 'apply' as const,
                },
              ]
            : []),
        ],
      };

      const planPath = writePlanReport(workspace, planReport);

      if (options.preview) {
        const previewDocs = generateDeterministicDocuments(config);
        const artifactPreview = Object.entries(previewDocs).map(([name, content]) => ({
          name,
          bytes: Buffer.byteLength(content, 'utf-8'),
        }));

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                mode: 'preview',
                workspace,
                planReport: planPath,
                checks: preflight.checks,
                generatedArtifacts: artifactPreview,
                hostMutationsSkipped: [...PREVIEW_MUTATIONS_SKIPPED],
              },
              null,
              2,
            ),
          );
        } else {
          console.log(`Preview complete. Plan report: ${planPath}`);
          for (const check of preflight.checks) {
            console.log(`- [${check.ok ? 'ok' : 'fail'}] ${check.name} ${check.details ?? ''}`);
          }
          console.log('Generated artifacts preview:');
          for (const artifact of artifactPreview) {
            console.log(`- ${artifact.name} (${artifact.bytes} bytes)`);
          }
          console.log('Host mutations skipped in preview:');
          for (const mutation of PREVIEW_MUTATIONS_SKIPPED) {
            console.log(`- ${mutation}`);
          }
        }
        return;
      }

      let autoInstallSummary:
        | {
            attempted: string[];
            installed: string[];
            failed: Array<{ binary: string; installCommand?: string; error: string }>;
          }
        | undefined;

      if (config.automation.autoInstallMissingCli) {
        const missing = missingBinaries(preflight);
        if (missing.length > 0) {
          autoInstallSummary = await autoInstallMissingBinaries(preflight);
          preflight = await runPreflight(config);
        }
      }

      if (options.confirm) {
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'apply',
            message: `Apply QuickClaw plan to ${workspace}?`,
            default: false,
          },
        ]);

        if (!answer.apply) {
          console.log(`Cancelled by user. Plan report remains at ${planPath}`);
          return;
        }
      }

      assertPreflight(preflight);
      if (!preflight.openclawBinary) {
        throw new Error('openclaw/clawdbot binary missing after preflight');
      }

      const actions: ApplyReport['actions'] = [];
      if (autoInstallSummary) {
        actions.push({
          id: 'auto_install_cli',
          ok: autoInstallSummary.failed.length === 0,
          details: [
            `attempted=${autoInstallSummary.attempted.join(',') || 'none'}`,
            `installed=${autoInstallSummary.installed.join(',') || 'none'}`,
            `failed=${autoInstallSummary.failed.map((failure) => failure.binary).join(',') || 'none'}`,
          ].join(' '),
        });
      }

      const onboardOutput = await runOpenClawOnboard(config, {
        openclawBinary: preflight.openclawBinary,
        workspaceOverride: workspace,
      });
      actions.push({ id: 'onboard', ok: true, details: onboardOutput.slice(0, 500) });

      const docs = await generateDocuments(config, enginePolicy);
      const materialized = writeWorkspaceDocs(workspace, docs);
      actions.push({ id: 'workspace_materialization', ok: true, details: `${materialized.length} files written` });

      const codingOps = setupCodingOps(workspace, config);
      actions.push({ id: 'coding_ops', ok: true, details: `${codingOps.files.length} scripts generated` });

      const hookResults = await setupHooks(preflight.openclawBinary);
      const hookFailures = hookResults.filter((result) => !result.ok);
      actions.push({
        id: 'hooks',
        ok: hookFailures.length === 0,
        details: hookResults.map((result) => `${result.hook}:${result.ok ? 'ok' : 'fail'}`).join(', '),
      });

      const cronResults = await setupCronJobs(preflight.openclawBinary, config);
      const cronFailures = cronResults.filter((result) => !result.ok);
      actions.push({
        id: 'cron',
        ok: cronFailures.length === 0,
        details: cronResults.map((result) => `${result.name}:${result.details}`).join(' | '),
      });

      const sentryResult = await setupSentryPipeline(workspace, config);
      const sentryFailures: string[] = [];
      if (!sentryResult.sentryApiValidated) {
        sentryFailures.push(`Sentry API validation failed. Check ${config.sentry.authTokenEnv}, org, and project.`);
      }
      if (!sentryResult.alertRuleConfigured) {
        sentryFailures.push('Sentry alert rule was not configured. Verify Sentry permissions and Slack integration.');
      }
      if (!sentryResult.webhookSmokeTest) {
        sentryFailures.push(
          sentryResult.globalConfigWriteBlocked
            ? 'Webhook smoke test skipped/failed because global OpenClaw config writes are blocked by policy.'
            : `Webhook smoke test failed. Verify OPENCLAW_HOOKS_TOKEN and gateway route /hooks/${config.sentry.webhookPath.replace(/^\/+/, '')}.`,
        );
      }
      const sentryOk =
        sentryResult.sentryApiValidated &&
        sentryResult.alertRuleConfigured &&
        sentryResult.webhookSmokeTest;
      actions.push({
        id: 'sentry_pipeline',
        ok: sentryOk,
        details: [...sentryResult.details, ...sentryFailures].join(' | '),
      });

      const tastekitResult = await runTasteKitBridge(workspace);
      actions.push({ id: 'tastekit_bridge', ok: tastekitResult.ok, details: tastekitResult.details });

      const applyReport: ApplyReport = {
        version: 'quickclaw-report.v1',
        generatedAt: new Date().toISOString(),
        workspace,
        success: actions.every((action) => action.ok),
        actions,
      };

      const applyPath = writeApplyReport(workspace, applyReport);
      const policyWarnings = [...sentryResult.policyWarnings];

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              workspace,
              planReport: planPath,
              applyReport: applyPath,
              checks: preflight.checks,
              success: applyReport.success,
              actions,
              policyWarnings,
            },
            null,
            2,
          ),
        );
      } else {
        console.log(`QuickClaw create complete for ${workspace}`);
        console.log(`Plan report: ${planPath}`);
        console.log(`Apply report: ${applyPath}`);
        for (const action of actions) {
          console.log(`- [${action.ok ? 'ok' : 'fail'}] ${action.id} ${action.details ?? ''}`);
        }
        if (policyWarnings.length > 0) {
          console.log('Policy warnings:');
          for (const warning of policyWarnings) {
            console.log(`- ${warning}`);
          }
        }
      }

      if (!applyReport.success) {
        process.exitCode = 1;
      }
    });
}
