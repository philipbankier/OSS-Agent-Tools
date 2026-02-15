/**
 * Content Agent Onboarding Questions
 * 
 * Specialized questions for content creation agents.
 */

import { Question } from '../../interview/questions.js';
import { CONTENT_PLATFORMS, CONTENT_TYPES, BRAND_ARCHETYPES } from './domain.js';

export const ContentAgentQuestions: Question[] = [
  // Brand Identity
  {
    id: 'content_brand_type',
    category: 'brand_identity',
    type: 'choice',
    text: 'What type of brand are you building content for?',
    choices: [
      'Personal brand (individual, founder, creator)',
      'Business brand (company, product, service)',
      'AI influencer (autonomous content persona)',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'content_brand_name',
    category: 'brand_identity',
    type: 'text',
    text: 'What is the name of your brand/account?',
    required: true,
    depth: 'quick',
  },
  {
    id: 'content_brand_archetype',
    category: 'brand_identity',
    type: 'multi-choice',
    text: 'Select the archetypes that best describe your brand voice (choose 1-3):',
    choices: Array.from(BRAND_ARCHETYPES),
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_voice_adjectives',
    category: 'brand_identity',
    type: 'text',
    text: 'List 5-10 adjectives that describe your brand voice (e.g., witty, authoritative, playful):',
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_example_posts',
    category: 'brand_identity',
    type: 'text',
    text: 'Paste 3-5 links to posts from OTHER accounts that exemplify the tone you want to achieve:',
    required: false,
    depth: 'operator',
  },
  {
    id: 'content_forbidden_topics',
    category: 'brand_identity',
    type: 'text',
    text: 'Are there any topics, phrases, or words that are strictly off-limits? (comma-separated)',
    required: false,
    depth: 'guided',
  },

  // Target Platforms
  {
    id: 'content_platforms',
    category: 'platforms',
    type: 'multi-choice',
    text: 'Which platforms will you be creating content for?',
    choices: Array.from(CONTENT_PLATFORMS),
    required: true,
    depth: 'quick',
  },
  {
    id: 'content_primary_platform',
    category: 'platforms',
    type: 'choice',
    text: 'Which is your PRIMARY platform (where you want the most focus)?',
    choices: Array.from(CONTENT_PLATFORMS),
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_posting_frequency',
    category: 'platforms',
    type: 'text',
    text: 'How often do you want to post on your primary platform? (e.g., "3 times per day", "daily", "3x per week")',
    required: true,
    depth: 'guided',
  },

  // Content Types
  {
    id: 'content_types',
    category: 'content_strategy',
    type: 'multi-choice',
    text: 'What types of content will you create?',
    choices: Array.from(CONTENT_TYPES),
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_primary_goal',
    category: 'content_strategy',
    type: 'choice',
    text: 'What is the PRIMARY goal of your content?',
    choices: [
      'Drive website traffic',
      'Build community and engagement',
      'Generate leads',
      'Establish thought leadership',
      'Promote products/services',
      'Entertain and grow audience',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_target_audience',
    category: 'content_strategy',
    type: 'text',
    text: 'Describe your target audience in 2-3 sentences (demographics, interests, pain points):',
    required: true,
    depth: 'guided',
  },

  // Workflow Preferences
  {
    id: 'content_workflow_mode',
    category: 'workflow',
    type: 'choice',
    text: 'How do you want to work with your content agent?',
    choices: [
      'Simple: I give a topic, agent gives me 3 options, I choose one',
      'Assisted: Agent researches trends, proposes ideas, I approve and refine',
      'Autopilot: Agent ideates, plans, creates, and schedules autonomously (I review before posting)',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'content_research_autonomy',
    category: 'workflow',
    type: 'choice',
    choices: ['Yes', 'No'],
    text: 'Should the agent autonomously research trends and winning formulas?',
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_approval_required',
    category: 'workflow',
    type: 'choice',
    text: 'When should the agent ask for your approval?',
    choices: [
      'Always - I review every piece of content before it\'s finalized',
      'Selective - Only for high-stakes content or new topics',
      'Rarely - Only if the agent is uncertain or detects risk',
    ],
    required: true,
    depth: 'guided',
  },

  // Tools and Integrations
  {
    id: 'content_has_image_generation',
    category: 'tools',
    type: 'choice',
    choices: ['Yes', 'No'],
    text: 'Do you have access to image generation tools (DALL-E, Midjourney, etc.)?',
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_has_scheduler',
    category: 'tools',
    type: 'choice',
    choices: ['Yes', 'No'],
    text: 'Do you have a social media scheduling tool (Postiz, Buffer, Hootsuite, etc.)?',
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_scheduler_name',
    category: 'tools',
    type: 'text',
    text: 'Which scheduling tool? (e.g., Postiz, Buffer)',
    required: false,
    depth: 'operator',
  },

  // Performance and Learning
  {
    id: 'content_success_metrics',
    category: 'performance',
    type: 'multi-choice',
    text: 'Which metrics matter most to you?',
    choices: [
      'Views/Impressions',
      'Engagement (likes, comments, shares)',
      'Followers/Subscribers growth',
      'Click-through rate (CTR)',
      'Conversions (leads, sales)',
      'Time spent / Watch time',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'content_learn_from_performance',
    category: 'performance',
    type: 'choice',
    choices: ['Yes', 'No'],
    text: 'Should the agent analyze performance data and learn from what works?',
    required: true,
    depth: 'guided',
  },
];
