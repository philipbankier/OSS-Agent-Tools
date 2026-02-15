/**
 * Content Agent Skills Library
 * 
 * Pre-built skills for content creation agents.
 */

import { ResearchTrendsSkill } from './research-trends.js';
import { GeneratePostOptionsSkill } from './generate-post-options.js';

export const ContentAgentSkills = [
  ResearchTrendsSkill,
  GeneratePostOptionsSkill,
  // More skills to be added:
  // - generate-hooks
  // - write-thread
  // - write-long-form
  // - create-content-calendar
  // - analyze-performance
  // - adapt-for-platform
  // - generate-image-prompt
];

export {
  ResearchTrendsSkill,
  GeneratePostOptionsSkill,
};
