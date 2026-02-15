import { z } from 'zod';

/**
 * Skills Manifest v1 Schema
 * 
 * Metadata for the Skills library with progressive disclosure.
 */

export const SkillMetadataSchema = z.object({
  skill_id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  risk_level: z.enum(['low', 'med', 'high']),
  required_tools: z.array(z.string()).describe('MCP tool refs required'),
  compatible_runtimes: z.array(z.string()).describe('Compatible runtime adapters'),
  playbook_ref: z.string().optional().describe('Associated playbook reference'),
});

export const SkillsManifestV1Schema = z.object({
  schema_version: z.literal('skills_manifest.v1'),
  skills: z.array(SkillMetadataSchema),
});

/**
 * SKILL.md Structure (not enforced by schema, but documented here)
 * 
 * Required sections:
 * - Purpose (1-3 sentences)
 * - When to use / When not to use
 * - Inputs / Outputs
 * - Procedure (steps referencing resources/scripts)
 * - Quality checks
 * - Guardrail notes
 * - Progressive disclosure:
 *   - Minimal context (always load)
 *   - On invoke (load when skill is invoked)
 *   - On demand resources (load only if needed)
 */

export type SkillsManifestV1 = z.infer<typeof SkillsManifestV1Schema>;
export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;
