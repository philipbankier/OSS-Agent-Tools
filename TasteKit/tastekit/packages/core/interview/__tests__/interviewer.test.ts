import { describe, expect, it } from 'vitest';
import { Interviewer } from '../interviewer.js';
import type { DomainRubric } from '../rubric.js';
import type { LLMCompletionOptions, LLMMessage, LLMProvider } from '../../llm/provider.js';

class QueueLLM implements LLMProvider {
  readonly name = 'mock-llm';
  private responses: string[];

  constructor(responses: string[]) {
    this.responses = [...responses];
  }

  async complete(_messages: LLMMessage[], _options?: LLMCompletionOptions): Promise<{ content: string }> {
    const content = this.responses.shift();
    if (!content) {
      throw new Error('No mock response available');
    }
    return { content };
  }
}

function makeRubric(withCascade = true): DomainRubric {
  return {
    domain_id: 'test-domain',
    version: '1.0.0',
    interview_goal: 'Collect test preferences',
    includes_universal: false,
    dimensions: [
      {
        id: 'focus',
        name: 'Focus',
        description: 'Primary focus',
        maps_to: ['principles'],
        depth_tiers: ['quick', 'guided', 'operator'],
        exploration_hints: ['Ask what matters most'],
        coverage_criteria: ['A clear preference is stated'],
        cascade_to: withCascade ? [{ dimension_id: 'style', weight: 0.4 }] : undefined,
      },
      {
        id: 'style',
        name: 'Style',
        description: 'Communication style',
        maps_to: ['tone'],
        depth_tiers: ['quick', 'guided', 'operator'],
        exploration_hints: ['Ask for style adjectives'],
        coverage_criteria: ['At least one style preference is captured'],
      },
    ],
  };
}

const extractionJson = JSON.stringify({
  principles: [
    {
      statement: 'Prioritize correctness',
      rationale: 'Prevents regressions',
      priority: 1,
      applies_to: ['*'],
      examples_good: [],
      examples_bad: [],
      source_dimension: 'focus',
    },
  ],
  tone: {
    voice_keywords: ['clear'],
    forbidden_phrases: ['hype'],
    formatting_rules: ['use bullets'],
    source_dimensions: ['style'],
  },
  tradeoffs: {
    accuracy_vs_speed: 0.8,
    cost_sensitivity: 0.5,
    autonomy_level: 0.4,
    source_dimensions: ['focus'],
  },
  evidence_policy: {
    require_citations_for: ['facts'],
    uncertainty_language_rules: ['say likely when unsure'],
    source_dimensions: ['focus'],
  },
  taboos: {
    never_do: ['fabricate data'],
    must_escalate: ['production deletions'],
    source_dimensions: ['focus'],
  },
  domain_specific: {},
});

describe('Interviewer confidence-weighted coverage', () => {
  it('accumulates signals and cascades inferred confidence', async () => {
    const llm = new QueueLLM([
      `Opening question\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.2,"signal_source":"implicit","summary":"Initial hint","facts":["prefers rigor"],"anti_signals":[]}},"should_complete":false}\nCOVERAGE-->`,
      `Follow-up question\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.3,"signal_source":"explicit","summary":"Strong preference","facts":["correctness over speed"],"anti_signals":["avoid fluff"]}},"should_complete":true}\nCOVERAGE-->`,
      extractionJson,
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(true),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => 'I care about correctness over speed.',
    });

    const structured = await interviewer.run();
    const state = interviewer.getState();

    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');
    const style = state.dimension_coverage.find(d => d.dimension_id === 'style');

    expect(focus?.confidence).toBe(1.5);
    expect(focus?.status).toBe('covered');
    expect(focus?.anti_signals).toContain('avoid fluff');

    expect(style?.confidence).toBe(0.4);
    expect(style?.status).toBe('in_progress');
    expect(style?.signals.some(s => s.source === 'inferred')).toBe(true);

    expect(state.structured_answers).toBeTruthy();
    expect(structured.principles).toHaveLength(1);
  });

  it('records anti-signals without increasing confidence', async () => {
    const llm = new QueueLLM([
      `Start\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `Noted\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.0,"signal_source":"anti","summary":"Negative preference","facts":[],"anti_signals":["avoid buzzwords"]}},"should_complete":true}\nCOVERAGE-->`,
      extractionJson,
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => 'No buzzwords please.',
    });

    await interviewer.run();
    const state = interviewer.getState();
    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');

    expect(focus?.confidence).toBe(0);
    expect(focus?.anti_signals).toContain('avoid buzzwords');
  });
});
