import type { QuickClawConfigV1 } from '../../config/schema.js';
import { runShell } from '../shell.js';

export interface CronJobResult {
  name: string;
  ok: boolean;
  details: string;
}

export interface ScheduleIntent {
  type: 'nightly' | 'daily-checkin';
  hour: number;
  minute: number;
}

export function scheduleIntentToCron(intent: ScheduleIntent): string {
  const hour = Math.max(0, Math.min(23, Math.floor(intent.hour)));
  const minute = Math.max(0, Math.min(59, Math.floor(intent.minute)));
  return `${minute} ${hour} * * *`;
}

interface ExistingCronSummary {
  names: Set<string>;
}

function parseCronNames(raw: string): ExistingCronSummary {
  const names = new Set<string>();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === 'object' && 'name' in item && typeof (item as { name?: unknown }).name === 'string') {
          names.add((item as { name: string }).name);
        }
      }
    } else if (parsed && typeof parsed === 'object' && 'jobs' in parsed && Array.isArray((parsed as { jobs?: unknown[] }).jobs)) {
      for (const item of (parsed as { jobs: Array<{ name?: string }> }).jobs) {
        if (item.name) names.add(item.name);
      }
    }
  } catch {
    const lines = raw.split('\n');
    for (const line of lines) {
      const match = line.match(/name\s*[:=]\s*(.+)$/i);
      if (match) {
        names.add(match[1].trim());
      }
    }
  }

  return { names };
}

async function listExisting(openclawBinary: 'openclaw' | 'clawdbot'): Promise<ExistingCronSummary> {
  const result = await runShell(openclawBinary, ['cron', 'list', '--json'], { allowFailure: true });
  if (result.code !== 0) {
    return { names: new Set() };
  }
  return parseCronNames(result.stdout);
}

export async function setupCronJobs(
  openclawBinary: 'openclaw' | 'clawdbot',
  config: QuickClawConfigV1,
): Promise<CronJobResult[]> {
  const existing = await listExisting(openclawBinary);
  const jobs: Array<{ name: string; cron: string; message: string }> = [
    {
      name: 'quickclaw-nightly-extraction',
      cron: config.memory.nightlyExtractionCron,
      message:
        "Review today's conversations. Extract durable facts, update memory/YYYY-MM-DD.md and MEMORY.md, then summarize critical updates.",
    },
    {
      name: 'quickclaw-morning-priorities',
      cron: config.memory.dailyCheckinCron,
      message: 'Generate morning priorities, pending approvals, and high-risk alerts for today.',
    },
    {
      name: 'quickclaw-ops-monitor',
      cron: '*/30 * * * *',
      message: 'Check coding sessions, webhook health, and recent errors. Report only actionable issues.',
    },
  ];

  const results: CronJobResult[] = [];
  for (const job of jobs) {
    if (existing.names.has(job.name)) {
      results.push({ name: job.name, ok: true, details: 'already exists' });
      continue;
    }

    try {
      await runShell(
        openclawBinary,
        [
          'cron',
          'add',
          '--name',
          job.name,
          '--cron',
          job.cron,
          '--tz',
          config.project.timezone,
          '--session',
          'isolated',
          '--message',
          job.message,
          '--no-deliver',
        ],
        { allowFailure: false },
      );
      results.push({ name: job.name, ok: true, details: 'created' });
    } catch (error) {
      results.push({ name: job.name, ok: false, details: (error as Error).message });
    }
  }

  return results;
}

export async function verifyCron(openclawBinary: 'openclaw' | 'clawdbot'): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const result = await runShell(openclawBinary, ['cron', 'list'], { allowFailure: true });
  return {
    ok: result.code === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
