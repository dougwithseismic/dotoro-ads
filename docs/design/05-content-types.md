# Extended Content Types

## Overview

Beyond paid advertising, Dotoro supports organic and promotional content generation. This document defines the architecture for non-ad content types, with a focus on Reddit thread generation.

---

## Content Categories

```typescript
export type ContentCategory =
  | 'paid'      // Traditional paid advertisements
  | 'organic'   // Organic posts without paid promotion
  | 'promoted'; // Organic-style content that can be promoted
```

### Category Definitions

| Category | Description | Examples |
|----------|-------------|----------|
| **Paid** | Traditional ads delivered through ad platforms | Google Search Ads, Reddit Promoted Posts |
| **Organic** | Natural content posted to platforms | Reddit threads, Social media posts |
| **Promoted** | Organic-style content with optional promotion | Reddit Conversation Ads, Boosted posts |

---

## Reddit Thread Generation

### Use Case

Generate authentic-looking Reddit threads with:
- A main post (title + body)
- Multiple comments from different "personas"
- Nested replies
- Natural conversation flow

This is useful for:
- Content marketing
- Community engagement simulation
- Product launch discussions
- FAQ-style content

### Type Definitions

```typescript
// packages/core/src/content-types/reddit-thread.ts

export interface RedditThreadDefinition {
  id: string;
  platform: 'reddit';
  category: 'organic';

  // Main post
  post: RedditPostConfig;

  // Comments configuration
  comments: RedditCommentConfig;

  // Author personas
  personas: AuthorPersona[];
}

export interface RedditPostConfig {
  // Post content
  title: string;           // Pattern with {variables}
  body?: string;           // Optional body text (self-post)
  url?: string;            // Link URL (for link posts)

  // Post type
  type: 'text' | 'link' | 'image' | 'video';

  // Targeting
  subreddit: string;       // Pattern like "{target_subreddit}" or fixed
  flair?: string;

  // Post settings
  nsfw?: boolean;
  spoiler?: boolean;
  sendReplies?: boolean;
}

export interface RedditCommentConfig {
  // Comment generation
  enabled: boolean;
  comments: CommentDefinition[];

  // Generation settings
  variationEnabled?: boolean;   // Generate variations of comments
  randomizeOrder?: boolean;     // Randomize comment order
  delayBetweenComments?: {
    min: number;  // minutes
    max: number;
  };
}

export interface CommentDefinition {
  id: string;
  parentId?: string;        // null = top-level, otherwise references another comment
  persona: string;          // Persona ID
  body: string;             // Pattern with {variables}
  depth: number;            // 0 = top-level, 1 = reply to top-level, etc.
  sortOrder: number;        // Order of appearance
}

export interface AuthorPersona {
  id: string;
  name: string;
  description: string;
  role: PersonaRole;

  // Persona characteristics
  tone?: 'friendly' | 'skeptical' | 'enthusiastic' | 'neutral' | 'curious';
  expertise?: 'novice' | 'intermediate' | 'expert';

  // Used in comment templates
  pronouns?: string;
}

export type PersonaRole =
  | 'op'               // Original poster
  | 'community_member' // Regular community participant
  | 'skeptic'          // Asks challenging questions
  | 'enthusiast'       // Positive supporter
  | 'expert'           // Provides detailed information
  | 'curious'          // Asks questions for clarification
  | 'moderator';       // (for simulated mod responses)
```

### Thread Structure Example

```typescript
const threadExample: RedditThreadDefinition = {
  id: 'product-launch-thread',
  platform: 'reddit',
  category: 'organic',

  post: {
    title: '{product_name} - Just launched and already getting great feedback!',
    body: `Hey r/{subreddit}!

I've been using {product_name} for about {usage_duration} now and wanted to share my experience.

**The Good:**
- {benefit_1}
- {benefit_2}
- {benefit_3}

**The Not-So-Good:**
- {drawback_1} (though they're working on it)

Overall, I'd rate it {rating}/10. Has anyone else tried it?`,
    type: 'text',
    subreddit: '{target_subreddit}',
    sendReplies: true,
  },

  comments: {
    enabled: true,
    comments: [
      {
        id: 'comment-1',
        parentId: null,
        persona: 'curious',
        body: 'Interesting! What\'s the price point? I\'ve been looking for something like this.',
        depth: 0,
        sortOrder: 1,
      },
      {
        id: 'comment-1-reply',
        parentId: 'comment-1',
        persona: 'op',
        body: 'It\'s ${price}! They have a {discount_info} going on right now too.',
        depth: 1,
        sortOrder: 2,
      },
      {
        id: 'comment-2',
        parentId: null,
        persona: 'skeptic',
        body: 'How does this compare to {competitor}? I\'ve been using that and it works fine.',
        depth: 0,
        sortOrder: 3,
      },
      {
        id: 'comment-2-reply',
        parentId: 'comment-2',
        persona: 'op',
        body: `Good question! The main differences are:
1. {comparison_point_1}
2. {comparison_point_2}

{competitor} is solid too, but I found {product_name} works better for my use case.`,
        depth: 1,
        sortOrder: 4,
      },
      {
        id: 'comment-3',
        parentId: null,
        persona: 'enthusiast',
        body: 'I\'ve been using this for {enthusiast_duration}! Totally agree with your review. The {feature_highlight} is a game changer.',
        depth: 0,
        sortOrder: 5,
      },
    ],
    variationEnabled: true,
    randomizeOrder: false,
  },

  personas: [
    {
      id: 'op',
      name: 'Original Poster',
      description: 'The person who created the thread, responds to questions',
      role: 'op',
      tone: 'friendly',
    },
    {
      id: 'curious',
      name: 'Curious User',
      description: 'Asks genuine questions about the product',
      role: 'curious',
      tone: 'neutral',
    },
    {
      id: 'skeptic',
      name: 'Skeptical User',
      description: 'Raises common objections and comparisons',
      role: 'skeptic',
      tone: 'skeptical',
    },
    {
      id: 'enthusiast',
      name: 'Happy Customer',
      description: 'Shares positive experience with the product',
      role: 'enthusiast',
      tone: 'enthusiastic',
    },
  ],
};
```

---

## UX Design: Thread Builder

### Main View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Reddit Thread Generator                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📝 Post Configuration                                                │   │
│  │                                                                      │   │
│  │  Post Type:  ○ Text Post  ○ Link Post  ○ Image Post                 │   │
│  │                                                                      │   │
│  │  Subreddit: ┌────────────────────────────────────────────────────┐  │   │
│  │             │ r/{target_subreddit}                               │  │   │
│  │             └────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  Title:     ┌────────────────────────────────────────────────────┐  │   │
│  │             │ {product_name} - Just launched!                    │  │   │
│  │             └────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  Body:      ┌────────────────────────────────────────────────────┐  │   │
│  │             │ Hey r/{subreddit}!                                 │  │   │
│  │             │                                                     │  │   │
│  │             │ I've been using {product_name} and wanted to       │  │   │
│  │             │ share my experience...                             │  │   │
│  │             │                                                     │  │   │
│  │             │ [Markdown supported]                               │  │   │
│  │             └────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  ☐ NSFW  ☐ Spoiler  ☑️ Send replies to inbox                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👥 Author Personas                                    [+ Add Persona] │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │ 🎤 OP (Original Poster)                              [Default] │  │   │
│  │  │     Responds to questions about the product                    │  │   │
│  │  │     Tone: Friendly · Role: Original Poster                     │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │ 🤔 Curious User                                        [Edit] │  │   │
│  │  │     Asks genuine questions, seeks more information             │  │   │
│  │  │     Tone: Neutral · Role: Community Member                     │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │ 🧐 Skeptic                                             [Edit] │  │   │
│  │  │     Raises objections, compares to alternatives                │  │   │
│  │  │     Tone: Skeptical · Role: Skeptic                            │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │ 😊 Enthusiast                                          [Edit] │  │   │
│  │  │     Shares positive experience, supports the product           │  │   │
│  │  │     Tone: Enthusiastic · Role: Enthusiast                      │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Comments Section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💬 Comments                                             [+ Add Top Comment] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ├─ Comment 1                                               [Edit] │   │
│  │  │  Author: [Curious User ▾]                                       │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  │ Interesting! What's the price? I've been looking for    │    │   │
│  │  │  │ something like this.                                    │    │   │
│  │  │  └─────────────────────────────────────────────────────────┘    │   │
│  │  │  [+ Add Reply]                                                  │   │
│  │  │                                                                  │   │
│  │  │  └─ Reply 1.1                                            [Edit] │   │
│  │  │     Author: [OP ▾]                                              │   │
│  │  │     ┌──────────────────────────────────────────────────────┐   │   │
│  │  │     │ It's ${price}! They have a {discount_info} right now │   │   │
│  │  │     └──────────────────────────────────────────────────────┘   │   │
│  │  │                                                                  │   │
│  │  ├─ Comment 2                                               [Edit] │   │
│  │  │  Author: [Skeptic ▾]                                            │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  │ How does this compare to {competitor}? I've been using  │    │   │
│  │  │  │ that and it works fine.                                 │    │   │
│  │  │  └─────────────────────────────────────────────────────────┘    │   │
│  │  │  [+ Add Reply]                                                  │   │
│  │  │                                                                  │   │
│  │  │  └─ Reply 2.1                                            [Edit] │   │
│  │  │     Author: [OP ▾]                                              │   │
│  │  │     ┌──────────────────────────────────────────────────────┐   │   │
│  │  │     │ Good question! The main differences are:             │   │   │
│  │  │     │ 1. {comparison_point_1}                              │   │   │
│  │  │     │ 2. {comparison_point_2}                              │   │   │
│  │  │     └──────────────────────────────────────────────────────┘   │   │
│  │  │                                                                  │   │
│  │  ├─ Comment 3                                               [Edit] │   │
│  │  │  Author: [Enthusiast ▾]                                         │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  │ I've been using this for {duration}! Totally agree.     │    │   │
│  │  │  │ The {feature} is a game changer.                        │    │   │
│  │  │  └─────────────────────────────────────────────────────────┘    │   │
│  │  │  [+ Add Reply]                                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Comment Settings                                                     │   │
│  │                                                                      │   │
│  │  ☐ Generate variations of comments                                  │   │
│  │  ☐ Randomize comment order                                          │   │
│  │  ☐ Add delay between comments: [ 5 ] - [ 30 ] minutes              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Preview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Preview                                                    Row 1 of 50 [ < > ]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ r/productivity                                                       │   │
│  │                                                                      │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │ TaskMaster Pro - Just launched and already getting great        │ │   │
│  │ │ feedback!                                                        │ │   │
│  │ │                                                                  │ │   │
│  │ │ Posted by u/user123                                             │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  │ Hey r/productivity!                                                 │   │
│  │                                                                      │   │
│  │ I've been using TaskMaster Pro for about 2 weeks now and wanted    │   │
│  │ to share my experience.                                             │   │
│  │                                                                      │   │
│  │ **The Good:**                                                       │   │
│  │ - AI-powered task prioritization                                    │   │
│  │ - Seamless calendar integration                                     │   │
│  │ - Beautiful minimal interface                                       │   │
│  │                                                                      │   │
│  │ **The Not-So-Good:**                                                │   │
│  │ - Mobile app could use work (though they're working on it)         │   │
│  │                                                                      │   │
│  │ Overall, I'd rate it 8/10. Has anyone else tried it?               │   │
│  │                                                                      │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │                                                                      │   │
│  │ 💬 Comments (5)                                                     │   │
│  │                                                                      │   │
│  │ ┌───────────────────────────────────────────────────────────────┐  │   │
│  │ │ u/curious_user · 3 points · 2 hours ago                       │  │   │
│  │ │                                                                │  │   │
│  │ │ Interesting! What's the price? I've been looking for          │  │   │
│  │ │ something like this.                                          │  │   │
│  │ │                                                                │  │   │
│  │ │   └── u/user123 (OP) · 5 points · 1 hour ago                  │  │   │
│  │ │       It's $9.99/month! They have a 30% off launch discount   │  │   │
│  │ │       right now too.                                          │  │   │
│  │ └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │ ┌───────────────────────────────────────────────────────────────┐  │   │
│  │ │ u/skeptical_sam · 2 points · 1 hour ago                       │  │   │
│  │ │                                                                │  │   │
│  │ │ How does this compare to Todoist? I've been using that and    │  │   │
│  │ │ it works fine.                                                │  │   │
│  │ │                                                                │  │   │
│  │ │   └── u/user123 (OP) · 3 points · 45 min ago                  │  │   │
│  │ │       Good question! The main differences are:                │  │   │
│  │ │       1. AI prioritization is much smarter                    │  │   │
│  │ │       2. Better calendar sync                                 │  │   │
│  │ └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Other Content Types

### Social Media Posts

```typescript
export interface SocialPostDefinition {
  id: string;
  platform: 'twitter' | 'linkedin' | 'instagram';
  category: 'organic';

  // Post content
  content: {
    text: string;           // Pattern with {variables}
    media?: MediaConfig[];  // Images/videos
    hashtags?: string[];    // Auto-appended hashtags
    mentions?: string[];    // @mentions
  };

  // Thread support (Twitter)
  isThread?: boolean;
  threadPosts?: string[];   // Array of post content patterns

  // Scheduling
  schedule?: {
    type: 'immediate' | 'scheduled' | 'optimal';
    scheduledTime?: string;
    timezone?: string;
  };
}
```

### Blog/Article Content

```typescript
export interface ArticleDefinition {
  id: string;
  platform: 'medium' | 'wordpress' | 'custom';
  category: 'organic';

  content: {
    title: string;
    subtitle?: string;
    body: string;           // Markdown with {variables}
    featuredImage?: string;
    tags?: string[];
    categories?: string[];
  };

  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
  };
}
```

---

## Content Type Registry

```typescript
// packages/core/src/content-types/registry.ts

export interface ContentTypeDefinition {
  id: string;
  platform: Platform | 'multi';
  name: string;
  description: string;
  category: ContentCategory;

  // Schema for this content type
  schema: ContentSchema;

  // Validation
  validate: (data: ContentData) => ValidationResult;

  // Preview component
  previewComponent: string;

  // Generation function
  generate: (config: ContentConfig, data: DataRow) => GeneratedContent;
}

class ContentTypeRegistry {
  private types: Map<string, ContentTypeDefinition> = new Map();

  register(type: ContentTypeDefinition): void {
    this.types.set(`${type.platform}:${type.id}`, type);
  }

  get(platform: string, id: string): ContentTypeDefinition | undefined {
    return this.types.get(`${platform}:${id}`);
  }

  getByPlatform(platform: Platform): ContentTypeDefinition[] {
    return Array.from(this.types.values())
      .filter(t => t.platform === platform || t.platform === 'multi');
  }

  getByCategory(category: ContentCategory): ContentTypeDefinition[] {
    return Array.from(this.types.values())
      .filter(t => t.category === category);
  }
}

export const contentTypeRegistry = new ContentTypeRegistry();
```

---

## Database Schema

```typescript
// Thread content storage
export const threadContent = pgTable('thread_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => generatedCampaigns.id),

  // Content type
  contentType: varchar('content_type', { length: 50 }).notNull(),
  platform: platformEnum('platform').notNull(),

  // Thread structure
  parentId: uuid('parent_id'), // Self-reference for replies
  depth: integer('depth').default(0),

  // Content
  authorPersona: varchar('author_persona', { length: 100 }),
  title: text('title'),
  body: text('body'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // Order
  sortOrder: integer('sort_order').default(0),

  // Status
  status: varchar('status', { length: 20 }).default('draft'),
  publishedAt: timestamp('published_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Author personas
export const authorPersonas = pgTable('author_personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),

  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  role: varchar('role', { length: 50 }),
  tone: varchar('tone', { length: 50 }),
  expertise: varchar('expertise', { length: 50 }),

  // Default persona for the user
  isDefault: boolean('is_default').default(false),

  createdAt: timestamp('created_at').defaultNow(),
});
```
