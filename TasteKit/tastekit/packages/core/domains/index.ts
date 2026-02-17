/**
 * TasteKit Domains Registry
 *
 * Central registry of all available domains.
 */

import { ContentAgentDomain } from './content-agent/domain.js';
import { ResearchAgentDomain } from './research-agent/domain.js';
import { SalesAgentDomain } from './sales-agent/domain.js';
import { SupportAgentDomain } from './support-agent/domain.js';
import { DevelopmentAgentDomain } from './development-agent/domain.js';
import { ContentAgentRubric } from './content-agent/rubric.js';
import { DevelopmentAgentRubric } from './development-agent/rubric.js';
import { DomainRubric } from '../interview/rubric.js';

export const AVAILABLE_DOMAINS = [
  ContentAgentDomain,
  ResearchAgentDomain,
  SalesAgentDomain,
  SupportAgentDomain,
  DevelopmentAgentDomain,
] as const;

/** Map of domain_id → rubric for domains that have rubrics */
const DOMAIN_RUBRICS: Record<string, DomainRubric> = {
  'content-agent': ContentAgentRubric,
  'development-agent': DevelopmentAgentRubric,
};

export function getDomainById(id: string) {
  return AVAILABLE_DOMAINS.find(d => d.id === id);
}

export function getDomainRubric(id: string): DomainRubric | undefined {
  return DOMAIN_RUBRICS[id];
}

export function listDomains() {
  return AVAILABLE_DOMAINS.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    version: d.version,
    is_stub: d.version.includes('stub'),
    has_rubric: d.id in DOMAIN_RUBRICS,
  }));
}

export * from './content-agent/index.js';
