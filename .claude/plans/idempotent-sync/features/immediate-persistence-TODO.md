# Immediate Platform ID Persistence

**Project:** Dotoro - Reddit Ads Sync System
**Feature:** Immediate Platform ID Persistence
**Date:** 2025-12-30
**Status:** Complete

---

## Overview

The Reddit ads sync system creates entities on the platform in a hierarchical order: Campaign -> Ad Group -> Ad -> Keyword. Currently, platform IDs are only persisted to the database when the **entire sync chain succeeds**. This creates a critical bug: if a campaign is created successfully on Reddit but a child entity (ad group, ad, or keyword) fails, the platformCampaignId is lost. On retry, a duplicate campaign is created on Reddit.

### The Problem

```
Current Flow:
1. Campaign created on Reddit -> platformCampaignId = "t3_abc123"
2. Ad group creation FAILS -> sync returns success: false
3. platformCampaignId NEVER saved to DB (only saved on success=true)
4. Next sync: no platformCampaignId -> creates DUPLICATE campaign "t3_xyz789"
```

### The Solution

Save each platform ID immediately after the entity is successfully created on the platform, BEFORE attempting to sync child entities. This ensures idempotent sync operations - if a sync fails partway through, retrying will update existing platform entities rather than creating duplicates.

---

## Goal

Enable idempotent campaign set syncing by persisting platform IDs immediately after each entity is created on the ad platform, preventing duplicate entity creation on retry.

### Success Criteria

- [x] Platform IDs are saved to DB immediately after each entity creation succeeds
- [x] Partial sync failures preserve all successfully-created platform IDs
- [x] Re-syncing a partially-failed campaign set updates (not duplicates) existing entities
- [x] All existing tests pass without modification (integration test updated to expect 2 calls per campaign)
- [x] New tests cover the immediate persistence behavior

---

## What's Already Done

### Repository Interface (Complete)
- `updateCampaignPlatformId(campaignId, platformId)` - lines 137
- `updateAdGroupPlatformId(adGroupId, platformId)` - line 138
- `updateAdPlatformId(adId, platformId)` - line 139
- `updateKeywordPlatformId(keywordId, platformId)` - line 140

### Ad Group/Ad/Keyword Persistence (Already Correct)
- `syncAdGroup()` - line 601: saves platformAdGroupId immediately after create
- `syncAd()` - line 661: saves platformAdId immediately after create
- `syncKeyword()` - line 695-698: saves platformKeywordId immediately after create

### Current Campaign ID Handling (The Bug)
- `syncCampaignSet()` - lines 264-270: only saves platformCampaignId when `result.success === true`
- `syncCampaign()` - lines 356-360: only saves platformCampaignId when `result.success && result.platformCampaignId`
- `syncSingleCampaign()` - lines 531-541: gets platformCampaignId but does NOT persist it

---

## What We're Building Now

### Phase 1: Fix syncSingleCampaign() (HIGH Priority)

**Location:** `packages/core/src/campaign-set/sync-service.ts` - `syncSingleCampaign()` method

**Current Code (lines 531-542):**
```typescript
} else {
  const result = await adapter.createCampaign(campaign);
  if (!result.success) {
    return {
      campaignId: campaign.id,
      platform: campaign.platform,
      success: false,
      error: result.error,
    };
  }
  platformCampaignId = result.platformCampaignId;
}
// Ad group sync loop starts here...
```

**Required Change:**
```typescript
} else {
  const result = await adapter.createCampaign(campaign);
  if (!result.success) {
    return {
      campaignId: campaign.id,
      platform: campaign.platform,
      success: false,
      error: result.error,
    };
  }
  platformCampaignId = result.platformCampaignId;

  // IMMEDIATELY persist platform ID before syncing children
  if (platformCampaignId) {
    await this.repository.updateCampaignPlatformId(campaign.id, platformCampaignId);
  }
}
// Ad group sync loop starts here...
```

#### Deliverables

- [x] Add immediate persistence call after `adapter.createCampaign()` returns successfully (line ~541)
- [x] Ensure persistence happens BEFORE the ad group sync loop (line 545)
- [x] Handle edge case where platformCampaignId might be undefined (defensive check)

### Phase 2: Remove Redundant Persistence in Callers (MEDIUM Priority)

After Phase 1, the persistence in `syncCampaignSet()` and `syncCampaign()` becomes redundant for campaign IDs. We should either:

**Option A (Recommended):** Keep redundant calls as a safety net - idempotent updates are cheap
**Option B:** Remove redundant calls to simplify code flow

#### Deliverables

- [x] Evaluate whether to keep or remove lines 264-270 in `syncCampaignSet()` (KEPT - safety net)
- [x] Evaluate whether to keep or remove lines 356-360 in `syncCampaign()` (KEPT - safety net)
- [x] Add code comments explaining the persistence strategy regardless of choice

### Phase 3: Add Unit Tests (HIGH Priority)

**Location:** `packages/core/src/campaign-set/__tests__/sync-service.test.ts`

#### Test Scenarios

- [x] Test: Campaign created, ad group fails -> platformCampaignId is persisted
- [x] Test: Campaign created, ad fails -> both platformCampaignId and platformAdGroupId persisted
- [x] Test: Full success -> all platform IDs persisted (regression test)
- [x] Test: Campaign creation fails -> no platform ID persisted (regression test)
- [x] Test: Re-sync with existing platformCampaignId uses update path (idempotency test)

#### Example Test Structure

```typescript
describe('immediate platform ID persistence', () => {
  it('should persist campaign platform ID before syncing ad groups', async () => {
    // Arrange: mock adapter.createCampaign to succeed, createAdGroup to fail
    mockAdapter.createCampaign.mockResolvedValue({
      success: true,
      platformCampaignId: 't3_abc123'
    });
    mockAdapter.createAdGroup.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded'
    });

    // Act
    const result = await service.syncCampaignSet(setId);

    // Assert
    expect(result.success).toBe(false);
    expect(mockRepository.updateCampaignPlatformId).toHaveBeenCalledWith(
      campaignId,
      't3_abc123'
    );
  });
});
```

---

## Not In Scope

### Retry Logic
- **Why:** Retry is a separate concern; this fix ensures retries work correctly, not when they happen

### Transaction/Rollback Support
- **Why:** Rolling back platform-side changes is complex and platform-specific; out of scope for this fix

### Batch Platform ID Updates
- **Why:** Individual updates are sufficient and simpler; batch optimization is premature

### Platform Adapter Changes
- **Why:** Adapters already return platform IDs correctly; the bug is in the sync service

---

## Implementation Plan

### Step 1: Add Immediate Persistence (30 minutes)
1. Open `packages/core/src/campaign-set/sync-service.ts`
2. Locate `syncSingleCampaign()` method (line 508)
3. Find the campaign creation block (lines 531-541)
4. Add `await this.repository.updateCampaignPlatformId()` call after line 541
5. Run existing tests to verify no regressions

### Step 2: Add Code Comments (15 minutes)
1. Add comment above the new persistence call explaining WHY
2. Add comment in `syncCampaignSet()` explaining the redundant call is intentional
3. Document the persistence strategy in method JSDoc

### Step 3: Write Unit Tests (1-2 hours)
1. Create or update test file for sync-service
2. Add test for partial failure scenario (campaign succeeds, ad group fails)
3. Add test for full failure scenario (campaign fails)
4. Add test for idempotent retry (re-sync updates existing)
5. Add test for full success path (regression)

### Step 4: Manual Verification (30 minutes)
1. Create a test campaign set
2. Mock or force an ad group creation failure
3. Verify platformCampaignId is in database
4. Re-trigger sync
5. Verify no duplicate campaign created on platform

---

## Definition of Done

- [x] `syncSingleCampaign()` persists platformCampaignId immediately after successful creation
- [x] All existing unit tests pass without modification
- [x] New unit tests cover partial failure + immediate persistence scenarios
- [x] Code comments explain the persistence strategy
- [ ] Manual test confirms no duplicate campaigns on retry after partial failure
- [ ] PR reviewed and approved

---

## Notes

### Tech Stack
- **Language:** TypeScript
- **Package:** `packages/core`
- **Pattern:** Repository pattern for data access
- **Why Repository:** Decouples sync logic from database implementation

### Design Principles
- **Idempotency:** Same input should produce same result, regardless of retries
- **Fail Fast:** Errors bubble up immediately; partial state is preserved
- **Defensive:** Check for undefined platform IDs before persisting

### Related Files
- `packages/core/src/campaign-set/sync-service.ts` - Main file to modify
- `packages/core/src/campaign-set/platform-adapter.ts` - Adapter interface (no changes needed)
- `apps/api/src/repositories/campaign-set-repository.ts` - Repository implementation (no changes needed)

---

## Next Steps

1. **Immediate:** Implement Phase 1 fix in sync-service.ts
2. **Short-term:** Add comprehensive unit tests
3. **Future:** Consider adding sync status tracking at entity level (campaign/ad group/ad)
4. **Future:** Consider adding retry queue for failed child entity syncs
