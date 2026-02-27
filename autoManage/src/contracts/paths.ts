import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';

export const CANONICAL_TRACE_SEGMENTS = ['ops', 'traces'] as const;

function resolveTastekitRoot(workspacePath: string): string {
  return basename(workspacePath) === '.tastekit' ? workspacePath : join(workspacePath, '.tastekit');
}

export function getTracePathCandidates(workspacePath: string): [string, string] {
  const tastekitRoot = resolveTastekitRoot(workspacePath);
  const canonical = join(tastekitRoot, ...CANONICAL_TRACE_SEGMENTS);
  const legacy = join(tastekitRoot, 'traces');
  return [canonical, legacy];
}

export function resolveTraceDirectory(workspacePath: string): string {
  const [canonical, legacy] = getTracePathCandidates(workspacePath);

  if (existsSync(canonical)) {
    return canonical;
  }

  if (existsSync(legacy)) {
    return legacy;
  }

  return canonical;
}
