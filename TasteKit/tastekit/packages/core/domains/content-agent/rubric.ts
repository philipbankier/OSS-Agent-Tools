import { DomainRubric } from '../../interview/rubric.js';

/**
 * Content Agent Domain Rubric
 *
 * 16 domain-specific dimensions converted from the original 20 static questions.
 * Combined with 7 universal dimensions, this gives:
 *   quick=8, guided=18, operator=23
 */
export const ContentAgentRubric: DomainRubric = {
  domain_id: 'content-agent',
  version: '0.5.0',
  interview_goal: 'Understand the user\'s brand voice, content strategy, platform preferences, and workflow expectations for their content creation agent.',
  includes_universal: true,

  dimensions: [
    // === QUICK TIER (4 domain-specific dimensions) ===
    {
      id: 'brand_identity',
      name: 'Brand Identity & Persona',
      description: 'Who is this content for? What brand/persona is being built? Personal brand, business, or AI influencer? What archetype fits?',
      maps_to: ['principles', 'tone'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Understand whether personal, business, or AI influencer',
        'Ask what the brand name/handle is',
        'Probe for brand personality: edgy? professional? funny?',
        'Listen for implicit identity cues in how they talk about their content',
      ],
      coverage_criteria: [
        'Brand type identified (personal/business/AI)',
        'Brand voice archetype(s) captured',
        'Brand name/handle known',
      ],
    },
    {
      id: 'target_platforms',
      name: 'Target Platforms',
      description: 'Which social media platforms and content channels the agent will create for. Primary vs. secondary.',
      maps_to: ['domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask which platforms, but also which is PRIMARY',
        'Understand if content should be adapted per platform or uniform',
        'Probe posting frequency expectations',
      ],
      coverage_criteria: [
        'Platform list captured',
        'Primary platform identified',
      ],
    },
    {
      id: 'content_workflow',
      name: 'Workflow & Autonomy',
      description: 'How the user wants to work with the content agent. Level of autonomy for ideation, creation, and scheduling.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Frame the spectrum: manual topic selection to full autopilot',
        'Ask about the approval workflow: review everything vs. trust the agent',
        'Probe for research autonomy: should agent independently find trends?',
      ],
      coverage_criteria: [
        'Workflow mode identified (manual/assisted/autopilot)',
        'Approval expectations set',
      ],
    },
    {
      id: 'content_goal',
      name: 'Content Strategy Goal',
      description: 'The primary purpose of the content: traffic, engagement, leads, thought leadership, entertainment.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask what success looks like for their content',
        'Probe the business outcome behind the content strategy',
        'Understand target audience demographics and interests',
      ],
      coverage_criteria: [
        'Primary content goal identified',
        'Target audience described',
      ],
    },

    // === GUIDED TIER adds 8 more dimensions ===
    {
      id: 'brand_voice_detail',
      name: 'Detailed Voice & Vocabulary',
      description: 'Specific adjectives, vocabulary level, sentence structure, humor style, and emotional register of the brand voice.',
      maps_to: ['tone'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask for 5-10 adjectives that describe the voice',
        'Probe vocabulary level: simple or sophisticated?',
        'Ask about humor: is it part of the voice?',
        'Explore example accounts they admire tonally',
      ],
      coverage_criteria: [
        'Voice adjectives captured',
        'Vocabulary level understood',
        'Example voices/accounts referenced',
      ],
    },
    {
      id: 'content_types',
      name: 'Content Formats & Types',
      description: 'What types of content the agent will produce: short-form text, long-form, threads, carousels, video scripts, stories.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Walk through format types and ask which they use',
        'Understand if they want the agent to suggest new formats',
        'Probe for format-specific preferences (thread length, carousel slide count, etc.)',
      ],
      coverage_criteria: [
        'Active content types listed',
        'Format preferences expressed',
      ],
    },
    {
      id: 'forbidden_topics',
      name: 'Off-Limits Topics & Phrases',
      description: 'Topics, words, phrases, or positions the agent should never include in content.',
      maps_to: ['taboos', 'tone'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about sensitive topics in their niche',
        'Probe for phrases that sound wrong for their brand',
        'Ask about political/controversial topic boundaries',
      ],
      coverage_criteria: [
        'Forbidden topics/phrases listed',
        'Sensitive area boundaries set',
      ],
    },
    {
      id: 'posting_cadence',
      name: 'Posting Cadence & Scheduling',
      description: 'Posting frequency, best times, content calendar approach.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about desired posting frequency per platform',
        'Probe for timing preferences (morning/evening, weekday/weekend)',
        'Ask about content batching vs. real-time posting',
      ],
      coverage_criteria: [
        'Posting frequency per platform established',
      ],
    },
    {
      id: 'research_autonomy',
      name: 'Trend Research & Ideation',
      description: 'Whether and how the agent should independently research trends, competitor content, and winning formulas.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask if the agent should proactively bring content ideas',
        'Probe for how they currently find content inspiration',
        'Understand comfort level with agent analyzing competitor accounts',
      ],
      coverage_criteria: [
        'Research autonomy level set',
        'Ideation expectations established',
      ],
    },
    {
      id: 'tools_integrations',
      name: 'Tools & Integrations',
      description: 'Available tools: image generation, scheduling platform, analytics access.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about image generation capabilities',
        'Ask about scheduling tools (Postiz, Buffer, etc.)',
        'Probe for analytics access and reporting needs',
      ],
      coverage_criteria: [
        'Available tools identified',
        'Integration expectations set',
      ],
    },
    {
      id: 'success_metrics',
      name: 'Performance Metrics & Learning',
      description: 'Which metrics matter, whether the agent should analyze performance, and how it should learn from results.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask which metrics they actually track today',
        'Probe for how they want the agent to learn from performance data',
        'Understand if they want regular performance reports',
      ],
      coverage_criteria: [
        'Key metrics identified',
        'Performance learning expectations set',
      ],
    },
    {
      id: 'audience_engagement',
      name: 'Audience & Engagement Style',
      description: 'How the agent should think about the audience. Engagement strategy, community building, reply behavior.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about reply/engagement philosophy',
        'Probe for community building goals',
        'Understand if the agent should engage with comments/mentions',
      ],
      coverage_criteria: [
        'Engagement philosophy captured',
      ],
    },

    // === OPERATOR TIER adds 4 more dimensions ===
    {
      id: 'exemplar_content',
      name: 'Exemplar Content & Anti-Examples',
      description: 'Specific posts, accounts, or content pieces that represent the ideal vs. what to avoid.',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask for links to posts they wish they had written',
        'Ask for examples of content they find cringeworthy in their niche',
        'Probe for what makes the good examples good and the bad ones bad',
      ],
      coverage_criteria: [
        'At least 2-3 positive examples referenced',
        'At least 1 anti-example referenced',
      ],
    },
    {
      id: 'platform_adaptation',
      name: 'Cross-Platform Adaptation Rules',
      description: 'How content should change between platforms. Tone shifts, format changes, audience assumptions.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask how their voice differs between platforms',
        'Probe for platform-specific do/don\'t rules',
        'Understand repurposing strategy (long-form to short-form, etc.)',
      ],
      coverage_criteria: [
        'Platform-specific rules captured',
      ],
    },
    {
      id: 'edge_cases_content',
      name: 'Edge Cases & Crisis Content',
      description: 'How to handle controversial moments, trending topics, crisis situations.',
      maps_to: ['taboos', 'domain_specific'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask what to do when a controversial topic trends in their niche',
        'Probe for crisis communication guidelines',
        'Ask about newsjacking: when is it appropriate?',
      ],
      coverage_criteria: [
        'Crisis/controversy guidelines set',
      ],
    },
    {
      id: 'growth_experimentation',
      name: 'Growth & Experimentation',
      description: 'Willingness to experiment with new formats, viral strategies, A/B testing content.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about comfort level with experimental content',
        'Probe for A/B testing interest',
        'Understand growth targets and timeline',
      ],
      coverage_criteria: [
        'Experimentation tolerance set',
      ],
    },
  ],
};
