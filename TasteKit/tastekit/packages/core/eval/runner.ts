import { EvalPackV1, EvalScenario } from '../schemas/evalpack.js';
import { Judge, JudgmentResult } from './judge.js';

/**
 * Eval Runner
 * 
 * Runs evaluation packs and produces reports.
 */

export interface EvalResult {
  scenario_id: string;
  passed: boolean;
  score: number;
  judgments: JudgmentResult[];
  outputs: any;
}

export interface EvalReport {
  evalpack_id: string;
  timestamp: string;
  results: EvalResult[];
  overall_score: number;
  passed: boolean;
}

export class EvalRunner {
  private judge: Judge;
  
  constructor() {
    this.judge = new Judge();
  }
  
  async runEvalPack(evalPack: EvalPackV1): Promise<EvalReport> {
    const results: EvalResult[] = [];
    
    for (const scenario of evalPack.scenarios) {
      const result = await this.runScenario(scenario, evalPack);
      results.push(result);
    }
    
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const passed = results.every(r => r.passed);
    
    return {
      evalpack_id: evalPack.id,
      timestamp: new Date().toISOString(),
      results,
      overall_score: overallScore,
      passed,
    };
  }
  
  private async runScenario(scenario: EvalScenario, evalPack: EvalPackV1): Promise<EvalResult> {
    // TODO: Execute scenario (would involve running agent with inputs)
    // For now, this is a stub
    
    const mockOutputs = {
      content: 'Mock output for scenario',
    };
    
    // Judge the outputs
    const judgments = await this.judge.judgeOutputs(
      mockOutputs,
      evalPack.judging,
      scenario.expected
    );
    
    const totalScore = judgments.reduce((sum, j) => sum + j.score, 0) / judgments.length;
    const passed = judgments.every(j => j.passed);
    
    return {
      scenario_id: scenario.scenario_id,
      passed,
      score: totalScore,
      judgments,
      outputs: mockOutputs,
    };
  }
}
