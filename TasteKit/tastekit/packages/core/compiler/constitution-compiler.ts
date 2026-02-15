import { ConstitutionV1 } from '../schemas/constitution.js';
import { SessionState } from '../schemas/workspace.js';

/**
 * Constitution compiler
 * 
 * Compiles onboarding answers into a constitution.v1.json artifact.
 */

export function compileConstitution(
  session: SessionState,
  generatorVersion: string
): ConstitutionV1 {
  const { answers } = session;
  
  // Parse principles from onboarding
  const principleStatements = answers.goals?.key_principles
    ? answers.goals.key_principles.split(',').map((p: string) => p.trim())
    : [];
  
  const principles = principleStatements.map((statement: string, index: number): any => ({
    id: `principle_${index + 1}`,
    priority: index + 1,
    statement,
    rationale: `Derived from onboarding session ${session.session_id}`,
    applies_to: ['*'],
  }));
  
  // Add primary goal as top principle
  if (answers.goals?.primary_goal) {
    principles.unshift({
      id: 'principle_0',
      priority: 1,
      statement: `Primary goal: ${answers.goals.primary_goal}`,
      rationale: 'User-defined primary goal',
      applies_to: ['*'],
    });
    
    // Adjust priorities
    principles.forEach((p: any, i: number) => {
      p.priority = i + 1;
    });
  }
  
  // Compile tone
  const voiceKeywords = answers.tone?.voice_keywords || [];
  const forbiddenPhrases = answers.tone?.forbidden_phrases
    ? answers.tone.forbidden_phrases.split(',').map((p: string) => p.trim()).filter(Boolean)
    : [];
  
  // Compile tradeoffs
  const tradeoffs = {
    accuracy_vs_speed: answers.tradeoffs?.accuracy_vs_speed || 0.5,
    cost_sensitivity: 0.5, // Default
    autonomy_level: answers.tradeoffs?.autonomy_level || 0.5,
  };
  
  return {
    schema_version: 'constitution.v1',
    generated_at: new Date().toISOString(),
    generator_version: generatorVersion,
    user_scope: 'single_user',
    
    principles,
    
    tone: {
      voice_keywords: voiceKeywords,
      forbidden_phrases: forbiddenPhrases,
      formatting_rules: [],
    },
    
    tradeoffs,
    
    evidence_policy: {
      require_citations_for: ['facts', 'statistics', 'claims'],
      uncertainty_language_rules: [
        'Use "likely" or "probably" for uncertain statements',
        'Use "I don\'t know" when information is unavailable',
      ],
    },
    
    taboos: {
      never_do: [
        'Share personal information without consent',
        'Make decisions with irreversible consequences without approval',
      ],
      must_escalate: [
        'Financial transactions',
        'Legal decisions',
        'Medical advice',
      ],
    },
    
    trace_map: {
      _session_id: session.session_id,
      _answers: answers,
    },
  };
}
