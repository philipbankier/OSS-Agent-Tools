/**
 * Research Agent Domain (STUB)
 * 
 * Domain for information gathering, analysis, and synthesis agents.
 * 
 * STATUS: Stub implementation. Community contributions welcome!
 * See: docs/domains/research-agent.md for contribution guidelines.
 */

import { DomainDefinition } from '../content-agent/domain.js';

export const ResearchAgentDomain: DomainDefinition = {
  id: 'research-agent',
  name: 'Research Agent',
  description: 'Information gathering, analysis, and synthesis',
  version: '0.5.0-stub',
  use_cases: [
    'Market research and competitive analysis',
    'Academic research and literature reviews',
    'News monitoring and trend analysis',
    'Due diligence and fact-checking',
  ],
  recommended_tools: [
    'web-search',
    'academic-databases',
    'news-apis',
    'pdf-reader',
    'data-analysis',
  ],
  default_autonomy_level: 0.7, // Higher autonomy for research
};

// TODO: Add specialized questions in questions.ts
// TODO: Add research skills in skills/
// TODO: Add example playbooks in playbooks/
