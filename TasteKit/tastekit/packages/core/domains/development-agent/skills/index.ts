/**
 * Development Agent Skills Library
 *
 * Pre-built skills for software development agents.
 */

import { CodeReviewSkill } from './code-review.js';
import { RefactorPlanSkill } from './refactor-plan.js';

export const DevelopmentAgentSkills = [
  CodeReviewSkill,
  RefactorPlanSkill,
];

export {
  CodeReviewSkill,
  RefactorPlanSkill,
};
