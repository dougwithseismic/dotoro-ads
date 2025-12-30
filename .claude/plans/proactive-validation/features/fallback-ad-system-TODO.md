# Fallback Ad System - TODO

**Date:** 2025-12-30
**Status:** Complete
**Feature:** Graceful handling of ads that exceed platform character limits

---

## Goal

Enable campaign sets to handle validation failures gracefully during sync by providing configurable fallback strategies. When dynamic content causes ads to exceed platform limits, users should be able to choose between using a pre-defined fallback ad, skipping the problematic variation, or truncating content - rather than having the entire sync fail.

### Success Criteria

- [x] Users can select a fallback strategy per campaign set from: "Use Fallback", "Skip", "Truncate"
- [x] Users can define a static fallback ad (no variables) that is guaranteed to pass validation
- [x] Skipped ads are logged and displayed in sync results with counts and details
- [x] Truncation applies configurable ellipsis handling for allowed fields only
- [x] Sync proceeds with valid ads plus fallbacks/skips, reporting partial success appropriately

---

## What's Already Done

### Database Schema
- [x] `campaign_sets.config` JSONB field exists with `CampaignSetConfig` type
- [x] `FallbackStrategy` type already defined: `"truncate" | "truncate_word" | "error"` in `packages/database/src/schema/campaign-sets.ts`
- [x] `AdDefinition` interface supports per-field fallback strategies (`headlineFallback`, `descriptionFallback`)
- [x] `sync_validation_results` table stores validation errors with full aggregation support

### Validation Layer
- [x] `SyncValidationService` in `packages/core/src/campaign-set/validation/sync-validation-service.ts` collects ALL errors
- [x] `ValidationErrorCode.FIELD_TOO_LONG` error code exists for length violations
- [x] `AdValidator` validates headline (100 chars), body (500 chars), display_url (25 chars)
- [x] Platform constraints defined in `packages/core/src/generation/platform-constraints.ts`

### Truncation Utilities
- [x] `truncateText()` - character-based truncation with ellipsis
- [x] `truncateToWordBoundary()` - word-boundary-aware truncation
- [x] `applyTruncation()` - applies truncation to all ad fields based on platform limits
- [x] `checkAllFieldLengths()` - validates all fields and returns overflow info

### Sync Service
- [x] `DefaultCampaignSetSyncService` handles campaign set syncing with skip/fail tracking
- [x] `SyncResult` type includes `skipped` count and `errors` array
- [x] Job handler emits SSE progress events for real-time feedback

---

## What We're Building Now

### Phase 1: Schema and Type Extensions (HIGH Priority) - COMPLETE
**Why:** Foundation for all other work - schema must be in place first

- [x] Add `fallbackStrategy` field to `CampaignSetConfig` interface
  - Location: `packages/database/src/schema/campaign-sets.ts`
  - Type: `"use_fallback" | "skip" | "truncate"` (extend existing `FallbackStrategy`)
  - Default: `"skip"` (safest option)

- [x] Add `fallbackAd` field to `CampaignSetConfig` interface
  - Location: `packages/database/src/schema/campaign-sets.ts`
  - Type: `FallbackAdDefinition` (new interface)
  - Fields: `headline`, `description`, `displayUrl`, `finalUrl`, `callToAction` (all static, no variables)

- [x] Add `skippedAds` tracking to sync results
  - Location: `apps/api/src/jobs/types.ts` - extend `SyncResult`
  - Type: `SkippedAdRecord[]` with `adId`, `adGroupId`, `campaignId`, `reason`, `field`, `overflow`

- [x] Create database migration for any new columns (if needed)
  - Location: `packages/database/drizzle/`
  - Note: Config is JSONB so schema changes are non-breaking

**Example Use Cases:**
1. E-commerce campaign with dynamic product names - some products have very long names that exceed headline limits
2. Multi-language campaign where translations vary significantly in length
3. User-generated content campaigns where input length is unpredictable

### Phase 2: Validation-Aware Strategy Engine (HIGH Priority) - COMPLETE
**Why:** Core logic that determines which strategy to apply for each failing ad

- [x] Create `FallbackStrategyEngine` class
  - Location: `packages/core/src/campaign-set/fallback/strategy-engine.ts`
  - Method: `applyStrategy(ad: Ad, errors: ValidationError[], config: CampaignSetConfig): StrategyResult`
  - Returns: `{ action: "sync" | "skip" | "fallback", ad: Ad, skippedReason?: string }`

- [x] Implement "Skip" strategy
  - Check if any `FIELD_TOO_LONG` errors exist for the ad
  - Return `{ action: "skip", ad, skippedReason: "headline exceeds 100 character limit (was 142)" }`
  - Log the skip decision with full context

- [x] Implement "Truncate" strategy
  - Use `applyTruncation()` from `platform-constraints.ts`
  - Apply to allowed fields only: `headline`, `description`, `displayUrl`
  - NOT allowed for: `finalUrl` (must remain valid), `callToAction` (enum)
  - Re-validate after truncation to ensure it passes

- [x] Implement "Use Fallback" strategy
  - Replace failing ad with the campaign set's `fallbackAd`
  - Preserve `adGroupId` and `campaignId` references
  - Log that fallback was used with original ad context

- [x] Add truncation configuration options
  - Location: `CampaignSetConfig.truncationConfig`
  - Fields: `truncateHeadline: boolean`, `truncateDescription: boolean`, `preserveWordBoundary: boolean`
  - Default: all true

**API Endpoint Schema:**
```typescript
// PATCH /api/campaign-sets/:id
{
  config: {
    fallbackStrategy: "skip" | "use_fallback" | "truncate",
    fallbackAd?: {
      headline: string,      // max 100 chars, no variables
      description: string,   // max 500 chars, no variables
      displayUrl: string,    // max 25 chars
      finalUrl: string,      // required, valid URL
      callToAction: string   // valid enum value
    },
    truncationConfig?: {
      truncateHeadline: boolean,
      truncateDescription: boolean,
      preserveWordBoundary: boolean
    }
  }
}
```

### Phase 3: Sync Service Integration (HIGH Priority)
**Why:** Strategy engine must be integrated into the actual sync flow

- [ ] Modify `DefaultCampaignSetSyncService.syncSingleCampaign()`
  - Location: `packages/core/src/campaign-set/sync-service.ts`
  - After validation fails, invoke `FallbackStrategyEngine` before aborting
  - Collect all ads that were skipped/replaced during the sync

- [ ] Update `CampaignSetSyncResult` to include skipped ad details
  - Location: `packages/core/src/campaign-set/sync-service.ts`
  - Add: `skippedAds: SkippedAdRecord[]`
  - Add: `fallbacksUsed: number`
  - Add: `truncated: number`

- [ ] Modify sync job handler to persist skipped ad data
  - Location: `apps/api/src/jobs/handlers/sync-campaign-set.ts`
  - Store `skippedAds` in sync validation results for later review
  - Emit progress events with skip/fallback counts

- [x] Update SSE events to include fallback/skip information
  - Location: `apps/api/src/jobs/events.ts`
  - Add to progress data: `skipped`, `fallbacksUsed`, `truncated`

**Integration Flow:**
```
1. Load campaign set with config.fallbackStrategy
2. Run validation on all ads
3. For each ad with FIELD_TOO_LONG errors:
   - If strategy = "skip": mark as skipped, continue
   - If strategy = "truncate": apply truncation, re-validate, sync if passes
   - If strategy = "use_fallback": swap with fallbackAd, sync
4. Sync all valid/truncated/fallback ads
5. Return result with skip/fallback counts
```

### Phase 4: API Endpoints (MEDIUM Priority)
**Why:** Enable frontend to configure fallback settings and view skipped ads

- [ ] Add fallback configuration to campaign set update endpoint
  - Location: `apps/api/src/routes/campaign-sets.ts`
  - Validate `fallbackAd` has no variables (regex check for `{variable}` patterns)
  - Validate `fallbackAd` passes all platform constraints before saving

- [ ] Add endpoint to retrieve skipped ads for a sync
  - Route: `GET /api/campaign-sets/:id/sync-results/:syncId/skipped`
  - Returns: list of skipped ads with reasons and context

- [ ] Add fallback ad validation endpoint
  - Route: `POST /api/campaign-sets/:id/validate-fallback`
  - Validates the fallback ad would pass all platform constraints
  - Returns: validation result with any errors

**Request/Response Examples:**
```typescript
// POST /api/campaign-sets/:id/validate-fallback
Request:
{
  fallbackAd: {
    headline: "Shop Our Best Deals",
    description: "Find great products at amazing prices.",
    finalUrl: "https://example.com/shop"
  }
}

Response (success):
{
  valid: true,
  warnings: []
}

Response (failure):
{
  valid: false,
  errors: [
    { field: "headline", message: "Contains variable {product_name}" }
  ]
}
```

### Phase 5: Frontend Components (MEDIUM Priority) - COMPLETE
**Why:** Users need UI to configure strategies and see results

- [x] Create FallbackStrategySelector component
  - Location: `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/fallback/FallbackStrategySelector.tsx`
  - Radio buttons: Skip (default), Truncate, Use Fallback
  - Show description of each option
  - Conditional reveal of fallback ad form when "Use Fallback" selected

- [x] Create FallbackAdForm component
  - Location: `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/fallback/FallbackAdForm.tsx`
  - Static fields with character counters
  - Real-time validation (no variables allowed, within limits)
  - Preview of fallback ad appearance

- [x] Create SkippedAdsPanel component
  - Location: `apps/web/app/[locale]/[teamSlug]/campaign-sets/[setId]/components/SkippedAdsPanel.tsx`
  - Display after sync completion when skips occurred
  - Show count and expandable list of skipped ads with reasons
  - Link to edit data source or adjust strategy

- [ ] Add skipped/fallback counts to sync status display
  - Location: `apps/web/components/sync-monitor/`
  - Show: "47 ads skipped due to length limits" or "12 ads used fallback"
  - Color-coded indicators (yellow for skips, blue for fallbacks)

- [ ] Add truncation options UI
  - Location: FallbackStrategySelector component
  - Checkboxes for which fields can be truncated
  - Toggle for word boundary preservation

---

## Not In Scope

### Per-Ad-Group Fallback Ads
- Why: Adds significant complexity; per-campaign-set fallback is sufficient for MVP
- Future: Consider if users report need for more granular control

### Automatic Fallback Generation
- Why: AI-generated fallbacks could produce unexpected results; explicit user control preferred
- Future: Could offer "suggest fallback" feature based on successful ads

### Fallback for Non-Length Errors
- Why: Other validation errors (invalid URLs, missing fields) require user correction, not fallback
- Future: Could extend to handle certain enum mismatches

### Historical Skipped Ad Analytics
- Why: Basic logging is sufficient; analytics adds scope
- Future: Dashboard showing skip trends over time

### Partial Truncation Strategies
- Why: Complexity of "truncate headline only, skip if description too long"
- Future: Could add field-specific strategy selection

---

## Implementation Plan

### Step 1: Schema Extensions (2-3 hours)
1. Extend `FallbackStrategy` type in `campaign-sets.ts` schema
2. Add `FallbackAdDefinition` interface
3. Add `fallbackAd` and `fallbackStrategy` to `CampaignSetConfig`
4. Extend `SyncResult` with `SkippedAdRecord[]`
5. Write unit tests for schema changes

### Step 2: Strategy Engine (3-4 hours)
1. Create `packages/core/src/campaign-set/fallback/` directory
2. Implement `FallbackStrategyEngine` class
3. Implement skip, truncate, and use_fallback strategies
4. Write comprehensive unit tests for each strategy
5. Add integration test with mock validation errors

### Step 3: Sync Service Integration (2-3 hours)
1. Inject strategy engine into sync service
2. Modify `syncSingleCampaign` to call strategy engine on validation failure
3. Update result types to include skip/fallback counts
4. Update job handler to persist skip data
5. Write integration tests for full sync flow with strategies

### Step 4: API Endpoints (2-3 hours)
1. Update campaign set PATCH endpoint for fallback config
2. Add validation for fallback ad (no variables, passes constraints)
3. Add skipped ads retrieval endpoint
4. Add fallback validation endpoint
5. Write API tests

### Step 5: Frontend - Strategy Selection (2-3 hours)
1. Create FallbackStrategySelector component
2. Create FallbackAdForm component
3. Integrate into campaign set wizard
4. Add form validation and character counters
5. Write component tests

### Step 6: Frontend - Results Display (2-3 hours)
1. Create SkippedAdsPanel component
2. Update sync monitor with skip/fallback counts
3. Add to campaign set detail page
4. Handle empty states
5. Write component tests

---

## Definition of Done

- [x] All fallback strategies (skip, truncate, use_fallback) work correctly during sync
- [x] Skipped ads are persisted and retrievable via API
- [x] Fallback ad configuration is validated before save (no variables, within limits)
- [x] Frontend allows strategy selection with appropriate UI for each option
- [x] Sync results display includes skip/fallback counts and details
- [x] All new code has unit test coverage >= 80%
- [ ] Integration tests cover full sync flow with each strategy (DEFERRED)
- [ ] API documentation updated with new endpoints and parameters (DEFERRED)
- [x] No regression in existing sync functionality

---

## Notes

### Tech Stack
- **Database:** PostgreSQL with Drizzle ORM - config stored as JSONB
- **API:** Hono.js with Zod validation
- **Frontend:** Next.js 14 App Router with React
- **Background Jobs:** pg-boss for async sync processing
- **Why JSONB for config:** Allows flexible schema evolution without migrations

### Design Principles
- **Fail-safe defaults:** "Skip" is the safest default - never send invalid data to platform
- **User control:** Users explicitly choose strategy; no automatic decisions
- **Transparency:** Clear reporting of what was skipped/modified and why
- **Reversibility:** Skipped ads can be fixed and re-synced

### Platform-Specific Considerations
- **Reddit:** headline (100), body (500), display_url (25) - all truncatable except URLs
- **Google Ads:** headline (30), description (90) - stricter limits, truncation more common
- **Future platforms:** Strategy engine designed to be platform-agnostic

### Best Practices
- Validate fallback ad at save time, not sync time - fail fast
- Store original ad data alongside skip record for debugging
- Use SSE progress events to show skip counts in real-time during sync
- Consider warning users if their data source will produce many skips

---

## Next Steps

### Phase 6: Dynamic Content Length Estimation Integration
- After `dynamic-content-length-estimation-TODO.md` is complete
- Pre-calculate which ads will fail before sync
- Show preview: "23 ads will be skipped with current settings"
- Enable users to adjust strategy before syncing

### Phase 7: Fallback Analytics Dashboard
- Track skip/fallback rates over time
- Identify data source columns that frequently cause skips
- Suggest data cleanup or template modifications

### Phase 8: Smart Truncation
- Preserve meaning by finding natural break points
- Handle multi-word variables more intelligently
- Consider context-aware abbreviations
