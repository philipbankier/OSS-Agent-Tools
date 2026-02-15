/**
 * Sales Agent Domain (STUB)
 * 
 * Domain for lead generation, qualification, and deal management agents.
 * 
 * STATUS: Stub implementation. Community contributions welcome!
 * See: docs/domains/sales-agent.md for contribution guidelines.
 */

import { DomainDefinition } from '../content-agent/domain.js';

export const SalesAgentDomain: DomainDefinition = {
  id: 'sales-agent',
  name: 'Sales Agent',
  description: 'Lead generation, qualification, and deal management',
  version: '0.5.0-stub',
  use_cases: [
    'Lead qualification and outreach',
    'CRM management and follow-ups',
    'Proposal generation',
    'Sales analytics and forecasting',
  ],
  recommended_tools: [
    'crm-integration',
    'email-sender',
    'calendar-scheduler',
    'document-generator',
    'web-search',
  ],
  default_autonomy_level: 0.5, // Moderate autonomy for sales
};

// TODO: Add specialized questions in questions.ts
// TODO: Add sales skills in skills/
// TODO: Add example playbooks in playbooks/
