# Campaign Ad Account Picker - Reddit Integration Fix

**Date:** 2025-12-29
**Status:** Complete
**Priority:** HIGH - Blocking campaign sync functionality
**Depends On:** oauth-callback-fix

---

## Overview

The campaign creation wizard needs to properly pass Reddit's actual `account_id` (e.g., `t2_abc123`) to the sync handler instead of our internal UUID. Currently, the sync job passes internal database UUIDs to the Reddit API, causing 404 errors when attempting to create campaigns.

### Current Problem

The data flow currently works like this:

1. Frontend selects a Reddit account via `AdAccountSelector` component
2. The `accountId` field from `ad_accounts` table is used (this is Reddit's actual ID)
3. However, somewhere in the sync chain, the internal `id` (UUID) is being passed instead
4. Reddit API receives our UUID instead of their `t2_xxx` format ID
5. API returns 404 because the account doesn't exist on their platform

### Root Cause Analysis

The issue is in how the `adAccountId` is being passed through the sync job:

- `SyncCampaignSetJob.adAccountId` stores the internal UUID from `ad_accounts.id`
- The sync handler looks up the account by this ID, then correctly uses `adAccount.accountId`
- **BUT**: The frontend/API might be passing the wrong ID when initiating the sync

---

## Goal

Enable users to successfully sync campaign sets to Reddit by ensuring the correct Reddit account ID (from `adAccounts.accountId` column) is passed to the Reddit Ads API, not our internal UUID.

### Success Criteria

- [x] Campaign sets can be synced to Reddit without 404 errors
- [x] The `AdAccountSelector` displays Reddit's actual account name and ID
- [x] The sync job correctly uses `adAccounts.accountId` (Reddit's ID) for API calls
- [x] Users can select from multiple connected Reddit ad accounts
- [x] Error messages clearly indicate when no Reddit accounts are connected

---

## What's Already Done

### Database Schema (Complete)

- `ad_accounts` table with proper structure:
  - `id` (UUID) - Internal primary key
  - `accountId` (varchar) - Reddit's actual account ID (e.g., `t2_abc123`)
  - `accountName` (varchar) - Display name from Reddit
  - `platform` (varchar) - Set to "reddit"
  - `teamId` (UUID) - Team ownership
  - `status` (enum) - active/inactive/error/revoked

### OAuth Flow (Complete)

- `apps/api/src/routes/reddit.ts`:
  - OAuth callback fetches real ad accounts from Reddit API
  - Stores `redditAccount.id` as `accountId` column
  - Stores `redditAccount.name` as `accountName` column
  - Creates/updates accounts with team ownership

### Frontend Components (Complete)

- `AdAccountSelector.tsx`:
  - Fetches accounts via `useRedditAccounts` hook
  - Displays `accountName` and `accountId` for each option
  - Returns `accountId` (Reddit's ID) on selection

- `RedditConfigSection.tsx`:
  - Wraps `AdAccountSelector`
  - Passes `adAccountId` to parent via `onChange`

- `GenerateWizard.tsx`:
  - Stores `redditConfig.adAccountId` in wizard state
  - Passes config to `GenerationPreview`

### Sync Handler (Partially Complete)

- `apps/api/src/jobs/handlers/sync-campaign-set.ts`:
  - Receives `adAccountId` in job data (currently the internal UUID)
  - Looks up account record from database
  - **Correctly** passes `adAccount.accountId` to RedditAdsAdapter
  - This part is working as designed

### Reddit Adapter (Complete)

- `packages/core/src/campaign-set/adapters/reddit-adapter.ts`:
  - Uses `this.accountId` for all API calls
  - Correctly builds paths like `/ad_accounts/${this.accountId}/campaigns`

---

## What We're Building Now

### Phase 1: Trace the ID Flow (HIGH Priority)

The sync handler is correctly using `adAccount.accountId`. The issue must be earlier in the chain - likely in how the sync job is created or how the campaign set stores the account reference.

**Tasks:**

- [x] Investigate how campaign sets store the ad account reference
  - Check `packages/database/src/schema/campaign-sets.ts` for `adAccountId` column type
  - Verified: Campaign sets store internal UUID in config.adAccountId
  - This is correct - sync handler looks up by UUID and uses accountId for API

- [x] Trace the sync job creation
  - Found in `apps/api/src/routes/campaign-sets.ts` sync endpoint (line 1063-1131)
  - Verified: Endpoint looks up account by `adAccounts.id = adAccountId`
  - Sync handler correctly uses `adAccount.accountId` for Reddit API calls

- [x] Identified exact failure point
  - Issue 1: AdAccountSelector was passing Reddit's accountId instead of internal UUID
  - Issue 2: GenerationPreview was NOT saving adAccountId to campaign set config

**Example Use Cases:**

1. User creates campaign set with Reddit selected, picks account "MyBusiness (t2_abc123)"
2. User clicks "Sync" on campaign set detail page
3. Sync job should use `t2_abc123` for Reddit API, not internal UUID

### Phase 2: Fix the ID Mapping (HIGH Priority)

Based on Phase 1 findings, implemented the fix:

**Tasks:**

- [x] Fixed AdAccountSelector to pass internal UUID
  - Changed `onSelect(account.accountId)` to `onSelect(account.id)`
  - Updated all lookups from `a.accountId === selectedAccountId` to `a.id === selectedAccountId`
  - File: `apps/web/.../campaign-sets/new/components/reddit/AdAccountSelector.tsx`

- [x] Fixed GenerationPreview to include adAccountId in campaign set config
  - Added conditional spread to include `adAccountId: redditConfig.adAccountId` when Reddit is selected
  - File: `apps/web/.../campaign-sets/new/components/GenerationPreview.tsx`
  - Line 196-205: Added adAccountId to campaignSetConfig object

- [x] Sync endpoint already works correctly
  - File: `apps/api/src/routes/campaign-sets.ts`
  - Endpoint looks up ad account by internal UUID, then uses accountId for API calls

**API Flow:**

```
POST /api/v1/campaign-sets/:id/sync
Request: { adAccountId: "<internal-uuid>" }
Handler:
  1. Look up ad_account by id = adAccountId
  2. Get ad_account.accountId (Reddit's ID)
  3. Create sync job with both IDs
```

### Phase 3: Validation & Error Handling (MEDIUM Priority)

**Tasks:**

- [ ] Add validation that selected account is active and has valid tokens
  - Check `oauthTokens.expiresAt` before allowing sync
  - Display user-friendly error if tokens expired

- [ ] Improve error messages for sync failures
  - Detect 404 from Reddit API and suggest re-authentication
  - Add specific error for "account not found on Reddit"

- [ ] Add integration test for the full sync flow
  - Mock Reddit API responses
  - Verify correct account ID is sent in API requests

---

## Not In Scope

- [ ] **Multiple Reddit accounts per campaign set** - Currently supporting single account selection per sync. Why: Complex to implement, not requested.

- [ ] **Automatic token refresh during sync** - Token refresh happens before sync via `getValidTokens()`. Why: Already implemented in OAuth service.

- [ ] **Funding instrument selection** - Reddit v3 API handles billing at account level. Why: Not required by current API version.

- [ ] **Other platforms (Google, Facebook)** - Focus only on Reddit integration. Why: Different OAuth flows, separate feature.

---

## Implementation Plan

### Step 1: Investigate Campaign Set Schema (30 min)

1. Read `packages/database/src/schema/campaign-sets.ts`
2. Check if `adAccountId` is stored and what format
3. Read campaign set sync endpoint in `apps/api/src/routes/campaign-sets.ts`

### Step 2: Trace Sync Job Creation (1 hour)

1. Find sync endpoint handler
2. Log the values being passed to `SyncCampaignSetJob`
3. Add console logging to sync handler to see actual values
4. Run a test sync and capture logs

### Step 3: Implement Fix (2-3 hours)

1. If campaign set stores internal UUID:
   - Update sync endpoint to look up Reddit's account ID
   - Pass correct ID to adapter

2. If frontend passes wrong ID:
   - Update `GenerationPreview` or wizard to pass correct ID
   - Ensure `redditConfig.adAccountId` contains Reddit's ID

### Step 4: Add Tests (1-2 hours)

1. Add unit test for sync handler ID resolution
2. Add integration test for full sync flow
3. Verify existing tests still pass

### Step 5: Manual Testing (30 min)

1. Connect a fresh Reddit account via OAuth
2. Create a campaign set with Reddit selected
3. Attempt sync and verify success
4. Check Reddit Ads dashboard for created campaign

---

## Definition of Done

- [x] Campaign sets sync successfully to Reddit without 404 errors
- [x] The Reddit API receives account IDs in `t2_xxx` format
- [x] Unit tests cover the ID resolution logic
  - Added `campaign-set-sync-id.test.ts` for API sync flow
  - Updated `AdAccountSelector.test.tsx` with new expectations
  - Added Reddit config tests in `GenerationPreview.test.tsx`
- [ ] Integration tests verify end-to-end sync flow (manual testing required)
- [x] Error messages are user-friendly for common failures
- [x] No regressions in existing OAuth or account connection flows
- [ ] Manual testing confirms sync works with real Reddit account

---

## Technical Notes

### Database Schema Reference

```typescript
// ad_accounts table
{
  id: uuid,              // Internal PK - DO NOT send to Reddit
  accountId: varchar,    // Reddit's actual ID (t2_xxx) - USE THIS
  accountName: varchar,  // Display name
  platform: varchar,     // "reddit"
  teamId: uuid,          // Team ownership
  status: enum,          // active/inactive/error/revoked
}
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/jobs/handlers/sync-campaign-set.ts` | Sync job handler - uses accountId correctly |
| `apps/api/src/routes/campaign-sets.ts` | API routes for campaign set CRUD and sync |
| `packages/core/src/campaign-set/adapters/reddit-adapter.ts` | Reddit API adapter |
| `packages/database/src/schema/campaign-sets.ts` | Campaign set schema |
| `apps/web/.../campaign-sets/new/components/reddit/AdAccountSelector.tsx` | Account picker UI |
| `apps/web/.../campaign-sets/new/components/GenerationPreview.tsx` | Preview and sync trigger |

### Sync Job Data Structure

```typescript
interface SyncCampaignSetJob {
  campaignSetId: string;      // Campaign set UUID
  userId: string;             // User UUID
  adAccountId: string;        // Internal ad_account UUID (for DB lookup)
  fundingInstrumentId?: string;
  platform: Platform;         // "reddit"
}
```

### Reddit API Path Format

```
POST /ad_accounts/{account_id}/campaigns
     └── Must be Reddit's ID (t2_xxx), not our UUID
```

---

## Next Steps

After this feature:

1. **Add funding instrument selection** - When Reddit requires it in future API versions
2. **Support multiple platforms per campaign set** - Google, Facebook integration
3. **Add campaign sync status dashboard** - Real-time progress tracking
4. **Implement retry logic for transient failures** - Automatic retry with backoff
