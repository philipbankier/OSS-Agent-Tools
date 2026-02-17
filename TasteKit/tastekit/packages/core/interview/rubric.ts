import { z } from 'zod';

/**
 * Domain Rubric Schema
 *
 * A rubric defines the *dimensions* the LLM should explore during an interview.
 * Dimensions are NOT questions — they are topic areas with guidance for the LLM.
 * The LLM decides how to explore each dimension adaptively.
 */

export const RubricDimensionSchema = z.object({
  /** Stable identifier, e.g., "brand_voice" */
  id: z.string(),

  /** Human-readable name, e.g., "Brand Voice & Tone" */
  name: z.string(),

  /** What this dimension captures. The LLM reads this to understand what to explore. */
  description: z.string(),

  /** Which constitution section(s) this dimension maps to */
  maps_to: z.array(z.enum([
    'principles',
    'tone',
    'tradeoffs',
    'evidence_policy',
    'taboos',
    'domain_specific',
  ])),

  /** Which depth tiers include this dimension */
  depth_tiers: z.array(z.enum(['quick', 'guided', 'operator'])),

  /**
   * Hints for the LLM: what angles to explore, what to listen for.
   * NOT questions to ask verbatim.
   */
  exploration_hints: z.array(z.string()),

  /**
   * What a good answer covers. Used by the LLM to decide if the
   * dimension is adequately covered.
   */
  coverage_criteria: z.array(z.string()),

  /** Optional sub-areas for deeper probing at operator depth. */
  sub_areas: z.array(z.string()).optional(),
});

export type RubricDimension = z.infer<typeof RubricDimensionSchema>;

/**
 * A complete domain rubric: dimensions + metadata.
 */
export const DomainRubricSchema = z.object({
  /** Must match the domain id from the domain registry */
  domain_id: z.string(),

  /** Version of this rubric */
  version: z.string(),

  /** Brief description of this domain's interview goals */
  interview_goal: z.string(),

  /** The full set of dimensions. Filtered by depth_tiers at runtime. */
  dimensions: z.array(RubricDimensionSchema),

  /** Whether to include universal dimensions (core_purpose, tone, etc.) */
  includes_universal: z.boolean().default(true),
});

export type DomainRubric = z.infer<typeof DomainRubricSchema>;
