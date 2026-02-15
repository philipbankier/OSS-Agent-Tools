import { TrustV1 } from '../schemas/trust.js';
import { BindingsV1 } from '../schemas/bindings.js';

/**
 * Trust Auditor
 * 
 * Audits trust policy and flags violations.
 */

export interface AuditViolation {
  type: 'fingerprint_mismatch' | 'unpinned_server' | 'unpinned_skill' | 'new_tool';
  severity: 'error' | 'warning';
  message: string;
  details?: any;
}

export interface AuditReport {
  timestamp: string;
  violations: AuditViolation[];
  passed: boolean;
}

export class TrustAuditor {
  audit(trust: TrustV1, bindings: BindingsV1): AuditReport {
    const violations: AuditViolation[] = [];
    
    // Check all bound servers are pinned
    for (const server of bindings.servers) {
      const pinned = trust.mcp_servers.find(s => s.url === server.url);
      
      if (!pinned) {
        violations.push({
          type: 'unpinned_server',
          severity: 'warning',
          message: `MCP server not pinned: ${server.name}`,
          details: { url: server.url },
        });
      } else if (server.pinned_fingerprint && server.pinned_fingerprint !== pinned.fingerprint) {
        violations.push({
          type: 'fingerprint_mismatch',
          severity: pinned.pin_mode === 'strict' ? 'error' : 'warning',
          message: `Fingerprint mismatch for server: ${server.name}`,
          details: {
            expected: pinned.fingerprint,
            actual: server.pinned_fingerprint,
          },
        });
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      violations,
      passed: violations.filter(v => v.severity === 'error').length === 0,
    };
  }
}
