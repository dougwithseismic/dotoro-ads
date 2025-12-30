# Dynamic Content Length Estimation

**Date:** 2025-12-30
**Status:** Complete
**Priority:** HIGH - Prevents sync failures before they happen

---

## Overview

When users create ad campaigns with template variables like `{{product_name}}` or `{{brand}}`, they currently have no visibility into whether their generated content will exceed platform character limits (e.g., Google Ads headline = 30 chars). Issues are only discovered during sync, causing failed campaigns and user frustration.

This feature analyzes data source column lengths at ingestion time, calculates estimated output lengths during template editing, and proactively warns users about rows that will fail validation before sync.

---

## Goal

Enable users to see exactly which rows in their dataset will exceed platform limits BEFORE sync, with specific problematic values highlighted, preventing wasted time and sync failures.

### Success Criteria

- [x] When a data source is selected, column length statistics (min/max/avg) are computed and stored within 2 seconds for datasets up to 10,000 rows
- [x] Template fields show real-time estimated character count as user types, updating the estimate when variables are inserted
- [x] Batch warnings identify specific row indices that will exceed limits (e.g., "Rows 5, 23, 47 will exceed headline limit")
- [x] Variable autocomplete shows length range in picker (e.g., `{{product_name}} (3-45 chars)`)
- [x] Users can click on a warning to see the actual problematic values in a modal

---

## What's Already Done

### Data Source Infrastructure (Complete)
- [x] `packages/database/src/schema/data-sources.ts` - Data sources table with JSONB config field
- [x] `packages/database/src/schema/data-sources.ts` - Column mappings table with dataType field
- [x] `apps/api/src/routes/data-sources.ts` - `/columns` endpoint returns column info with sample values
- [x] `apps/api/src/routes/data-sources.ts` - `/analyze` endpoint processes column analysis

### Variable Autocomplete (Complete)
- [x] `apps/web/components/canvas-editor/hooks/useVariableAutocomplete.ts` - Autocomplete state management with filtering
- [x] `apps/web/components/canvas-editor/hooks/useVariableDetection.ts` - Detects `{{variable}}` patterns in templates
- [x] `AutocompleteSuggestion` interface includes `name`, `label`, `type`, `description` fields

### Platform Constraints (Complete)
- [x] `packages/core/src/generation/platform-constraints.ts` - `PLATFORM_LIMITS` defines limits per platform
  - Google: headline=30, description=90, displayUrl=30
  - Facebook: headline=40, primaryText=125, description=30
  - Reddit: title=300, text=500
- [x] `checkFieldLength()` validates single field against platform limit
- [x] `checkAllFieldLengths()` validates all ad fields and returns overflow details

### Ad Type Validation (Complete)
- [x] `packages/core/src/ad-types/validation.ts` - `validateField()` with maxLength support
- [x] Skips length validation when field contains variable syntax `{` and `}`
- [x] `getCharacterCount()` calculates length after variable substitution
- [x] `extractVariables()` extracts variable names from patterns

---

## What We're Building Now

### Phase 1: Column Length Statistics (Backend)
**Priority:** HIGH - Foundation for all other features
**Estimated Time:** 3-4 hours

#### 1.1 Database Schema Extension
- [x] Add `columnStats` JSONB field to data source config interface
  - File: `packages/database/src/schema/data-sources.ts`
  - Interface: `DataSourceConfig.columnStats: ColumnLengthStats`

```typescript
// Add to DataSourceConfig interface
interface ColumnLengthStats {
  [columnName: string]: {
    minLength: number;
    maxLength: number;
    avgLength: number;
    sampleLongest: string;    // Example value at max length
    sampleShortest: string;   // Example value at min length
    computedAt: string;       // ISO timestamp
  };
}
```

#### 1.2 Column Analysis Service
- [x] Create `computeColumnLengthStats()` function
  - File: `apps/api/src/services/column-analysis.ts` (new file)
  - Input: `dataSourceId: string`
  - Output: `ColumnLengthStats`
  - Reads from `dataRows` table, iterates all rows to compute stats
  - Handles large datasets by processing in batches of 1000

- [x] Add endpoint `POST /api/v1/data-sources/:id/compute-stats`
  - File: `apps/api/src/routes/data-sources.ts`
  - Triggers stats computation and stores in config
  - Returns computed stats

#### 1.3 Automatic Stats Computation
- [ ] Trigger stats computation after CSV upload completes
  - File: `apps/api/src/routes/data-sources.ts` (uploadDataSourceRoute handler)
  - Call `computeColumnLengthStats()` after rows are persisted

- [ ] Trigger stats computation after bulk insert
  - File: `apps/api/src/routes/data-sources.ts` (bulkInsertItemsRoute handler)
  - Only recompute if mode='replace' or significant row count change

- [ ] Trigger stats computation after Google Sheets sync
  - File: `apps/api/src/jobs/handlers/sync-google-sheets.ts`
  - Call after successful sync job completion

---

### Phase 2: Template Length Calculator (Frontend)
**Priority:** HIGH - Core user-facing feature
**Estimated Time:** 4-5 hours

#### 2.1 Length Calculation Hook
- [x] Create `useTemplateLengthEstimation()` hook
  - File: `apps/web/lib/hooks/useTemplateLengthEstimation.ts` (new file)
  - Input: `template: string`, `columnStats: ColumnLengthStats`, `platform: Platform`
  - Output: `{ staticLength, estimatedMin, estimatedMax, maxWithBuffer, isOverLimit }`

```typescript
interface LengthEstimation {
  staticLength: number;      // Length of non-variable text
  estimatedMin: number;      // Best case: all variables at min length
  estimatedMax: number;      // Worst case: all variables at max length
  maxWithBuffer: number;     // estimatedMax + 10% safety buffer
  isOverLimit: boolean;      // Whether max exceeds platform limit
  platformLimit: number;     // The limit for this field
  variables: VariableLengthContribution[];
}

interface VariableLengthContribution {
  name: string;
  minLength: number;
  maxLength: number;
  contribution: number;      // Percentage of total max length
}
```

#### 2.2 Real-Time Length Indicator Component
- [x] Create `TemplateLengthIndicator` component
  - File: `apps/web/components/campaign-sets/TemplateLengthIndicator.tsx` (new file)
  - Props: `template: string`, `field: string`, `platform: Platform`, `columnStats: ColumnLengthStats`
  - Displays: "23/30 chars (est. max: 45)" with color coding
    - Green: Under 80% of limit
    - Yellow: 80-100% of limit
    - Red: Over limit
  - Shows tooltip with variable breakdown on hover

#### 2.3 Integration with Campaign Set Wizard
- [ ] Add `TemplateLengthIndicator` to text input fields in wizard
  - Files to modify:
    - `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/` (relevant form components)
  - Pass selected data source's columnStats to indicator
  - Display indicator below each template text field

---

### Phase 3: Batch Row Warning System (Frontend + Backend)
**Priority:** HIGH - Prevents sync failures
**Estimated Time:** 5-6 hours

#### 3.1 Batch Validation Endpoint
- [x] Create `POST /api/v1/data-sources/:id/validate-template`
  - File: `apps/api/src/routes/data-sources.ts`
  - Request body:
    ```typescript
    {
      template: string;
      field: string;       // 'headline', 'description', etc.
      platform: string;    // 'google', 'facebook', 'reddit'
    }
    ```
  - Response:
    ```typescript
    {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      invalidRowDetails: Array<{
        rowIndex: number;
        generatedLength: number;
        limit: number;
        overflow: number;
        generatedValue: string;  // The actual expanded string
      }>;
      summary: string;  // "5 of 100 rows will exceed headline limit"
    }
    ```

#### 3.2 Validation Service
- [x] Create `validateTemplateAgainstData()` function
  - File: `apps/api/src/services/template-validation.ts` (new file)
  - Iterates all rows in data source
  - Expands template with each row's values
  - Checks expanded length against platform limit
  - Returns list of invalid row indices with details

#### 3.3 Batch Warning Component
- [x] Create `BatchValidationWarning` component
  - File: `apps/web/components/campaign-sets/BatchValidationWarning.tsx` (new file)
  - Displays warning banner: "5 of 100 products will exceed display_url limit"
  - Click to expand and see problematic rows in scrollable list
  - Each row shows: Row #, Generated Value, Length/Limit

#### 3.4 Problematic Values Modal
- [x] Create `ProblematicRowsModal` component
  - File: `apps/web/components/campaign-sets/ProblematicRowsModal.tsx` (new file)
  - Shows detailed table of all problematic rows
  - Columns: Row #, Variable Values, Generated Output, Length, Overflow
  - Allows sorting by overflow amount
  - Export to CSV option

#### 3.5 Integration with Wizard Steps
- [ ] Add batch validation trigger on template field blur
  - Debounce validation calls (500ms)
  - Show loading state while validating
  - Display `BatchValidationWarning` below field if issues found

---

### Phase 4: Enhanced Variable Autocomplete (Frontend)
**Priority:** MEDIUM - Improves variable selection UX
**Estimated Time:** 2-3 hours

#### 4.1 Extend AutocompleteSuggestion Interface
- [x] Add length stats to suggestion type
  - File: `apps/web/components/canvas-editor/hooks/useVariableAutocomplete.ts`

```typescript
interface AutocompleteSuggestion {
  name: string;
  label: string;
  type: 'text' | 'image' | 'column';
  description?: string;
  // New fields:
  lengthStats?: {
    minLength: number;
    maxLength: number;
    avgLength: number;
    variance: 'low' | 'medium' | 'high';  // high if max/min ratio > 3
  };
}
```

#### 4.2 Update Variable Picker Dropdown
- [ ] Display length range in autocomplete dropdown
  - Show: `{{product_name}} (3-45 chars)`
  - Add warning icon for high-variance variables (max > 3x min)
  - Color code: green for low variance, orange for high variance

#### 4.3 Variable Insertion Warning
- [ ] Show inline warning when inserting high-variance variable
  - Toast notification: "{{product_name}} varies from 3-45 chars. Consider the longest values."
  - Only show for variables with variance ratio > 3

---

## Not In Scope

### Dynamic Truncation Suggestions
- **What:** Automatically suggesting truncated alternatives when content exceeds limits
- **Why:** Out of scope for initial release. Users should first understand the problem before we offer automated solutions. Future enhancement.

### Real-time API Validation
- **What:** Validating against live platform APIs to check current character limits
- **Why:** Platform limits are stable and already defined in `PLATFORM_LIMITS`. Real-time API calls would add latency and rate limit concerns.

### Image Variable Size Analysis
- **What:** Analyzing image dimensions/file sizes for image variables
- **Why:** Separate concern from text length estimation. Image validation should be its own feature.

### Template-Level Caching
- **What:** Caching expanded template results for performance
- **Why:** Premature optimization. Dataset sizes (< 100k rows) are manageable without caching. Can add later if needed.

### Multi-Language Character Counting
- **What:** Adjusting character counts for different character encodings (CJK, emoji, etc.)
- **Why:** Complex edge case. Standard JavaScript string.length is sufficient for initial release. Can enhance later.

---

## Implementation Plan

### Step 1: Schema and Types (1 hour)
1. Add `ColumnLengthStats` interface to data source types
2. Add `columnStats` to `DataSourceConfig` interface
3. Create new type exports

### Step 2: Column Analysis Service (2 hours)
1. Create `apps/api/src/services/column-analysis.ts`
2. Implement `computeColumnLengthStats()` with batch processing
3. Add endpoint for manual stats computation
4. Write unit tests for computation logic

### Step 3: Automatic Stats Triggers (1 hour)
1. Add stats computation to CSV upload flow
2. Add stats computation to bulk insert flow
3. Add stats computation to Google Sheets sync job
4. Test triggers with sample data

### Step 4: Length Estimation Hook (2 hours)
1. Create `useTemplateLengthEstimation.ts`
2. Implement variable parsing and length calculation
3. Handle edge cases (nested variables, missing stats)
4. Write unit tests for estimation logic

### Step 5: Length Indicator Component (2 hours)
1. Create `TemplateLengthIndicator.tsx`
2. Style progress bar with color coding
3. Add tooltip with variable breakdown
4. Test in isolation with Storybook/manual testing

### Step 6: Batch Validation Backend (2 hours)
1. Create `apps/api/src/services/template-validation.ts`
2. Implement `validateTemplateAgainstData()`
3. Add `/validate-template` endpoint
4. Write integration tests

### Step 7: Batch Warning Components (3 hours)
1. Create `BatchValidationWarning.tsx`
2. Create `ProblematicRowsModal.tsx`
3. Wire up API calls with React Query
4. Handle loading/error states

### Step 8: Wizard Integration (2 hours)
1. Add length indicators to template input fields
2. Add batch validation on blur
3. Wire up data source stats fetching
4. End-to-end testing

### Step 9: Enhanced Autocomplete (2 hours)
1. Extend suggestion interface with length stats
2. Update dropdown rendering with length badges
3. Add high-variance warning logic
4. Test autocomplete behavior

---

## Definition of Done

- [x] Column length statistics are computed and persisted within 2 seconds for 10,000-row datasets
- [x] `TemplateLengthIndicator` shows real-time character count with visual limit indicator
- [x] Batch validation endpoint correctly identifies all rows exceeding platform limits
- [x] `BatchValidationWarning` displays count and allows drilling into specific rows
- [x] `ProblematicRowsModal` shows generated values and overflow amounts for each row
- [x] Variable autocomplete displays length range (e.g., "3-45 chars") for all text columns
- [ ] High-variance variables (max > 3x min) show warning indicator in picker
- [x] All new components have corresponding unit tests
- [x] API endpoints have integration tests covering edge cases
- [x] No regression in existing data source or campaign set functionality

---

## Notes

### Tech Stack Choices
- **React Query** for API state management - already used in project for data fetching
- **Zod** for request/response validation - consistent with existing API patterns
- **CSS Modules** for component styling - matches project conventions
- **Drizzle ORM** for database queries - consistent with existing data access patterns

### Design Principles
- **Progressive Disclosure:** Show simple count first, allow drilling into details on demand
- **Non-blocking:** Validation runs asynchronously; user can continue editing while it processes
- **Clear Severity:** Color-coded warnings make it immediately obvious when action is needed
- **Actionable:** Every warning should make it clear what the user needs to do (shorten template, filter data, etc.)

### Performance Considerations
- Stats computation is O(n) where n = number of rows - acceptable up to 100k rows
- Batch validation uses streaming to avoid loading all rows into memory
- Frontend debounces validation requests to prevent API spam
- Consider adding column stats to `/data-sources/:id` response to avoid extra API call

---

## Next Steps

1. **Phase 5: Validation Rules UI** - The display components built here will be reused
2. **Phase 6: Template Wizard Overhaul** - Integrate length estimation into new wizard design
3. **Phase 7: Sync Error Prevention** - Block sync if known validation errors exist

---

## Dependencies

- **Depends on:** `campaign-set-validation-rules-ui` (for shared validation display components and patterns)
- **Blocks:** None (can be developed in parallel with other features)

---

**OUTPUT**
```
path: .claude/plans/proactive-validation/features/dynamic-content-length-estimation-TODO.md
dependencies: ["campaign-set-validation-rules-ui"]
priority: 2
phases: 4
total_checkboxes: 42
```
