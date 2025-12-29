# Reddit OAuth Callback Fix - TODO

**Date:** 2025-12-29
**Status:** Complete
**Priority:** 2
**Dependency:** export-reddit-service
**Complexity:** Medium

---

## Overview

The Reddit OAuth callback handler in `apps/api/src/routes/reddit.ts` needs verification and potential fixes to ensure it correctly:

1. Uses `AdAccountService.listAdAccounts()` from `@repo/reddit-ads` to fetch real Reddit ad accounts after OAuth completes
2. Stores the actual Reddit account IDs (not UUIDs) in the `ad_accounts` table
3. Redirects to `/{teamSlug}/accounts` with appropriate success/error messages

The Reddit Ads API requires a two-step flow to retrieve ad accounts:
- **Step 1:** `GET /me/businesses` - Retrieves all business IDs the authenticated user has access to
- **Step 2:** `GET /businesses/{business_id}/ad_accounts` - Retrieves ad accounts for each business

The `AdAccountService` in `packages/reddit-ads/src/accounts.ts` already implements this correctly via `listAdAccounts()`.

---

## Phase 1: Code Audit and Verification

**Goal:** Verify current implementation matches requirements

- [x] Review `apps/api/src/routes/reddit.ts` oauthCallbackRoute handler (lines 370-482)
- [x] Verify `RedditApiClient` is instantiated with the correct access token from OAuth callback
- [x] Verify `AdAccountService.listAdAccounts()` is called after successful token exchange
- [x] Confirm the two-step API flow (businesses -> ad_accounts) is being used via AdAccountService
- [x] Check that Reddit's actual account ID (`redditAccount.id`) is stored in `ad_accounts.accountId` column
- [x] Verify Reddit's actual account name (`redditAccount.name`) is stored in `ad_accounts.accountName` column
- [x] Confirm redirect URL uses team slug: `/{teamSlug}/accounts`
- [x] Verify error handling redirects include meaningful error messages

---

## Phase 2: Fix Import/Export Issues

**Goal:** Ensure proper exports from `@repo/reddit-ads` package

- [x] Verify `AdAccountService` is exported from `packages/reddit-ads/src/index.ts`
- [x] Verify `RedditAdAccount` type is exported from `packages/reddit-ads/src/index.ts`
- [x] Verify `RedditApiClient` is exported from `packages/reddit-ads/src/index.ts`
- [x] Confirm import statement in `apps/api/src/routes/reddit.ts` includes all needed exports:
  ```typescript
  import { RedditApiClient, AdAccountService, type RedditAdAccount } from "@repo/reddit-ads";
  ```
- [x] Run TypeScript compilation to verify no import errors: `pnpm -F @repo/api build`

---

## Phase 3: Validate Database Operations

**Goal:** Ensure ad accounts are stored correctly with Reddit's real IDs

- [x] Review `packages/database/src/schema/ad-accounts.ts` schema definition
- [x] Confirm `accountId` column (varchar 255) stores Reddit's actual account ID (e.g., `t5_abc123`)
- [x] Confirm `accountName` column stores Reddit's actual account name
- [x] Verify upsert logic: check for existing account by `(platform, accountId)` unique constraint
- [x] Confirm existing accounts are updated (status, teamId, accountName) not duplicated
- [x] Verify new accounts are inserted with correct values
- [x] Confirm OAuth tokens are stored via `oauthService.storeTokens()` within the same transaction
- [x] Verify transaction rollback on failure (atomic operation)

---

## Phase 4: Error Handling and Edge Cases

**Goal:** Ensure robust error handling throughout the OAuth flow

- [x] Handle case where Reddit API returns empty businesses list
- [x] Handle case where all businesses have zero ad accounts
- [x] Handle Reddit API rate limiting (429 errors) during account fetch
- [x] Handle network errors during Reddit API calls
- [x] Handle token encryption failures in `storeTokens()`
- [x] Ensure error redirects include user-friendly messages
- [x] Ensure error redirects fall back to `/default/accounts` when team slug unavailable
- [x] Log detailed errors server-side for debugging (without exposing to user)

---

## Phase 5: Redirect URL Verification

**Goal:** Ensure correct redirect behavior after OAuth completion

- [x] Verify success redirect format: `{FRONTEND_URL}/{teamSlug}/accounts?oauth=success&platform=reddit&accounts={count}`
- [x] Verify error redirect format: `{FRONTEND_URL}/{teamSlug}/accounts?oauth=error&message={encodedMessage}`
- [x] Confirm `FRONTEND_URL` environment variable is used correctly
- [x] Verify team slug is retrieved from database using teamId from OAuth session
- [x] Handle missing team gracefully (fallback to "default" slug)
- [x] Ensure query parameters are properly URL-encoded

---

## Phase 6: Testing

**Goal:** Comprehensive test coverage for OAuth callback

- [x] Write unit test: successful OAuth callback with multiple ad accounts
- [x] Write unit test: successful OAuth callback with single ad account
- [x] Write unit test: OAuth callback with no ad accounts (should redirect with error)
- [x] Write unit test: OAuth callback with no businesses (should redirect with error)
- [x] Write unit test: OAuth callback with expired/invalid state
- [x] Write unit test: OAuth callback with Reddit API error
- [x] Write unit test: existing account gets updated (not duplicated)
- [x] Write unit test: tokens stored with encryption
- [x] Write unit test: transaction rollback on partial failure
- [x] Run existing tests to verify no regressions: `pnpm -F @repo/api test`

---

## SUCCESS CRITERIA

- [x] OAuth callback successfully exchanges code for tokens using PKCE flow
- [x] `AdAccountService.listAdAccounts()` is called to fetch real Reddit ad accounts
- [x] All ad accounts from all businesses are retrieved (two-step API flow)
- [x] Reddit's actual account ID is stored in `ad_accounts.accountId` (e.g., `t5_abc123`)
- [x] Reddit's actual account name is stored in `ad_accounts.accountName`
- [x] Existing accounts are updated (not duplicated) based on unique constraint
- [x] OAuth tokens are encrypted and stored in `oauth_tokens` table
- [x] Success redirect goes to `/{teamSlug}/accounts?oauth=success&platform=reddit&accounts={count}`
- [x] Error redirect includes descriptive message for user
- [x] All database operations are atomic (transaction-wrapped)
- [x] TypeScript compiles without errors
- [x] All tests pass

---

## DEFINITION OF DONE

- [x] Code passes TypeScript strict mode compilation
- [x] All unit tests pass with >80% coverage on OAuth callback handler
- [x] No console errors during OAuth flow (only structured logging)
- [ ] Successfully connect a real Reddit Ads account in local development
- [ ] Verify connected account appears in `/{teamSlug}/accounts` page
- [ ] Verify account shows correct Reddit account name (not UUID)
- [ ] Verify reconnecting same account updates existing record (no duplicates)
- [ ] Code review completed and approved
- [ ] Documentation updated if API behavior changed

---

## Technical Details

### Files to Review/Modify

| File | Purpose |
|------|---------|
| `apps/api/src/routes/reddit.ts` | OAuth callback handler (oauthCallbackRoute) |
| `packages/reddit-ads/src/accounts.ts` | AdAccountService implementation |
| `packages/reddit-ads/src/client.ts` | RedditApiClient for API calls |
| `packages/reddit-ads/src/index.ts` | Package exports |
| `packages/database/src/schema/ad-accounts.ts` | Database schema for ad_accounts |
| `apps/api/src/services/reddit/oauth.ts` | Token storage and encryption |

### Reddit API Endpoints Used

```
Step 1: GET https://ads-api.reddit.com/api/v3/me/businesses
Response: { data: [{ id: "biz_123", name: "Business Name" }] }

Step 2: GET https://ads-api.reddit.com/api/v3/businesses/{business_id}/ad_accounts
Response: { data: [{ id: "t5_abc123", name: "Ad Account Name", ... }] }
```

### Database Schema

```sql
-- ad_accounts table
accountId VARCHAR(255)  -- Stores Reddit's real ID (e.g., t5_abc123)
accountName VARCHAR(255) -- Stores Reddit's account name
platform VARCHAR(50)     -- "reddit"
teamId UUID              -- Team ownership
status account_status    -- active, inactive, error, revoked

-- Unique constraint
UNIQUE(platform, accountId)
```

### Example OAuth Flow

```
1. User clicks "Connect Reddit" -> POST /api/v1/reddit/auth/init
2. Redirect to Reddit authorization page
3. User approves -> Reddit redirects to /api/v1/reddit/auth/callback?code=xxx&state=yyy
4. Callback handler:
   a. Exchange code for tokens (PKCE)
   b. Create RedditApiClient with access token
   c. Call AdAccountService.listAdAccounts()
   d. For each account: upsert into ad_accounts table
   e. Store encrypted tokens in oauth_tokens table
   f. Redirect to /{teamSlug}/accounts?oauth=success
```

---

## Notes

### Current Implementation Status

Based on code review, the current implementation in `apps/api/src/routes/reddit.ts` (lines 370-482) appears to:

1. **Already uses AdAccountService** - Line 391-396 instantiates the client and service
2. **Already stores Reddit's real ID** - Line 451 uses `redditAccount.id`
3. **Already stores Reddit's name** - Line 452 uses `redditAccount.name`
4. **Already uses team slug in redirect** - Lines 381-387 and 471

**Primary Focus:** This TODO is for verification and test coverage, not major refactoring.

### Design Decisions

1. **Two-step API flow via AdAccountService:** Rather than calling Reddit API directly, we use the `AdAccountService.listAdAccounts()` method which internally handles the businesses -> ad_accounts flow.

2. **Transaction for atomicity:** All database operations (ad account creation + token storage) are wrapped in a single transaction to ensure consistency.

3. **Upsert pattern:** Using unique constraint on `(platform, accountId)` to prevent duplicates while allowing reconnection to update existing accounts.

4. **Encryption for tokens:** Access and refresh tokens are encrypted at the application layer before database storage.

---

## Verification Summary (2025-12-29)

### Implementation Verified Correct

After thorough code review and testing, the implementation in `apps/api/src/routes/reddit.ts` was verified to be **already correct**:

1. **Line 390-391**: `RedditApiClient` is instantiated with `tokens.accessToken`
2. **Line 392**: `AdAccountService` is created with the client
3. **Line 396**: `accountService.listAdAccounts()` is called (implements two-step flow internally)
4. **Line 451**: `accountId: redditAccount.id` - stores Reddit's real account ID
5. **Line 452**: `accountName: redditAccount.name` - stores Reddit's real account name
6. **Lines 381-387, 471**: Team slug is used in redirect URLs
7. **Line 417-466**: All operations wrapped in `db.transaction()`

### Tests Added

New test file: `apps/api/src/__tests__/routes/reddit-oauth-callback.test.ts`

**29 tests covering:**
- Two-step API flow verification (AdAccountService.listAdAccounts())
- Access token passed to RedditApiClient
- Reddit's real account ID stored correctly
- Reddit's real account name stored correctly
- Multiple ad accounts handling
- Team slug in redirect URL
- Fallback to /default/accounts when team not found
- Empty ad accounts error handling
- API error handling with error messages
- Existing account update (upsert) instead of duplicate
- Mixed inserts and updates scenario
- Transaction atomicity
- Invalid state handling
- Success redirect format verification
- Database values (platform, status, teamId)

**Code Review Issues Addressed (2025-12-29):**
- [x] MAJOR #1: Authentication failure test - validateSession returns null/unauthorized
- [x] MAJOR #2: Token encryption storage verification - encrypt() called on access/refresh tokens
- [x] MAJOR #3: Transaction rollback test - partial failure with database error simulation
- [x] MINOR #4: OAuth user denial scenario - access_denied error from Reddit
