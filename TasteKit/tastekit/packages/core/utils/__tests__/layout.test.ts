import { afterEach, describe, expect, it } from 'vitest';
import {
  createThreeSpaceLayout,
  detectLayoutVersion,
  migrateWorkspaceLayout,
  resolveArtifactPath,
  resolvePlaybooksPath,
  resolveSessionPath,
  resolveSkillsPath,
} from '../filesystem.js';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const tempRoots: string[] = [];

function newWorkspace(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  tempRoots.push(root);
  const tastekit = join(root, '.tastekit');
  mkdirSync(tastekit, { recursive: true });
  return tastekit;
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('layout resolution', () => {
  it('resolves artifacts in v2 first then v1 fallback', () => {
    const workspace = newWorkspace('tastekit-layout-artifacts-');
    const v1 = join(workspace, 'artifacts', 'constitution.v1.json');
    const v2 = join(workspace, 'self', 'constitution.v1.json');

    mkdirSync(join(workspace, 'artifacts'), { recursive: true });
    writeFileSync(v1, '{}', 'utf-8');
    expect(resolveArtifactPath(workspace, 'constitution')).toBe(v1);

    mkdirSync(join(workspace, 'self'), { recursive: true });
    writeFileSync(v2, '{"v":2}', 'utf-8');
    expect(resolveArtifactPath(workspace, 'constitution')).toBe(v2);
  });

  it('resolves skills, playbooks, and session across layouts', () => {
    const workspace = newWorkspace('tastekit-layout-resolve-');

    mkdirSync(join(workspace, 'skills'), { recursive: true });
    mkdirSync(join(workspace, 'artifacts', 'playbooks'), { recursive: true });
    writeFileSync(join(workspace, 'session.json'), '{}', 'utf-8');

    expect(resolveSkillsPath(workspace)).toBe(join(workspace, 'skills'));
    expect(resolvePlaybooksPath(workspace)).toBe(join(workspace, 'artifacts', 'playbooks'));
    expect(resolveSessionPath(workspace)).toBe(join(workspace, 'session.json'));

    mkdirSync(join(workspace, 'knowledge', 'skills'), { recursive: true });
    mkdirSync(join(workspace, 'knowledge', 'playbooks'), { recursive: true });
    mkdirSync(join(workspace, 'ops'), { recursive: true });
    writeFileSync(join(workspace, 'ops', 'session.json'), '{}', 'utf-8');

    expect(resolveSkillsPath(workspace)).toBe(join(workspace, 'knowledge', 'skills'));
    expect(resolvePlaybooksPath(workspace)).toBe(join(workspace, 'knowledge', 'playbooks'));
    expect(resolveSessionPath(workspace)).toBe(join(workspace, 'ops', 'session.json'));
  });
});

describe('layout migration and detection', () => {
  it('detects v1 vs v2 and creates v2 directories', () => {
    const workspace = newWorkspace('tastekit-layout-detect-');
    expect(detectLayoutVersion(workspace)).toBe(1);

    createThreeSpaceLayout(workspace);
    expect(detectLayoutVersion(workspace)).toBe(2);
    expect(resolveSkillsPath(workspace)).toBe(join(workspace, 'knowledge', 'skills'));
  });

  it('migrates v1 files into v2 structure non-destructively', () => {
    const workspace = newWorkspace('tastekit-layout-migrate-');

    mkdirSync(join(workspace, 'artifacts', 'playbooks'), { recursive: true });
    mkdirSync(join(workspace, 'skills', 'demo-skill'), { recursive: true });
    mkdirSync(join(workspace, 'traces'), { recursive: true });

    writeFileSync(join(workspace, 'artifacts', 'constitution.v1.json'), '{"ok":true}', 'utf-8');
    writeFileSync(join(workspace, 'artifacts', 'guardrails.v1.yaml'), 'schema_version: guardrails.v1', 'utf-8');
    writeFileSync(join(workspace, 'artifacts', 'memory.v1.yaml'), 'schema_version: memory.v1', 'utf-8');
    writeFileSync(join(workspace, 'artifacts', 'playbooks', 'demo.v1.yaml'), 'schema_version: playbook.v1', 'utf-8');
    writeFileSync(join(workspace, 'skills', 'manifest.v1.yaml'), 'schema_version: skills_manifest.v1', 'utf-8');
    writeFileSync(join(workspace, 'skills', 'demo-skill', 'SKILL.md'), '# Demo', 'utf-8');
    writeFileSync(join(workspace, 'traces', 'events.jsonl'), '{}\n', 'utf-8');
    writeFileSync(join(workspace, 'session.json'), '{"session_id":"s1"}', 'utf-8');

    const result = migrateWorkspaceLayout(workspace);

    expect(result.migrated.length).toBeGreaterThan(0);
    expect(resolveArtifactPath(workspace, 'constitution')).toBe(join(workspace, 'self', 'constitution.v1.json'));
    expect(resolveSkillsPath(workspace)).toBe(join(workspace, 'knowledge', 'skills'));
    expect(resolvePlaybooksPath(workspace)).toBe(join(workspace, 'knowledge', 'playbooks'));
    expect(resolveSessionPath(workspace)).toBe(join(workspace, 'ops', 'session.json'));
  });
});
