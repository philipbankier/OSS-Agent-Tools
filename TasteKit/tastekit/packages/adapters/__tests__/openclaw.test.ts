import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { OpenClawAdapter } from '../openclaw/index.js';
import { cleanupFixture, createProfileFixture, type Layout } from './helpers.js';

for (const layout of ['v1', 'v2'] as Layout[]) {
  describe(`OpenClawAdapter (${layout})`, () => {
    it('exports openclaw config and optional skills', async () => {
      const { rootDir, profilePath } = createProfileFixture(layout);
      const outDir = join(rootDir, 'export-openclaw');

      try {
        mkdirSync(outDir, { recursive: true });
        const adapter = new OpenClawAdapter();
        await adapter.export(profilePath, outDir, {
          includeSkills: true,
          includePlaybooks: true,
        });

        expect(existsSync(join(outDir, 'openclaw.config.json'))).toBe(true);
        expect(existsSync(join(outDir, 'skills', 'manifest.v1.yaml'))).toBe(true);

        const config = JSON.parse(readFileSync(join(outDir, 'openclaw.config.json'), 'utf-8'));
        expect(config.profile.principles).toHaveLength(1);
        expect(config.safety.taboos.never_do).toContain('Never fabricate citations');
      } finally {
        cleanupFixture(rootDir);
      }
    });
  });
}
