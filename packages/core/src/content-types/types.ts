/**
 * Extended Content Types
 *
 * Type definitions for organic and promotional content beyond paid ads.
 * Includes Reddit thread generation and social media posts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Content Categories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Content category
 * - paid: Traditional paid advertisements
 * - organic: Organic posts without paid promotion
 * - promoted: Organic-style content that can be promoted
 */
export type ContentCategory = "paid" | "organic" | "promoted";

// ─────────────────────────────────────────────────────────────────────────────
// Author Personas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Role of an author persona in a thread
 */
export type PersonaRole =
  | "op" // Original poster
  | "community_member" // Regular community participant
  | "skeptic" // Asks challenging questions
  | "enthusiast" // Positive supporter
  | "expert" // Provides detailed information
  | "curious" // Asks questions for clarification
  | "moderator"; // Simulated mod responses

/**
 * Tone of an author persona
 */
export type PersonaTone =
  | "friendly"
  | "skeptical"
  | "enthusiastic"
  | "neutral"
  | "curious";

/**
 * Expertise level of an author persona
 */
export type PersonaExpertise = "novice" | "intermediate" | "expert";

/**
 * Definition of an author persona for thread generation
 */
export interface AuthorPersona {
  /** Unique identifier for the persona */
  id: string;

  /** Display name of the persona */
  name: string;

  /** Description of the persona's characteristics */
  description: string;

  /** Role of the persona in discussions */
  role: PersonaRole;

  /** Tone of the persona's comments */
  tone?: PersonaTone;

  /** Expertise level of the persona */
  expertise?: PersonaExpertise;

  /** Pronouns for the persona (optional) */
  pronouns?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reddit Thread Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type of Reddit post
 */
export type RedditPostType = "text" | "link" | "image" | "video";

/**
 * Configuration for a Reddit post
 */
export interface RedditPostConfig {
  /** Post title (supports {variable} patterns) */
  title: string;

  /** Post body text (optional, for self-posts) */
  body?: string;

  /** Link URL (for link posts) */
  url?: string;

  /** Type of post */
  type: RedditPostType;

  /** Target subreddit (pattern like "{target_subreddit}" or fixed) */
  subreddit: string;

  /** Post flair (optional) */
  flair?: string;

  /** Whether the post is NSFW */
  nsfw?: boolean;

  /** Whether the post contains spoilers */
  spoiler?: boolean;

  /** Whether to receive reply notifications */
  sendReplies?: boolean;
}

/**
 * Definition of a single comment in a thread
 */
export interface CommentDefinition {
  /** Unique identifier for the comment */
  id: string;

  /** Parent comment ID (null for top-level comments) */
  parentId?: string | null;

  /** ID of the persona making this comment */
  persona: string;

  /** Comment body (supports {variable} patterns) */
  body: string;

  /** Nesting depth (0 = top-level, 1 = reply to top-level, etc.) */
  depth: number;

  /** Order of appearance in the thread */
  sortOrder: number;
}

/**
 * Configuration for comments in a Reddit thread
 */
export interface RedditCommentConfig {
  /** Whether comments are enabled */
  enabled: boolean;

  /** Comment definitions */
  comments: CommentDefinition[];

  /** Whether to generate variations of comments */
  variationEnabled?: boolean;

  /** Whether to randomize comment order */
  randomizeOrder?: boolean;

  /** Delay between posting comments */
  delayBetweenComments?: {
    /** Minimum delay in minutes */
    min: number;
    /** Maximum delay in minutes */
    max: number;
  };
}

/**
 * Complete Reddit thread definition
 */
export interface RedditThreadDefinition {
  /** Unique identifier for the thread */
  id: string;

  /** Platform (always 'reddit') */
  platform: "reddit";

  /** Category (always 'organic' for threads) */
  category: "organic";

  /** Main post configuration */
  post: RedditPostConfig;

  /** Comments configuration */
  comments: RedditCommentConfig;

  /** Author personas used in the thread */
  personas: AuthorPersona[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Media Post Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Social media platform for organic posts
 */
export type SocialPlatform = "twitter" | "linkedin" | "instagram";

/**
 * Media configuration for social posts
 */
export interface MediaConfig {
  /** Type of media */
  type: "image" | "video" | "gif";

  /** Source URL or variable pattern */
  source: string;

  /** Alt text for accessibility */
  altText?: string;
}

/**
 * Schedule type for social posts
 */
export type ScheduleType = "immediate" | "scheduled" | "optimal";

/**
 * Schedule configuration for social posts
 */
export interface SocialPostSchedule {
  /** Type of scheduling */
  type: ScheduleType;

  /** Scheduled time (ISO 8601) for 'scheduled' type */
  scheduledTime?: string;

  /** Timezone for scheduling */
  timezone?: string;
}

/**
 * Social media post content
 */
export interface SocialPostContent {
  /** Post text (supports {variable} patterns) */
  text: string;

  /** Media attachments */
  media?: MediaConfig[];

  /** Hashtags to append */
  hashtags?: string[];

  /** @mentions to include */
  mentions?: string[];
}

/**
 * Social media post definition
 */
export interface SocialPostDefinition {
  /** Unique identifier */
  id: string;

  /** Target platform */
  platform: SocialPlatform;

  /** Category (always 'organic') */
  category: "organic";

  /** Post content */
  content: SocialPostContent;

  /** Whether this is a thread (Twitter) */
  isThread?: boolean;

  /** Thread posts (for multi-post threads) */
  threadPosts?: string[];

  /** Scheduling configuration */
  schedule?: SocialPostSchedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// Article/Blog Content Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platform for article content
 */
export type ArticlePlatform = "medium" | "wordpress" | "custom";

/**
 * Article content configuration
 */
export interface ArticleContent {
  /** Article title */
  title: string;

  /** Subtitle (optional) */
  subtitle?: string;

  /** Article body (Markdown with {variable} patterns) */
  body: string;

  /** Featured image URL */
  featuredImage?: string;

  /** Tags for the article */
  tags?: string[];

  /** Categories for the article */
  categories?: string[];
}

/**
 * SEO configuration for articles
 */
export interface ArticleSeo {
  /** Meta title */
  metaTitle?: string;

  /** Meta description */
  metaDescription?: string;

  /** URL slug */
  slug?: string;
}

/**
 * Article/blog post definition
 */
export interface ArticleDefinition {
  /** Unique identifier */
  id: string;

  /** Target platform */
  platform: ArticlePlatform;

  /** Category (always 'organic') */
  category: "organic";

  /** Article content */
  content: ArticleContent;

  /** SEO configuration */
  seo?: ArticleSeo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Type Registry Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validation result for content
 */
export interface ContentValidationResult {
  /** Whether the content is valid */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];
}

/**
 * Generated content output
 */
export interface GeneratedContent {
  /** Content type */
  type: string;

  /** Platform */
  platform: string;

  /** Generated content data */
  data: Record<string, unknown>;

  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Context for content generation
 */
export interface ContentGenerationContext {
  /** Row data for variable interpolation */
  rowData: Record<string, unknown>;

  /** Additional context data */
  context?: Record<string, unknown>;
}
