/**
 * OpenClaw Adapter
 * 
 * Exports TasteKit artifacts to OpenClaw format.
 */

import { TasteKitAdapter, ExportOpts, InstallOpts } from '../adapter-interface.js';
import { readFileSync, writeFileSync, cpSync, existsSync } from 'fs';
import { join } from 'path';

export class OpenClawAdapter implements TasteKitAdapter {
  id = 'openclaw';
  version = '1.0.0';
  
  async detect(target: string): Promise<boolean> {
    // Check if target has OpenClaw configuration
    return existsSync(join(target, 'openclaw.config.json'));
  }
  
  async export(profilePath: string, outDir: string, opts: ExportOpts): Promise<void> {
    // Read TasteKit artifacts
    const constitutionPath = join(profilePath, 'artifacts', 'constitution.v1.json');
    const guardrailsPath = join(profilePath, 'artifacts', 'guardrails.v1.yaml');
    
    if (!existsSync(constitutionPath)) {
      throw new Error('Constitution not found. Run tastekit compile first.');
    }
    
    const constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
    
    // Generate OpenClaw configuration
    const config = this.generateOpenClawConfig(constitution);
    
    // Write configuration
    writeFileSync(
      join(outDir, 'openclaw.config.json'),
      JSON.stringify(config, null, 2)
    );
    
    // Copy skills
    if (opts.includeSkills) {
      const skillsPath = join(profilePath, 'skills');
      if (existsSync(skillsPath)) {
        cpSync(skillsPath, join(outDir, 'skills'), { recursive: true });
      }
    }
  }
  
  async install(outDir: string, target: string, opts: InstallOpts): Promise<void> {
    // Copy configuration to target
    cpSync(outDir, target, { recursive: true });
  }
  
  private generateOpenClawConfig(constitution: any): any {
    return {
      version: '1.0',
      profile: {
        principles: constitution.principles,
        tone: constitution.tone,
        tradeoffs: constitution.tradeoffs,
      },
      behavior: {
        autonomy_level: constitution.tradeoffs.autonomy_level,
        require_citations: constitution.evidence_policy.require_citations_for,
      },
      safety: {
        forbidden_phrases: constitution.tone.forbidden_phrases,
        taboos: constitution.taboos,
      },
    };
  }
}
