/**
 * Content Agent Domain
 * 
 * Specialized domain for social media content creation, brand management,
 * and audience engagement.
 */

export interface DomainDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  use_cases: string[];
  recommended_tools: string[];
  default_autonomy_level: number;
}

export const ContentAgentDomain: DomainDefinition = {
  id: 'content-agent',
  name: 'Content Agent',
  description: 'Social media content creation, brand management, and audience engagement',
  version: '0.5.0',
  use_cases: [
    'Personal brand management (Twitter, LinkedIn, TikTok, Instagram)',
    'Business social media accounts',
    'AI influencers and content creators',
    'Newsletter and blog content generation',
  ],
  recommended_tools: [
    'image-generation', // DALL-E, Midjourney, etc.
    'social-media-scheduler', // Postiz, Buffer, etc.
    'web-search', // For trend research
    'analytics-api', // Platform-specific metrics
    'file-system', // For managing content assets
  ],
  default_autonomy_level: 0.6, // Moderate autonomy for content creation
};

export const CONTENT_PLATFORMS = [
  'twitter',
  'linkedin',
  'tiktok',
  'instagram',
  'youtube',
  'facebook',
  'blog',
  'newsletter',
] as const;

export type ContentPlatform = typeof CONTENT_PLATFORMS[number];

export const CONTENT_TYPES = [
  'short-form-text', // Tweets, short posts
  'long-form-text', // Articles, blog posts
  'image-post', // Single image with caption
  'carousel', // Multiple images
  'video', // Short-form or long-form video
  'thread', // Twitter threads, LinkedIn carousels
  'story', // Instagram/Facebook stories
] as const;

export type ContentType = typeof CONTENT_TYPES[number];

export const BRAND_ARCHETYPES = [
  'professional', // Corporate, formal
  'casual', // Friendly, approachable
  'edgy', // Bold, provocative
  'humorous', // Funny, entertaining
  'educational', // Teaching, informative
  'inspirational', // Motivational, uplifting
  'technical', // Expert, detailed
] as const;

export type BrandArchetype = typeof BRAND_ARCHETYPES[number];
