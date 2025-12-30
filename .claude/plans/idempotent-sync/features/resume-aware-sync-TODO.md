# Resume-Aware Sync Logic

**Date:** 2025-12-30
**Status:** Complete
**Priority:** HIGH - Critical for production reliability

---

## Goal

Enable fully resumable, idempotent campaign syncs that gracefully recover from interruptions. When a sync fails mid-operation (network timeout, server crash, rate limit), re-running the sync should seamlessly continue from where it left off without creating duplicate entities on ad platforms.

### Success Criteria

- [x] Interrupted syncs can be safely re-run without creating duplicate campaigns/ad groups/ads on platforms
- [x] Entities created before a failure are correctly identified and updated (not recreated) on retry
- [x] Platform IDs recovered via deduplication are immediately persisted to prevent repeated lookups
- [x] Sync operations are idempotent - running the same sync N times produces the same result
- [x] No performance regression for normal (non-interrupted) sync operations

---

## What's Already Done

### Sync Service Infrastructure (Complete)
- `DefaultCampaignSetSyncService` class with full campaign hierarchy sync
- `syncSingleCampaign()`, `syncAdGroup()`, `syncAd()`, `syncKeyword()` methods
- Repository interface with `updateCampaignPlatformId()`, `updateAdGroupPlatformId()`, `updateAdPlatformId()`, `updateKeywordPlatformId()` methods
- Platform adapter interface with create/update operations for all entity types

### Immediate Platform ID Persistence - Feature 1 (Required)
- Repository methods to persist platform IDs immediately after creation
- Already integrated in `syncAdGroup()`, `syncAd()`, `syncKeyword()` for successful creates

### Platform Deduplication Query - Feature 2 (Required)
- Adapter methods to find existing entities by name on platforms:
  - `findExistingCampaign(adAccountId: string, name: string): Promise<string | null>`
  - `findExistingAdGroup(campaignId: string, name: string): Promise<string | null>`
  - `findExistingAd(adGroupId: string, name: string): Promise<string | null>`

---

## What We're Building Now

### Phase 1: Extend Platform Adapter Interface

**Priority:** HIGH - Foundation for deduplication logic

- [x] Add `findExistingCampaign(adAccountId: string, name: string)` to `CampaignSetPlatformAdapter` interface
  - File: `packages/core/src/campaign-set/platform-adapter.ts`
  - Returns: `Promise<string | null>` (platform campaign ID or null)
- [x] Add `findExistingAdGroup(platformCampaignId: string, name: string)` to interface
  - Returns: `Promise<string | null>` (platform ad group ID or null)
- [x] Add `findExistingAd(platformAdGroupId: string, name: string)` to interface
  - Returns: `Promise<string | null>` (platform ad ID or null)
- [x] Add `findExistingKeyword(platformAdGroupId: string, text: string, matchType: string)` to interface
  - Returns: `Promise<string | null>` (platform keyword ID or null)
  - Keywords need text + matchType for unique identification

**Example Interface Addition:**
```typescript
// In CampaignSetPlatformAdapter interface
/**
 * Find an existing campaign on the platform by name
 * Used for deduplication during sync resume
 */
findExistingCampaign?(adAccountId: string, name: string): Promise<string | null>;

findExistingAdGroup?(platformCampaignId: string, name: string): Promise<string | null>;

findExistingAd?(platformAdGroupId: string, name: string): Promise<string | null>;

findExistingKeyword?(platformAdGroupId: string, text: string, matchType: string): Promise<string | null>;
```

---

### Phase 2: Update Campaign Sync Logic

**Priority:** HIGH - Core feature implementation

- [x] Refactor `syncSingleCampaign()` method in `sync-service.ts`
  - File: `packages/core/src/campaign-set/sync-service.ts` (lines 508-568)

**Current Logic (lines 513-542):**
```typescript
const isUpdate = !!campaign.platformCampaignId;
if (isUpdate) {
  const result = await adapter.updateCampaign(campaign, campaign.platformCampaignId!);
  // ...
} else {
  const result = await adapter.createCampaign(campaign);
  // ...
}
```

**New Logic:**
```typescript
// 1. Start with stored platform ID (may be null)
let platformCampaignId = campaign.platformCampaignId;

// 2. If no stored ID, try to find existing on platform (deduplication)
if (!platformCampaignId && adapter.findExistingCampaign) {
  const adAccountId = this.getAdAccountId(campaign); // Extract from campaign config
  platformCampaignId = await adapter.findExistingCampaign(adAccountId, campaign.name);

  // 3. If found, persist the recovered ID immediately
  if (platformCampaignId) {
    await this.repository.updateCampaignPlatformId(campaign.id, platformCampaignId);
  }
}

// 4. Route to UPDATE or CREATE based on whether we have an ID
if (platformCampaignId) {
  const result = await adapter.updateCampaign(campaign, platformCampaignId);
  if (!result.success) {
    return { campaignId: campaign.id, platform: campaign.platform, success: false, error: result.error };
  }
  // ID might have changed (rare but possible)
  if (result.platformCampaignId !== platformCampaignId) {
    await this.repository.updateCampaignPlatformId(campaign.id, result.platformCampaignId!);
  }
  platformCampaignId = result.platformCampaignId;
} else {
  const result = await adapter.createCampaign(campaign);
  if (!result.success) {
    return { campaignId: campaign.id, platform: campaign.platform, success: false, error: result.error };
  }
  // Immediate persistence of new platform ID
  await this.repository.updateCampaignPlatformId(campaign.id, result.platformCampaignId!);
  platformCampaignId = result.platformCampaignId;
}
```

- [x] Add helper method `getAdAccountId(campaign: Campaign): string`
  - Extract ad account ID from campaign's platform config
  - Used for scoping deduplication queries

---

### Phase 3: Update Ad Group Sync Logic

**Priority:** HIGH - Second level of hierarchy

- [x] Refactor `syncAdGroup()` method in `sync-service.ts`
  - File: `packages/core/src/campaign-set/sync-service.ts` (lines 573-633)

**New Logic Pattern:**
```typescript
private async syncAdGroup(
  adGroup: AdGroup,
  platformCampaignId: string,
  adapter: CampaignSetPlatformAdapter
): Promise<{ success: boolean; platformAdGroupId?: string; error?: string }> {
  // 1. Start with stored platform ID
  let platformAdGroupId = adGroup.platformAdGroupId;

  // 2. Deduplication lookup if no stored ID
  if (!platformAdGroupId && adapter.findExistingAdGroup) {
    platformAdGroupId = await adapter.findExistingAdGroup(platformCampaignId, adGroup.name);
    if (platformAdGroupId) {
      await this.repository.updateAdGroupPlatformId(adGroup.id, platformAdGroupId);
    }
  }

  // 3. Route to UPDATE or CREATE
  if (platformAdGroupId) {
    const result = await adapter.updateAdGroup(adGroup, platformAdGroupId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    if (result.platformAdGroupId && result.platformAdGroupId !== platformAdGroupId) {
      await this.repository.updateAdGroupPlatformId(adGroup.id, result.platformAdGroupId);
    }
    platformAdGroupId = result.platformAdGroupId;
  } else {
    const result = await adapter.createAdGroup(adGroup, platformCampaignId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    await this.repository.updateAdGroupPlatformId(adGroup.id, result.platformAdGroupId!);
    platformAdGroupId = result.platformAdGroupId;
  }

  // 4. Continue with child entities (ads, keywords)
  // ... existing logic
}
```

---

### Phase 4: Update Ad Sync Logic

**Priority:** HIGH - Third level of hierarchy

- [x] Refactor `syncAd()` method in `sync-service.ts`
  - File: `packages/core/src/campaign-set/sync-service.ts` (lines 638-663)

**New Logic Pattern:**
```typescript
private async syncAd(
  ad: Ad,
  platformAdGroupId: string,
  adapter: CampaignSetPlatformAdapter
): Promise<{ success: boolean; platformAdId?: string; error?: string }> {
  // 1. Start with stored platform ID
  let platformAdId = ad.platformAdId;

  // 2. Deduplication lookup if no stored ID
  if (!platformAdId && adapter.findExistingAd) {
    platformAdId = await adapter.findExistingAd(platformAdGroupId, ad.name);
    if (platformAdId) {
      await this.repository.updateAdPlatformId(ad.id, platformAdId);
    }
  }

  // 3. Route to UPDATE or CREATE
  if (platformAdId) {
    const result = await adapter.updateAd(ad, platformAdId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    if (result.platformAdId && result.platformAdId !== platformAdId) {
      await this.repository.updateAdPlatformId(ad.id, result.platformAdId);
    }
    return { success: true, platformAdId: result.platformAdId };
  } else {
    const result = await adapter.createAd(ad, platformAdGroupId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    await this.repository.updateAdPlatformId(ad.id, result.platformAdId!);
    return { success: true, platformAdId: result.platformAdId };
  }
}
```

---

### Phase 5: Update Keyword Sync Logic

**Priority:** MEDIUM - Fourth level, keywords have unique identification needs

- [x] Refactor `syncKeyword()` method in `sync-service.ts`
  - File: `packages/core/src/campaign-set/sync-service.ts` (lines 669-700)

**New Logic Pattern:**
```typescript
private async syncKeyword(
  keyword: Keyword,
  platformAdGroupId: string,
  adapter: CampaignSetPlatformAdapter
): Promise<{ success: boolean; platformKeywordId?: string; error?: string }> {
  // 1. Start with stored platform ID
  let platformKeywordId = keyword.platformKeywordId;

  // 2. Deduplication lookup if no stored ID
  // Keywords are unique by (adGroupId, text, matchType), not just name
  if (!platformKeywordId && adapter.findExistingKeyword) {
    platformKeywordId = await adapter.findExistingKeyword(
      platformAdGroupId,
      keyword.text,
      keyword.matchType
    );
    if (platformKeywordId) {
      await this.repository.updateKeywordPlatformId(keyword.id, platformKeywordId);
    }
  }

  // 3. Route to UPDATE or CREATE
  if (platformKeywordId) {
    const result = await adapter.updateKeyword(keyword, platformKeywordId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    if (result.platformKeywordId && result.platformKeywordId !== platformKeywordId) {
      await this.repository.updateKeywordPlatformId(keyword.id, result.platformKeywordId);
    }
    return { success: true, platformKeywordId: result.platformKeywordId };
  } else {
    const result = await adapter.createKeyword(keyword, platformAdGroupId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    await this.repository.updateKeywordPlatformId(keyword.id, result.platformKeywordId!);
    return { success: true, platformKeywordId: result.platformKeywordId };
  }
}
```

---

### Phase 6: Unit Tests

**Priority:** HIGH - Validate correctness of resume logic

- [x] Create test file: `packages/core/src/campaign-set/__tests__/sync-service-resume.test.ts`

**Test Cases:**

1. **Normal sync (no interruption)**
   - [x] New campaign without platform ID creates and persists ID
   - [x] Campaign with platform ID routes to update

2. **Interrupted sync recovery**
   - [x] Campaign created on platform but ID not saved - dedup finds it, updates DB
   - [x] Ad group created on platform but ID not saved - dedup finds it, updates DB
   - [x] Ad created on platform but ID not saved - dedup finds it, updates DB

3. **Deduplication edge cases**
   - [x] Dedup returns null - proceeds with create
   - [x] Dedup adapter method not implemented - proceeds with create (backward compatible)
   - [x] Recovered ID is immediately persisted before continuing

4. **Idempotency verification**
   - [x] Running same sync twice produces identical platform state
   - [x] Multiple retries don't create duplicate entities

**Example Test:**
```typescript
describe('syncSingleCampaign - resume aware', () => {
  it('should recover platform ID via dedup when not stored in DB', async () => {
    const campaign = createMockCampaign({ platformCampaignId: undefined });
    const existingPlatformId = 'recovered-123';

    mockAdapter.findExistingCampaign.mockResolvedValue(existingPlatformId);
    mockAdapter.updateCampaign.mockResolvedValue({
      success: true,
      platformCampaignId: existingPlatformId
    });

    const result = await service.syncCampaign(campaign.id);

    expect(result.success).toBe(true);
    expect(mockAdapter.findExistingCampaign).toHaveBeenCalledWith(
      campaign.adAccountId,
      campaign.name
    );
    expect(mockRepository.updateCampaignPlatformId).toHaveBeenCalledWith(
      campaign.id,
      existingPlatformId
    );
    expect(mockAdapter.createCampaign).not.toHaveBeenCalled();
    expect(mockAdapter.updateCampaign).toHaveBeenCalled();
  });
});
```

---

## Not In Scope

### Parallel Entity Syncing
- Why: Adds complexity; sequential is sufficient for MVP; can optimize later

### Cross-Platform Deduplication
- Why: Each platform has its own ID space; dedup is platform-scoped

### Automatic Retry with Backoff
- Why: Separate concern; handled by job system / queue infrastructure

### Conflict Resolution for Name Collisions
- Why: Edge case; current behavior (fail fast) is acceptable for now

### Soft Delete / Archive Support
- Why: Different feature; dedup only handles active entities

---

## Implementation Plan

1. **Extend adapter interface** (1-2 hours)
   - Add optional `findExisting*` methods to `CampaignSetPlatformAdapter`
   - Keep methods optional for backward compatibility

2. **Refactor `syncSingleCampaign`** (1-2 hours)
   - Implement 3-step check: stored ID -> dedup lookup -> create
   - Add `getAdAccountId` helper method
   - Ensure immediate ID persistence on recovery

3. **Refactor `syncAdGroup`** (1 hour)
   - Same pattern as campaign
   - Uses parent `platformCampaignId` for scoped lookup

4. **Refactor `syncAd`** (1 hour)
   - Same pattern as ad group
   - Uses parent `platformAdGroupId` for scoped lookup

5. **Refactor `syncKeyword`** (1 hour)
   - Slightly different: uses text + matchType instead of name
   - Uses parent `platformAdGroupId` for scoped lookup

6. **Write unit tests** (2-3 hours)
   - Test all sync methods with resume scenarios
   - Test backward compatibility when dedup methods not implemented
   - Test idempotency guarantees

7. **Manual testing** (1 hour)
   - Test with Reddit adapter (primary use case)
   - Simulate interrupted syncs and verify recovery

---

## Definition of Done

- [x] All four `findExisting*` methods added to `CampaignSetPlatformAdapter` interface (optional)
- [x] `syncSingleCampaign`, `syncAdGroup`, `syncAd`, `syncKeyword` refactored with 3-step logic
- [x] Platform IDs recovered via dedup are persisted immediately (before continuing sync)
- [x] Existing adapters without `findExisting*` methods continue to work (backward compatible)
- [x] Unit tests cover: normal sync, interrupted recovery, dedup not found, backward compatibility
- [x] All existing sync tests continue to pass
- [x] Running `pnpm test` in `packages/core` passes
- [x] Code follows existing patterns and style in sync-service.ts

---

## Notes

### Tech Stack
- **TypeScript** - Strict types for adapter interface extensions
- **Vitest** - Test framework for unit tests
- **Repository Pattern** - Existing abstraction for DB operations

### Design Principles
- **Backward Compatibility** - Optional methods don't break existing adapters
- **Fail Fast** - If dedup lookup fails, let the error propagate
- **Immediate Persistence** - Never continue sync with unpersisted platform IDs
- **Single Responsibility** - Dedup logic in sync service, actual lookup in adapter

### Performance Considerations
- Dedup lookups add latency only when platform ID is missing
- Normal syncs (with stored IDs) have zero overhead
- Lookups are scoped to parent entity (not full table scans)

---

## Next Steps

1. **Implement Reddit Adapter Dedup Methods** - Add `findExisting*` implementations to Reddit adapter
2. **Implement Google Adapter Dedup Methods** - Add `findExisting*` implementations to Google adapter
3. **Add Sync Metrics/Observability** - Track dedup hits/misses for monitoring
4. **Retry Queue Integration** - Wire up failed syncs to automatic retry system
