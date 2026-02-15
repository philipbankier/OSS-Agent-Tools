/**
 * Drift Proposal
 * 
 * Represents a proposed change to artifacts based on detected drift.
 */

export interface DriftProposal {
  proposal_id: string;
  created_at: string;
  signal_type: string;
  frequency: number;
  rationale: string;
  proposed_changes: any;
  risk_rating: 'low' | 'medium' | 'high';
  evidence: any;
}

export interface AppliedProposal {
  proposal_id: string;
  applied_at: string;
  artifacts_updated: string[];
  recompiled: boolean;
}
