import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getTracePathCandidates, resolveTraceDirectory } from '../../src/contracts/paths';

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('trace path resolution', () => {
  it('prefers canonical .tastekit/ops/traces when present', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'automanage-paths-'));
    dirs.push(workspace);

    const canonical = join(workspace, '.tastekit', 'ops', 'traces');
    mkdirSync(canonical, { recursive: true });

    expect(resolveTraceDirectory(workspace)).toBe(canonical);
  });

  it('falls back to legacy .tastekit/traces when canonical is missing', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'automanage-paths-'));
    dirs.push(workspace);

    const legacy = join(workspace, '.tastekit', 'traces');
    mkdirSync(legacy, { recursive: true });

    expect(resolveTraceDirectory(workspace)).toBe(legacy);
  });

  it('returns canonical default when neither path exists', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'automanage-paths-'));
    dirs.push(workspace);

    const [canonical, legacy] = getTracePathCandidates(workspace);
    expect(resolveTraceDirectory(workspace)).toBe(canonical);
    expect(canonical.endsWith(join('.tastekit', 'ops', 'traces'))).toBe(true);
    expect(legacy.endsWith(join('.tastekit', 'traces'))).toBe(true);
  });
});
