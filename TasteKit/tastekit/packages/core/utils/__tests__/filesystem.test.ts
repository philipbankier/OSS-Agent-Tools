import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveTracesPath } from '../filesystem.js';

function createTastekitDir(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  return join(root, '.tastekit');
}

describe('resolveTracesPath', () => {
  it('prefers v2 ops/traces when present', () => {
    const tastekitPath = createTastekitDir('tastekit-utils-v2-');
    mkdirSync(join(tastekitPath, 'ops', 'traces'), { recursive: true });
    mkdirSync(join(tastekitPath, 'traces'), { recursive: true });

    expect(resolveTracesPath(tastekitPath)).toBe(join(tastekitPath, 'ops', 'traces'));

    rmSync(join(tastekitPath, '..'), { recursive: true, force: true });
  });

  it('falls back to v1 traces when v2 does not exist', () => {
    const tastekitPath = createTastekitDir('tastekit-utils-v1-');
    mkdirSync(join(tastekitPath, 'traces'), { recursive: true });

    expect(resolveTracesPath(tastekitPath)).toBe(join(tastekitPath, 'traces'));

    rmSync(join(tastekitPath, '..'), { recursive: true, force: true });
  });

  it('defaults to v2 ops/traces for new workspaces', () => {
    const tastekitPath = createTastekitDir('tastekit-utils-default-');

    expect(resolveTracesPath(tastekitPath)).toBe(join(tastekitPath, 'ops', 'traces'));

    rmSync(join(tastekitPath, '..'), { recursive: true, force: true });
  });
});
