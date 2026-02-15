import { MemoryV1 } from '../schemas/memory.js';
import { SessionState } from '../schemas/workspace.js';

/**
 * Memory policy compiler
 * 
 * Compiles memory management policy.
 */

export function compileMemoryPolicy(session: SessionState): MemoryV1 {
  return {
    schema_version: 'memory.v1',
    runtime_target: 'generic',
    
    stores: [
      {
        store_id: 'default',
        type: 'runtime_managed',
        config: {},
      },
    ],
    
    write_policy: {
      salience_rules: [
        {
          rule_id: 'user_preferences',
          pattern: 'preference|like|dislike|prefer',
          score: 0.9,
          reason: 'User preferences are highly salient',
        },
        {
          rule_id: 'corrections',
          pattern: 'actually|correction|mistake',
          score: 0.95,
          reason: 'Corrections are critical to remember',
        },
        {
          rule_id: 'feedback',
          pattern: 'good|bad|better|worse',
          score: 0.8,
          reason: 'Feedback helps improve future responses',
        },
      ],
      
      pii_handling: {
        detect: true,
        redact: false,
        store_separately: true,
      },
      
      update_mode: 'consolidate',
      consolidation_schedule: '0 0 2 * * *', // Daily at 2 AM
      
      revisit_triggers: [
        'user_correction',
        'principle_violation',
        'repeated_failure',
      ],
    },
    
    retention_policy: {
      ttl_days: 90,
      prune_strategy: 'least_salient',
    },
  };
}
