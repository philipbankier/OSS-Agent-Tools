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

export const AVAILABLE_DOMAINS = [
  ContentAgentDomain,
  ResearchAgentDomain,
  SalesAgentDomain,
  SupportAgentDomain,
  DevelopmentAgentDomain,
] as const;

export function getDomainById(id: string) {
  return AVAILABLE_DOMAINS.find(d => d.id === id);
}

export function listDomains() {
  return AVAILABLE_DOMAINS.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    version: d.version,
    is_stub: d.version.includes('stub'),
  }));
}

export * from './content-agent/index.js';
