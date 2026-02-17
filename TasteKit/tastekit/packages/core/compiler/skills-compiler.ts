import { join } from 'path';
import { writeFileSafe } from '../utils/filesystem.js';
import { stringifyYAML } from '../utils/yaml.js';
import { SkillsManifestV1, SkillMetadata } from '../schemas/skills.js';
import { ConstitutionV1 } from '../schemas/constitution.js';
import { SessionState } from '../schemas/workspace.js';

/**
 * Domain skill definition — what domain skill files export.
 */
interface DomainSkill {
  skill_id: string;
  name: string;
  description: string;
  tags?: string[];
  risk_level: 'low' | 'med' | 'high';
  required_tools: string[];
  compatible_runtimes?: string[];
  skill_md_content: string;
}

export interface SkillsCompilationOptions {
  workspacePath: string;
  session: SessionState;
  constitution: ConstitutionV1;
}

/**
 * Compile skills library from domain skills + constitution.
 *
 * Resolves domain-specific pre-built skills, writes SKILL.md files,
 * and generates the skills manifest.
 */
export async function compileSkills(options: SkillsCompilationOptions): Promise<string[]> {
  const { workspacePath, session, constitution } = options;
  const skillsPath = join(workspacePath, 'skills');
  const artifacts: string[] = [];

  // Resolve domain skills
  const domainSkills = await resolveDomainSkills(session.domain_id);
  const allSkills: SkillMetadata[] = [];

  // Write each domain skill's SKILL.md
  for (const skill of domainSkills) {
    const metadata: SkillMetadata = {
      skill_id: skill.skill_id,
      name: skill.name,
      description: skill.description,
      tags: skill.tags ?? [skill.skill_id],
      risk_level: skill.risk_level,
      required_tools: skill.required_tools,
      compatible_runtimes: skill.compatible_runtimes ?? ['claude-code', 'openclaw'],
    };

    allSkills.push(metadata);

    // Write the SKILL.md content
    writeFileSafe(
      join(skillsPath, skill.skill_id, 'SKILL.md'),
      skill.skill_md_content,
    );
  }

  // If no domain skills were found, generate a generic skill from constitution
  if (allSkills.length === 0) {
    const genericSkill = generateGenericSkill(constitution);
    allSkills.push(genericSkill.metadata);
    writeFileSafe(
      join(skillsPath, genericSkill.metadata.skill_id, 'SKILL.md'),
      genericSkill.markdown,
    );
  }

  // Write manifest
  const manifest: SkillsManifestV1 = {
    schema_version: 'skills_manifest.v1',
    skills: allSkills,
  };

  writeFileSafe(
    join(skillsPath, 'manifest.v1.yaml'),
    stringifyYAML(manifest),
  );
  artifacts.push('skills/manifest.v1.yaml');

  return artifacts;
}

/**
 * Dynamically resolve domain skills by domain_id.
 */
async function resolveDomainSkills(domainId?: string): Promise<DomainSkill[]> {
  if (!domainId) return [];

  switch (domainId) {
    case 'content-agent': {
      const { ContentAgentSkills } = await import('../domains/content-agent/skills/index.js');
      return ContentAgentSkills as DomainSkill[];
    }
    case 'research-agent': {
      const { ResearchAgentSkills } = await import('../domains/research-agent/skills/index.js');
      return ResearchAgentSkills as DomainSkill[];
    }
    case 'sales-agent': {
      const { SalesAgentSkills } = await import('../domains/sales-agent/skills/index.js');
      return SalesAgentSkills as DomainSkill[];
    }
    case 'support-agent': {
      const { SupportAgentSkills } = await import('../domains/support-agent/skills/index.js');
      return SupportAgentSkills as DomainSkill[];
    }
    default:
      return [];
  }
}

/**
 * Generate a generic skill when no domain skills are available.
 * Uses constitution data to personalize the skill.
 */
function generateGenericSkill(constitution: ConstitutionV1): {
  metadata: SkillMetadata;
  markdown: string;
} {
  const metadata: SkillMetadata = {
    skill_id: 'general-task',
    name: 'General Task Execution',
    description: 'Execute tasks following user principles and tone preferences',
    tags: ['general', 'task-execution'],
    risk_level: 'low',
    required_tools: [],
    compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  };

  const principlesList = constitution.principles
    .slice(0, 5)
    .map(p => `- ${p.statement}`)
    .join('\n');

  const voiceKeywords = constitution.tone.voice_keywords.join(', ') || 'not specified';
  const forbiddenPhrases = constitution.tone.forbidden_phrases.join(', ') || 'none';

  const markdown = `# ${metadata.name}

## Purpose

${metadata.description}

## When to use

Use this skill for general tasks that don't have a specialized skill.

## When not to use

When a domain-specific skill exists for the task type.

## Inputs

- **task**: Description of the task to perform
- **context**: Any relevant context or constraints

## Outputs

- Task result following user's principles and tone

## Procedure

### Minimal context (always load)

Apply these principles:
${principlesList}

Voice: ${voiceKeywords}
Avoid: ${forbiddenPhrases}

### On invoke (load when skill is invoked)

1. Understand the task requirements
2. Plan approach following principles
3. Execute while respecting tone preferences
4. Check output against quality criteria

### On demand resources

- User constitution for full principle details
- Guardrails for approval requirements

## Quality checks

- [ ] Output follows user principles
- [ ] Tone matches voice keywords
- [ ] No forbidden phrases used
- [ ] Task requirements fully addressed

## Guardrail notes

Check autonomy level before taking irreversible actions.
`;

  return { metadata, markdown };
}
