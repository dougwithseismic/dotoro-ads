# Campaign Sets - Data Persistence, Edit View & Error Handling

**Date:** 2025-12-27
**Status:** Planning

---

## Goal

Enable complete campaign set lifecycle management by implementing data persistence for all wizard configuration, building an edit view that mirrors the creation experience, and adding robust error handling with clear user feedback.

### Success Criteria

- [ ] All campaign set configuration (name patterns, ad groups, ads, keywords, budgets) is persisted to the database and can be retrieved
- [ ] Users can edit existing campaign sets through a wizard interface at `/campaign-sets/[setId]/edit`
- [ ] Edit view loads existing configuration and displays the full hierarchy (campaigns, ad groups, ads, keywords)
- [ ] Form validation errors trigger smooth scrolling to the error location with clear messaging
- [ ] All required fields have proper validation with user-friendly error messages

---

## What's Already Done

### Database Schema (Complete)

- [x] `campaign_sets` table with `config` JSONB column storing `CampaignSetConfig`
  - File: `packages/database/src/schema/campaign-sets.ts`
  - Stores: `dataSourceId`, `campaignConfig`, `hierarchyConfig`, `selectedPlatforms`, `budgetConfig`, etc.
- [x] `generated_campaigns` table with relationships to campaign sets
- [x] `ad_groups`, `ads`, `keywords` tables with proper foreign keys
- [x] Campaign set status and sync status enums

### API Routes (Complete)

- [x] CRUD endpoints for campaign sets at `/api/v1/campaign-sets`
  - File: `apps/api/src/routes/campaign-sets.ts`
  - `GET /api/v1/campaign-sets` - List with pagination
  - `POST /api/v1/campaign-sets` - Create with config
  - `GET /api/v1/campaign-sets/{setId}` - Get with full hierarchy
  - `PUT /api/v1/campaign-sets/{setId}` - Update
  - `DELETE /api/v1/campaign-sets/{setId}` - Delete
- [x] Campaign generation endpoint: `POST /api/v1/campaign-sets/{setId}/generate`
- [x] Sync, pause, resume endpoints

### Creation Wizard (Complete)

- [x] Accordion-based wizard at `apps/web/app/campaign-sets/new/`
  - File: `apps/web/app/campaign-sets/new/components/CampaignEditor.tsx`
- [x] Campaign set name and description input
- [x] Data source selection with column discovery
- [x] Campaign name pattern configuration
- [x] Hierarchy configuration (ad groups, ads, keywords)
- [x] Platform selection with per-platform budgets
- [x] Live preview panel with hierarchy visualization
- [x] Session persistence via `useWizardPersistence` hook
- [x] Generation preview with stats

### Detail View (Complete)

- [x] Campaign set detail page at `/campaign-sets/[setId]`
  - File: `apps/web/app/campaign-sets/[setId]/page.tsx`
- [x] Campaign hierarchy display via `CampaignHierarchyView`
- [x] Sync, pause, resume action buttons
- [x] Summary statistics display

### Validation (Partial)

- [x] Client-side validation for wizard steps
  - File: `apps/web/app/campaign-sets/new/types.ts`
  - Functions: `validateCampaignConfig`, `validateHierarchyConfig`, `validatePlatformSelection`
- [x] API-level Zod schema validation
  - File: `apps/api/src/schemas/campaign-sets.ts`

---

## What We're Building Now

### Phase 1: Enhanced Data Persistence (Priority: HIGH)

**Why:** The wizard saves campaign sets but the config may not capture all editable fields needed for round-trip editing.

#### 1.1 Extend CampaignSetConfig Schema

- [ ] Audit `CampaignSetConfig` interface for missing wizard state fields
  - File: `packages/database/src/schema/campaign-sets.ts` (lines 102-154)
  - Ensure all `WizardState` fields are captured (e.g., `threadConfig` for Reddit, `targetingConfig`)
- [ ] Add `inlineRules` to config if not already persisted correctly
- [ ] Add `platformBudgets` as Record<Platform, BudgetConfig> (currently flattened)
- [ ] Add `selectedAdTypes` mapping per platform

**Example Use Cases:**
1. User creates a campaign set with Google + Reddit, each with different budgets
2. User adds inline data transformation rules during creation
3. User configures targeting options that should persist for editing

#### 1.2 Update API to Persist Complete Config

- [ ] Modify `POST /api/v1/campaign-sets` to validate all config fields
  - File: `apps/api/src/routes/campaign-sets.ts` (line 776)
- [ ] Ensure `PUT /api/v1/campaign-sets/{setId}` can update partial config
  - File: `apps/api/src/routes/campaign-sets.ts` (line 871)
- [ ] Add migration if schema changes are needed
  - Directory: `packages/database/drizzle/`

**API Schema Example:**
```typescript
// apps/api/src/schemas/campaign-sets.ts
export const campaignSetConfigSchema = z.object({
  // ... existing fields
  platformBudgets: z.record(platformSchema, budgetConfigSchema.nullable()).optional(),
  targetingConfig: z.record(z.unknown()).optional(),
  threadConfig: threadConfigSchema.optional(),
});
```

---

### Phase 2: Edit View Implementation (Priority: HIGH)

**Why:** Users currently have no way to modify campaign set configurations after creation.

#### 2.1 Create Edit Page Route

- [ ] Create edit page at `apps/web/app/campaign-sets/[setId]/edit/page.tsx`
- [ ] Create loading state at `apps/web/app/campaign-sets/[setId]/edit/loading.tsx`
- [ ] Implement data fetching for existing campaign set

**File Structure:**
```
apps/web/app/campaign-sets/[setId]/edit/
  page.tsx          # Main edit page
  loading.tsx       # Loading skeleton
  EditCampaignSet.tsx  # Client component wrapper
```

#### 2.2 Create Reusable CampaignEditor Component

- [ ] Refactor `CampaignEditor.tsx` to accept optional `initialData` prop
  - File: `apps/web/app/campaign-sets/new/components/CampaignEditor.tsx`
- [ ] Add `mode` prop: `'create' | 'edit'`
- [ ] Add `campaignSetId` prop for edit mode
- [ ] Update form submission to use `PUT` for edit, `POST` for create
- [ ] Handle "Save" vs "Create" button text based on mode

**Component Props:**
```typescript
interface CampaignEditorProps {
  mode: 'create' | 'edit';
  campaignSetId?: string;
  initialData?: CampaignSet;
  onSaveComplete?: (result: CampaignSet) => void;
}
```

#### 2.3 Implement Config-to-WizardState Mapping

- [ ] Create `mapConfigToWizardState(config: CampaignSetConfig): WizardState` utility
  - File: `apps/web/app/campaign-sets/new/utils/config-mapper.ts`
- [ ] Handle missing/null fields with sensible defaults
- [ ] Preserve IDs for ad groups and ads during editing

**Example Mapping:**
```typescript
// apps/web/app/campaign-sets/new/utils/config-mapper.ts
export function mapConfigToWizardState(
  campaignSet: CampaignSet
): Partial<WizardState> {
  const { config, name, description } = campaignSet;
  return {
    campaignSetName: name,
    campaignSetDescription: description ?? '',
    dataSourceId: config.dataSourceId,
    campaignConfig: { namePattern: config.campaignConfig.namePattern },
    hierarchyConfig: {
      adGroups: config.hierarchyConfig.adGroups.map(ag => ({
        id: generateId(),
        namePattern: ag.namePattern,
        keywords: ag.keywords ?? [],
        ads: ag.ads.map(ad => ({
          id: generateId(),
          headline: ad.headline ?? '',
          description: ad.description ?? '',
          // ...
        })),
      })),
    },
    selectedPlatforms: config.selectedPlatforms as Platform[],
    // ...
  };
}
```

#### 2.4 Display Existing Hierarchy in Edit Mode

- [ ] Fetch generated campaigns with full hierarchy via `GET /api/v1/campaign-sets/{setId}`
- [ ] Display campaigns/ad groups/ads in the preview panel
- [ ] Allow editing of generated campaign names (if they differ from patterns)
- [ ] Show sync status for each campaign

**Example Use Cases:**
1. User opens edit view, sees all 50 generated campaigns in preview
2. User modifies ad group name pattern, preview updates in real-time
3. User changes an ad headline, only that ad is marked as "modified"

#### 2.5 Handle Edit Mode Navigation

- [ ] Update detail page "Edit" button to navigate to edit route
  - File: `apps/web/app/campaign-sets/[setId]/page.tsx` (line 117)
- [ ] Add "Cancel" button to return to detail view
- [ ] Add "Save Changes" button that updates campaign set
- [ ] Show confirmation dialog if navigating away with unsaved changes

---

### Phase 3: Error Handling & Validation UX (Priority: MEDIUM)

**Why:** Current validation exists but errors don't scroll into view and messages could be clearer.

#### 3.1 Implement Scroll-to-Error Behavior

- [ ] Create `useScrollToError` hook
  - File: `apps/web/app/campaign-sets/new/hooks/useScrollToError.ts`
- [ ] Integrate with form submission in `CampaignEditor`
- [ ] Auto-expand collapsed accordion section containing error
- [ ] Smooth scroll to first error field

**Hook API:**
```typescript
function useScrollToError(errors: ValidationResult) {
  const scrollToFirstError = useCallback(() => {
    const firstErrorField = findFirstErrorElement(errors);
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorField.focus();
    }
  }, [errors]);

  return { scrollToFirstError };
}
```

#### 3.2 Enhance Validation Messages

- [ ] Add field-level validation state to form inputs
- [ ] Display inline error messages below each field
- [ ] Style error states consistently (red border, icon)
- [ ] Add aria-describedby for accessibility

**Component Updates:**
```typescript
// Update input components to accept error state
interface InputProps {
  error?: string;
  touched?: boolean;
}

// VariableAutocomplete, CampaignSetName, etc.
```

#### 3.3 Campaign Set Name Validation

- [ ] Show inline error if name is empty on blur
- [ ] Show inline error if name is less than 3 characters
- [ ] Block form submission with focused error message
- [ ] Server-side validation for duplicate names (optional)

#### 3.4 API Error Display

- [ ] Parse API error responses for user-friendly messages
  - File: `apps/web/lib/api-client.ts`
- [ ] Display validation errors from Zod in a structured way
- [ ] Handle network errors gracefully
- [ ] Add retry logic for transient failures

**Error Display Example:**
```typescript
// Handle structured API errors
if (error instanceof ApiError) {
  const data = error.data as { errors?: Array<{ field: string; message: string }> };
  if (data?.errors) {
    // Map errors to form fields
    setFieldErrors(data.errors);
  } else {
    setGeneralError(error.message);
  }
}
```

---

## Not In Scope

### Bulk Campaign Editing

- **What:** Editing multiple campaigns at once
- **Why:** Adds complexity; focus on single campaign set editing first
- **When:** Future phase after edit view is stable

### Campaign Regeneration

- **What:** Regenerating campaigns after editing config
- **Why:** Requires careful handling of existing synced campaigns
- **When:** After sync status management is more mature

### Real-time Collaboration

- **What:** Multiple users editing same campaign set
- **Why:** Requires WebSocket infrastructure and conflict resolution
- **When:** Not planned for near-term

### Template Management

- **What:** Saving campaign set configs as reusable templates
- **Why:** Separate feature; template system exists but not integrated
- **When:** After core edit functionality is complete

---

## Implementation Plan

### Step 1: Audit and Extend Schema (2-3 hours)

1. Review `CampaignSetConfig` interface against `WizardState`
2. Identify missing fields needed for round-trip editing
3. Update TypeScript interfaces in database schema
4. Create migration if needed
5. Update API schema validation

### Step 2: Create Edit Route Structure (1-2 hours)

1. Create `apps/web/app/campaign-sets/[setId]/edit/` directory
2. Add `page.tsx` with data fetching
3. Add `loading.tsx` skeleton
4. Wire up navigation from detail page

### Step 3: Refactor CampaignEditor for Reuse (3-4 hours)

1. Add `mode` and `initialData` props to `CampaignEditor`
2. Create `mapConfigToWizardState` utility
3. Update `useGenerateWizard` hook to accept initial state
4. Modify form submission for edit vs create
5. Update button text and navigation

### Step 4: Implement Hierarchy Display in Edit (2-3 hours)

1. Fetch full hierarchy on edit page load
2. Display generated campaigns in preview panel
3. Show campaign/ad group/ad counts
4. Indicate which items have been synced

### Step 5: Add Scroll-to-Error (2 hours)

1. Create `useScrollToError` hook
2. Integrate with validation on submit
3. Auto-expand accordion sections
4. Add focus management

### Step 6: Enhance Field Validation UX (2-3 hours)

1. Add inline error display to input components
2. Style error states consistently
3. Add touched/dirty tracking
4. Improve accessibility with ARIA attributes

### Step 7: API Error Handling (1-2 hours)

1. Parse structured API errors
2. Display field-level errors
3. Add retry for network failures
4. Test error scenarios

---

## Definition of Done

- [ ] Campaign set config includes all wizard state fields for full round-trip editing
- [ ] Edit page at `/campaign-sets/[setId]/edit` loads and displays existing configuration
- [ ] Users can modify any wizard field and save changes via PUT request
- [ ] Preview panel shows generated campaigns with hierarchy in edit mode
- [ ] Validation errors scroll into view and focus the first error field
- [ ] All form fields display inline error messages when validation fails
- [ ] API errors are parsed and displayed with clear user-friendly messages
- [ ] Unit tests cover config mapping and validation functions
- [ ] Integration tests verify edit flow end-to-end

---

## Notes

### Tech Stack

- **Frontend:** Next.js 14+ App Router, React, CSS Modules
- **State Management:** `useReducer` hook in `useGenerateWizard`
- **API Client:** Custom fetch wrapper with typed responses (`apps/web/lib/api-client.ts`)
- **Validation:** Client-side functions in `types.ts`, Zod schemas on API
- **Database:** PostgreSQL with Drizzle ORM, JSONB for config storage

### Design Principles

1. **Reuse over duplication:** The CampaignEditor should work for both create and edit
2. **Progressive disclosure:** Only show relevant sections, auto-expand on errors
3. **Optimistic persistence:** Save intermediate state locally, sync on submit
4. **Accessible by default:** ARIA labels, keyboard navigation, focus management

### Key Files Reference

| Component | File Path |
|-----------|-----------|
| CampaignEditor | `apps/web/app/campaign-sets/new/components/CampaignEditor.tsx` |
| Wizard State | `apps/web/app/campaign-sets/new/hooks/useGenerateWizard.ts` |
| Wizard Types | `apps/web/app/campaign-sets/new/types.ts` |
| Campaign Set Schema | `packages/database/src/schema/campaign-sets.ts` |
| API Routes | `apps/api/src/routes/campaign-sets.ts` |
| API Schemas | `apps/api/src/schemas/campaign-sets.ts` |
| Detail Page | `apps/web/app/campaign-sets/[setId]/page.tsx` |

---

## Next Steps (Post-MVP)

1. **Campaign Regeneration:** Allow regenerating campaigns after config changes
2. **Diff View:** Show what changed between saves
3. **Undo/Redo:** Track edit history within a session
4. **Bulk Actions:** Select multiple ad groups/ads for batch editing
