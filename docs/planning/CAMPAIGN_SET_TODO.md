# Campaign Set Implementation - Task Checklist

> Quick reference checklist. See `CAMPAIGN_SET_MIGRATION.md` for full details.

---

## 🔴 Phase 1: Database Layer

### Schema Changes
- [ ] Create `campaign_set_status` enum (draft, pending, syncing, active, paused, completed, archived, error)
- [ ] Create `campaign_sets` table
  - [ ] id, userId, name, description
  - [ ] dataSourceId, templateId (foreign keys)
  - [ ] config (JSONB - wizard state snapshot)
  - [ ] status, syncStatus, lastSyncedAt
  - [ ] createdAt, updatedAt
- [ ] Add `campaign_set_id` column to `generated_campaigns` (nullable initially)
- [ ] Add `order_index` column to `generated_campaigns`
- [ ] Create indexes: `campaign_sets(userId)`, `generated_campaigns(campaign_set_id)`
- [ ] Generate and run migration

### Schema Files
- [ ] `packages/database/src/schema/campaignSets.ts` - New file
- [ ] `packages/database/src/schema/generatedCampaigns.ts` - Add campaignSetId
- [ ] `packages/database/src/schema/index.ts` - Export new schema
- [ ] `packages/database/drizzle/migrations/` - New migration file

---

## 🟠 Phase 2: Type Definitions

### Core Types (`@repo/core`)
- [ ] Create `packages/core/src/types/campaignSet.ts`
  - [ ] `CampaignSet` interface
  - [ ] `CampaignSetConfig` interface (wizard snapshot)
  - [ ] `CampaignSetStatus` type
  - [ ] `Campaign` interface (within set context)
  - [ ] `AdGroup`, `Ad`, `Keyword` interfaces
- [ ] Export from `packages/core/src/types/index.ts`

### Frontend Types
- [ ] Update `apps/web/app/campaigns/generate/types.ts`
  - [ ] Add `campaignSetName` to `WizardState`
  - [ ] Add `campaignSetDescription` to `WizardState`
  - [ ] Add `'campaign-set-name'` to `WizardStep` type
  - [ ] Add validation for campaign set name

---

## 🟡 Phase 3: API Routes

### Campaign Set CRUD
- [ ] `POST /api/v1/campaign-sets` - Create campaign set
- [ ] `GET /api/v1/campaign-sets` - List user's campaign sets
- [ ] `GET /api/v1/campaign-sets/:setId` - Get campaign set with campaigns
- [ ] `PUT /api/v1/campaign-sets/:setId` - Update campaign set
- [ ] `DELETE /api/v1/campaign-sets/:setId` - Delete campaign set (cascade)

### Generation & Sync
- [ ] `POST /api/v1/campaign-sets/:setId/generate` - Generate campaigns from config
- [ ] `POST /api/v1/campaign-sets/:setId/regenerate` - Regenerate (diff update)
- [ ] `POST /api/v1/campaign-sets/:setId/sync` - Sync entire set
- [ ] `POST /api/v1/campaign-sets/:setId/pause` - Pause all campaigns
- [ ] `POST /api/v1/campaign-sets/:setId/resume` - Resume all campaigns

### Files to Create
- [ ] `apps/web/app/api/v1/campaign-sets/route.ts`
- [ ] `apps/web/app/api/v1/campaign-sets/[setId]/route.ts`
- [ ] `apps/web/app/api/v1/campaign-sets/[setId]/generate/route.ts`
- [ ] `apps/web/app/api/v1/campaign-sets/[setId]/sync/route.ts`
- [ ] `apps/web/app/api/v1/campaign-sets/[setId]/pause/route.ts`
- [ ] `apps/web/app/api/v1/campaign-sets/[setId]/resume/route.ts`

---

## 🟢 Phase 4: Wizard Updates

### New Step Component
- [ ] Create `apps/web/app/campaigns/generate/components/CampaignSetName.tsx`
  - [ ] Name input (required)
  - [ ] Description input (optional)
  - [ ] Validation (name length, uniqueness check)
  - [ ] Next button enabled when valid

### CampaignEditor Changes
- [ ] Add campaign set name step as step 1 (shift others)
- [ ] Update step navigation (STEPS array)
- [ ] Update step count and progress bar
- [ ] Change "Generate Campaigns" button to "Create Campaign Set"
- [ ] Update `handleGenerate()` to:
  1. Create campaign set first
  2. Generate campaigns within set
  3. Navigate to `/campaign-sets/:setId`

### Wizard State Changes
- [ ] Update initial state with `campaignSetName: ''`
- [ ] Add `campaignSetDescription: ''`
- [ ] Update validation functions

---

## 🔵 Phase 5: Campaign Set Management Pages

### Listing Page
- [ ] Create `apps/web/app/campaign-sets/page.tsx`
  - [ ] List all user's campaign sets
  - [ ] Show: name, status, campaign count, last synced
  - [ ] Actions: View, Edit, Delete, Sync
  - [ ] Filters: status, date range
  - [ ] Create new button → `/campaigns/generate`

### Detail/Dashboard Page
- [ ] Create `apps/web/app/campaign-sets/[setId]/page.tsx`
  - [ ] Campaign set header (name, description, status)
  - [ ] Sync status indicator
  - [ ] Action buttons (Sync All, Pause All, Resume All, Edit)
  - [ ] Campaign list with expandable cards
  - [ ] Each campaign shows: ad groups → ads → keywords

### Components
- [ ] `CampaignSetCard.tsx` - Card for listing page
- [ ] `CampaignSetDashboard.tsx` - Main dashboard component
- [ ] `CampaignHierarchyView.tsx` - Expandable hierarchy tree
- [ ] `SyncStatusBadge.tsx` - Status indicator component

---

## 🟣 Phase 6: Sync Engine

### Campaign Set Sync Service
- [ ] Create `packages/core/src/services/campaignSetSync.ts`
  - [ ] `syncCampaignSet(setId)` - Sync all campaigns
  - [ ] `pauseCampaignSet(setId)` - Pause all
  - [ ] `resumeCampaignSet(setId)` - Resume all
  - [ ] Progress tracking and error aggregation

### Diff-Based Updates
- [ ] Create `packages/core/src/services/diffSync.ts`
  - [ ] Compare old vs new config
  - [ ] Identify changed entities
  - [ ] Generate minimal update operations
  - [ ] Apply partial sync

---

## ⚫ Phase 7: Migration & Cleanup

### Data Migration
- [ ] Create `scripts/migrate-to-campaign-sets.ts`
  - [ ] For each existing campaign:
    - [ ] Create a campaign set
    - [ ] Link campaign to set
  - [ ] Verify all campaigns have a set
- [ ] Run migration in development
- [ ] Run migration in production

### Schema Finalization
- [ ] Make `campaign_set_id` NOT NULL in `generated_campaigns`
- [ ] Update foreign key constraints
- [ ] Generate final migration

### Testing
- [ ] Unit tests for campaign set types
- [ ] API route tests for CRUD operations
- [ ] Integration tests for generation flow
- [ ] E2E tests for wizard with campaign sets

### Documentation
- [ ] Update API documentation
- [ ] Update user-facing docs
- [ ] Add migration guide for existing users

---

## Quick Start (MVP Path)

If you want the minimal viable implementation:

1. **Database**: Create `campaign_sets` table, add `campaign_set_id` to campaigns
2. **Types**: Define `CampaignSet` and `CampaignSetConfig`
3. **Wizard**: Add name step, update generation to create set first
4. **API**: Create basic CRUD routes
5. **Pages**: Create listing page and detail page
6. **Sync**: Update sync to operate on sets

This gives you create/save/edit/sync at the campaign set level.

---

## Estimated Scope

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Database | 2-3 hours | 🔴 Critical |
| Phase 2: Types | 1-2 hours | 🔴 Critical |
| Phase 3: API Routes | 3-4 hours | 🔴 Critical |
| Phase 4: Wizard Updates | 2-3 hours | 🔴 Critical |
| Phase 5: Management Pages | 4-6 hours | 🟠 High |
| Phase 6: Sync Engine | 3-4 hours | 🟠 High |
| Phase 7: Migration | 2-3 hours | 🟡 Medium |

**Total estimated: 17-25 hours**
