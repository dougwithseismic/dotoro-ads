# Export Reddit Service - TODO

**Date:** 2025-12-29
**Status:** VERIFIED COMPLETE
**Priority:** 1
**Complexity:** Low
**Verified:** 2025-12-29 - All exports confirmed working, build passes, 100 tests pass

---

## Overview

This task ensures the Reddit Ads package (`packages/reddit-ads`) properly exports the `AdAccountService` class and associated types (`RedditAdAccount`, `RedditBusiness`) from the package entry point. These exports enable consuming applications (like the API service) to import and use the Reddit ad account management functionality.

**Current State:** Upon investigation, all required exports are already present in `packages/reddit-ads/src/index.ts`:
- `AdAccountService` class is exported (line 31)
- `RedditAdAccount` type is exported (line 32)
- `RedditBusiness` type is exported (line 32)

---

## Phase 1: Verify Existing Exports

- [x] Confirm `AdAccountService` is exported from `packages/reddit-ads/src/index.ts`
- [x] Confirm `RedditAdAccount` type is exported from `packages/reddit-ads/src/index.ts`
- [x] Confirm `RedditBusiness` type is exported from `packages/reddit-ads/src/index.ts`
- [x] Verify exports use correct `.js` extension for ESM compatibility

**Files Verified:**
```
packages/reddit-ads/src/index.ts (lines 31-32)
packages/reddit-ads/src/accounts.ts (complete implementation)
```

---

## Phase 2: Validate TypeScript Compilation

- [x] Run TypeScript compilation for `packages/reddit-ads` package
- [x] Verify no type errors in exports
- [x] Confirm generated `.d.ts` files include all exports

**Commands:**
```bash
cd packages/reddit-ads && pnpm build
```

---

## Phase 3: Verify Import Functionality

- [x] Test importing `AdAccountService` from `@dotoro/reddit-ads`
- [x] Test importing `RedditAdAccount` type from `@dotoro/reddit-ads`
- [x] Test importing `RedditBusiness` type from `@dotoro/reddit-ads`
- [x] Verify TypeScript IntelliSense works for imported items

**Test Import Example:**
```typescript
import {
  AdAccountService,
  type RedditAdAccount,
  type RedditBusiness
} from "@dotoro/reddit-ads";
```

---

## Phase 4: Run Existing Tests

- [x] Run unit tests for `packages/reddit-ads`
- [x] Verify all tests pass (100 tests passed across 7 test files)
- [x] Check test coverage for `AdAccountService` (9 tests in accounts.test.ts)

**Commands:**
```bash
cd packages/reddit-ads && pnpm test
```

---

## Existing Implementation Details

### AdAccountService Class
**Location:** `packages/reddit-ads/src/accounts.ts`

**Methods:**
| Method | Description | API Endpoint |
|--------|-------------|--------------|
| `listBusinesses()` | Get all businesses for authenticated user | `GET /me/businesses` |
| `listAdAccountsByBusiness(businessId)` | Get ad accounts for a specific business | `GET /businesses/{id}/ad_accounts` |
| `listAdAccounts()` | Get all ad accounts across all businesses (combines both calls) | Two-step flow |
| `getAdAccount(accountId)` | Get a specific ad account by ID | `GET /ad_accounts/{id}` |

### RedditBusiness Type
```typescript
interface RedditBusiness {
  id: string;
  name: string;
  industry?: string;
  created_at?: string;
  modified_at?: string;
}
```

### RedditAdAccount Type
```typescript
interface RedditAdAccount {
  id: string;
  name: string;
  type: "MANAGED" | "SELF_SERVE";
  currency: string;
  business_id: string;
  time_zone_id?: string;
  admin_approval?: string;
  created_at?: string;
  modified_at?: string;
}
```

---

## SUCCESS CRITERIA

- [x] `AdAccountService` can be imported from `@dotoro/reddit-ads` without errors
- [x] `RedditAdAccount` type can be imported and used for type annotations
- [x] `RedditBusiness` type can be imported and used for type annotations
- [x] TypeScript compilation succeeds with no errors
- [x] All existing unit tests pass
- [x] Package builds successfully with `pnpm build`

---

## DEFINITION OF DONE

- [x] All exports are present in `packages/reddit-ads/src/index.ts`
- [x] TypeScript compilation produces valid `.d.ts` declaration files
- [x] Imports work correctly in consuming packages (e.g., `apps/api`)
- [x] No breaking changes to existing functionality
- [x] Unit tests pass with no failures
- [x] Documentation reflects current export structure

---

## Notes

### Why These Exports Matter
The Reddit account connection flow requires:
1. Fetching businesses via `GET /me/businesses`
2. Fetching ad accounts per business via `GET /businesses/{id}/ad_accounts`

The `AdAccountService` encapsulates this two-step flow, making it easy for the API layer to retrieve ad accounts for connected Reddit OAuth users.

### Technical Context
- Package uses ESM modules (`.js` extensions in imports)
- Types are exported separately using `export type` for proper tree-shaking
- Service follows the same pattern as other services (`CampaignService`, `AdGroupService`, etc.)

---

## Next Steps

After verification:
1. Integrate `AdAccountService` in API route for fetching user's Reddit ad accounts
2. Build account selection UI in web app
3. Store selected ad account reference in database
