# Campaign Set Migration Plan

> **Goal**: Shift from individual campaign generation to **campaign set-level** generation, editing, and syncing.

## Current vs. Target Architecture

```
CURRENT                              TARGET
────────────────────────────────     ────────────────────────────────
generatedCampaigns (individual)      campaignSets (container)
    ↓                                    ↓
syncRecords (per campaign)           campaigns (belongs to set)
                                         ↓
                                     adGroups → ads → keywords
                                         ↓
                                     syncRecords (per set OR per campaign)
```

---

## Phase 1: Database Schema Changes

### 1.1 Create `campaignSets` Table

```typescript
// packages/database/src/schema/campaignSets.ts
export const campaignSets = pgTable('campaign_sets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),

  // Identity
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Source data
  dataSourceId: uuid('data_source_id').references(() => dataSources.id),
  templateId: uuid('template_id').references(() => campaignTemplates.id),

  // Configuration snapshot (wizard state at creation)
  config: jsonb('config').$type<CampaignSetConfig>().notNull(),

  // Status
  status: campaignSetStatusEnum('status').default('draft').notNull(),

  // Sync tracking
  lastSyncedAt: timestamp('last_synced_at'),
  syncStatus: syncStatusEnum('sync_status').default('pending'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const campaignSetStatusEnum = pgEnum('campaign_set_status', [
  'draft',        // Just created, not synced
  'pending',      // Queued for sync
  'syncing',      // Currently syncing to platforms
  'active',       // Live on platforms
  'paused',       // Paused across all platforms
  'completed',    // Campaign period ended
  'archived',     // User archived
  'error',        // Sync failed
]);
```

### 1.2 Modify `generatedCampaigns` Table

```typescript
// Add campaign set reference
campaignSetId: uuid('campaign_set_id')
  .references(() => campaignSets.id, { onDelete: 'cascade' })
  .notNull(),

// Add ordering within set
orderIndex: integer('order_index').default(0),
```

### 1.3 Create Hierarchical Tables (Optional - for normalized structure)

```typescript
// campaigns → adGroups → ads → keywords
// Currently stored as JSONB, consider normalizing for better querying

export const adGroups = pgTable('ad_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => generatedCampaigns.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  settings: jsonb('settings').$type<AdGroupSettings>(),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ads = pgTable('ads', {
  id: uuid('id').defaultRandom().primaryKey(),
  adGroupId: uuid('ad_group_id').references(() => adGroups.id, { onDelete: 'cascade' }),
  headline: varchar('headline', { length: 300 }),
  description: text('description'),
  displayUrl: varchar('display_url', { length: 255 }),
  finalUrl: text('final_url'),
  callToAction: varchar('call_to_action', { length: 50 }),
  assets: jsonb('assets').$type<AdAssets>(),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const keywords = pgTable('keywords', {
  id: uuid('id').defaultRandom().primaryKey(),
  adGroupId: uuid('ad_group_id').references(() => adGroups.id, { onDelete: 'cascade' }),
  keyword: varchar('keyword', { length: 255 }).notNull(),
  matchType: matchTypeEnum('match_type').default('broad'),
  bid: decimal('bid', { precision: 10, scale: 2 }),
  status: keywordStatusEnum('status').default('active'),
});
```

---

## Phase 2: Type Definitions

### 2.1 Core Campaign Set Types

```typescript
// packages/core/src/types/campaignSet.ts

export interface CampaignSet {
  id: string;
  userId: string;
  name: string;
  description?: string;

  // Configuration
  config: CampaignSetConfig;

  // Contained entities
  campaigns: Campaign[];

  // Status
  status: CampaignSetStatus;
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignSetConfig {
  // Snapshot of wizard state
  dataSourceId: string;
  selectedPlatforms: Platform[];
  selectedAdTypes: Record<Platform, AdType[]>;
  campaignConfig: CampaignConfig;
  budgetConfig: BudgetConfig;
  biddingConfig: BiddingConfig;
  hierarchyConfig: HierarchyConfig;
  targetingConfig?: TargetingConfig;
  inlineRules?: InlineRule[];

  // Generation metadata
  generatedAt: Date;
  rowCount: number;
  campaignCount: number;
}

export type CampaignSetStatus =
  | 'draft'
  | 'pending'
  | 'syncing'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'
  | 'error';

export interface Campaign {
  id: string;
  campaignSetId: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;

  // Hierarchy
  adGroups: AdGroup[];

  // Platform-specific data
  platformCampaignId?: string;
  platformData?: Record<string, unknown>;

  // Sync
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  syncError?: string;
}

export interface AdGroup {
  id: string;
  campaignId: string;
  name: string;
  settings?: AdGroupSettings;
  ads: Ad[];
  keywords: Keyword[];
  orderIndex: number;
}

export interface Ad {
  id: string;
  adGroupId: string;
  headline: string;
  description: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
  assets?: AdAssets;
  orderIndex: number;
}

export interface Keyword {
  id: string;
  adGroupId: string;
  keyword: string;
  matchType: 'broad' | 'phrase' | 'exact';
  bid?: number;
  status: 'active' | 'paused' | 'removed';
}
```

### 2.2 Update Wizard Types

```typescript
// apps/web/app/campaigns/generate/types.ts

// Add campaign set fields to wizard state
export interface WizardState {
  // NEW: Campaign set identity
  campaignSetName: string;
  campaignSetDescription?: string;

  // Existing fields...
  currentStep: WizardStep;
  dataSourceId: string | null;
  // ...
}

// Add new step or modify existing
export type WizardStep =
  | 'campaign-set-name'  // NEW: First step
  | 'data-source'
  | 'rules'
  | 'campaign-config'
  | 'platform'
  | 'ad-type'
  | 'hierarchy'
  | 'targeting'
  | 'preview';
```

---

## Phase 3: API Routes

### 3.1 Campaign Set CRUD

```typescript
// apps/web/app/api/v1/campaign-sets/route.ts

// GET /api/v1/campaign-sets - List user's campaign sets
// POST /api/v1/campaign-sets - Create new campaign set

// apps/web/app/api/v1/campaign-sets/[setId]/route.ts

// GET /api/v1/campaign-sets/:setId - Get campaign set with campaigns
// PUT /api/v1/campaign-sets/:setId - Update campaign set config
// DELETE /api/v1/campaign-sets/:setId - Delete campaign set (cascades)

// apps/web/app/api/v1/campaign-sets/[setId]/generate/route.ts

// POST /api/v1/campaign-sets/:setId/generate - Generate campaigns from config

// apps/web/app/api/v1/campaign-sets/[setId]/regenerate/route.ts

// POST /api/v1/campaign-sets/:setId/regenerate - Regenerate (diff-based update)
```

### 3.2 Campaign Set Sync

```typescript
// apps/web/app/api/v1/campaign-sets/[setId]/sync/route.ts

// POST /api/v1/campaign-sets/:setId/sync - Sync entire set to platforms
// Response includes: { syncedCount, failedCount, errors[] }

// apps/web/app/api/v1/campaign-sets/[setId]/pause/route.ts

// POST /api/v1/campaign-sets/:setId/pause - Pause all campaigns in set

// apps/web/app/api/v1/campaign-sets/[setId]/resume/route.ts

// POST /api/v1/campaign-sets/:setId/resume - Resume all campaigns in set
```

### 3.3 Individual Campaign Operations (within set context)

```typescript
// apps/web/app/api/v1/campaign-sets/[setId]/campaigns/[campaignId]/route.ts

// GET - Get single campaign
// PUT - Update single campaign
// DELETE - Remove campaign from set

// apps/web/app/api/v1/campaign-sets/[setId]/campaigns/[campaignId]/sync/route.ts

// POST - Sync single campaign only
```

---

## Phase 4: Frontend Components

### 4.1 New Campaign Set Name Step

```typescript
// apps/web/app/campaigns/generate/components/CampaignSetName.tsx

interface CampaignSetNameProps {
  name: string;
  description?: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onNext: () => void;
}

// First step in wizard - name and describe the campaign set
```

### 4.2 Modify CampaignEditor

```typescript
// apps/web/app/campaigns/generate/components/CampaignEditor.tsx

// Changes needed:
// 1. Add campaign set name step (step 0 or step 1)
// 2. Change "Generate Campaigns" to "Create Campaign Set"
// 3. Update generateCampaigns() to create set + campaigns
// 4. Update navigation to go to /campaign-sets/:id after creation
```

### 4.3 New Campaign Set Management Pages

```
/campaign-sets                    - List all campaign sets
/campaign-sets/[setId]           - View/edit single campaign set
/campaign-sets/[setId]/campaigns - List campaigns within set
/campaign-sets/[setId]/edit      - Edit campaign set config
```

### 4.4 Campaign Set Dashboard Component

```typescript
// apps/web/app/campaign-sets/[setId]/components/CampaignSetDashboard.tsx

// Shows:
// - Campaign set name, description, status
// - Sync status indicator
// - List of campaigns with individual statuses
// - Actions: Sync All, Pause All, Resume All, Edit, Archive
// - Expandable campaign cards showing ad groups, ads, keywords
```

---

## Phase 5: Sync Engine Updates

### 5.1 Campaign Set Sync Service

```typescript
// packages/core/src/services/campaignSetSync.ts

export class CampaignSetSyncService {
  async syncCampaignSet(setId: string): Promise<SyncResult> {
    // 1. Load campaign set with all campaigns
    // 2. Group campaigns by platform
    // 3. Sync to each platform in parallel
    // 4. Aggregate results
    // 5. Update campaign set sync status
  }

  async pauseCampaignSet(setId: string): Promise<void> {
    // Pause all campaigns across all platforms
  }

  async resumeCampaignSet(setId: string): Promise<void> {
    // Resume all campaigns across all platforms
  }
}
```

### 5.2 Diff-Based Sync

```typescript
// packages/core/src/services/diffSync.ts

export class DiffSyncService {
  // When user edits campaign set config:
  // 1. Compare new config vs. stored config
  // 2. Identify changed campaigns/ad groups/ads
  // 3. Generate minimal update operations
  // 4. Apply changes to database
  // 5. Queue changed entities for platform sync
}
```

---

## Phase 6: Migration Strategy

### 6.1 Database Migration

```typescript
// packages/database/drizzle/migrations/XXXX_add_campaign_sets.ts

// 1. Create campaign_sets table
// 2. Create campaign_set_status enum
// 3. Add campaign_set_id column to generated_campaigns (nullable initially)
// 4. Create default campaign sets for existing campaigns (migration script)
// 5. Make campaign_set_id NOT NULL after migration
// 6. Add indexes for performance
```

### 6.2 Data Migration Script

```typescript
// scripts/migrate-to-campaign-sets.ts

// For each existing generatedCampaign:
// 1. Create a campaign set named "Migrated - {campaign.name}"
// 2. Link campaign to new set
// 3. Copy relevant config from campaign to set
```

---

## Implementation Order (TODO Checklist)

### Sprint 1: Foundation
- [ ] Create `campaignSets` database table and enum
- [ ] Add `campaignSetId` to `generatedCampaigns` (nullable)
- [ ] Define `CampaignSet` and related types in `@repo/core`
- [ ] Create basic CRUD API routes for campaign sets

### Sprint 2: Wizard Integration
- [ ] Add "Campaign Set Name" step to wizard (new first step)
- [ ] Update `WizardState` type with campaign set fields
- [ ] Modify generation flow to create campaign set first
- [ ] Update `CampaignEditor` to handle new flow

### Sprint 3: Campaign Set Management
- [ ] Create `/campaign-sets` listing page
- [ ] Create `/campaign-sets/[setId]` detail/dashboard page
- [ ] Build `CampaignSetDashboard` component
- [ ] Add campaign hierarchy visualization (sets → campaigns → ad groups → ads)

### Sprint 4: Sync at Set Level
- [ ] Create `CampaignSetSyncService`
- [ ] Update sync endpoints to operate on sets
- [ ] Add "Sync All", "Pause All", "Resume All" actions
- [ ] Implement sync status aggregation at set level

### Sprint 5: Edit & Update
- [ ] Create campaign set edit flow
- [ ] Implement diff-based regeneration
- [ ] Add individual campaign/ad group/ad editing within set context
- [ ] Handle partial sync (only changed entities)

### Sprint 6: Migration & Polish
- [ ] Write data migration script for existing campaigns
- [ ] Make `campaignSetId` NOT NULL
- [ ] Add tests for all new functionality
- [ ] Update documentation

---

## Key Decisions Needed

1. **Normalized vs. JSONB hierarchy**
   - Current: Ad groups/ads stored as JSONB in `campaignData`
   - Option A: Keep JSONB (simpler, current approach)
   - Option B: Normalize to separate tables (better querying, more complex)

2. **Sync granularity**
   - Option A: Always sync entire set
   - Option B: Smart sync - only changed campaigns
   - Option C: User chooses per-campaign or full-set sync

3. **Edit capabilities**
   - Can users edit individual campaigns after generation?
   - Can users add/remove campaigns from a set?
   - Can users merge campaign sets?

4. **Versioning**
   - Track config versions for rollback?
   - Audit log of changes?

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/database/src/schema/campaignSets.ts` | **CREATE** | New schema file |
| `packages/database/src/schema/generatedCampaigns.ts` | MODIFY | Add campaignSetId |
| `packages/core/src/types/campaignSet.ts` | **CREATE** | New type definitions |
| `apps/web/app/campaigns/generate/types.ts` | MODIFY | Add campaign set fields |
| `apps/web/app/campaigns/generate/components/CampaignSetName.tsx` | **CREATE** | New wizard step |
| `apps/web/app/campaigns/generate/components/CampaignEditor.tsx` | MODIFY | Add set name step, update flow |
| `apps/web/app/api/v1/campaign-sets/` | **CREATE** | New API routes |
| `apps/web/app/campaign-sets/` | **CREATE** | New pages |
| `packages/core/src/services/campaignSetSync.ts` | **CREATE** | New sync service |
