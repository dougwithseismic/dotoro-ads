# Pre-Sync Validation Preview

**Project:** dotoro - Campaign Management Platform
**Feature:** Pre-Sync Validation Preview Modal
**Date:** 2025-12-30
**Status:** Complete

---

## Overview

Before sync, users should see a clear preview of what will happen to their ads. This feature adds a confirmation step that displays a breakdown of validation results, allowing users to review and fix issues before proceeding with the actual sync operation.

**Why this matters:**
- Users currently sync blindly without knowing which ads will fail
- No visibility into fallback behavior before it happens
- Skipped ads are only discovered after sync completes
- Users cannot make informed decisions about proceeding
- No quick path to fix issues without leaving the sync flow

**User Flow:**
1. User clicks "Sync" button on campaign set
2. System runs validation (using existing `/validate` endpoint)
3. Preview modal shows breakdown of what will happen
4. User can drill down into issues, fix them, or proceed with sync

---

## Goal

Provide users with a clear, actionable preview of sync outcomes before execution, enabling informed decisions and reducing failed/partial syncs.

### Success Criteria

- [x] Preview modal shows accurate breakdown: valid, fallback, and skipped ad counts
- [x] Users can drill down to see individual skipped ads with specific error reasons
- [x] Drill-down view shows product name, error type, and offending field value
- [x] "Fix and Re-validate" flow allows users to edit and re-check without losing context
- [x] "Sync anyway" bypass option available with confirmation for advanced users
- [x] Preview loads within 2 seconds for campaign sets with up to 1000 ads
- [x] Modal is accessible (keyboard navigable, screen reader compatible)

---

## What's Already Done

### Backend Validation Infrastructure (Complete)
- [x] `POST /api/v1/campaign-sets/:id/validate` endpoint returns structured validation results
  - File: `apps/api/src/routes/campaign-sets.ts` (lines 560-616, 1276-1316)
  - Returns: `ValidationResult` with `isValid`, `totalErrors`, `campaigns[]`, `summary`
- [x] `SyncValidationService` validates entire campaign set hierarchy
  - File: `packages/core/src/campaign-set/validation/sync-validation-service.ts`
  - Collects ALL errors in single pass (not fail-fast)
- [x] Validation types defined with error codes and entity mapping
  - File: `apps/api/src/schemas/campaign-sets.ts` (lines 857-963)
  - Includes: `ValidationErrorCode`, `ValidationEntityType`, `ValidationError`
- [x] Pre-sync validation runs automatically before sync job
  - File: `apps/api/src/jobs/handlers/sync-campaign-set.ts` (lines 94-168)
  - Blocks sync if validation fails, persists results for lookup

### Frontend Sync Modal (Partial)
- [x] `SyncProgressModal` component exists for real-time progress
  - File: `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SyncProgressModal.tsx`
  - Shows progress bar, campaign statuses, error messages
- [x] Focus trap and accessibility patterns implemented
- [x] Modal styling with CSS modules
  - File: `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SyncProgressModal.module.css`

### Campaign Set Detail Page
- [x] Sync button triggers modal and SSE connection
  - File: `apps/web/app/[locale]/[teamSlug]/campaign-sets/[setId]/page.tsx`
- [x] Campaign set data fetched with full hierarchy
- [x] Existing "Sync" action in campaign set header

---

## What We're Building Now

### Phase 1: Preview API Endpoint (Priority: HIGH)
**Why:** Backend must provide preview-specific data before frontend can display it

- [x] Create `POST /api/v1/campaign-sets/:id/preview-sync` endpoint
  - Path: `apps/api/src/routes/campaign-sets.ts`
  - Runs validation but adds sync plan classification
  - Does NOT execute sync, only previews

- [x] Define preview response schema
  ```typescript
  // apps/api/src/schemas/campaign-sets.ts
  const syncPreviewResponseSchema = z.object({
    campaignSetId: z.string(),
    totalAds: z.number(),
    breakdown: z.object({
      valid: z.number(),      // Will sync successfully
      fallback: z.number(),   // Will use fallback ad
      skipped: z.number(),    // Will be skipped entirely
    }),
    validAds: z.array(z.object({
      adId: z.string(),
      adGroupId: z.string(),
      campaignId: z.string(),
      name: z.string(),
    })),
    fallbackAds: z.array(z.object({
      adId: z.string(),
      adGroupId: z.string(),
      campaignId: z.string(),
      name: z.string(),
      reason: z.string(),
      fallbackAdId: z.string().optional(),
    })),
    skippedAds: z.array(z.object({
      adId: z.string(),
      adGroupId: z.string(),
      campaignId: z.string(),
      name: z.string(),
      productName: z.string().optional(),
      reason: z.string(),
      errorCode: z.string(),
      field: z.string(),
      value: z.unknown().optional(),
      expected: z.string().optional(),
    })),
    canProceed: z.boolean(),
    warnings: z.array(z.string()),
    validationTimeMs: z.number(),
  });
  ```

- [ ] Integrate fallback strategy detection
  - Read `fallbackStrategy` from campaign set config
  - Classify errors based on whether fallback applies
  - Categories: FIELD_TOO_LONG can use truncate fallback, others skip

**Example Use Cases:**
1. Campaign set with 100 ads: 95 valid, 3 fallback (truncated headlines), 2 skipped (missing URLs)
2. All ads valid - show simple confirmation with green checkmark
3. High skip rate (>20%) - show warning banner recommending review

**Files to create/modify:**
- `apps/api/src/routes/campaign-sets.ts` - Add preview-sync route
- `apps/api/src/schemas/campaign-sets.ts` - Add preview schemas

---

### Phase 2: Preview Modal Component (Priority: HIGH)
**Why:** Core UI component users interact with before every sync

- [ ] Create `SyncPreviewModal` component
  - Path: `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SyncPreviewModal.tsx`
  - Displays breakdown summary with visual indicators
  - Three action buttons: "Review Issues", "Sync Now", "Cancel"

- [ ] Design breakdown display section
  ```tsx
  // Visual breakdown with color-coded badges
  <div className={styles.breakdownSection}>
    <h3>Sync Preview for "{campaignSetName}"</h3>
    <p>Total ads to process: {totalAds}</p>

    <div className={styles.breakdownItems}>
      <BreakdownItem
        icon="check-circle"
        label="Valid"
        count={valid}
        color="green"
        description="Will sync successfully"
      />
      <BreakdownItem
        icon="refresh"
        label="Fallback"
        count={fallback}
        color="yellow"
        description="Will use fallback ad"
        onClick={fallback > 0 ? () => setView('fallback') : undefined}
      />
      <BreakdownItem
        icon="skip-forward"
        label="Skipped"
        count={skipped}
        color="red"
        description="Will be skipped"
        onClick={skipped > 0 ? () => setView('skipped') : undefined}
      />
    </div>
  </div>
  ```

- [ ] Implement accessible modal with focus trap
  - Reuse patterns from existing `SyncProgressModal`
  - Keyboard navigation: Tab through items, Escape to close
  - Screen reader announcements for breakdown counts

- [ ] Add loading state while fetching preview
  - Skeleton UI matching breakdown layout
  - "Analyzing {totalAds} ads..." message

**Example Use Cases:**
1. User sees 950 valid, 30 fallback, 20 skipped at a glance
2. Clicking "30 fallback" opens drill-down view
3. User can return to summary view from drill-down

**Files to create:**
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SyncPreviewModal.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SyncPreviewModal.module.css`

---

### Phase 3: Drill-Down View (Priority: HIGH)
**Why:** Users need details to understand and fix issues

- [ ] Create `SkippedAdsTable` component
  - Path: `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SkippedAdsTable.tsx`
  - Columns: Product/Ad Name, Error Type, Field, Invalid Value
  - Sortable by error type for grouping similar issues
  - Paginated for large lists (50 items per page)

- [ ] Add error type filter
  ```tsx
  // Filter by error code
  const errorTypes = useMemo(() =>
    [...new Set(skippedAds.map(ad => ad.errorCode))],
    [skippedAds]
  );

  <Select
    label="Filter by error type"
    options={[
      { value: 'all', label: 'All errors' },
      ...errorTypes.map(code => ({
        value: code,
        label: getErrorLabel(code),
      })),
    ]}
    value={selectedErrorType}
    onChange={setSelectedErrorType}
  />
  ```

- [ ] Display field values with highlighting
  - Show truncated value with "..." if too long
  - Red underline on the specific field that failed
  - Tooltip with full value on hover

- [ ] Add "Back to Summary" navigation
  - Breadcrumb: "Preview > Skipped Ads (20)"
  - Back arrow button with keyboard shortcut (Backspace)

**Example Use Cases:**
1. User clicks "20 skipped" -> sees table with: "Nike Air Max", INVALID_URL, click_url, "not-a-url"
2. User filters by "FIELD_TOO_LONG" -> sees only headline overflow issues
3. User hovers on truncated value -> sees full 500 character headline

**Files to create:**
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SkippedAdsTable.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SkippedAdsTable.module.css`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/FallbackAdsTable.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/FallbackAdsTable.module.css`

---

### Phase 4: Quick Fix Actions (Priority: MEDIUM)
**Why:** Reduce friction in fix-and-retry workflow

- [ ] Add "Edit Campaign Set" link from preview
  - Opens campaign set editor in new tab (or side drawer)
  - Deep link to the specific campaign/ad group with issues
  - URL: `/{teamSlug}/campaign-sets/{setId}/edit?highlight=ad-{adId}`

- [ ] Implement "Fix and Re-validate" button
  - After editing, user returns to preview modal
  - Button triggers fresh `/preview-sync` call
  - Shows loading state, then updated breakdown

- [ ] Add field-level edit suggestions
  ```tsx
  // For FIELD_TOO_LONG errors
  {error.code === 'FIELD_TOO_LONG' && (
    <div className={styles.suggestion}>
      <p>Current length: {error.value?.length} / Max: {getMaxLength(error.field)}</p>
      <p>Suggestion: Shorten to {getMaxLength(error.field)} characters or enable auto-truncate</p>
    </div>
  )}
  ```

- [ ] Preserve modal state during navigation
  - Store preview data in session storage
  - Restore when user returns from edit page
  - Show "Re-validate" prompt after edit

**Example Use Cases:**
1. User sees skipped ad -> clicks "Edit" -> edits headline -> returns -> clicks "Re-validate"
2. System shows updated breakdown with that ad now in "valid" category
3. User proceeds with sync after fix

**Files to modify:**
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/SyncPreviewModal.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/[setId]/edit/page.tsx`

---

### Phase 5: Bypass Option (Priority: MEDIUM)
**Why:** Power users may want to proceed despite skipped ads

- [ ] Add "Sync Anyway" button for advanced users
  - Only shows when there are skipped ads
  - Styled as secondary/warning button
  - Positioned after primary actions

- [ ] Implement confirmation dialog
  ```tsx
  <ConfirmDialog
    isOpen={showBypassConfirm}
    title="Proceed with skipped ads?"
    message={`${skipped} ads will be skipped and will not appear in your campaign. This action cannot be undone.`}
    confirmLabel="Sync Anyway"
    confirmVariant="warning"
    onConfirm={handleBypassSync}
    onCancel={() => setShowBypassConfirm(false)}
  />
  ```

- [ ] Log bypass decisions for audit
  - Record when user chooses to bypass warnings
  - Include: userId, campaignSetId, skippedCount, timestamp
  - Useful for debugging "why didn't my ad sync?" support tickets

- [ ] Add "Don't show again" preference (optional)
  - User preference to skip preview for small skip counts (<5%)
  - Stored in user settings
  - Can be reset in settings page

**Example Use Cases:**
1. User has 5 skipped ads out of 1000 -> clicks "Sync Anyway" -> confirms -> sync proceeds
2. System logs: "User X bypassed preview with 5 skipped ads on set Y"
3. User later asks "why didn't ad Z sync?" -> support finds bypass log

**Files to create/modify:**
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/components/BypassConfirmDialog.tsx`
- `apps/api/src/routes/campaign-sets.ts` - Add bypass logging

---

### Phase 6: Integration and Polish (Priority: MEDIUM)
**Why:** Connect all pieces and ensure smooth UX

- [ ] Hook preview modal to sync button
  - Replace direct sync call with preview flow
  - Sync button click -> fetch preview -> show modal
  - If all valid and no fallback, still show brief confirmation

- [ ] Add API client method for preview
  ```typescript
  // apps/web/lib/api/campaign-sets.ts
  export async function previewSync(teamSlug: string, setId: string): Promise<SyncPreviewResponse> {
    const response = await api.post(`/api/v1/campaign-sets/${setId}/preview-sync`, {
      headers: { 'X-Team-Slug': teamSlug },
    });
    return response.json();
  }
  ```

- [ ] Handle preview errors gracefully
  - Network error: show retry button
  - Validation timeout: show partial results with warning
  - Campaign set not found: redirect to list with toast

- [ ] Add analytics events
  - Track: preview_opened, preview_drilldown, preview_fix_clicked, preview_bypassed, preview_synced
  - Measure: time spent on preview, conversion rate (preview -> sync)

**Files to modify:**
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/[setId]/page.tsx`
- `apps/web/lib/api/campaign-sets.ts`

---

## Not In Scope

### Frontend Optimizations
- Real-time validation as user edits campaign set
  - **Why:** Separate feature; preview is for pre-sync confirmation
- Inline editing within preview modal
  - **Why:** Too complex; link to edit page is sufficient for v1
- Bulk fix operations (fix all headlines at once)
  - **Why:** Future enhancement; single-item fixes first

### Backend Enhancements
- Caching preview results
  - **Why:** Adds complexity; preview is fast enough without cache
- Webhook notification when preview is ready
  - **Why:** Preview is synchronous; no need for async notification
- Historical preview comparison
  - **Why:** Nice-to-have for future; not core functionality

### Advanced Features
- AI-powered fix suggestions
  - **Why:** Significant scope; manual suggestions sufficient for v1
- Preview diff from last sync
  - **Why:** Requires sync history tracking; out of scope
- Batch preview across multiple campaign sets
  - **Why:** Edge case; single-set preview is the primary use case

---

## Implementation Plan

| Step | Task | Time Estimate | Dependencies |
|------|------|---------------|--------------|
| 1 | Define `SyncPreviewResponse` schema | 1 hour | None |
| 2 | Implement `/preview-sync` endpoint | 3-4 hours | Step 1, fallback-ad-system |
| 3 | Create `SyncPreviewModal` component shell | 2-3 hours | Step 2 |
| 4 | Implement breakdown display with styling | 2-3 hours | Step 3 |
| 5 | Create `SkippedAdsTable` component | 3-4 hours | Step 3 |
| 6 | Create `FallbackAdsTable` component | 2-3 hours | Step 5 |
| 7 | Add error type filtering | 1-2 hours | Step 5 |
| 8 | Implement "Edit" deep link | 2-3 hours | Step 5 |
| 9 | Add "Fix and Re-validate" flow | 2-3 hours | Step 8 |
| 10 | Create bypass confirmation dialog | 1-2 hours | Step 3 |
| 11 | Add bypass logging | 1 hour | Step 10 |
| 12 | Hook modal to sync button | 2-3 hours | Steps 3, 4, 5 |
| 13 | Add loading and error states | 1-2 hours | Step 12 |
| 14 | Write unit tests for preview endpoint | 2-3 hours | Step 2 |
| 15 | Write component tests | 3-4 hours | Steps 3-6 |
| 16 | Accessibility audit and fixes | 2-3 hours | Steps 3-6 |
| 17 | Performance testing (1000 ads) | 1-2 hours | Step 2 |

**Total estimated time:** 32-42 hours

---

## Definition of Done

- [ ] `/preview-sync` endpoint returns accurate breakdown of valid/fallback/skipped ads
- [ ] `SyncPreviewModal` displays breakdown with clickable drill-down links
- [ ] `SkippedAdsTable` shows product name, error type, field, and invalid value
- [ ] Error type filter works correctly, filtering displayed items
- [ ] "Edit Campaign Set" link opens editor with correct deep link
- [ ] "Fix and Re-validate" triggers fresh preview and updates modal
- [ ] "Sync Anyway" bypass shows confirmation and logs decision
- [ ] Preview loads in < 2 seconds for 1000 ads
- [ ] Modal is keyboard navigable and screen reader accessible
- [ ] Unit tests cover endpoint with various validation scenarios
- [ ] Component tests cover modal states and interactions
- [ ] Integration with sync button is seamless (no regressions)

---

## Notes

### Tech Stack Details

| Layer | Technology | Relevant Files |
|-------|------------|----------------|
| API Endpoint | Hono, Zod | `apps/api/src/routes/campaign-sets.ts` |
| Validation | SyncValidationService | `packages/core/src/campaign-set/validation/` |
| Frontend | React, Next.js | `apps/web/app/[locale]/[teamSlug]/campaign-sets/` |
| Styling | CSS Modules | `*.module.css` files |
| API Client | fetch wrapper | `apps/web/lib/api/campaign-sets.ts` |

### Design Principles

1. **Progressive Disclosure** - Show summary first, details on demand
2. **Actionable Information** - Every error should have a clear fix path
3. **Non-Blocking** - Preview should not prevent sync if user chooses to proceed
4. **Performance** - Preview must be fast to avoid user frustration
5. **Consistency** - Follow existing modal patterns from `SyncProgressModal`

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| fallback-ad-system | Required | Needed to classify which ads use fallback vs skip |
| dynamic-content-length-estimation | Required | Needed to predict which fields will exceed limits |
| sync-validation-service | Complete | Provides underlying validation logic |

### Best Practices

- Use optimistic UI updates where possible (show expected state)
- Cache validation results in component state during session
- Debounce re-validate calls if user makes rapid edits
- Show skeleton UI during loading instead of spinner
- Use toast notifications for success/error feedback
- Log all user actions for debugging support tickets

---

## Next Steps (Future Iterations)

1. **Phase 2:** Real-time validation in campaign set wizard
2. **Phase 3:** Bulk fix operations for common errors
3. **Phase 4:** AI-powered fix suggestions (auto-shorten headlines)
4. **Phase 5:** Preview comparison with last successful sync
5. **Phase 6:** Email notification when preview has high skip rate
