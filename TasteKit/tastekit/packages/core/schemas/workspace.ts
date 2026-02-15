import { z } from 'zod';

/**
 * Workspace Configuration Schema
 * 
 * Configuration for a TasteKit workspace (.tastekit/tastekit.yaml)
 */

export const WorkspaceConfigSchema = z.object({
  version: z.string().describe('TasteKit version'),
  project_name: z.string(),
  created_at: z.string().datetime(),
  
  onboarding: z.object({
    depth: z.enum(['quick', 'guided', 'operator']),
    completed: z.boolean().default(false),
    session_path: z.string().optional().describe('Path to session.json'),
  }).optional(),
  
  compilation: z.object({
    last_compiled_at: z.string().datetime().optional(),
    artifacts_version: z.string().optional(),
  }).optional(),
});

/**
 * Session State Schema
 * 
 * Resumable onboarding wizard state (.tastekit/session.json)
 */
export const SessionStateSchema = z.object({
  session_id: z.string(),
  started_at: z.string().datetime(),
  last_updated_at: z.string().datetime(),
  
  depth: z.enum(['quick', 'guided', 'operator']),
  current_step: z.string(),
  completed_steps: z.array(z.string()),
  
  answers: z.record(z.any()).describe('User answers by question ID'),
  
  metadata: z.record(z.any()).optional(),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
