import { Command } from 'commander';
import path from 'node:path';
import {
  buildDefaultConfig,
  loadConfigFile,
  type QuickClawConfigV1,
} from '../config/schema.js';
import { runPreflight } from '../core/preflight.js';
import { runShell } from '../core/shell.js';
import { checkHooks } from '../core/ops/hooks.js';
import { verifyCron } from '../core/ops/cron.js';
import { verifySentryEndpoint } from '../core/ops/sentry.js';
import { type VerificationReport, writeVerificationReport } from '../core/reports.js';

interface VerifyOptions {
  config?: string;
  workspace?: string;
  json?: boolean;
}

function resolveConfig(options: VerifyOptions): QuickClawConfigV1 {
  if (options.config) {
    return loadConfigFile(options.config);
  }

  const config = buildDefaultConfig();
  if (!options.workspace) {
    return config;
  }

  return {
    ...config,
    project: {
      ...config.project,
      workspace: options.workspace,
    },
  };
}

export function verifyCommand(): Command {
  return new Command('verify')
    .description('Run verification checks and write verification report')
    .option('--config <path>', 'Config file path')
    .option('--workspace <path>', 'Workspace override')
    .option('--json', 'Machine-readable output')
    .action(async (options: VerifyOptions) => {
      const config = resolveConfig(options);
      const workspace = path.resolve(options.workspace ?? config.project.workspace);

      const preflight = await runPreflight(config);
      const checks: VerificationReport['checks'] = [...preflight.checks];

      if (preflight.openclawBinary) {
        const health = await runShell(preflight.openclawBinary, ['health'], { allowFailure: true });
        checks.push({
          name: 'openclaw_health',
          ok: health.code === 0,
          details: health.code === 0 ? 'ok' : health.stderr || health.stdout,
        });

        const hooks = await checkHooks(preflight.openclawBinary);
        checks.push({
          name: 'openclaw_hooks_check',
          ok: hooks.ok,
          details: hooks.ok ? hooks.stdout.trim() : hooks.stderr || hooks.stdout,
        });

        const cron = await verifyCron(preflight.openclawBinary);
        checks.push({
          name: 'openclaw_cron_list',
          ok: cron.ok,
          details: cron.ok ? cron.stdout.trim() : cron.stderr || cron.stdout,
        });
      } else {
        checks.push({
          name: 'openclaw_runtime',
          ok: false,
          details: 'openclaw/clawdbot not found; runtime checks skipped',
        });
      }

      const sentryRoute = await verifySentryEndpoint(config);
      checks.push({
        name: 'sentry_webhook_route_test',
        ok: sentryRoute.ok,
        details: sentryRoute.details,
      });

      const report: VerificationReport = {
        version: 'quickclaw-report.v1',
        generatedAt: new Date().toISOString(),
        workspace,
        checks,
      };

      const reportPath = writeVerificationReport(workspace, report);
      const ok = checks.every((check) => check.ok);

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              workspace,
              verificationReport: reportPath,
              ok,
              checks,
            },
            null,
            2,
          ),
        );
      } else {
        console.log(`Verification report: ${reportPath}`);
        for (const check of checks) {
          console.log(`- [${check.ok ? 'ok' : 'fail'}] ${check.name} ${check.details ?? ''}`);
        }
      }

      if (!ok) {
        process.exitCode = 1;
      }
    });
}
