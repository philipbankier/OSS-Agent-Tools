import { join } from 'path';
import { SessionState } from '../schemas/workspace.js';
import { writeFileSafe, atomicWrite } from '../utils/filesystem.js';
import { stringifyYAML } from '../utils/yaml.js';
import { compileConstitution } from './constitution-compiler.js';
import { compileGuardrails } from './guardrails-compiler.js';
import { compileMemoryPolicy } from './memory-compiler.js';
import { compileSkills } from './skills-compiler.js';
import { compilePlaybooks } from './playbook-compiler.js';

/**
 * Main compiler orchestrator
 */

export interface CompilationOptions {
  workspacePath: string;
  session: SessionState;
  generatorVersion: string;
}

export interface CompilationResult {
  success: boolean;
  artifacts: string[];
  errors?: string[];
}

export async function compile(options: CompilationOptions): Promise<CompilationResult> {
  const { workspacePath, session, generatorVersion } = options;
  const artifacts: string[] = [];
  const errors: string[] = [];
  
  try {
    // Compile constitution
    const constitution = compileConstitution(session, generatorVersion);
    const constitutionPath = join(workspacePath, 'artifacts', 'constitution.v1.json');
    atomicWrite(constitutionPath, JSON.stringify(constitution, null, 2));
    artifacts.push('constitution.v1.json');
    
    // Compile guardrails
    const guardrails = compileGuardrails(session);
    const guardrailsPath = join(workspacePath, 'artifacts', 'guardrails.v1.yaml');
    atomicWrite(guardrailsPath, stringifyYAML(guardrails));
    artifacts.push('guardrails.v1.yaml');
    
    // Compile memory policy
    const memory = compileMemoryPolicy(session);
    const memoryPath = join(workspacePath, 'artifacts', 'memory.v1.yaml');
    atomicWrite(memoryPath, stringifyYAML(memory));
    artifacts.push('memory.v1.yaml');
    
    // Compile skills library
    const skillArtifacts = await compileSkills({
      workspacePath,
      session,
      constitution,
    });
    artifacts.push(...skillArtifacts);

    // Generate playbooks
    const playbookArtifacts = await compilePlaybooks({
      workspacePath,
      session,
      constitution,
    });
    artifacts.push(...playbookArtifacts);

    return {
      success: true,
      artifacts,
    };
    
  } catch (error) {
    return {
      success: false,
      artifacts,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
