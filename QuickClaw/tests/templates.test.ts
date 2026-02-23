import { describe, expect, it } from 'vitest';
import { buildDefaultConfig } from '../src/config/schema.js';
import { generateDeterministicDocuments } from '../src/core/templates.js';

describe('template generation', () => {
  it('produces required workspace sections', () => {
    const docs = generateDeterministicDocuments(buildDefaultConfig());

    expect(docs['AGENTS.md']).toContain('Session Startup');
    expect(docs['SOUL.md']).toContain('Boundaries');
    expect(docs['MEMORY.md']).toContain('Long-Term Rules');
    expect(docs['ops/coding-policy.md']).toContain('Model Split');
    expect(docs['HEARTBEAT.md']).toContain('HEARTBEAT_OK');
  });
});
