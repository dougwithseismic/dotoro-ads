# Database Schema Extensions

## Overview

This document defines the database schema extensions required to support the enhanced campaign platform features including:

- Enhanced budget and bidding
- Creative assets
- Extended content types
- Platform configurations

---

## Current Schema

### Existing Tables

```sql
-- Campaign templates
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'reddit' | 'google' | 'facebook'
  structure JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated campaigns
CREATE TABLE generated_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  template_id UUID REFERENCES campaign_templates(id),
  data_row_id UUID,
  campaign_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, pending, active, paused, completed, error
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync records
CREATE TABLE sync_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_campaign_id UUID REFERENCES generated_campaigns(id),
  platform VARCHAR(20) NOT NULL,
  platform_id VARCHAR(255),
  sync_status VARCHAR(20) DEFAULT 'pending', -- pending, syncing, synced, failed, conflict
  last_synced_at TIMESTAMP,
  error_log TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Schema Extensions

### Platform Enum Update

```sql
-- Update platform enum to support future platforms
CREATE TYPE platform_type AS ENUM (
  'google',
  'reddit',
  'facebook',
  'twitter',
  'linkedin',
  'tiktok',
  'instagram'
);

-- Migrate existing columns
ALTER TABLE campaign_templates
  ALTER COLUMN platform TYPE platform_type
  USING platform::platform_type;
```

### Content Category Enum

```sql
CREATE TYPE content_category AS ENUM (
  'paid',      -- Traditional paid ads
  'organic',   -- Organic posts
  'promoted'   -- Organic-style promoted content
);
```

### Ad Type Enum

```sql
CREATE TYPE ad_type AS ENUM (
  -- Google
  'google_responsive_search',
  'google_responsive_display',
  'google_performance_max',
  'google_video',
  'google_shopping',

  -- Reddit
  'reddit_link',
  'reddit_image',
  'reddit_video',
  'reddit_carousel',
  'reddit_conversation',
  'reddit_thread',

  -- Facebook
  'facebook_single_image',
  'facebook_video',
  'facebook_carousel',
  'facebook_collection',

  -- Generic
  'custom'
);
```

---

## New Tables

### 1. Creative Assets

```sql
CREATE TABLE creative_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Asset identification
  name VARCHAR(255),
  type VARCHAR(20) NOT NULL, -- 'image', 'video', 'gif'

  -- File info
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,

  -- Storage
  storage_provider VARCHAR(20), -- 'r2', 's3', 'local'
  storage_key VARCHAR(500),
  storage_url TEXT,
  public_url TEXT,

  -- Dimensions
  width INTEGER,
  height INTEGER,
  aspect_ratio VARCHAR(20),

  -- Video-specific
  duration DECIMAL(10, 2), -- seconds
  bitrate INTEGER,
  codec VARCHAR(50),
  thumbnail_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, archived, deleted

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_creative_assets_user (user_id),
  INDEX idx_creative_assets_type (type),
  INDEX idx_creative_assets_status (status)
);
```

### 2. Campaign Settings (Extended)

```sql
CREATE TABLE campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES generated_campaigns(id) ON DELETE CASCADE,

  -- Budget Configuration
  budget_type VARCHAR(20), -- 'daily', 'lifetime', 'shared'
  budget_amount DECIMAL(12, 2),
  budget_currency VARCHAR(3) DEFAULT 'USD',
  budget_pacing VARCHAR(20) DEFAULT 'standard', -- 'standard', 'accelerated'
  shared_budget_id UUID,

  -- Budget Caps
  daily_cap DECIMAL(12, 2),
  weekly_cap DECIMAL(12, 2),
  monthly_cap DECIMAL(12, 2),
  total_cap DECIMAL(12, 2),

  -- Schedule
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  timezone VARCHAR(50) DEFAULT 'UTC',
  day_parting JSONB, -- DayPartingConfig

  -- Bidding
  bidding_strategy VARCHAR(50),
  target_cpa DECIMAL(12, 2),
  target_roas DECIMAL(6, 2),
  target_cpm DECIMAL(12, 2),
  target_cpv DECIMAL(12, 2),
  max_cpc DECIMAL(12, 2),
  max_cpm DECIMAL(12, 2),
  max_cpv DECIMAL(12, 2),

  -- Bid Adjustments
  bid_adjustments JSONB DEFAULT '[]', -- BidAdjustment[]

  -- Targeting (platform-specific)
  targeting JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE (campaign_id)
);

CREATE INDEX idx_campaign_settings_campaign ON campaign_settings(campaign_id);
```

### 3. Ad Type Templates

```sql
CREATE TABLE ad_type_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Template identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  platform platform_type NOT NULL,
  ad_type ad_type NOT NULL,
  category content_category DEFAULT 'paid',

  -- Field mappings
  field_mappings JSONB NOT NULL DEFAULT '[]',

  -- Creative configuration
  creative_config JSONB DEFAULT '{}',

  -- Default settings
  default_settings JSONB DEFAULT '{}',

  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,

  -- Status
  is_public BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_ad_type_templates_user (user_id),
  INDEX idx_ad_type_templates_platform (platform),
  INDEX idx_ad_type_templates_ad_type (ad_type)
);
```

### 4. Campaign Creative Associations

```sql
CREATE TABLE campaign_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES generated_campaigns(id) ON DELETE CASCADE,
  creative_id UUID REFERENCES creative_assets(id) ON DELETE SET NULL,

  -- Position/Role
  slot VARCHAR(50) NOT NULL, -- 'primary_image', 'video', 'logo', 'carousel_1', etc.
  position INTEGER DEFAULT 0,

  -- Source type
  source_type VARCHAR(20) NOT NULL, -- 'upload', 'variable', 'remote'
  source_pattern TEXT, -- For variable sources like '{image_url}'
  source_url TEXT, -- For remote sources

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE (campaign_id, slot, position)
);

CREATE INDEX idx_campaign_creatives_campaign ON campaign_creatives(campaign_id);
CREATE INDEX idx_campaign_creatives_creative ON campaign_creatives(creative_id);
```

### 5. Thread Content

```sql
CREATE TABLE thread_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES generated_campaigns(id) ON DELETE CASCADE,

  -- Content type
  content_type VARCHAR(50) NOT NULL, -- 'post', 'comment', 'reply'
  platform platform_type NOT NULL,

  -- Thread structure (self-referencing for hierarchy)
  parent_id UUID REFERENCES thread_content(id) ON DELETE CASCADE,
  depth INTEGER DEFAULT 0,

  -- Content
  author_persona VARCHAR(100),
  title TEXT,
  body TEXT NOT NULL,

  -- Reddit-specific
  subreddit VARCHAR(100),
  flair VARCHAR(100),
  is_nsfw BOOLEAN DEFAULT FALSE,
  is_spoiler BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Order
  sort_order INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, published, deleted
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  platform_id VARCHAR(255), -- ID from the platform after publishing

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_thread_content_campaign (campaign_id),
  INDEX idx_thread_content_parent (parent_id),
  INDEX idx_thread_content_status (status)
);
```

### 6. Author Personas

```sql
CREATE TABLE author_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Persona info
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Characteristics
  role VARCHAR(50), -- 'op', 'community_member', 'skeptic', 'enthusiast', 'expert', 'curious'
  tone VARCHAR(50), -- 'friendly', 'skeptical', 'enthusiastic', 'neutral', 'curious'
  expertise VARCHAR(50), -- 'novice', 'intermediate', 'expert'

  -- Avatar (optional)
  avatar_url TEXT,

  -- Default flag
  is_default BOOLEAN DEFAULT FALSE,

  -- Usage tracking
  use_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_author_personas_user (user_id)
);
```

### 7. Shared Budgets

```sql
CREATE TABLE shared_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Budget info
  name VARCHAR(255) NOT NULL,
  platform platform_type NOT NULL,

  -- Budget settings
  budget_type VARCHAR(20) NOT NULL, -- 'daily', 'monthly'
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Current spend tracking
  current_spend DECIMAL(12, 2) DEFAULT 0,
  period_start TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, paused, depleted

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_shared_budgets_user (user_id),
  INDEX idx_shared_budgets_platform (platform)
);

-- Junction table for campaigns using shared budgets
CREATE TABLE campaign_shared_budgets (
  campaign_id UUID REFERENCES generated_campaigns(id) ON DELETE CASCADE,
  shared_budget_id UUID REFERENCES shared_budgets(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (campaign_id, shared_budget_id)
);
```

### 8. Asset Library (for future asset management)

```sql
CREATE TABLE asset_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  parent_id UUID REFERENCES asset_folders(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Folder metadata
  asset_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_asset_folders_user (user_id),
  INDEX idx_asset_folders_parent (parent_id)
);

-- Add folder reference to creative_assets
ALTER TABLE creative_assets
  ADD COLUMN folder_id UUID REFERENCES asset_folders(id) ON DELETE SET NULL;
```

---

## Drizzle Schema

```typescript
// packages/api/db/schema/campaigns-extended.ts

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const platformEnum = pgEnum('platform_type', [
  'google', 'reddit', 'facebook', 'twitter', 'linkedin', 'tiktok', 'instagram'
]);

export const contentCategoryEnum = pgEnum('content_category', [
  'paid', 'organic', 'promoted'
]);

export const adTypeEnum = pgEnum('ad_type', [
  'google_responsive_search', 'google_responsive_display', 'google_performance_max',
  'google_video', 'google_shopping',
  'reddit_link', 'reddit_image', 'reddit_video', 'reddit_carousel',
  'reddit_conversation', 'reddit_thread',
  'facebook_single_image', 'facebook_video', 'facebook_carousel', 'facebook_collection',
  'custom'
]);

// Creative Assets
export const creativeAssets = pgTable('creative_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),

  name: varchar('name', { length: 255 }),
  type: varchar('type', { length: 20 }).notNull(),

  fileName: varchar('file_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: integer('file_size'),

  storageProvider: varchar('storage_provider', { length: 20 }),
  storageKey: varchar('storage_key', { length: 500 }),
  storageUrl: text('storage_url'),
  publicUrl: text('public_url'),

  width: integer('width'),
  height: integer('height'),
  aspectRatio: varchar('aspect_ratio', { length: 20 }),

  duration: decimal('duration', { precision: 10, scale: 2 }),
  bitrate: integer('bitrate'),
  codec: varchar('codec', { length: 50 }),
  thumbnailUrl: text('thumbnail_url'),

  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  status: varchar('status', { length: 20 }).default('active'),
  folderId: uuid('folder_id'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_creative_assets_user').on(table.userId),
  typeIdx: index('idx_creative_assets_type').on(table.type),
}));

// Campaign Settings
export const campaignSettings = pgTable('campaign_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => generatedCampaigns.id, { onDelete: 'cascade' }),

  // Budget
  budgetType: varchar('budget_type', { length: 20 }),
  budgetAmount: decimal('budget_amount', { precision: 12, scale: 2 }),
  budgetCurrency: varchar('budget_currency', { length: 3 }).default('USD'),
  budgetPacing: varchar('budget_pacing', { length: 20 }).default('standard'),
  sharedBudgetId: uuid('shared_budget_id'),

  // Caps
  dailyCap: decimal('daily_cap', { precision: 12, scale: 2 }),
  weeklyCap: decimal('weekly_cap', { precision: 12, scale: 2 }),
  monthlyCap: decimal('monthly_cap', { precision: 12, scale: 2 }),
  totalCap: decimal('total_cap', { precision: 12, scale: 2 }),

  // Schedule
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  dayParting: jsonb('day_parting').$type<DayPartingConfig>(),

  // Bidding
  biddingStrategy: varchar('bidding_strategy', { length: 50 }),
  targetCpa: decimal('target_cpa', { precision: 12, scale: 2 }),
  targetRoas: decimal('target_roas', { precision: 6, scale: 2 }),
  targetCpm: decimal('target_cpm', { precision: 12, scale: 2 }),
  targetCpv: decimal('target_cpv', { precision: 12, scale: 2 }),
  maxCpc: decimal('max_cpc', { precision: 12, scale: 2 }),
  maxCpm: decimal('max_cpm', { precision: 12, scale: 2 }),
  maxCpv: decimal('max_cpv', { precision: 12, scale: 2 }),

  bidAdjustments: jsonb('bid_adjustments').$type<BidAdjustment[]>().default([]),
  targeting: jsonb('targeting').$type<TargetingConfig>().default({}),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  campaignIdx: uniqueIndex('idx_campaign_settings_campaign').on(table.campaignId),
}));

// Ad Type Templates
export const adTypeTemplates = pgTable('ad_type_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  platform: platformEnum('platform').notNull(),
  adType: adTypeEnum('ad_type').notNull(),
  category: contentCategoryEnum('category').default('paid'),

  fieldMappings: jsonb('field_mappings').$type<FieldMapping[]>().default([]),
  creativeConfig: jsonb('creative_config').$type<CreativeConfig>().default({}),
  defaultSettings: jsonb('default_settings').$type<Record<string, unknown>>().default({}),

  useCount: integer('use_count').default(0),
  lastUsedAt: timestamp('last_used_at'),

  isPublic: boolean('is_public').default(false),
  status: varchar('status', { length: 20 }).default('active'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_ad_type_templates_user').on(table.userId),
  platformIdx: index('idx_ad_type_templates_platform').on(table.platform),
}));

// Thread Content
export const threadContent = pgTable('thread_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => generatedCampaigns.id, { onDelete: 'cascade' }),

  contentType: varchar('content_type', { length: 50 }).notNull(),
  platform: platformEnum('platform').notNull(),

  parentId: uuid('parent_id'),
  depth: integer('depth').default(0),

  authorPersona: varchar('author_persona', { length: 100 }),
  title: text('title'),
  body: text('body').notNull(),

  subreddit: varchar('subreddit', { length: 100 }),
  flair: varchar('flair', { length: 100 }),
  isNsfw: boolean('is_nsfw').default(false),
  isSpoiler: boolean('is_spoiler').default(false),

  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  sortOrder: integer('sort_order').default(0),

  status: varchar('status', { length: 20 }).default('draft'),
  scheduledAt: timestamp('scheduled_at'),
  publishedAt: timestamp('published_at'),
  platformId: varchar('platform_id', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  campaignIdx: index('idx_thread_content_campaign').on(table.campaignId),
  parentIdx: index('idx_thread_content_parent').on(table.parentId),
}));

// Author Personas
export const authorPersonas = pgTable('author_personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),

  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),

  role: varchar('role', { length: 50 }),
  tone: varchar('tone', { length: 50 }),
  expertise: varchar('expertise', { length: 50 }),

  avatarUrl: text('avatar_url'),
  isDefault: boolean('is_default').default(false),
  useCount: integer('use_count').default(0),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_author_personas_user').on(table.userId),
}));

// Relations
export const threadContentRelations = relations(threadContent, ({ one, many }) => ({
  campaign: one(generatedCampaigns, {
    fields: [threadContent.campaignId],
    references: [generatedCampaigns.id],
  }),
  parent: one(threadContent, {
    fields: [threadContent.parentId],
    references: [threadContent.id],
    relationName: 'threadHierarchy',
  }),
  replies: many(threadContent, {
    relationName: 'threadHierarchy',
  }),
}));
```

---

## Migrations

### Migration: Add Extended Tables

```typescript
// packages/api/db/migrations/0001_add_campaign_extensions.ts

import { sql } from 'drizzle-orm';
import { db } from '../client';

export async function up() {
  // Create enums
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE platform_type AS ENUM (
        'google', 'reddit', 'facebook', 'twitter', 'linkedin', 'tiktok', 'instagram'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE content_category AS ENUM ('paid', 'organic', 'promoted');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create tables (using Drizzle push or explicit SQL)
  // ...
}

export async function down() {
  // Drop tables in reverse order
  await db.execute(sql`DROP TABLE IF EXISTS thread_content CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS campaign_settings CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS creative_assets CASCADE`);
  // ...
}
```
