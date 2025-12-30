# Platform Deduplication Query - Idempotent Sync System

**Date:** 2024-12-30
**Status:** COMPLETE
**Priority:** HIGH - Critical for data integrity

---

## Overview

This feature adds platform-side deduplication to prevent duplicate entity creation during Reddit ad syncs. Even with immediate ID persistence, a race condition exists:

1. Sync initiates, Reddit creates entity
2. Sync crashes BEFORE we persist the platformId
3. Next sync attempt sees no platformId, tries to CREATE again
4. Result: Duplicate entity on Reddit (wasted budget, skewed metrics)

The solution: Before creating any entity, query Reddit for existing entities matching by name + parent ID. If found, use the existing platform ID instead of creating a duplicate.

---

## Goal

Implement platform-side deduplication queries to ensure idempotent sync operations that never create duplicate entities on Reddit, even after crash recovery scenarios.

### Success Criteria

- [x] Platform adapter interface extended with `findExisting*` methods for campaigns, ad groups, and ads
- [x] Reddit adapter implements deduplication using existing `listCampaigns()`, `listAdGroups()`, `listAds()` methods
- [ ] Sync service checks for existing entities before every CREATE operation (OUT OF SCOPE - separate feature)
- [ ] No duplicate entities created on Reddit after simulated crash scenarios (requires sync service integration)
- [x] Performance impact is minimal (single list API call per entity type during create)

---

## What's Already Done

### Platform Adapter Interface
- [x] `CampaignSetPlatformAdapter` interface defined in `packages/core/src/campaign-set/platform-adapter.ts`
- [x] CRUD operations for campaigns, ad groups, ads, and keywords
- [x] Result types with `success`, `platformId`, `error`, `retryable`, `retryAfter` fields

### Reddit Adapter Implementation
- [x] `RedditAdsAdapter` class in `packages/core/src/campaign-set/adapters/reddit-adapter.ts`
- [x] Transformation functions for campaigns, ad groups, ads (micro-units, objectives, bid strategies)
- [x] Error handling with retry support for rate limits

### Reddit API Client Services
- [x] `CampaignService.listCampaigns(accountId, filters?)` - Returns `CampaignResponse[]`
- [x] `AdGroupService.listAdGroups(accountId, filters?)` - Returns `AdGroupResponse[]`
- [x] `AdGroupService.getAdGroupsByCampaign(accountId, campaignId)` - Filters by campaign
- [x] `AdService.listAds(accountId, filters?)` - Returns `AdResponse[]`
- [x] `AdService.getAdsByAdGroup(accountId, adGroupId)` - Filters by ad group

### Sync Service
- [x] `DefaultCampaignSetSyncService` in `packages/core/src/campaign-set/sync-service.ts`
- [x] Hierarchical sync: Campaign -> AdGroups -> Ads -> Keywords
- [x] Platform ID persistence via repository methods

---

## Implementation Complete

### Phase 1: Interface Extension - DONE

**File:** `packages/core/src/campaign-set/platform-adapter.ts`

- [x] Add `findExistingCampaign(accountId: string, name: string): Promise<string | null>` method signature
- [x] Add `findExistingAdGroup(campaignId: string, name: string): Promise<string | null>` method signature
- [x] Add `findExistingAd(adGroupId: string, name: string): Promise<string | null>` method signature
- [x] Update `isCampaignSetPlatformAdapter` type guard to include new methods
- [x] Add JSDoc comments explaining deduplication purpose and usage

### Phase 2: Reddit Adapter Implementation - DONE

**File:** `packages/core/src/campaign-set/adapters/reddit-adapter.ts`

- [x] Implement `findExistingCampaign()` using `client.get()` to list campaigns and filter by name
- [x] Implement `findExistingAdGroup()` using `client.get()` with campaign_id filter, match by name
- [x] Implement `findExistingAd()` using `client.get()` with ad_group_id filter, match by name/headline
- [x] Handle API errors gracefully (return null on failure, log warning)
- [x] Case-sensitive exact matching (Reddit's expected behavior)

### Phase 3: Update Mock Adapter - DONE

**File:** `packages/core/src/campaign-set/adapters/mock-adapter.ts`

- [x] Add `findExistingCampaign()` mock returning configurable results
- [x] Add `findExistingAdGroup()` mock returning configurable results
- [x] Add `findExistingAd()` mock returning configurable results
- [x] Support pre-seeding "existing" entities for test scenarios
- [x] Add helper methods: `addExistingCampaign()`, `addExistingAdGroup()`, `addExistingAd()`, `clearExistingEntities()`

### Phase 4: Unit Tests - DONE

**File:** `packages/core/src/campaign-set/__tests__/reddit-adapter-dedup.test.ts`

- [x] Test `findExistingCampaign()` returns ID when campaign exists
- [x] Test `findExistingCampaign()` returns null when no match
- [x] Test `findExistingCampaign()` returns null on empty list
- [x] Test `findExistingCampaign()` returns null on API error without throwing
- [x] Test `findExistingCampaign()` returns first match for duplicate names
- [x] Test `findExistingCampaign()` performs exact case-sensitive matching
- [x] Test `findExistingAdGroup()` returns ID when ad group exists in campaign
- [x] Test `findExistingAdGroup()` returns null when no match
- [x] Test `findExistingAdGroup()` filters by campaign_id in API request
- [x] Test `findExistingAdGroup()` performs exact case-sensitive matching
- [x] Test `findExistingAd()` returns ID when ad with matching headline exists
- [x] Test `findExistingAd()` returns ID when ad with matching name exists
- [x] Test `findExistingAd()` prioritizes headline match over name match
- [x] Test `findExistingAd()` filters by ad_group_id in API request
- [x] Test error handling logs warnings for all three methods
- [x] Test graceful handling of rate limit, auth, and server errors

**Total tests added: 27**

### Additional Adapters Updated - DONE

- [x] `GoogleAdsAdapter` - placeholder implementations returning null (out of scope)
- [x] `FacebookAdsAdapter` - placeholder implementations returning null (out of scope)
- [x] `ConfigurableMockAdapter` - placeholder implementations returning null

---

## Definition of Done - COMPLETE

- [x] `CampaignSetPlatformAdapter` interface includes `findExistingCampaign`, `findExistingAdGroup`, `findExistingAd` methods
- [x] `isCampaignSetPlatformAdapter` type guard updated to check for new methods
- [x] `RedditAdsAdapter` implements all three deduplication methods
- [x] Mock adapter updated with testable implementations
- [x] Unit tests cover success, not-found, and error scenarios for each method
- [x] All tests pass: `pnpm --filter @repo/core test` (1657 tests)
- [x] TypeScript compilation succeeds with no errors
- [x] Code follows existing patterns (error handling, naming conventions)
- [x] JSDoc comments explain purpose and usage of new methods

---

## Test Results

```
pnpm --filter @repo/core test -- --run

Test Files  53 passed (53)
Tests       1657 passed (1657)
```

---

## Files Changed

1. `packages/core/src/campaign-set/platform-adapter.ts` - Added interface methods and type guard
2. `packages/core/src/campaign-set/adapters/reddit-adapter.ts` - Implemented deduplication queries
3. `packages/core/src/campaign-set/adapters/mock-adapter.ts` - Added mock implementations and test helpers
4. `packages/core/src/campaign-set/adapters/google-adapter.ts` - Added placeholder implementations
5. `packages/core/src/campaign-set/adapters/facebook-adapter.ts` - Added placeholder implementations
6. `packages/core/src/campaign-set/__tests__/configurable-mock-adapter.ts` - Added placeholder implementations

## Files Created

1. `packages/core/src/campaign-set/__tests__/reddit-adapter-dedup.test.ts` - 27 new tests

---

## Next Steps

1. **Sync Service Integration** - Modify `sync-service.ts` to call deduplication before CREATE (separate TODO)
2. **End-to-End Testing** - Test full crash recovery scenarios with real Reddit API
3. **Monitoring** - Add metrics for deduplication hits/misses
4. **Google Adapter** - Implement similar deduplication for Google Ads (if needed)
