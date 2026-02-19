/**
 * Claude Code Adapter
 * 
 * Exports TasteKit artifacts to Claude Code format.
 */

import { TasteKitAdapter, ExportOpts, InstallOpts } from '../adapter-interface.js';
import { readFileSync, writeFileSync, cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class ClaudeCodeAdapter implements TasteKitAdapter {
  id = 'claude-code';
  version = '1.0.0';
  
  async detect(target: string): Promise<boolean> {
    // Check if target has Claude Code configuration
    return existsSync(join(target, '.claude', 'config.json'));
  }
  
  async export(profilePath: string, outDir: string, opts: ExportOpts): Promise<void> {
    // Read TasteKit artifacts
    const constitutionPath = join(profilePath, 'artifacts', 'constitution.v1.json');
    const guardrailsPath = join(profilePath, 'artifacts', 'guardrails.v1.yaml');
    
    if (!existsSync(constitutionPath)) {
      throw new Error('Constitution not found. Run tastekit compile first.');
    }
    
    const constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
    
    // Generate Claude Code hooks configuration
    const hooksConfig = this.generateHooksConfig(constitution);
    
    // Write to output directory
    const claudeDir = join(outDir, '.claude');
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }
    
    writeFileSync(
      join(claudeDir, 'hooks.json'),
      JSON.stringify(hooksConfig, null, 2)
    );
    
    // Copy skills if requested
    if (opts.includeSkills) {
      const skillsPath = join(profilePath, 'skills');
      if (existsSync(skillsPath)) {
        cpSync(skillsPath, join(outDir, 'skills'), { recursive: true });
      }
    }
  }
  
  async install(outDir: string, target: string, opts: InstallOpts): Promise<void> {
    // Copy generated files to target
    cpSync(outDir, target, { recursive: true });
  }
  
  private generateHooksConfig(constitution: any): any {
    return {
      version: '1.0',
      principles: constitution.principles.map((p: any) => ({
        id: p.id,
        statement: p.statement,
        priority: p.priority,
      })),
      tone: {
        voice: constitution.tone.voice_keywords.join(', '),
        forbidden: constitution.tone.forbidden_phrases,
      },
      enforcement: {
        pre_execution: [
          {
            hook: 'check_forbidden_phrases',
            enabled: true,
          },
        ],
        post_execution: [
          {
            hook: 'log_trace',
            enabled: true,
          },
        ],
      },
    };
  }
}
