/**
 * Support Agent Domain (STUB)
 * 
 * Domain for customer support, troubleshooting, and user assistance agents.
 * 
 * STATUS: Stub implementation. Community contributions welcome!
 * See: docs/domains/support-agent.md for contribution guidelines.
 */

import { DomainDefinition } from '../content-agent/domain.js';

export const SupportAgentDomain: DomainDefinition = {
  id: 'support-agent',
  name: 'Support Agent',
  description: 'Customer support, troubleshooting, and user assistance',
  version: '0.5.0-stub',
  use_cases: [
    'Customer support ticket triage and response',
    'Knowledge base management',
    'Onboarding assistance',
    'Escalation management',
  ],
  recommended_tools: [
    'ticket-system',
    'knowledge-base',
    'email-sender',
    'chat-integration',
    'screen-reader',
  ],
  default_autonomy_level: 0.4, // Lower autonomy for customer-facing
};

// TODO: Add specialized questions in questions.ts
// TODO: Add support skills in skills/
// TODO: Add example playbooks in playbooks/
