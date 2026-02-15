import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Skills linter
 * 
 * Validates Skills structure and progressive disclosure constraints.
 */

export interface LintResult {
  valid: boolean;
  errors: LintError[];
  warnings: LintWarning[];
}

export interface LintError {
  skill_id: string;
  message: string;
  severity: 'error';
}

export interface LintWarning {
  skill_id: string;
  message: string;
  severity: 'warning';
}

const REQUIRED_SECTIONS = [
  'Purpose',
  'When to use',
  'When not to use',
  'Inputs',
  'Outputs',
  'Procedure',
  'Quality checks',
  'Guardrail notes',
  'Progressive disclosure',
];

const MAX_SKILL_SIZE = 50 * 1024; // 50 KB

export function lintSkills(skillsPath: string): LintResult {
  const errors: LintError[] = [];
  const warnings: LintWarning[] = [];
  
  // Check if skills directory exists
  if (!existsSync(skillsPath)) {
    errors.push({
      skill_id: '_global',
      message: 'Skills directory does not exist',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }
  
  // Get all skill directories
  const entries = readdirSync(skillsPath, { withFileTypes: true });
  const skillDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  
  // Lint each skill
  for (const skillId of skillDirs) {
    const skillPath = join(skillsPath, skillId);
    const skillMdPath = join(skillPath, 'SKILL.md');
    
    // Check SKILL.md exists
    if (!existsSync(skillMdPath)) {
      errors.push({
        skill_id: skillId,
        message: 'SKILL.md not found',
        severity: 'error',
      });
      continue;
    }
    
    // Read SKILL.md
    const content = readFileSync(skillMdPath, 'utf-8');
    
    // Check size
    if (content.length > MAX_SKILL_SIZE) {
      warnings.push({
        skill_id: skillId,
        message: `SKILL.md exceeds recommended size (${content.length} > ${MAX_SKILL_SIZE} bytes)`,
        severity: 'warning',
      });
    }
    
    // Check required sections
    for (const section of REQUIRED_SECTIONS) {
      if (!content.includes(`## ${section}`)) {
        errors.push({
          skill_id: skillId,
          message: `Missing required section: ${section}`,
          severity: 'error',
        });
      }
    }
    
    // Check progressive disclosure sections
    const hasMinimalContext = content.includes('### Minimal context');
    const hasOnInvoke = content.includes('### On invoke');
    const hasOnDemand = content.includes('### On demand');
    
    if (!hasMinimalContext || !hasOnInvoke || !hasOnDemand) {
      warnings.push({
        skill_id: skillId,
        message: 'Progressive disclosure sections incomplete',
        severity: 'warning',
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
