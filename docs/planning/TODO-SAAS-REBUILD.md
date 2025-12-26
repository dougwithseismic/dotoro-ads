# Dotoro - Dynamic Content Generation Platform

**Date:** 2025-12-25
**Status:** Planning Phase

---

## What is Dotoro?

**Dotoro** is an open-source alternative to [Dotty](https://dotty.com) and [PPCB.ee](https://ppcb.ee) - a dynamic, programmatic content generation platform for advertising and organic social media.

### The Problem

Marketing teams need to create thousands of variations of content across multiple platforms:
- **Paid Ads:** Google Ads, Facebook Ads, Reddit Ads
- **Organic Content:** Reddit threads, Reddit comments, Instagram posts, Twitter/X posts

Manually creating each variation is time-consuming and error-prone.

### The Solution

Dotoro lets you:
1. **Upload data** (CSV with products, locations, keywords, etc.)
2. **Create templates** with dynamic variables (`{{product_name}}`, `{{location}}`)
3. **Apply rules** for conditional logic (IF price > $100 THEN use "Premium" template)
4. **Generate content** - thousands of variations automatically
5. **Publish** - push to ad platforms or post organically

### Platforms & Content Types

| Platform | Type | Content Units |
|----------|------|---------------|
| **Reddit** | Paid | Link ads, video ads, carousel ads |
| **Reddit** | Organic | Threads (title + body + image), Comments |
| **Google** | Paid | Search ads, Display ads, Shopping ads |
| **Facebook/Meta** | Paid | Feed ads, Story ads, Reel ads |
| **Instagram** | Organic | Posts, Stories, Reels |
| **Twitter/X** | Organic | Tweets, Threads |

**Current Focus:** Reddit (both paid ads and organic threads/comments)

---

## Goal

Build Dotoro as a multi-tenant SaaS platform on Cloudflare's edge infrastructure. The rebuild preserves proven core domain logic (generation engine, rules engine, variable substitution) while adding proper authentication, workspaces, billing, and multi-platform support.

### Success Criteria

- [ ] Multi-tenant architecture with workspace isolation and role-based access
- [ ] Secure authentication with Clerk integration and session management
- [ ] Stripe billing with usage-based metering for content generation
- [ ] Public API with key-based authentication and rate limiting
- [ ] **Reddit Paid Ads** - Full OAuth flow, campaign creation, sync
- [ ] **Reddit Organic** - Thread posting, comment posting, subreddit targeting
- [ ] Complete audit trail for compliance and debugging
- [ ] Zero data leakage between tenants verified through integration tests

---

## What's Already Done (Existing Codebase Analysis)

### Core Domain Logic (Keep & Enhance)

- [x] **Campaign Sets** (`packages/database/src/schema/campaign-sets.ts`)
  - Complete CRUD with status tracking (draft, pending, syncing, active, paused, completed, archived, error)
  - `CampaignSetConfig` interface storing wizard state snapshots
  - Sync status tracking (pending, syncing, synced, failed, conflict)
  - Relations to data sources, templates, and generated campaigns

- [x] **Data Sources** (`packages/database/src/schema/data-sources.ts`)
  - CSV, API, and manual data source types
  - `dataRows` table for normalized row storage
  - `columnMappings` for schema normalization with type inference

- [x] **Campaign Templates** (`packages/database/src/schema/campaign-templates.ts`)
  - Platform-specific templates (Google, Facebook, Reddit)
  - Hierarchical structure: Campaign -> AdGroup -> Ad templates
  - Variable placeholders with `{{columnName}}` syntax

- [x] **Rules Engine** (`packages/core/src/rules/`)
  - `RuleEngine` class with condition evaluation
  - Rule types: filter, transform, conditional
  - Operators: equals, not_equals, contains, greater_than, less_than, in, regex
  - Actions: set, append, prepend, replace, calculate, lookup

- [x] **Transforms** (`packages/database/src/schema/transforms.ts`)
  - GROUP BY aggregations (COUNT, SUM, MIN, MAX, AVG, FIRST, LAST, CONCAT, COLLECT)
  - Transform engine in `packages/core/src/transforms/`
  - Source-to-output data source pipeline

- [x] **Generation Engine** (`packages/core/src/generation/`)
  - `GenerationOrchestrator` coordinating rule execution and variation generation
  - `VariationGenerator` for template + data row = campaign expansion
  - Platform constraint validation
  - Deduplication support

- [x] **Platform Adapters** (`packages/core/src/campaign-set/adapters/`)
  - Mock, Google Ads, Facebook Ads, Reddit Ads adapters
  - Sync service with diff calculation
  - Platform-specific field mappings

- [x] **Ad Accounts & OAuth** (`packages/database/src/schema/ad-accounts.ts`)
  - OAuth token storage (access/refresh tokens)
  - Platform credential management
  - Account status tracking

### API Layer (Keep & Enhance)

- [x] **Hono.js Routes** (`apps/api/src/routes/`)
  - Data sources CRUD with CSV upload
  - Templates CRUD
  - Rules CRUD
  - Campaign sets with generate/sync/pause/resume actions
  - Accounts management
  - Creatives management
  - Transforms management

- [x] **OpenAPI/Zod Schemas** (`apps/api/src/schemas/`)
  - Type-safe request/response validation
  - OpenAPI spec generation

### Frontend (Keep & Enhance)

- [x] **8-Step Generation Wizard** (`apps/web/app/campaigns/generate/`)
  - `useGenerateWizard` hook with full state management
  - Steps: CampaignSetName, DataSource, Platforms, AdTypes, CampaignConfig, HierarchyConfig, Targeting, Review
  - Validation per step

- [x] **Core Components**
  - `KeywordCombinator` for keyword generation
  - `GenerationPreview` for campaign preview
  - `CampaignEditor` for post-generation editing

### Infrastructure (Keep)

- [x] **Turborepo Monorepo Structure**
  - `apps/api` - Hono.js API
  - `apps/web` - Next.js App Router frontend
  - `packages/core` - Shared business logic
  - `packages/database` - Drizzle ORM + PostgreSQL

- [x] **Testing Setup**
  - Vitest configuration
  - Test utilities and fixtures
  - API route tests

---

## Content Model Architecture

### Core Concepts

```
Platform (reddit, instagram, twitter, google_ads, facebook_ads)
  └── Content Type (paid_ad, organic_post)
        └── Content Format (thread, comment, link_ad, image_post, etc.)
              └── Template (structure with variables)
                    └── Generated Content (template + data row = content unit)
```

### Campaign Sets

A **Campaign Set** is a container for related content generation:

```typescript
interface CampaignSet {
  id: string
  workspaceId: string
  name: string                    // "Reddit Product Threads Q1"
  platform: Platform              // "reddit"
  contentType: ContentType        // "organic" | "paid"
  contentFormat: ContentFormat    // "thread" | "comment" | "link_ad"
  dataSourceId: string            // CSV with dynamic data
  templateId: string              // Content template
  targeting: TargetingConfig      // Platform-specific targeting
  schedule: ScheduleConfig        // When to publish
  status: CampaignSetStatus
}
```

### Platform Registry

```typescript
const PLATFORMS = {
  reddit: {
    name: 'Reddit',
    contentTypes: {
      paid: {
        formats: ['link_ad', 'video_ad', 'carousel_ad'],
        requiresOAuth: true,
        apiType: 'reddit_ads_api'
      },
      organic: {
        formats: ['thread', 'comment'],
        requiresOAuth: true,
        apiType: 'reddit_api'
      }
    }
  },
  instagram: {
    name: 'Instagram',
    contentTypes: {
      organic: {
        formats: ['image_post', 'carousel_post', 'video_post', 'story', 'reel'],
        requiresOAuth: true,
        apiType: 'instagram_graph_api'
      }
    }
  },
  // ... more platforms
}
```

### Reddit Content Formats

#### Reddit Thread (Organic)
```typescript
interface RedditThread {
  subreddit: string               // Target subreddit (e.g., "entrepreneur")
  title: string                   // Thread title (max 300 chars)
  body?: string                   // Self-post text (markdown)
  url?: string                    // Link post URL (mutually exclusive with body)
  imageUrl?: string               // Image post
  flairId?: string                // Subreddit flair
  isNsfw: boolean
  isSpoiler: boolean
  sendReplies: boolean
}
```

#### Reddit Comment (Organic)
```typescript
interface RedditComment {
  parentId: string                // Thread ID or parent comment ID
  body: string                    // Comment text (markdown)
}
```

#### Reddit Link Ad (Paid)
```typescript
interface RedditLinkAd {
  headline: string                // Ad headline
  destinationUrl: string          // Landing page
  callToAction: string            // Button text
  thumbnailUrl?: string           // Preview image
  // ... targeting via ad account
}
```

### Targeting for Organic Reddit

```typescript
interface RedditOrganicTargeting {
  subreddits: string[]            // List of target subreddits
  flairMapping?: {                // Map data values to flairs
    field: string                 // e.g., "category"
    mapping: Record<string, string>
  }
  postTiming?: {
    timezone: string
    preferredHours: number[]      // Best hours to post (0-23)
    preferredDays: number[]       // Best days (0=Sun, 6=Sat)
  }
  accountRotation?: {
    enabled: boolean
    accounts: string[]            // Rotate between these accounts
  }
}
```

---

## Existing Scaffold

The `apps/web-app/` directory contains a ready-to-use Next.js 16 + OpenNext scaffold for Cloudflare Workers:

```
apps/web-app/
├── wrangler.jsonc          # CF Workers config
├── open-next.config.ts     # OpenNext adapter config
├── cloudflare-env.d.ts     # Generated CF bindings types
├── src/app/                # Next.js App Router
├── package.json            # Already has @repo/core, @repo/ui
└── .dev.vars               # Local dev secrets
```

**Scripts:**
- `pnpm dev` - Local dev on port 3002
- `pnpm preview` - Build + preview with Wrangler
- `pnpm deploy` - Deploy to Cloudflare Workers

---

## What We're Building Now - SaaS Features

### Phase 0: Cloudflare Infrastructure Setup

**Priority: CRITICAL** - Set up bindings before any code

#### 0.1 Wrangler Configuration

Update `apps/web-app/wrangler.jsonc` with all bindings:

```jsonc
{
  "name": "dotoro",
  "compatibility_date": "2025-12-25",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".open-next/worker.js",
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },

  // D1 Database
  "d1_databases": [
    { "binding": "DB", "database_name": "dotoro-db", "database_id": "<from-wrangler-d1-create>" }
  ],

  // R2 Storage
  "r2_buckets": [
    { "binding": "STORAGE", "bucket_name": "dotoro-assets" }
  ],

  // KV Namespaces
  "kv_namespaces": [
    { "binding": "CACHE", "id": "<from-wrangler-kv-create>" },
    { "binding": "SESSIONS", "id": "<from-wrangler-kv-create>" }
  ],

  // Queues
  "queues": {
    "producers": [
      { "binding": "GENERATION_QUEUE", "queue": "campaign-generation" }
    ],
    "consumers": [
      { "queue": "campaign-generation", "max_batch_size": 10, "max_retries": 3 }
    ]
  }
}
```

**Deliverables:**
- [ ] Create D1 database: `wrangler d1 create dotoro-db`
- [ ] Create R2 bucket: `wrangler r2 bucket create dotoro-assets`
- [ ] Create KV namespaces: `wrangler kv namespace create CACHE` and `SESSIONS`
- [ ] Create Queue: `wrangler queues create campaign-generation`
- [ ] Update wrangler.jsonc with all binding IDs
- [ ] Create `apps/api-worker/` for standalone Hono API (or embed in web-app)

#### 0.2 Drizzle + D1 Setup

Create `packages/database-d1/` for D1-specific schema:

```typescript
// packages/database-d1/src/client.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
```

**Deliverables:**
- [ ] Create `packages/database-d1/` package
- [ ] Port schemas from PostgreSQL to D1-compatible SQLite
- [ ] Create migration scripts for D1 (`wrangler d1 migrations`)
- [ ] Update core packages to accept D1 database instance

---

### Phase 1: Foundation - Authentication & Multi-Tenancy

**Priority: HIGH** - All other features depend on auth and tenant isolation

#### 1.1 Authentication with Clerk

**Entities/Tables:**
```sql
-- No new tables needed - Clerk handles user data
-- Existing userId columns will reference Clerk user IDs
```

**API Endpoints:**
```
# Clerk webhook handlers
POST /api/webhooks/clerk/user-created
POST /api/webhooks/clerk/user-updated
POST /api/webhooks/clerk/user-deleted
POST /api/webhooks/clerk/session-ended
```

**Deliverables:**
- [ ] Install and configure Clerk (`@clerk/nextjs`, `@clerk/backend`)
- [ ] Add Clerk middleware to API routes (`apps/api/src/middleware/clerk.ts`)
- [ ] Create auth context provider for frontend (`apps/web/providers/auth.tsx`)
- [ ] Implement protected route wrappers
- [ ] Add Clerk webhook handlers for user lifecycle events
- [ ] Migrate existing `getUserId()` helper to use Clerk auth
- [ ] Add user profile sync to local database (for foreign key references)

**Example Use Cases:**
1. New user signs up via Clerk -> webhook creates local user record -> default personal workspace created
2. User signs in -> Clerk session established -> API requests include auth token
3. User revoked access -> Clerk webhook triggers session cleanup

#### 1.2 Workspaces/Organizations

**Entities/Tables (D1/SQLite):**
```sql
-- packages/database-d1/src/schema/workspaces.ts
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,  -- nanoid or uuid string
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,  -- Clerk user ID
  settings TEXT,  -- JSON string (D1 stores JSON as TEXT)
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'
  invited_by TEXT,
  invited_at INTEGER,
  accepted_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE workspace_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  invited_by TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(workspace_id, email)
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
```

**D1/SQLite Notes:**
- Use `TEXT` instead of `VARCHAR` or `UUID`
- Use `INTEGER` (unix timestamp) instead of `TIMESTAMPTZ`
- Store JSON as `TEXT`, parse in application layer
- Generate IDs in application (nanoid recommended)

**API Endpoints:**
```
# Workspace CRUD
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/:workspaceId
PUT    /api/v1/workspaces/:workspaceId
DELETE /api/v1/workspaces/:workspaceId

# Workspace Members
GET    /api/v1/workspaces/:workspaceId/members
POST   /api/v1/workspaces/:workspaceId/members/invite
PUT    /api/v1/workspaces/:workspaceId/members/:userId
DELETE /api/v1/workspaces/:workspaceId/members/:userId

# Invitation Flow
POST   /api/v1/invitations/:token/accept
POST   /api/v1/invitations/:token/decline
```

**Deliverables:**
- [ ] Create workspace schema (`packages/database/src/schema/workspaces.ts`)
- [ ] Add workspace_id to all existing tables (data_sources, campaign_templates, rules, campaign_sets, ad_accounts, creatives, transforms)
- [ ] Create migration for workspace columns
- [ ] Implement workspace CRUD routes
- [ ] Implement member management routes
- [ ] Create invitation system with email notifications
- [ ] Add workspace context middleware (extracts workspace from subdomain or header)
- [ ] Implement role-based access control (RBAC) middleware
- [ ] Create workspace switcher UI component
- [ ] Add workspace settings page

**Example Use Cases:**
1. Agency creates workspace for each client -> separate data isolation
2. Team member invited via email -> clicks link -> joins workspace with assigned role
3. Admin removes member -> loses access to workspace resources immediately

**Role Permissions Matrix:**
| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| Delete workspace | Yes | No | No | No |
| Manage billing | Yes | Yes | No | No |
| Invite members | Yes | Yes | No | No |
| Manage campaigns | Yes | Yes | Yes | No |
| View campaigns | Yes | Yes | Yes | Yes |
| Manage integrations | Yes | Yes | No | No |

#### 1.3 Tenant Isolation

**Deliverables:**
- [ ] Create workspace-scoped database queries helper
- [ ] Implement Row-Level Security (RLS) policies for PostgreSQL
- [ ] Add workspace validation middleware for all routes
- [ ] Create integration tests for cross-tenant data isolation
- [ ] Implement workspace-scoped API rate limiting

**Testing Requirements:**
- [ ] Test that User A cannot access Workspace B resources
- [ ] Test workspace deletion cascades properly
- [ ] Test member removal revokes access immediately
- [ ] Test invitation token expiration

---

### Phase 2: Core Domain Enhancement

**Priority: HIGH** - Ensure core features work with multi-tenancy

#### 2.1 Data Sources (Workspace-Scoped)

**Schema Updates:**
```sql
ALTER TABLE data_sources ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX data_sources_workspace_idx ON data_sources(workspace_id);
```

**API Updates:**
- [ ] Add workspace_id to all data source operations
- [ ] Update data source routes to require workspace context
- [ ] Implement workspace-scoped file storage for CSV uploads

#### 2.2 Campaign Templates (Workspace-Scoped)

**Schema Updates:**
```sql
ALTER TABLE campaign_templates ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX campaign_templates_workspace_idx ON campaign_templates(workspace_id);
```

**Deliverables:**
- [ ] Add workspace scoping to template CRUD
- [ ] Create template duplication across workspaces
- [ ] Implement template sharing (read-only access between workspaces)

#### 2.3 Rules Engine (Workspace-Scoped)

**Schema Updates:**
```sql
ALTER TABLE rules ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX rules_workspace_idx ON rules(workspace_id);
```

**Deliverables:**
- [ ] Add workspace scoping to rules CRUD
- [ ] Implement rule templates (system-wide pre-built rules)

#### 2.4 Campaign Sets (Workspace-Scoped)

**Schema Updates:**
```sql
ALTER TABLE campaign_sets ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX campaign_sets_workspace_idx ON campaign_sets(workspace_id);
```

**Deliverables:**
- [ ] Add workspace scoping to campaign set CRUD
- [ ] Ensure generated campaigns inherit workspace from parent set

---

### Phase 3: Generation Pipeline Enhancement

**Priority: HIGH** - Core value proposition

#### 3.1 Variable Substitution Engine

**Current Implementation:** `packages/core/src/services/variable-engine.ts`

**Enhancements:**
- [ ] Add variable validation before generation
- [ ] Implement fallback values for missing data
- [ ] Add variable transformation functions (uppercase, truncate, etc.)
- [ ] Create variable preview mode

**API Endpoints:**
```
POST /api/v1/generation/validate-variables
  Request: { template: string, dataRow: Record<string, unknown> }
  Response: { valid: boolean, missingVariables: string[], warnings: string[] }

POST /api/v1/generation/preview-substitution
  Request: { template: string, dataRow: Record<string, unknown>, limit: number }
  Response: { previews: string[] }
```

#### 3.2 Rules Execution Pipeline

**Current Implementation:** `packages/core/src/rules/rule-engine.ts`

**Enhancements:**
- [ ] Add rule execution logging
- [ ] Implement rule debugging mode (step-by-step evaluation)
- [ ] Add rule performance metrics
- [ ] Create rule testing sandbox

#### 3.3 Campaign Generation Job Queue

**New Tables:**
```sql
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_set_id UUID NOT NULL REFERENCES campaign_sets(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  error_log TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Deliverables:**
- [ ] Implement background job processing (Inngest or Trigger.dev)
- [ ] Create generation job queue with progress tracking
- [ ] Add job cancellation support
- [ ] Implement retry logic for failed jobs
- [ ] Add webhook notifications for job completion

**API Endpoints:**
```
POST /api/v1/campaign-sets/:setId/generate/async
  Response: { jobId: string }

GET  /api/v1/jobs/:jobId
  Response: { status, progress, totalRows, processedRows, error }

POST /api/v1/jobs/:jobId/cancel
```

---

### Phase 4: Reddit Integration (Primary Focus)

**Priority: HIGH** - Reddit is the primary platform for MVP

#### 4.1 Reddit Account Management

**Schema (D1/SQLite):**
```sql
CREATE TABLE reddit_accounts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  account_type TEXT NOT NULL,  -- 'personal' | 'ads_account'
  access_token TEXT NOT NULL,  -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  token_expires_at INTEGER NOT NULL,
  scopes TEXT NOT NULL,        -- JSON array of granted scopes
  is_active INTEGER DEFAULT 1,
  last_used_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(workspace_id, username)
);

CREATE INDEX idx_reddit_accounts_workspace ON reddit_accounts(workspace_id);
```

**API Endpoints:**
```
# OAuth Flow
GET  /api/v1/reddit/oauth/authorize
  Query: { type: 'personal' | 'ads', scopes?: string[] }
  Response: { authUrl: string, state: string }

GET  /api/v1/reddit/oauth/callback
  Query: { code, state }
  Response: Redirect to success page

# Account Management
GET    /api/v1/reddit/accounts
POST   /api/v1/reddit/accounts/:id/refresh
DELETE /api/v1/reddit/accounts/:id
GET    /api/v1/reddit/accounts/:id/validate
```

**Deliverables:**
- [ ] Reddit OAuth flow for personal accounts (organic posting)
- [ ] Reddit OAuth flow for ads accounts (paid ads)
- [ ] Token encryption at rest
- [ ] Automatic token refresh via Cloudflare Queue
- [ ] Account validation (check if tokens still work)

#### 4.2 Reddit Organic - Threads

**Schema (D1/SQLite):**
```sql
CREATE TABLE generated_threads (
  id TEXT PRIMARY KEY,
  campaign_set_id TEXT NOT NULL REFERENCES campaign_sets(id) ON DELETE CASCADE,
  data_row_id TEXT NOT NULL,
  reddit_account_id TEXT REFERENCES reddit_accounts(id),

  -- Thread Content
  subreddit TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,                    -- For self-posts
  url TEXT,                     -- For link posts
  image_key TEXT,               -- R2 storage key for images
  flair_id TEXT,
  is_nsfw INTEGER DEFAULT 0,
  is_spoiler INTEGER DEFAULT 0,
  send_replies INTEGER DEFAULT 1,

  -- Status & Tracking
  status TEXT DEFAULT 'draft',  -- draft, scheduled, posting, posted, failed
  scheduled_for INTEGER,        -- Unix timestamp
  posted_at INTEGER,
  reddit_post_id TEXT,          -- e.g., "t3_abc123"
  reddit_url TEXT,              -- Full URL to post
  error_message TEXT,

  -- Metrics (updated periodically)
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_threads_campaign_set ON generated_threads(campaign_set_id);
CREATE INDEX idx_threads_status ON generated_threads(status);
CREATE INDEX idx_threads_scheduled ON generated_threads(scheduled_for) WHERE status = 'scheduled';
```

**API Endpoints:**
```
# Thread Generation
POST /api/v1/campaign-sets/:setId/generate/threads
  Request: { preview?: boolean, limit?: number }
  Response: { jobId: string } | { threads: GeneratedThread[] }

# Thread Management
GET    /api/v1/threads
  Query: { campaignSetId, status, subreddit }
GET    /api/v1/threads/:id
PUT    /api/v1/threads/:id
DELETE /api/v1/threads/:id

# Publishing
POST /api/v1/threads/:id/publish
POST /api/v1/threads/:id/schedule
  Request: { scheduledFor: number }
POST /api/v1/campaign-sets/:setId/publish-all
  Request: { staggerMinutes?: number }  -- Time between posts
```

**Deliverables:**
- [ ] Thread template with variable substitution
- [ ] Subreddit targeting (single or list from data)
- [ ] Image upload to R2 + Reddit
- [ ] Flair mapping from data fields
- [ ] Post scheduling with staggered timing
- [ ] Rate limiting to avoid Reddit spam detection
- [ ] Post status tracking and metrics sync

#### 4.3 Reddit Organic - Comments

**Schema (D1/SQLite):**
```sql
CREATE TABLE generated_comments (
  id TEXT PRIMARY KEY,
  campaign_set_id TEXT NOT NULL REFERENCES campaign_sets(id) ON DELETE CASCADE,
  data_row_id TEXT NOT NULL,
  reddit_account_id TEXT REFERENCES reddit_accounts(id),

  -- Comment Content
  parent_id TEXT NOT NULL,      -- Thread ID (t3_xxx) or comment ID (t1_xxx)
  body TEXT NOT NULL,

  -- Status & Tracking
  status TEXT DEFAULT 'draft',
  scheduled_for INTEGER,
  posted_at INTEGER,
  reddit_comment_id TEXT,       -- e.g., "t1_abc123"
  reddit_url TEXT,
  error_message TEXT,

  -- Metrics
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_comments_campaign_set ON generated_comments(campaign_set_id);
CREATE INDEX idx_comments_parent ON generated_comments(parent_id);
```

**Deliverables:**
- [ ] Comment template with variable substitution
- [ ] Parent thread/comment targeting
- [ ] Comment scheduling
- [ ] Reply chains (comment on own threads)

#### 4.4 Reddit Paid Ads

**Existing:** `packages/reddit-ads/` SDK

**Enhancements:**
- [ ] Integrate with new workspace-scoped accounts
- [ ] Add campaign set generation for ads
- [ ] Sync ad performance metrics
- [ ] Budget management and alerts

#### 4.5 Reddit API Client

**Package:** `packages/reddit-api/` (NEW - for organic)

```typescript
// packages/reddit-api/src/client.ts
export class RedditClient {
  constructor(private accessToken: string) {}

  // Posting
  async submitThread(params: SubmitThreadParams): Promise<RedditPost>
  async submitComment(params: SubmitCommentParams): Promise<RedditComment>

  // Reading
  async getSubredditInfo(subreddit: string): Promise<SubredditInfo>
  async getFlairs(subreddit: string): Promise<Flair[]>
  async getPost(postId: string): Promise<RedditPost>

  // Account
  async getMe(): Promise<RedditUser>
  async getKarma(): Promise<KarmaBreakdown>
}
```

**Deliverables:**
- [ ] Create `packages/reddit-api/` for organic Reddit API
- [ ] OAuth PKCE flow for personal accounts
- [ ] Rate limiting (Reddit allows 60 req/min)
- [ ] Error handling for Reddit API errors
- [ ] Subreddit validation (check if can post)

---

### Phase 5: Publishing Pipeline

**Priority: HIGH** - Core value proposition

#### 5.1 Cloudflare Queues for Publishing

```typescript
// Queue message types
interface PublishThreadMessage {
  type: 'publish_thread'
  threadId: string
  workspaceId: string
  retryCount: number
}

interface PublishCommentMessage {
  type: 'publish_comment'
  commentId: string
  workspaceId: string
  retryCount: number
}

interface SyncMetricsMessage {
  type: 'sync_metrics'
  campaignSetId: string
  workspaceId: string
}
```

**Deliverables:**
- [ ] Queue producer for scheduling posts
- [ ] Queue consumer for publishing
- [ ] Retry logic with exponential backoff
- [ ] Dead letter queue for failed posts
- [ ] Metrics sync job (hourly)

#### 5.2 Rate Limiting & Anti-Spam

Reddit has strict rate limits and spam detection:

```typescript
interface PublishingConfig {
  // Per-account limits
  minSecondsBetweenPosts: number      // Default: 600 (10 min)
  maxPostsPerHour: number             // Default: 6
  maxPostsPerDay: number              // Default: 50

  // Per-subreddit limits
  minSecondsBetweenSubredditPosts: number  // Default: 3600 (1 hour)

  // Randomization to appear human
  jitterSeconds: number               // Random delay 0-N seconds
}
```

**Deliverables:**
- [ ] Per-account rate limiting with KV
- [ ] Per-subreddit rate limiting
- [ ] Random delay/jitter for human-like posting
- [ ] Karma monitoring (low karma = stricter limits)

---

### Phase 6: Sync & Metrics

**Priority: MEDIUM** - Nice to have for MVP

#### 6.1 Metrics Sync

**Schema (D1/SQLite):**
```sql
CREATE TABLE content_metrics (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,   -- 'thread' | 'comment' | 'ad'
  content_id TEXT NOT NULL,

  -- Engagement
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,

  -- Ad-specific (for paid)
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,

  synced_at INTEGER DEFAULT (unixepoch()),

  UNIQUE(content_type, content_id)
);
```

**Deliverables:**
- [ ] Periodic metrics sync via Queue
- [ ] Dashboard with engagement stats
- [ ] Export metrics to CSV

#### 6.2 Sync History

```sql
CREATE TABLE sync_history (
  id TEXT PRIMARY KEY,
  campaign_set_id TEXT NOT NULL REFERENCES campaign_sets(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,      -- 'publish' | 'metrics' | 'full'
  status TEXT NOT NULL,         -- 'running' | 'completed' | 'failed'
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_log TEXT,               -- JSON array of errors
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);
```

---

### Phase 7: SaaS Features

**Priority: MEDIUM** - Required for monetization (can launch with manual billing initially)

#### 7.1 Billing Integration (Stripe)

**New Tables:**
```sql
CREATE TABLE billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- active, past_due, canceled, trialing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  metric VARCHAR(100) NOT NULL, -- 'campaigns_generated', 'syncs_performed', 'api_calls'
  quantity INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_usage_record_id VARCHAR(255)
);
```

**API Endpoints:**
```
# Billing Management
GET    /api/v1/billing/subscription
POST   /api/v1/billing/checkout-session
POST   /api/v1/billing/customer-portal

# Stripe Webhooks
POST   /api/webhooks/stripe
  Events: checkout.session.completed, invoice.paid, invoice.payment_failed,
          customer.subscription.updated, customer.subscription.deleted
```

**Deliverables:**
- [ ] Install Stripe SDK (`stripe`, `@stripe/stripe-js`)
- [ ] Create billing customer on workspace creation
- [ ] Implement checkout session creation
- [ ] Add Stripe webhook handlers
- [ ] Implement usage tracking for metered billing
- [ ] Create billing dashboard UI
- [ ] Add subscription status checks middleware
- [ ] Implement feature gating based on plan

**Pricing Plans:**
| Plan | Monthly | Campaigns/mo | Syncs/mo | API Calls/mo | Members |
|------|---------|--------------|----------|--------------|---------|
| Starter | $29 | 500 | 50 | 10,000 | 2 |
| Pro | $99 | 5,000 | 500 | 100,000 | 10 |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Unlimited |

#### 7.2 API Keys for Programmatic Access

**New Tables:**
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of the key
  key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification
  scopes JSONB NOT NULL DEFAULT '["read", "write"]', -- Granular permissions
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

**API Endpoints:**
```
GET    /api/v1/api-keys
POST   /api/v1/api-keys
  Request: { name: string, scopes: string[], expiresIn: number }
  Response: { id, key, keyPrefix, scopes } -- key only shown once

DELETE /api/v1/api-keys/:keyId
POST   /api/v1/api-keys/:keyId/revoke
```

**Deliverables:**
- [ ] Implement secure API key generation (cryptographically random)
- [ ] Create key hashing and storage
- [ ] Add API key authentication middleware
- [ ] Implement scope-based authorization
- [ ] Add key usage tracking
- [ ] Create API key management UI
- [ ] Add rate limiting per API key

**API Key Format:** `dotoro_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 7.3 Audit Logging

**New Tables:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID, -- null for system actions
  action VARCHAR(100) NOT NULL, -- 'campaign_set.created', 'member.invited', etc.
  resource_type VARCHAR(100) NOT NULL, -- 'campaign_set', 'data_source', etc.
  resource_id UUID,
  metadata JSONB, -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for performance
CREATE INDEX audit_logs_workspace_created_idx ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_action_idx ON audit_logs(action);
```

**API Endpoints:**
```
GET /api/v1/audit-logs
  Query: { startDate, endDate, action, userId, resourceType, limit, cursor }
  Response: { logs: AuditLog[], nextCursor: string }
```

**Deliverables:**
- [ ] Create audit logging middleware
- [ ] Implement audit log routes with filtering
- [ ] Add audit log retention policy (90 days for Starter, 1 year for Pro, unlimited for Enterprise)
- [ ] Create audit log export functionality
- [ ] Add audit log viewer UI

**Audited Actions:**
- Authentication: login, logout, password_change
- Workspace: created, updated, deleted, member_invited, member_removed
- Campaign Sets: created, updated, deleted, generated, synced
- Data Sources: created, updated, deleted, data_uploaded
- API Keys: created, revoked, used

---

### Phase 8: UI Enhancement

**Priority: MEDIUM** - After backend features complete

#### 8.1 Dashboard

**Components:**
- [ ] `WorkspaceDashboard` - Overview of all campaign sets, recent activity
- [ ] `QuickStats` - Campaign count, sync status, usage metrics
- [ ] `RecentActivity` - Timeline of recent actions
- [ ] `UsageChart` - Monthly usage visualization

**Routes:**
```
/dashboard
/dashboard/campaigns
/dashboard/data-sources
/dashboard/templates
/dashboard/accounts
```

#### 8.2 Settings Pages

**Components:**
- [ ] `WorkspaceSettings` - Name, slug, preferences
- [ ] `TeamSettings` - Member management, invitations
- [ ] `BillingSettings` - Subscription, usage, invoices
- [ ] `ApiKeySettings` - Key management
- [ ] `IntegrationSettings` - Connected ad accounts
- [ ] `AuditLogViewer` - Searchable audit trail

**Routes:**
```
/settings
/settings/team
/settings/billing
/settings/api-keys
/settings/integrations
/settings/audit-log
```

#### 8.3 Wizard Enhancement

**Current Implementation:** `apps/web/app/campaigns/generate/`

**Enhancements:**
- [ ] Add draft auto-save
- [ ] Implement wizard state persistence (resume where left off)
- [ ] Add progress indicator with step validation
- [ ] Implement bulk operations mode
- [ ] Add template selection from library

---

## Not In Scope (Explicitly Excluded)

### Real-time Collaboration
- Multiple users editing same campaign set simultaneously
- **Why:** Complexity outweighs value for MVP; campaigns are typically created by single user

### A/B Testing Framework
- Built-in experiment creation and analysis
- **Why:** Users can create variations manually; dedicated A/B tools exist

### Mobile App
- Native iOS/Android applications
- **Why:** Web-first approach; responsive design covers mobile needs

### AI-Powered Copy Generation
- LLM integration for ad copy suggestions
- **Why:** Phase 2 feature; focus on core generation engine first

### Custom Domain Support
- White-label with custom domains
- **Why:** Enterprise feature for later; subdomains work for MVP

### Advanced Analytics Dashboard
- Performance metrics from ad platforms
- **Why:** Platform-native analytics are superior; focus on generation

### SSO/SAML Authentication
- Enterprise single sign-on
- **Why:** Enterprise feature; Clerk provides social login for MVP

### Data Pipeline Integrations
- Google Sheets, Airtable, Zapier connectors
- **Why:** Phase 2; CSV upload covers 80% of use cases

---

## Implementation Plan

### Step 1: Cloudflare Infrastructure (Phase 0)
- Create D1 database: `wrangler d1 create dotoro-db`
- Create R2 bucket: `wrangler r2 bucket create dotoro-assets`
- Create KV namespaces: `wrangler kv namespace create CACHE` and `SESSIONS`
- Create Queue: `wrangler queues create campaign-generation`
- Update `apps/web-app/wrangler.jsonc` with all bindings
- Create `packages/database-d1/` with Drizzle + D1 schemas

### Step 2: Authentication (Phase 1)
- Set up Clerk account and configure application
- Implement Clerk integration in `apps/web-app/`
- Add auth middleware to all routes
- Create protected route wrappers
- Implement Clerk webhook handlers

### Step 3: Workspaces & Multi-Tenancy (Phase 1)
- Create workspace schema (D1)
- Implement workspace CRUD
- Add workspace context to all entities
- Implement RBAC middleware
- Build workspace switcher UI

### Step 4: Core Domain Migration (Phase 2 + 3)
- Port data sources schema to D1
- Port campaign templates schema to D1
- Port rules schema to D1
- Port campaign sets schema to D1
- Verify `@repo/core` works with D1

### Step 5: Reddit Accounts (Phase 4)
- Implement Reddit OAuth for personal accounts (organic)
- Implement Reddit OAuth for ads accounts (paid)
- Token encryption at rest
- Automatic token refresh via Queue

### Step 6: Reddit Organic Threads (Phase 4)
- Create `packages/reddit-api/` for organic Reddit API
- Thread template with variable substitution
- Subreddit targeting
- Image upload to R2 + Reddit
- Post scheduling

### Step 7: Publishing Pipeline (Phase 5)
- Queue producer for scheduling posts
- Queue consumer for publishing
- Rate limiting with KV
- Retry logic and dead letter queue

### Step 8: Reddit Paid Ads (Phase 4)
- Integrate existing `packages/reddit-ads/` with new structure
- Campaign set generation for ads
- Sync ad performance metrics

### Step 9: Metrics & Sync (Phase 6)
- Periodic metrics sync via Queue
- Dashboard with engagement stats
- Sync history

### Step 10: SaaS Features (Phase 7)
- Stripe billing integration
- API keys for programmatic access
- Audit logging

### Step 11: UI Polish (Phase 8)
- Build dashboard
- Create settings pages
- Enhance wizard with Reddit thread templates
- Add onboarding flow

---

## Definition of Done

- [ ] All workspace data is isolated - verified by integration tests
- [ ] Authentication works end-to-end with Clerk
- [ ] Billing integration accepts payments and tracks usage
- [ ] API keys work for programmatic access
- [ ] Audit logs capture all significant actions
- [ ] All existing functionality works with workspace context
- [ ] Unit test coverage > 80% for new code
- [ ] Integration tests pass for critical paths
- [ ] API documentation updated in OpenAPI spec
- [ ] Performance: API responses < 200ms for common operations

---

## Notes

### Tech Stack (Final) - Full Cloudflare

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 16 + OpenNext | Existing scaffold in `apps/web-app/`, deploys to CF Workers |
| API | Hono.js on Workers | Edge-first, type-safe, OpenAPI, runs on CF Workers |
| Database | **Cloudflare D1** | SQLite-based, global replication, Drizzle ORM compatible |
| Auth | Clerk | Fast integration, webhooks, edge-compatible |
| Billing | Stripe | Industry standard, works from Workers |
| Background Jobs | **Cloudflare Queues** | Native to Workers, guaranteed delivery |
| Cache/Sessions | **Cloudflare KV** | Global, low-latency key-value store |
| File Storage | **Cloudflare R2** | S3-compatible, zero egress fees |
| Email | Resend | Simple API, great deliverability |
| Validation | Zod | Existing; type-safe, runtime validation |
| Durable Objects | **Cloudflare DO** | For rate limiting, real-time features (optional) |

#### Cloudflare-Specific Notes

**D1 Database:**
- SQLite-based, not PostgreSQL - some schema adjustments needed
- Drizzle ORM supports D1 via `drizzle-orm/d1`
- No RLS - implement tenant isolation in application layer
- Batch operations for performance

**Queues:**
- Replace Inngest/BullMQ with native CF Queues
- Consumer workers for campaign generation jobs
- Dead letter queues for failed jobs

**KV:**
- Session storage (Clerk session cache)
- API key lookups (hash → workspace mapping)
- Rate limiting counters

**R2:**
- CSV uploads, creative assets
- Presigned URLs for direct uploads
- Already S3-compatible

### Design Principles

1. **Workspace-First:** Every resource belongs to exactly one workspace
2. **Least Privilege:** Default to minimal permissions, require explicit grants
3. **Audit Everything:** If it matters, log it
4. **Fail Safely:** Validation before action, rollback on error
5. **API-First:** UI is just another API client
6. **Async by Default:** Long operations go to job queue

### Best Practices

1. **Database:**
   - Always include `workspace_id` in WHERE clauses
   - Use RLS policies as defense-in-depth
   - Create indexes for common query patterns

2. **API:**
   - Validate workspace access before any operation
   - Return consistent error formats
   - Log all errors with context

3. **Security:**
   - Hash API keys, never store plain
   - Encrypt OAuth tokens at rest
   - Validate webhook signatures

4. **Testing:**
   - Test workspace isolation explicitly
   - Mock external services (Stripe, Clerk, ad platforms)
   - Use database transactions for test isolation

---

## Next Steps

After this planning phase, the implementation order is:

1. **Phase 0** - Cloudflare infrastructure setup (D1, R2, KV, Queues)
2. **Phase 1** - Authentication with Clerk + Workspaces
3. **Phase 2-3** - Core domain migration to D1
4. **Phase 4** - Reddit integration (accounts, organic threads, paid ads)
5. **Phase 5** - Publishing pipeline with Queues
6. **Phase 6** - Metrics sync
7. **Phase 7** - SaaS features (billing, API keys, audit)
8. **Phase 8** - UI polish

**MVP Target:** Phases 0-5 (ability to generate and publish Reddit threads)

---

## Core Packages Review for Cloudflare Compatibility

**Review completed: 2025-12-25**

### @repo/core - Business Logic

**Status:** ✅ Compatible with `nodejs_compat` flag

| File | Status | Notes |
|------|--------|-------|
| `csv-parser.ts` | ✅ | Uses Papa Parse (browser-compatible) + Buffer |
| `variable-engine.ts` | ✅ | Pure string manipulation |
| `rule-engine.ts` | ✅ | Pure logic, no Node APIs |
| `transform-engine.ts` | ✅ | Pure data transformation |
| `generation/*` | ✅ | No Node.js-specific APIs |
| `storage/providers/memory.ts` | ✅ | Uses Buffer (works with nodejs_compat) |
| `storage/providers/local.ts` | ❌ | Uses `node:fs`, `node:path` - **exclude from Workers build** |

**Buffer Usage:** Several files use `Buffer.isBuffer()` and `Buffer.from()`. These work in Workers with `nodejs_compat` flag (already set in wrangler.jsonc).

**Action Items:**
- [x] Review all files for Node.js APIs
- [ ] Exclude `local.ts` from Workers bundle (tree-shake or conditional import)
- [ ] Create R2 storage provider for production

### @repo/database - ORM Layer

**Status:** 🔄 Needs new D1 package

**Current:** PostgreSQL + Drizzle with `pg` driver

**Action Items:**
- [ ] Create `packages/database-d1/` with D1 driver
- [ ] Port schemas: UUID → TEXT, JSONB → TEXT, TIMESTAMPTZ → INTEGER
- [ ] Create database adapter interface for core packages
- [ ] Allow core to work with either pg or D1

### @repo/reddit-ads - API Client

**Status:** ❌ Needs Web Crypto migration

**Issues Found:**
```typescript
// oauth.ts line 1 - Node.js crypto
import { createHash, randomBytes } from "crypto";

// oauth.ts line 262 - Buffer for base64
const credentials = Buffer.from(
  `${this.config.clientId}:${this.config.clientSecret}`
).toString("base64");
```

**Required Changes:**

```typescript
// BEFORE (Node.js)
import { createHash, randomBytes } from "crypto";

function generateState(): string {
  return randomBytes(16).toString("hex");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

// AFTER (Web Crypto - Workers compatible)
function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Base64 encoding without Buffer
function btoa64(str: string): string {
  return btoa(str);
}
```

**Action Items:**
- [ ] Replace `crypto` imports with Web Crypto API
- [ ] Replace `Buffer.from().toString('base64')` with `btoa()`
- [ ] Test OAuth flow in Workers environment
- [ ] Update tests to work with async Web Crypto

### @repo/ui - React Components

**Status:** ✅ Compatible (runs in browser)

No Workers compatibility needed - these run client-side.

---

## Compatibility Summary

| Package | Workers Ready | Changes Needed |
|---------|--------------|----------------|
| `@repo/core` | ⚠️ Mostly | Exclude `local.ts`, add R2 provider |
| `@repo/reddit-ads` | ❌ No | Migrate to Web Crypto API |
| `@repo/database` | ❌ No | Create new D1 package |
| `@repo/ui` | ✅ Yes | None (client-side) |

**Prerequisites for Workers deployment:**
1. Set `nodejs_compat` flag in wrangler.jsonc ✅ (already set)
2. Migrate `@repo/reddit-ads` OAuth to Web Crypto
3. Create `@repo/database-d1` package
4. Create R2 storage provider

---

## Migration Strategy

### Option A: Fresh Start (Recommended)

Build in `apps/web-app/` from scratch using core packages:

1. Set up Cloudflare bindings (D1, R2, KV, Queues)
2. Create `packages/database-d1/` with new schemas
3. Create adapter layer so `@repo/core` works with D1
4. Build API routes (embedded in Next.js or separate worker)
5. Build UI progressively

**Pros:** Clean architecture, no legacy debt
**Cons:** More upfront work

### Option B: Gradual Migration

Keep `apps/web/` + `apps/api/` running on existing infra, gradually move to Cloudflare:

1. Deploy `apps/web-app/` as new frontend
2. Point to existing API initially
3. Migrate API endpoints one by one to Workers
4. Switch database last (most complex)

**Pros:** Lower risk, can ship incrementally
**Cons:** Maintains two systems temporarily

### Recommendation

**Option A** - The existing codebase has good separation, but the iteration has left some complexity. A fresh start in `apps/web-app/` with clean D1 schemas will be faster than migrating.

Keep `packages/core/` - the business logic is solid and well-tested.
Create new `packages/database-d1/` - cleaner than adapting PostgreSQL schemas.
