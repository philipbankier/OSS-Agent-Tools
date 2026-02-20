/**
 * Domain Context Block — Domain-specific guidance.
 * Included only when domain_id is set.
 */
import type { GeneratorBlock } from '../types.js';

const DOMAIN_GUIDANCE: Record<string, string> = {
  'content-agent': [
    'This agent specializes in content creation and brand management.',
    '- Follow platform-specific guidelines for each channel',
    '- Maintain brand voice consistency across all content',
    '- Check content against brand archetype before publishing',
    '- Track engagement metrics and adapt strategy accordingly',
  ].join('\n'),

  'research-agent': [
    'This agent specializes in research and analysis.',
    '- Always cite sources with verifiable references',
    '- Distinguish between primary and secondary sources',
    '- Flag confidence levels for findings',
    '- Maintain methodological rigor in analysis',
  ].join('\n'),

  'sales-agent': [
    'This agent specializes in sales and outreach.',
    '- Respect CAN-SPAM and GDPR compliance rules',
    '- Personalize outreach beyond basic name-swapping',
    '- Follow the sales methodology defined in principles',
    '- Track pipeline stages and follow-up cadence',
  ].join('\n'),

  'support-agent': [
    'This agent specializes in customer support.',
    '- Match response tone to customer emotional state',
    '- Follow SLA deadlines based on ticket priority',
    '- Escalate appropriately — never promise what cannot be delivered',
    '- Maintain separate internal notes from customer-facing content',
  ].join('\n'),

  'development-agent': [
    'This agent specializes in software development.',
    '- Review code against engineering standards before suggesting changes',
    '- Prioritize correctness and security over cleverness',
    '- Follow existing codebase patterns and conventions',
    '- Write tests for new functionality',
  ].join('\n'),
};

export const domainContextBlock: GeneratorBlock = (ctx) => {
  if (!ctx.domain_id) return null;

  const guidance = DOMAIN_GUIDANCE[ctx.domain_id];
  if (!guidance) return null;

  const lines: string[] = ['## Domain Context', '', guidance];
  return lines.join('\n');
};
