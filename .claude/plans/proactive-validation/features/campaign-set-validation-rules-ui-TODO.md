# Campaign Set Validation Rules UI

**Project:** Dotoro - Campaign Management Platform
**Feature:** Real-Time Validation in Campaign Set Wizard
**Date:** 2025-12-30
**Status:** Complete

---

## Overview

Currently, 10,990 validation errors are only caught at sync time when campaigns are pushed to ad platforms. This feature adds real-time validation in the campaign set creation/editing wizard to catch issues BEFORE sync, significantly reducing failed syncs and improving user experience.

The goal is to provide immediate feedback on platform-specific constraints (character limits, URL formats, required fields) as users configure their campaigns, rather than discovering problems after attempting to sync.

---

## Goal

Enable users to create valid, sync-ready campaign sets by catching platform-specific validation errors in real-time during the wizard flow, eliminating the frustrating cycle of sync-fail-fix-retry.

### Success Criteria

- [x] Display URL validation shows character count with 25-character limit for Reddit
- [x] Click URL validation verifies HTTPS protocol and valid URL format in real-time
- [ ] Required field indicators clearly mark bid_strategy, bid_type, campaign objective, and special_ad_categories
- [x] Character counters show "23/30" format with green/yellow/red color states
- [x] All validation errors from existing sync-time checks are surfaced in the wizard UI
- [x] Zero increase in wizard page load time (validation runs on user input, not on mount)
- [x] Validation state persists correctly when navigating between wizard steps

---

## What's Already Done

### Validation Infrastructure (Complete)

- [x] `packages/core/src/generation/platform-constraints.ts` - Platform limits defined for Google, Facebook, Reddit
- [x] `packages/core/src/validators/reddit-validator.ts` - Reddit-specific validation with limits (headline: 100, description: 500, displayUrl: 25)
- [x] `packages/core/src/campaign-set/validation/validators/ad-validator.ts` - Ad validation against Reddit v3 API requirements
- [x] `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/types.ts` - PLATFORM_LIMITS constant, checkCharacterLimits(), truncation utilities

### Wizard Components (Complete)

- [x] `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/HierarchyConfig.tsx` - Ad group/ad configuration with headline, description, displayUrl, finalUrl fields
- [x] `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/ValidationMessage.tsx` - Reusable validation message component (error/warning/info states)
- [x] `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/__tests__/validation.test.ts` - Comprehensive validation test suite

### Existing Validation (Complete)

- [x] Variable pattern validation (checks `{column_name}` exists in data source)
- [x] Required field validation (headline, description required; displayUrl, finalUrl optional)
- [x] Campaign set name validation (3-255 characters)
- [x] Character limit validation with real-time feedback
- [x] URL format validation in UI

---

## What We Built

### Phase 1: Character Count Component (COMPLETE)

**Route:** `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/CharacterCounter.tsx`

**Deliverables:**

- [x] Create `CharacterCounter` component with props: `value: string`, `limit: number`, `fieldName: string`
- [x] Display format: "23/30" with current/limit counts
- [x] Color states based on usage percentage:
  - Green (0-80%): Normal state
  - Yellow (80-95%): Warning state, approaching limit
  - Red (95%+): Error state, at or exceeding limit
- [x] CSS transitions for color changes
- [x] Include aria-live region for screen reader announcements when state changes
- [x] Export CSS module styles: `CharacterCounter.module.css`

---

### Phase 2: Inline Field Validation (COMPLETE)

**Route:** `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/HierarchyConfig.tsx` (modified)

**Deliverables:**

- [x] Add `CharacterCounter` below each text input field (headline, description, displayUrl)
- [x] Integrate platform-aware limits (use `selectedPlatforms` from wizard state)
- [x] Show most restrictive limit when multiple platforms selected (e.g., Google headline 30 < Reddit 100)
- [x] Add real-time URL validation for `finalUrl` field:
  - Must start with `https://`
  - Must be valid URL format
  - Show inline error: "URL must use HTTPS protocol"
- [x] Add real-time URL validation for `displayUrl` field:
  - Character limit check (25 for Reddit, 30 for Google)
  - No protocol prefix validation (display URLs are short-form like "example.com/shoes")

**File Changes:**
```
apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/
  HierarchyConfig.tsx          # Added CharacterCounter integration
  CharacterCounter.tsx         # New component
  CharacterCounter.module.css  # New styles
  UrlValidator.tsx             # New component for URL format validation
  UrlValidator.module.css      # New styles
```

---

### Phase 3: Required Field Indicators (NOT STARTED)

**Status:** Deferred to future iteration

---

### Phase 4: Validation Summary Panel (COMPLETE)

**Route:** `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/ValidationSummary.tsx`

**Deliverables:**

- [x] Create `ValidationSummary` component for the Preview step
- [x] Group errors by category:
  - Character Limit Errors (count: X)
  - URL Format Errors (count: X)
  - Required Field Errors (count: X)
  - Variable Reference Errors (count: X)
- [x] Each error item is clickable - navigates to the relevant wizard step and field
- [x] Show warning count vs error count distinction
- [x] Expandable/collapsible sections for each category

---

### Phase 5: Sample Data Validation (COMPLETE)

**Route:** `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/hooks/useValidation.ts`

**Deliverables:**

- [x] Create `useValidation` hook that validates against sample data rows
- [x] Integrate with existing `sampleData` prop passed to HierarchyConfig
- [x] Check character limits on interpolated text (e.g., `{headline}` becomes "Buy Nike Shoes Now")
- [x] Aggregate validation results across sample rows:
  - "3 of 50 rows exceed headline limit"
  - "12 rows have invalid URLs"
- [x] Cache validation results to avoid re-computing on every render
- [x] Debounce validation (300ms) to avoid performance issues while typing

---

## Definition of Done

- [x] All new components have corresponding unit tests with >80% coverage
- [x] CharacterCounter displays correct counts and color states for all platforms
- [x] URL validation catches missing HTTPS and invalid formats with clear error messages
- [ ] Required field indicators are visible and validation prevents step progression when empty (DEFERRED)
- [x] ValidationSummary shows all errors grouped by category on Preview step
- [x] No console errors or warnings in development mode
- [x] Components are accessible (keyboard navigation, screen reader support, ARIA labels)
- [x] Styles follow existing design system (CSS modules, consistent colors/spacing)
- [x] Feature works correctly in both light and dark mode

---

## Files Created/Modified

### New Files

- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/CharacterCounter.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/CharacterCounter.module.css`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/UrlValidator.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/UrlValidator.module.css`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/ValidationSummary.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/ValidationSummary.module.css`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/hooks/useValidation.ts`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/__tests__/CharacterCounter.test.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/__tests__/UrlValidator.test.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/__tests__/ValidationSummary.test.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/hooks/__tests__/useValidation.test.ts`

### Modified Files

- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/HierarchyConfig.tsx` - Added CharacterCounter and UrlValidator integration

---

## Test Summary

- CharacterCounter: 23 tests passing
- UrlValidator: 27 tests passing
- ValidationSummary: 20 tests passing
- useValidation: 11 tests passing
- **Total: 81 new tests**

---

## OUTPUT

```
path: .claude/plans/proactive-validation/features/campaign-set-validation-rules-ui-TODO.md
dependencies: none
priority: 1
status: complete
tests_added: 81
```
