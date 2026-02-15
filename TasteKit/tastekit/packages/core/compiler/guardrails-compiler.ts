import { GuardrailsV1 } from '../schemas/guardrails.js';
import { SessionState } from '../schemas/workspace.js';

/**
 * Guardrails compiler
 * 
 * Compiles guardrails based on autonomy level and safety preferences.
 */

export function compileGuardrails(session: SessionState): GuardrailsV1 {
  const { answers } = session;
  const autonomyLevel = answers.tradeoffs?.autonomy_level || 0.5;
  
  // Default permissions (will be populated when MCP tools are bound)
  const permissions: any[] = [];
  
  // Approval rules based on autonomy level
  const approvals = [];
  
  if (autonomyLevel < 0.4) {
    // Low autonomy - require approval for most actions
    approvals.push({
      rule_id: 'approve_all_writes',
      when: 'action.type == "write" || action.type == "delete"',
      action: 'require_approval' as const,
      channel: 'cli' as const,
    });
  } else if (autonomyLevel < 0.7) {
    // Medium autonomy - require approval for destructive actions
    approvals.push({
      rule_id: 'approve_destructive',
      when: 'action.type == "delete" || action.risk_score > 0.7',
      action: 'require_approval' as const,
      channel: 'cli' as const,
    });
  }
  
  // Always require approval for high-risk actions
  approvals.push({
    rule_id: 'approve_high_risk',
    when: 'action.risk_score > 0.9',
    action: 'require_approval' as const,
    channel: 'cli' as const,
  });
  
  // Rate limits (default conservative limits)
  const rate_limits = [
    {
      tool_ref: '*:*',
      limit: 100,
      window: '1h',
    },
  ];
  
  return {
    schema_version: 'guardrails.v1',
    permissions,
    approvals,
    rate_limits,
  };
}
