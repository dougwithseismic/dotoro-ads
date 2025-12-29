# Account Selection UI - Reddit Ad Account Connection

**Date:** 2025-12-29
**Status:** Planning
**Depends On:** oauth-callback-fix (Priority 1)
**Priority:** 3

---

## Overview

The current Reddit OAuth flow auto-connects ALL ad accounts from all businesses after OAuth completion. This is problematic because:

1. Users may have access to multiple businesses with many ad accounts
2. Users may only want to connect specific accounts to their team
3. The auto-connect behavior can cause confusion and unwanted account connections

This feature replaces the auto-connect flow with a user-driven account selection UI that:
- Shows available Reddit ad accounts after OAuth completes
- Groups accounts by business name for clarity
- Allows users to select which accounts to connect to their team
- Saves only the selected accounts to the database

---

## Goal

Enable users to explicitly choose which Reddit ad accounts to connect to their team workspace, providing full control over account connections and preventing unwanted auto-connections.

### Success Criteria

- [ ] After OAuth callback, user sees a modal/page with all available Reddit ad accounts
- [ ] Accounts are grouped by business name for easy identification
- [ ] User can select/deselect individual accounts using checkboxes
- [ ] Only selected accounts are saved to the database after confirmation
- [ ] Empty state is shown if user has no Reddit ad accounts
- [ ] Error state is shown if fetching accounts fails with retry option
- [ ] Loading state is shown while fetching accounts from Reddit API
- [ ] User can cancel the selection and no accounts are connected

---

## What's Already Done

### Backend Infrastructure
- [x] `packages/reddit-ads/src/accounts.ts` - `AdAccountService` with `listAdAccounts()`, `listBusinesses()`, `listAdAccountsByBusiness()`
- [x] `apps/api/src/routes/reddit.ts` - OAuth init and callback routes
- [x] `apps/api/src/services/reddit/oauth.ts` - OAuth service with token handling
- [x] `packages/database/src/schema/ad-accounts.ts` - Schema with `adAccounts` and `oauthTokens` tables
- [x] `RedditAdAccount` type includes: `id`, `name`, `type`, `currency`, `business_id`, `time_zone_id`
- [x] `RedditBusiness` type includes: `id`, `name`, `industry`

### Frontend Components
- [x] `apps/web/app/[locale]/[teamSlug]/accounts/page.tsx` - Accounts page with OAuth handling
- [x] `apps/web/app/[locale]/[teamSlug]/accounts/components/ConnectButton.tsx` - Platform connect buttons
- [x] `apps/web/app/[locale]/[teamSlug]/accounts/components/AccountCard.tsx` - Connected account display
- [x] `apps/web/app/[locale]/[teamSlug]/accounts/components/AccountsList.tsx` - List of connected accounts
- [x] `apps/web/app/[locale]/[teamSlug]/accounts/components/DisconnectDialog.tsx` - Disconnect confirmation
- [x] Existing `AdAccountSelector.tsx` in campaign-sets (can reference for patterns)

### Types and Schemas
- [x] `apps/web/app/[locale]/[teamSlug]/accounts/types.ts` - Frontend types for `AdAccount`, `PlatformConfig`
- [x] `apps/api/src/schemas/reddit.ts` - API schemas for OAuth

---

## What We're Building Now

### Phase 1: API Endpoint for Available Accounts (HIGH)

**Why HIGH:** Backend must expose available accounts before UI can display them

- [ ] Create new API endpoint `GET /api/v1/reddit/available-accounts`
  - File: `apps/api/src/routes/reddit.ts`
  - Returns accounts fetched from Reddit API using stored OAuth tokens
  - Groups accounts by business for frontend display
  - Requires authentication and team membership validation

- [ ] Create request/response schemas
  - File: `apps/api/src/schemas/reddit.ts`
  - Schema: `redditAvailableAccountsResponseSchema`
  ```typescript
  {
    businesses: [{
      id: string,
      name: string,
      accounts: [{
        id: string,
        name: string,
        type: "MANAGED" | "SELF_SERVE",
        currency: string,
        alreadyConnected: boolean
      }]
    }]
  }
  ```

- [ ] Create endpoint `POST /api/v1/reddit/connect-accounts`
  - File: `apps/api/src/routes/reddit.ts`
  - Accepts array of account IDs to connect
  - Validates accounts exist in Reddit API response
  - Creates/updates adAccounts records in database
  - Stores OAuth tokens for each selected account

**Example Use Cases:**
1. User completes OAuth and has access to 3 businesses with 8 total ad accounts
2. User selects 2 accounts from 1 business to connect
3. API validates selection and saves only those 2 accounts
4. User can later add more accounts by going through selection again

### Phase 2: Account Selection Modal Component (HIGH)

**Why HIGH:** Core user-facing component for the feature

- [ ] Create `AccountSelectionModal.tsx` component
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/components/AccountSelectionModal.tsx`
  - Props: `isOpen`, `onClose`, `onConfirm`, `availableAccounts`, `isLoading`, `error`
  - Uses CSS modules: `AccountSelectionModal.module.css`

- [ ] Implement modal structure
  - Header with title "Select Reddit Ad Accounts"
  - Scrollable content area for account list
  - Footer with Cancel and "Connect Selected" buttons
  - Accessible: focus trap, escape to close, aria labels

- [ ] Implement business grouping UI
  - Collapsible sections per business
  - Business name as section header
  - Checkbox for each account within business
  - "Select All" checkbox per business section

- [ ] Implement account row display
  - Checkbox for selection
  - Account name (primary)
  - Account ID (secondary, smaller text)
  - Account type badge (MANAGED/SELF_SERVE)
  - Currency indicator
  - "Already connected" badge if applicable (disabled checkbox)

- [ ] Implement selection state management
  - `useState` for selected account IDs
  - Enable/disable confirm button based on selection count
  - Show selection count: "X accounts selected"

- [ ] Create loading state
  - Spinner with "Loading available accounts..." text
  - Skeleton placeholders for account list

- [ ] Create error state
  - Error message display
  - Retry button
  - Option to cancel and close modal

- [ ] Create empty state
  - Message: "No Reddit ad accounts found"
  - Link to Reddit Ads setup instructions
  - Close button

**Example Use Cases:**
1. Modal opens showing 2 businesses: "Agency ABC" and "Client XYZ"
2. "Agency ABC" has 3 accounts, "Client XYZ" has 2 accounts
3. User expands "Agency ABC" section and selects 2 of 3 accounts
4. Footer shows "2 accounts selected" and enables Connect button
5. User clicks Connect, modal shows saving state, then closes on success

### Phase 3: Hook for Account Selection (MEDIUM)

**Why MEDIUM:** Abstracts API logic from component

- [ ] Create `useAvailableAccounts.ts` hook
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/hooks/useAvailableAccounts.ts`
  - Fetches available accounts from API
  - Handles loading, error, and success states
  - Provides `refetch` function for retry

- [ ] Create `useConnectAccounts.ts` hook
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/hooks/useConnectAccounts.ts`
  - Mutation hook for connecting selected accounts
  - Handles loading and error states
  - Returns success/failure status

- [ ] Export hooks from index
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/hooks/index.ts`

### Phase 4: Integration with OAuth Flow (HIGH)

**Why HIGH:** Connects the new UI to the existing OAuth flow

- [ ] Modify OAuth callback handling in `page.tsx`
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/page.tsx`
  - Detect `oauth=pending_selection` query param (new state)
  - Open AccountSelectionModal when pending selection detected
  - Pass session token or temporary state for account fetching

- [ ] Modify backend OAuth callback
  - File: `apps/api/src/routes/reddit.ts`
  - Change redirect from `oauth=success` to `oauth=pending_selection`
  - Store tokens temporarily (session or short-lived cache)
  - Do NOT auto-create adAccount records

- [ ] Handle modal confirmation
  - Call `POST /api/v1/reddit/connect-accounts` with selected IDs
  - On success: show success toast, refresh accounts list
  - On error: show error in modal, allow retry

- [ ] Handle modal cancellation
  - Clear temporary OAuth state
  - Show info toast: "No accounts were connected"
  - Revoke tokens if applicable (cleanup)

**Data Flow:**
```
1. User clicks "Connect Reddit" button
2. OAuth redirect to Reddit, user authorizes
3. Callback stores tokens temporarily, redirects with oauth=pending_selection
4. Frontend opens AccountSelectionModal
5. Modal fetches available accounts using temp tokens
6. User selects accounts, clicks Connect
7. API creates adAccount records for selected accounts
8. Modal closes, success message shown, list refreshed
```

### Phase 5: CSS Styling (MEDIUM)

**Why MEDIUM:** Required for usability but follows established patterns

- [ ] Create `AccountSelectionModal.module.css`
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/components/AccountSelectionModal.module.css`
  - Modal overlay and container styles
  - Header, content, footer sections
  - Business group accordion styles
  - Account row styles with checkbox
  - Loading, error, empty state styles
  - Responsive design for mobile

- [ ] Follow existing design patterns
  - Reference `DisconnectDialog.module.css` for modal patterns
  - Reference `AccountCard.module.css` for account display patterns
  - Use existing CSS variables for colors, spacing

### Phase 6: Unit Tests (MEDIUM)

**Why MEDIUM:** Ensures reliability of new components

- [ ] Test `AccountSelectionModal.tsx`
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/components/__tests__/AccountSelectionModal.test.tsx`
  - Tests: renders with accounts, handles selection, submit, cancel
  - Tests: loading state, error state, empty state
  - Tests: business grouping, select all functionality

- [ ] Test `useAvailableAccounts.ts`
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/hooks/__tests__/useAvailableAccounts.test.ts`
  - Tests: successful fetch, error handling, refetch

- [ ] Test `useConnectAccounts.ts`
  - File: `apps/web/app/[locale]/[teamSlug]/accounts/hooks/__tests__/useConnectAccounts.test.ts`
  - Tests: successful connection, error handling

- [ ] Test API endpoints
  - File: `apps/api/src/__tests__/routes/reddit-available-accounts.test.ts`
  - Tests: authentication, authorization, success response, error cases

---

## Not In Scope

### Deferred Features
- [ ] Bulk disconnect of accounts
  - **Why:** Adds complexity; current single disconnect works fine
- [ ] Account renaming from UI
  - **Why:** Names come from Reddit API; renaming could cause confusion
- [ ] Account reordering/favoriting
  - **Why:** Nice-to-have; not core to selection flow
- [ ] Automatic token refresh during selection
  - **Why:** Selection happens immediately after OAuth; tokens are fresh

### Future Considerations
- [ ] Google Ads account selection (same pattern, different platform)
  - **Why:** Focus on Reddit first; can extend pattern later
- [ ] Meta/Facebook account selection
  - **Why:** Same as above
- [ ] Account permissions/roles display
  - **Why:** Reddit API doesn't expose granular permissions

---

## Implementation Plan

1. **Create API schemas and endpoint structure** (1-2 hours)
   - Add Zod schemas for request/response
   - Create route handler stubs
   - Add to OpenAPI documentation

2. **Implement available accounts endpoint** (2-3 hours)
   - Fetch businesses from Reddit API
   - Fetch accounts per business
   - Check which are already connected
   - Return grouped response

3. **Implement connect accounts endpoint** (2-3 hours)
   - Validate account IDs against available accounts
   - Create/update adAccount records
   - Store OAuth tokens
   - Return success/failure

4. **Create modal component structure** (2-3 hours)
   - Modal layout with header/content/footer
   - Business grouping accordion
   - Account row with checkbox
   - State management for selection

5. **Add loading, error, empty states** (1-2 hours)
   - Loading spinner and skeleton
   - Error message with retry
   - Empty state with guidance

6. **Create hooks for data fetching** (1-2 hours)
   - useAvailableAccounts with SWR/React Query pattern
   - useConnectAccounts mutation hook

7. **Modify OAuth callback flow** (2-3 hours)
   - Backend: redirect with pending_selection
   - Frontend: detect and open modal
   - Handle temporary token storage

8. **CSS styling** (2-3 hours)
   - Modal styles following design system
   - Responsive design
   - Animation/transitions

9. **Write unit tests** (3-4 hours)
   - Component tests with React Testing Library
   - Hook tests
   - API route tests

10. **Integration testing and polish** (2-3 hours)
    - End-to-end flow testing
    - Edge case handling
    - Error message refinement

---

## Definition of Done

- [ ] User can complete OAuth and see available accounts in a modal
- [ ] Accounts are grouped by business name
- [ ] User can select/deselect individual accounts
- [ ] User can select all accounts within a business
- [ ] Already connected accounts are shown but disabled
- [ ] Only selected accounts are saved after confirmation
- [ ] Cancel closes modal without connecting any accounts
- [ ] Loading, error, and empty states work correctly
- [ ] All unit tests pass
- [ ] Responsive design works on mobile
- [ ] Accessibility: keyboard navigation, screen reader support
- [ ] No TypeScript errors or warnings

---

## Notes

### Tech Stack
- **Frontend:** Next.js 15, React, CSS Modules
- **Backend:** Hono (OpenAPI), Drizzle ORM
- **Database:** PostgreSQL
- **Testing:** Vitest, React Testing Library

### Design Principles
- **Progressive disclosure:** Show business groups collapsed by default
- **Explicit over implicit:** User must actively select accounts
- **Error recovery:** Retry options at every failure point
- **Accessibility first:** Full keyboard navigation, ARIA labels

### API Design
- Use existing authentication middleware
- Follow established route patterns in `apps/api/src/routes/`
- Use Zod schemas for validation
- Return consistent error format

### Component Patterns
- Reference existing modal patterns (DisconnectDialog)
- Use existing account display patterns (AccountCard)
- Follow established hook patterns (useRedditAccounts)

---

## Next Steps

After this feature is complete:

1. **Phase 2: Google Ads Account Selection**
   - Apply same pattern to Google Ads OAuth flow
   - Reuse modal component with platform prop

2. **Phase 3: Meta Account Selection**
   - Apply same pattern to Meta OAuth flow
   - Handle Meta's business/ad account hierarchy

3. **Phase 4: Account Management Improvements**
   - Add "Add more accounts" button for already-connected platforms
   - Show account details in expanded view
