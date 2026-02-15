/**
 * Development Agent Domain (STUB)
 * 
 * Domain for software development assistance agents.
 * 
 * STATUS: Stub implementation. Community contributions welcome!
 * See: docs/domains/development-agent.md for contribution guidelines.
 */

import { DomainDefinition } from '../content-agent/domain.js';

export const DevelopmentAgentDomain: DomainDefinition = {
  id: 'development-agent',
  name: 'Development Agent',
  description: 'Software development assistance and automation',
  version: '0.5.0-stub',
  use_cases: [
    'Code review and refactoring',
    'Documentation generation',
    'Bug triage and debugging assistance',
    'Test generation',
  ],
  recommended_tools: [
    'file-system',
    'code-execution',
    'git-integration',
    'linter',
    'test-runner',
  ],
  default_autonomy_level: 0.6, // Moderate-high autonomy for dev tasks
};

// TODO: Add specialized questions in questions.ts
// TODO: Add development skills in skills/
// TODO: Add example playbooks in playbooks/
