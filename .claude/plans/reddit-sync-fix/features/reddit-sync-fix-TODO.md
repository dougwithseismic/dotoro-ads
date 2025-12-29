# Reddit Campaign Sync Fix

**Date:** 2025-12-29
**Status:** Complete

---

## Goal

Fix the Reddit campaign sync functionality that is currently failing with 404 errors due to passing the wrong account identifier to the Reddit API.

### Success Criteria

- [x] Sync handler correctly retrieves Reddit's `account_id` from the `ad_accounts` table
- [x] Reddit adapter uses correct API path `/ad_accounts/` instead of `/accounts/`
- [x] `AdAccountService` and `RedditAdAccount` types are exported from `@repo/reddit-ads`
- [x] All existing tests continue to pass
- [x] Campaign syncs complete successfully without 404 errors

---

## What's Already Done

### Database Schema (Complete)
- `ad_accounts` table with:
  - `id` (UUID) - internal primary key
  - `accountId` (VARCHAR) - Reddit's actual `account_id` stored as `account_id` column
  - `platform` field to identify Reddit accounts

### Reddit Ads Package (Partial)
- `packages/reddit-ads/src/accounts.ts` exists with `AdAccountService` class
- `AdAccountService.getAdAccount()` correctly uses `/ad_accounts/${accountId}` path
- Service is NOT exported from package index

### Sync Handler (Needs Fix)
- `apps/api/src/jobs/handlers/sync-campaign-set.ts` exists
- Currently queries `ad_accounts` table but only uses the UUID `id`
- Passes UUID to `RedditAdsAdapter` instead of Reddit's `account_id`

### Reddit Adapter (Needs Fix)
- `packages/core/src/campaign-set/adapters/reddit-adapter.ts` exists
- Uses incorrect path `/accounts/${accountId}/campaigns`
- Reddit API requires `/ad_accounts/${accountId}/campaigns`

---

## What We're Building Now

### Phase 1: Export AdAccountService from reddit-ads package

**File:** `packages/reddit-ads/src/index.ts`
**Priority:** HIGH - Required for other fixes to work

- [x] Add export for `AdAccountService` class
- [x] Add export for `RedditAdAccount` type

```typescript
// Add to exports in index.ts
export { AdAccountService } from "./accounts.js";
export type { RedditAdAccount } from "./accounts.js";
```

### Phase 2: Fix Reddit Adapter API Paths

**File:** `packages/core/src/campaign-set/adapters/reddit-adapter.ts`
**Priority:** HIGH - Core bug fix

- [x] Update campaign endpoints from `/accounts/` to `/ad_accounts/`
  - Line 237: `/accounts/${this.accountId}/campaigns` -> `/ad_accounts/${this.accountId}/campaigns`
  - Line 259: `/accounts/${this.accountId}/campaigns/${platformId}` -> `/ad_accounts/${this.accountId}/campaigns/${platformId}`
  - Line 277: `/accounts/${this.accountId}/campaigns/${platformId}` -> `/ad_accounts/${this.accountId}/campaigns/${platformId}`
  - Line 287: `/accounts/${this.accountId}/campaigns/${platformId}` -> `/ad_accounts/${this.accountId}/campaigns/${platformId}`
  - Line 296: `/accounts/${this.accountId}/campaigns/${platformId}` -> `/ad_accounts/${this.accountId}/campaigns/${platformId}`

- [x] Update ad group endpoints from `/accounts/` to `/ad_accounts/`
  - Line 313: `/accounts/${this.accountId}/adgroups` -> `/ad_accounts/${this.accountId}/adgroups`
  - Line 335: `/accounts/${this.accountId}/adgroups/${platformAdGroupId}` -> `/ad_accounts/${this.accountId}/adgroups/${platformAdGroupId}`
  - Line 353: `/accounts/${this.accountId}/adgroups/${platformAdGroupId}` -> `/ad_accounts/${this.accountId}/adgroups/${platformAdGroupId}`

- [x] Update ad endpoints from `/accounts/` to `/ad_accounts/`
  - Line 380: `/accounts/${this.accountId}/ads` -> `/ad_accounts/${this.accountId}/ads`
  - Line 401: `/accounts/${this.accountId}/ads/${platformAdId}` -> `/ad_accounts/${this.accountId}/ads/${platformAdId}`
  - Line 418: `/accounts/${this.accountId}/ads/${platformAdId}` -> `/ad_accounts/${this.accountId}/ads/${platformAdId}`

### Phase 3: Fix Sync Handler to Use Correct Account ID

**File:** `apps/api/src/jobs/handlers/sync-campaign-set.ts`
**Priority:** HIGH - Core bug fix

- [x] Modify the existing query to select `accountId` (Reddit's ID) along with other fields
  - Current code at line 64-68 selects the full row but only validates existence
  - Need to use `adAccount.accountId` instead of `adAccountId` parameter

- [x] Pass `adAccount.accountId` to `RedditAdsAdapter` instead of `adAccountId`
  - Line 89-93: Change `accountId: adAccountId` to `accountId: adAccount.accountId`

**Before:**
```typescript
const redditAdapter = new RedditAdsAdapter({
  client: redditClient,
  accountId: adAccountId,  // This is our UUID!
  fundingInstrumentId,
});
```

**After:**
```typescript
const redditAdapter = new RedditAdsAdapter({
  client: redditClient,
  accountId: adAccount.accountId,  // This is Reddit's actual account_id
  fundingInstrumentId,
});
```

---

## Not In Scope

### Additional Platform Support
- Other ad platforms (Google Ads, Meta, TikTok)
- **Why:** This fix is specifically for Reddit integration; other platforms are not currently implemented

### OAuth Token Refresh Logic
- Automatic token refresh on 401 errors
- **Why:** Separate concern; tokens are already validated before sync

### Database Schema Changes
- No changes to `ad_accounts` table structure
- **Why:** Schema already correctly stores Reddit's `account_id` in the `accountId` column

### New API Endpoints
- No new REST endpoints needed
- **Why:** Fix is internal to the sync job handler

---

## Implementation Plan

1. **Export AdAccountService** (5 minutes)
   - Add two export lines to `packages/reddit-ads/src/index.ts`
   - This enables type-safe access to account types if needed elsewhere

2. **Fix Reddit Adapter Paths** (15 minutes)
   - Find and replace `/accounts/` with `/ad_accounts/` in reddit-adapter.ts
   - Approximately 11 occurrences to update
   - Update any related tests if they mock these paths

3. **Fix Sync Handler** (10 minutes)
   - Update the adapter instantiation to use `adAccount.accountId`
   - The query already fetches the full `adAccount` row, so no additional DB call needed

4. **Test the Fix** (15 minutes)
   - Run existing unit tests: `pnpm test --filter=@repo/reddit-ads`
   - Run API tests: `pnpm test --filter=api`
   - Manual test with a real Reddit ad account (if available)

---

## Definition of Done

- [x] `AdAccountService` and `RedditAdAccount` are exported from `@repo/reddit-ads`
- [x] All API paths in `reddit-adapter.ts` use `/ad_accounts/` prefix
- [x] Sync handler passes `adAccount.accountId` (Reddit's ID) to the adapter
- [x] Unit tests pass for `packages/reddit-ads`
- [x] Unit tests pass for `packages/core`
- [x] API tests pass for `apps/api` (sync-campaign-set tests all pass; some pre-existing failures in unrelated tests)
- [x] No TypeScript compilation errors introduced by these changes

---

## Notes

### Tech Stack
- **Database ORM:** Drizzle ORM with PostgreSQL
- **Job Queue:** pg-boss for background job processing
- **Reddit API:** Custom `@repo/reddit-ads` package wrapping Reddit Ads API v3

### Key Data Flow
1. User triggers sync via API
2. Job handler receives `adAccountId` (our UUID) in job payload
3. Handler queries `ad_accounts` table using UUID to get the full record
4. Handler should extract `accountId` field (Reddit's ID) from the record
5. Handler passes Reddit's `account_id` to the adapter
6. Adapter makes API calls to Reddit using correct `/ad_accounts/` paths

### Database Column Mapping
| Our Schema Column | Description | Example Value |
|-------------------|-------------|---------------|
| `id` | Internal UUID primary key | `550e8400-e29b-41d4-a716-446655440000` |
| `accountId` | Reddit's account identifier | `t2_abc123xyz` |

---

## Next Steps

1. **After this fix:** Monitor sync job success rates in production
2. **Future enhancement:** Add retry logic specific to 404 vs 401 errors
3. **Future enhancement:** Add account ID validation before sync attempts
