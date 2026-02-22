import { describe, expect, it } from 'vitest';
import { TrustAuditor } from '../auditor.js';
import type { BindingsV1 } from '../../schemas/bindings.js';
import type { TrustV1 } from '../../schemas/trust.js';

function trust(pinMode: 'strict' | 'warn', actualFingerprint = 'fp-good'): TrustV1 {
  return {
    schema_version: 'trust.v1',
    mcp_servers: [
      {
        url: 'https://mcp.local',
        fingerprint: actualFingerprint,
        pin_mode: pinMode,
      },
    ],
    skill_sources: [],
    update_policy: {
      allow_auto_updates: false,
      require_review: true,
    },
  };
}

function bindings(fingerprint = 'fp-good'): BindingsV1 {
  return {
    schema_version: 'bindings.v1',
    servers: [
      {
        name: 'local',
        url: 'https://mcp.local',
        pinned_fingerprint: fingerprint,
        tools: [],
      },
    ],
  };
}

describe('TrustAuditor', () => {
  it('passes when fingerprints match', () => {
    const auditor = new TrustAuditor();
    const report = auditor.audit(trust('strict'), bindings('fp-good'));

    expect(report.passed).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('returns warning for unpinned servers', () => {
    const auditor = new TrustAuditor();

    const report = auditor.audit(
      {
        schema_version: 'trust.v1',
        mcp_servers: [],
        skill_sources: [],
        update_policy: { allow_auto_updates: false, require_review: true },
      },
      bindings('fp-any'),
    );

    expect(report.passed).toBe(true);
    expect(report.violations[0].type).toBe('unpinned_server');
    expect(report.violations[0].severity).toBe('warning');
  });

  it('fails on strict fingerprint mismatch and warns on warn mode mismatch', () => {
    const auditor = new TrustAuditor();

    const strictReport = auditor.audit(trust('strict', 'fp-expected'), bindings('fp-actual'));
    expect(strictReport.passed).toBe(false);
    expect(strictReport.violations[0].type).toBe('fingerprint_mismatch');
    expect(strictReport.violations[0].severity).toBe('error');

    const warnReport = auditor.audit(trust('warn', 'fp-expected'), bindings('fp-actual'));
    expect(warnReport.passed).toBe(true);
    expect(warnReport.violations[0].severity).toBe('warning');
  });
});
