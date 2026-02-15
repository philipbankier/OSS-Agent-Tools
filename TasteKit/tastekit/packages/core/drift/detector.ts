import { TraceEvent } from '../schemas/trace.js';
import { TraceReader } from '../tracing/reader.js';
import { DriftProposal } from './proposal.js';

/**
 * Drift Detector
 * 
 * Detects drift from traces, feedback, and violations.
 */

export interface DriftDetectionOptions {
  since?: Date;
  skillId?: string;
  mode?: 'violations' | 'staleness';
}

export interface DriftSignal {
  type: 'repeated_edit' | 'principle_violation' | 'user_correction' | 'tool_change';
  frequency: number;
  context: any;
}

export class DriftDetector {
  private reader: TraceReader;
  
  constructor() {
    this.reader = new TraceReader();
  }
  
  detectFromTraces(tracePaths: string[], options: DriftDetectionOptions = {}): DriftProposal[] {
    const proposals: DriftProposal[] = [];
    
    // Collect all events
    const allEvents: TraceEvent[] = [];
    for (const path of tracePaths) {
      const events = this.reader.readTrace(path);
      allEvents.push(...events);
    }
    
    // Filter by options
    let filteredEvents = allEvents;
    if (options.since) {
      filteredEvents = filteredEvents.filter(
        e => new Date(e.timestamp) >= options.since!
      );
    }
    if (options.skillId) {
      filteredEvents = this.reader.filterBySkill(filteredEvents, options.skillId);
    }
    
    // Detect signals
    const signals = this.detectSignals(filteredEvents);
    
    // Generate proposals from signals
    for (const signal of signals) {
      if (signal.frequency >= 3) { // Threshold for considering drift
        proposals.push(this.createProposalFromSignal(signal));
      }
    }
    
    return proposals;
  }
  
  private detectSignals(events: TraceEvent[]): DriftSignal[] {
    const signals: DriftSignal[] = [];
    
    // Detect repeated edits
    const approvalResponses = this.reader.filterByEventType(events, 'approval_response');
    const rejections = approvalResponses.filter(e => e.data?.approved === false);
    
    if (rejections.length > 0) {
      // Group by reason
      const reasonCounts = new Map<string, number>();
      for (const rejection of rejections) {
        const reason = rejection.data?.reason || 'unknown';
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      }
      
      for (const [reason, count] of reasonCounts) {
        signals.push({
          type: 'repeated_edit',
          frequency: count,
          context: { reason },
        });
      }
    }
    
    // Detect errors (potential principle violations)
    const errors = this.reader.getErrors(events);
    if (errors.length > 0) {
      signals.push({
        type: 'principle_violation',
        frequency: errors.length,
        context: { errors: errors.slice(0, 5) }, // Sample
      });
    }
    
    return signals;
  }
  
  private createProposalFromSignal(signal: DriftSignal): DriftProposal {
    const proposalId = `drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let proposedChanges: any = {};
    let rationale = '';
    
    switch (signal.type) {
      case 'repeated_edit':
        rationale = `User repeatedly rejected actions with reason: "${signal.context.reason}". This suggests a principle or preference that should be captured.`;
        proposedChanges = {
          constitution: {
            add_principle: {
              statement: `Avoid: ${signal.context.reason}`,
              priority: 10,
            },
          },
        };
        break;
        
      case 'principle_violation':
        rationale = `Multiple errors detected (${signal.frequency} occurrences). Review and update guardrails or principles.`;
        proposedChanges = {
          guardrails: {
            review_required: true,
          },
        };
        break;
        
      default:
        rationale = `Drift detected: ${signal.type} (${signal.frequency} occurrences)`;
    }
    
    return {
      proposal_id: proposalId,
      created_at: new Date().toISOString(),
      signal_type: signal.type,
      frequency: signal.frequency,
      rationale,
      proposed_changes: proposedChanges,
      risk_rating: signal.frequency > 10 ? 'high' : signal.frequency > 5 ? 'medium' : 'low',
      evidence: signal.context,
    };
  }
}
