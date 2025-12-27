# Data Source Frontend Integration

**Date:** 2025-12-26
**Status:** In Progress

---

## Problem Statement

We built the backend and individual frontend components for data source types, but they're not fully integrated:

1. **GoogleSheetsForm exists but isn't wired into CreateDataSourceDrawer**
2. **Detail page only shows CSV-style data** (Preview, Mapping, Validation)
3. **No way to view/edit API Fetch or Google Sheets configuration after creation**
4. **No sync controls on detail page**

---

## Current State

### What Works
- `/data-sources` list page with sync status, last synced, sync button ✅
- `CreateDataSourceDrawer` with: CSV Upload, CSV Paste, API Push, API Fetch ✅
- Individual form components exist: GoogleSheetsForm, ApiDataSourceForm, ApiPushConfig ✅
- Backend fully supports all 4 data source types ✅

### What's Missing

| Feature | Status |
|---------|--------|
| Google Sheets in CreateDataSourceDrawer | ❌ Not integrated |
| Detail page shows API Fetch config | ❌ Only shows data rows |
| Detail page shows Google Sheets config | ❌ Only shows data rows |
| Edit API Fetch config after creation | ❌ Not possible |
| Edit Google Sheets config after creation | ❌ Not possible |
| Sync button on detail page | ❌ Only on list page |
| Re-sync Google Sheets on detail page | ❌ Not implemented |

---

## Implementation Plan

### Phase 1: Integrate Google Sheets into CreateDataSourceDrawer

**File:** `apps/web/app/campaign-sets/new/components/CreateDataSourceDrawer.tsx`

**Deliverables:**
- [ ] Add Google Sheets as 5th source type option
- [ ] Import and wire up GoogleSheetsForm component
- [ ] Handle Google OAuth connection state
- [ ] Handle Google Sheets data source creation flow

### Phase 2: Enhance Detail Page for API/Sheets Types

**File:** `apps/web/app/data-sources/[id]/page.tsx`

**Deliverables:**
- [ ] Detect data source type and show appropriate UI
- [ ] For `api` type: Show API Fetch config panel (URL, headers, auth, sync freq)
- [ ] For `google-sheets` type: Show Sheets config panel (spreadsheet, sheet, sync freq)
- [ ] Add "Configuration" tab for API/Sheets types
- [ ] Keep existing tabs (Preview, Mapping, Validation) for all types

### Phase 3: Add Edit Functionality for API/Sheets Config

**File:** `apps/web/app/data-sources/[id]/page.tsx` + new components

**Deliverables:**
- [ ] Create `ApiConfigPanel.tsx` - displays and edits API Fetch config
- [ ] Create `GoogleSheetsConfigPanel.tsx` - displays and edits Sheets config
- [ ] Wire up PATCH endpoint for updating config
- [ ] Add "Save Changes" button for config modifications

### Phase 4: Add Sync Controls to Detail Page

**File:** `apps/web/app/data-sources/[id]/page.tsx`

**Deliverables:**
- [ ] Add SyncButton to header for API/Sheets types
- [ ] Show last synced timestamp in header
- [ ] Show sync status badge
- [ ] Poll for sync completion
- [ ] Toast notification on sync complete/error

---

## Technical Details

### Data Source Types

```typescript
type DataSourceType = 'csv' | 'api' | 'manual' | 'google-sheets';

// CSV type: Shows data preview, column mapping, validation
// API type: Shows config panel + data preview
// Google Sheets type: Shows config panel + data preview
// Manual type: Shows data entry form + data preview
```

### API Endpoints Used

```
GET  /api/v1/data-sources/:id          - Get data source with config
PATCH /api/v1/data-sources/:id         - Update data source (including config)
POST /api/v1/data-sources/:id/sync     - Trigger manual sync
GET  /api/v1/auth/google/status        - Check Google OAuth status
```

### Type-Specific UI

| Type | Configuration Tab | Data Tabs | Sync Controls |
|------|------------------|-----------|---------------|
| csv | No | Preview, Mapping, Validation | No |
| api | Yes (API config) | Preview, Mapping, Validation | Yes |
| google-sheets | Yes (Sheets config) | Preview, Mapping, Validation | Yes |
| manual | No | Preview, Entry Form | No |

---

## File Reference

### Files to Modify
```
apps/web/app/campaign-sets/new/components/CreateDataSourceDrawer.tsx
apps/web/app/data-sources/[id]/page.tsx
apps/web/app/data-sources/[id]/DataSourceDetail.module.css
apps/web/app/data-sources/types.ts
```

### Files to Create
```
apps/web/app/data-sources/components/ApiConfigPanel.tsx
apps/web/app/data-sources/components/ApiConfigPanel.module.css
apps/web/app/data-sources/components/GoogleSheetsConfigPanel.tsx
apps/web/app/data-sources/components/GoogleSheetsConfigPanel.module.css
apps/web/app/data-sources/components/__tests__/ApiConfigPanel.test.tsx
apps/web/app/data-sources/components/__tests__/GoogleSheetsConfigPanel.test.tsx
```

---

## Definition of Done

- [ ] User can create Google Sheets data source from drawer
- [ ] User can view API Fetch configuration on detail page
- [ ] User can view Google Sheets configuration on detail page
- [ ] User can edit API Fetch configuration
- [ ] User can edit Google Sheets configuration
- [ ] User can manually sync from detail page
- [ ] All changes have tests
- [ ] No regressions in existing functionality
