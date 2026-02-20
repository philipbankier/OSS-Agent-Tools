import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, cpSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Filesystem utilities for TasteKit
 */

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function writeFileSafe(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content, 'utf-8');
}

export function readFileIfExists(path: string): string | null {
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8');
  }
  return null;
}

export function atomicWrite(path: string, content: string): void {
  ensureDir(dirname(path));
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, content, 'utf-8');
  renameSync(tempPath, path);
}

// ---------------------------------------------------------------------------
// Three-Space Workspace Layout
// ---------------------------------------------------------------------------
//
// .tastekit/
// ├── tastekit.yaml              # Workspace config
// ├── self/                      # Identity artifacts (slow-changing)
// │   ├── constitution.v1.json
// │   ├── guardrails.v1.yaml
// │   └── memory.v1.yaml
// ├── knowledge/                 # Domain knowledge (steady accumulation)
// │   ├── skills/
// │   │   ├── manifest.v1.yaml
// │   │   └── <skill_id>/SKILL.md
// │   └── playbooks/
// │       └── <playbook_id>/PLAYBOOK.md
// ├── ops/                       # Operational state (fluctuating)
// │   ├── traces/
// │   ├── drift/
// │   ├── observations/
// │   ├── sessions/
// │   ├── derivation.v1.yaml
// │   └── session.json
// ├── bindings.v1.yaml           # Cross-cutting
// └── trust.v1.yaml              # Cross-cutting

/**
 * Layout version for workspace migration detection.
 * v1 = flat layout (.tastekit/artifacts/, .tastekit/traces/)
 * v2 = three-space layout (.tastekit/self/, .tastekit/knowledge/, .tastekit/ops/)
 */
export type LayoutVersion = 1 | 2;

/** Detect which workspace layout is in use */
export function detectLayoutVersion(workspacePath: string): LayoutVersion {
  if (existsSync(join(workspacePath, 'self'))) {
    return 2;
  }
  return 1;
}

// --- Three-space path helpers ---

/** Identity space: slow-changing artifacts that define who the agent is */
export function selfPath(workspacePath: string, ...segments: string[]): string {
  return join(workspacePath, 'self', ...segments);
}

/** Knowledge space: skills, playbooks, domain knowledge */
export function knowledgePath(workspacePath: string, ...segments: string[]): string {
  return join(workspacePath, 'knowledge', ...segments);
}

/** Operations space: traces, drift, sessions, derivation state */
export function opsPath(workspacePath: string, ...segments: string[]): string {
  return join(workspacePath, 'ops', ...segments);
}

/**
 * Resolve an artifact path that works in both layouts.
 * Checks the v2 (three-space) location first, falls back to v1 (flat).
 */
export function resolveArtifactPath(
  workspacePath: string,
  artifact: 'constitution' | 'guardrails' | 'memory',
): string {
  const v2Paths: Record<string, string> = {
    constitution: selfPath(workspacePath, 'constitution.v1.json'),
    guardrails: selfPath(workspacePath, 'guardrails.v1.yaml'),
    memory: selfPath(workspacePath, 'memory.v1.yaml'),
  };

  const v1Paths: Record<string, string> = {
    constitution: join(workspacePath, 'artifacts', 'constitution.v1.json'),
    guardrails: join(workspacePath, 'artifacts', 'guardrails.v1.yaml'),
    memory: join(workspacePath, 'artifacts', 'memory.v1.yaml'),
  };

  const v2Path = v2Paths[artifact];
  if (existsSync(v2Path)) return v2Path;

  const v1Path = v1Paths[artifact];
  if (existsSync(v1Path)) return v1Path;

  // Default to v2 path for new writes
  return v2Path;
}

/** Resolve traces directory (v2: ops/traces, v1: traces/) */
export function resolveTracesPath(workspacePath: string): string {
  const v2 = opsPath(workspacePath, 'traces');
  if (existsSync(v2)) return v2;

  const v1 = join(workspacePath, 'traces');
  if (existsSync(v1)) return v1;

  return v2;
}

/** Resolve skills directory (v2: knowledge/skills, v1: skills/) */
export function resolveSkillsPath(workspacePath: string): string {
  const v2 = knowledgePath(workspacePath, 'skills');
  if (existsSync(v2)) return v2;

  const v1 = join(workspacePath, 'skills');
  if (existsSync(v1)) return v1;

  return v2;
}

/** Resolve playbooks directory (v2: knowledge/playbooks, v1: artifacts/playbooks/) */
export function resolvePlaybooksPath(workspacePath: string): string {
  const v2 = knowledgePath(workspacePath, 'playbooks');
  if (existsSync(v2)) return v2;

  const v1 = join(workspacePath, 'artifacts', 'playbooks');
  if (existsSync(v1)) return v1;

  return v2;
}

/** Resolve session.json path (v2: ops/session.json, v1: session.json) */
export function resolveSessionPath(workspacePath: string): string {
  const v2 = opsPath(workspacePath, 'session.json');
  if (existsSync(v2)) return v2;

  const v1 = join(workspacePath, 'session.json');
  if (existsSync(v1)) return v1;

  return v2;
}

/**
 * Create the three-space directory structure for a new workspace.
 */
export function createThreeSpaceLayout(workspacePath: string): void {
  // Self space — identity artifacts
  ensureDir(selfPath(workspacePath));

  // Knowledge space — skills and playbooks
  ensureDir(knowledgePath(workspacePath, 'skills'));
  ensureDir(knowledgePath(workspacePath, 'playbooks'));

  // Ops space — traces, drift, observations, sessions
  ensureDir(opsPath(workspacePath, 'traces'));
  ensureDir(opsPath(workspacePath, 'drift'));
  ensureDir(opsPath(workspacePath, 'observations'));
  ensureDir(opsPath(workspacePath, 'sessions'));
}

/**
 * Migrate a v1 (flat) workspace to v2 (three-space) layout.
 *
 * File moves:
 *   artifacts/constitution.v1.json  → self/constitution.v1.json
 *   artifacts/guardrails.v1.yaml    → self/guardrails.v1.yaml
 *   artifacts/memory.v1.yaml        → self/memory.v1.yaml
 *   skills/                         → knowledge/skills/
 *   artifacts/playbooks/            → knowledge/playbooks/
 *   traces/                         → ops/traces/
 *   session.json                    → ops/session.json
 *
 * The old directories are left in place (not deleted) for safety.
 */
export function migrateWorkspaceLayout(workspacePath: string): {
  migrated: string[];
  skipped: string[];
} {
  const migrated: string[] = [];
  const skipped: string[] = [];

  // Create new structure
  createThreeSpaceLayout(workspacePath);

  // Move identity artifacts to self/
  const identityMoves: Array<[string, string]> = [
    [join(workspacePath, 'artifacts', 'constitution.v1.json'), selfPath(workspacePath, 'constitution.v1.json')],
    [join(workspacePath, 'artifacts', 'guardrails.v1.yaml'), selfPath(workspacePath, 'guardrails.v1.yaml')],
    [join(workspacePath, 'artifacts', 'memory.v1.yaml'), selfPath(workspacePath, 'memory.v1.yaml')],
  ];

  for (const [src, dest] of identityMoves) {
    if (existsSync(src) && !existsSync(dest)) {
      const content = readFileSync(src, 'utf-8');
      writeFileSafe(dest, content);
      migrated.push(`${src} → ${dest}`);
    } else if (!existsSync(src)) {
      skipped.push(src);
    }
  }

  // Move skills/ → knowledge/skills/
  const oldSkills = join(workspacePath, 'skills');
  const newSkills = knowledgePath(workspacePath, 'skills');
  if (existsSync(oldSkills) && oldSkills !== newSkills) {
    copyDirContents(oldSkills, newSkills);
    migrated.push(`${oldSkills} → ${newSkills}`);
  }

  // Move artifacts/playbooks/ → knowledge/playbooks/
  const oldPlaybooks = join(workspacePath, 'artifacts', 'playbooks');
  const newPlaybooks = knowledgePath(workspacePath, 'playbooks');
  if (existsSync(oldPlaybooks)) {
    copyDirContents(oldPlaybooks, newPlaybooks);
    migrated.push(`${oldPlaybooks} → ${newPlaybooks}`);
  }

  // Move traces/ → ops/traces/
  const oldTraces = join(workspacePath, 'traces');
  const newTraces = opsPath(workspacePath, 'traces');
  if (existsSync(oldTraces) && oldTraces !== newTraces) {
    copyDirContents(oldTraces, newTraces);
    migrated.push(`${oldTraces} → ${newTraces}`);
  }

  // Move session.json → ops/session.json
  const oldSession = join(workspacePath, 'session.json');
  const newSession = opsPath(workspacePath, 'session.json');
  if (existsSync(oldSession) && !existsSync(newSession)) {
    const content = readFileSync(oldSession, 'utf-8');
    writeFileSafe(newSession, content);
    migrated.push(`${oldSession} → ${newSession}`);
  }

  return { migrated, skipped };
}

/** Copy contents of one directory into another (non-destructive) */
function copyDirContents(srcDir: string, destDir: string): void {
  ensureDir(destDir);
  try {
    cpSync(srcDir, destDir, { recursive: true, force: false });
  } catch {
    // Fall back to manual copy if cpSync with force:false fails
    const entries = readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const destPath = join(destDir, entry.name);
      if (!existsSync(destPath)) {
        if (entry.isDirectory()) {
          cpSync(srcPath, destPath, { recursive: true });
        } else {
          writeFileSync(destPath, readFileSync(srcPath));
        }
      }
    }
  }
}
