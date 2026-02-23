import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface PlanReport {
  version: 'quickclaw-report.v1';
  generatedAt: string;
  workspace: string;
  checks: Array<{ name: string; ok: boolean; details?: string }>;
  actions: Array<{ id: string; description: string; mode: 'plan' | 'apply' }>;
}

export interface ApplyReport {
  version: 'quickclaw-report.v1';
  generatedAt: string;
  workspace: string;
  success: boolean;
  actions: Array<{ id: string; ok: boolean; details?: string }>;
}

export interface VerificationReport {
  version: 'quickclaw-report.v1';
  generatedAt: string;
  workspace: string;
  checks: Array<{ name: string; ok: boolean; details?: string }>;
}

export function ensureQuickClawDir(workspace: string): string {
  const outDir = path.join(workspace, '.quickclaw');
  mkdirSync(outDir, { recursive: true });
  return outDir;
}

export function writePlanReport(workspace: string, report: PlanReport): string {
  const outDir = ensureQuickClawDir(workspace);
  const filePath = path.join(outDir, 'plan-report.v1.json');
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}

export function writeApplyReport(workspace: string, report: ApplyReport): string {
  const outDir = ensureQuickClawDir(workspace);
  const filePath = path.join(outDir, 'apply-report.v1.json');
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}

export function writeVerificationReport(workspace: string, report: VerificationReport): string {
  const outDir = ensureQuickClawDir(workspace);
  const filePath = path.join(outDir, 'verification-report.v1.json');
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}
