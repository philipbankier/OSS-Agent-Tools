/**
 * Development Agent Domain
 *
 * Domain for software development assistance agents.
 */

import { DomainDefinition } from '../content-agent/domain.js';

export const DevelopmentAgentDomain: DomainDefinition = {
  id: 'development-agent',
  name: 'Development Agent',
  description: 'Software development assistance and automation',
  version: '0.5.0',
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
  default_autonomy_level: 0.6,
};
