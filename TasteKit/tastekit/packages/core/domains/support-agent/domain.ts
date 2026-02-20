/**
 * Support Agent Domain
 *
 * Domain for customer support, troubleshooting, and user assistance agents.
 */

import { DomainDefinition } from '../content-agent/domain.js';

export const SupportAgentDomain: DomainDefinition = {
  id: 'support-agent',
  name: 'Support Agent',
  description: 'Customer support, troubleshooting, and user assistance',
  version: '0.5.0',
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
  default_autonomy_level: 0.4,
  vocabulary: {
    principles_heading: 'Support Policies',
    guardrails_heading: 'Escalation Rules',
    skills_heading: 'Support Procedures',
    constitution_label: 'Support Handbook',
    skill_label: 'Procedure',
    playbook_label: 'Resolution Flow',
    drift_verb: 'Policy drift',
  },
};

export const SUPPORT_CHANNELS = [
  'email',
  'chat',
  'phone',
  'social_media',
  'self_service',
] as const;

export type SupportChannel = typeof SUPPORT_CHANNELS[number];

export const TICKET_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
] as const;

export type TicketPriority = typeof TICKET_PRIORITIES[number];
