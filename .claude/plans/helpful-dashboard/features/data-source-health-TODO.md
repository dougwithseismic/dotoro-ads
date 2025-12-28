# Data Source Health Dashboard Component

**Date:** 2025-12-28
**Status:** Complete
**Priority:** Medium
**Depends On:** dashboard-stats-api

---

## Overview

The DataSourceHealth component provides users with an at-a-glance view of all their data sources directly on the dashboard. It displays data source type, row counts, sync status, validation health, and quick navigation to detail pages. This component enables users to quickly identify data sources that need attention (sync failures, validation errors, stale data) without navigating away from the dashboard.

---

## Goal

Build a DataSourceHealth dashboard widget that surfaces the health status of all data sources, enabling users to quickly identify issues and take action on data ingestion problems before they impact campaign generation.

### Success Criteria

- [x] Users can see all data sources with type icons (CSV/Sheets/API) at a glance
- [x] Row count and "last updated X ago" displayed using `formatDistanceToNow`
- [x] Google Sheets sources show sync status (last sync, next scheduled, error state)
- [x] Validation errors/warnings are surfaced with severity indicators
- [x] Each data source row links to its detail page (`/data-sources/[id]`)
- [x] Component matches existing dashboard card styling (CSS Modules pattern)
- [x] Loading and empty states are properly handled

---

## What's Already Done

### Data Source Infrastructure (Complete)
- Database schema for data sources with type enum: `csv`, `api`, `manual`, `google-sheets`
- `DataSourceConfig` interface with `googleSheets` and `apiFetch` nested configs
- Sync status tracking: `lastSyncAt`, `lastSyncStatus`, `lastSyncError`, `syncFrequency`
- Row count computation via `computeRowCount()` and `computeRowCountsBatch()`

### API Endpoints (Complete)
- `GET /api/v1/data-sources` - List with pagination, returns `rowCount`, `status`, `config`
- `GET /api/v1/data-sources/:id` - Detail with `columnMappings`, `data` preview
- Sync trigger: `POST /api/v1/data-sources/:id/sync`

### Frontend Hooks (Complete)
- `useDataSources()` hook at `apps/web/lib/hooks/useDataSources.ts`
- Returns `dataSources`, `loading`, `error`, `fetchDataSources()`

### Dashboard Components (Complete)
- `StatsCard` component with CSS Modules at `apps/web/components/dashboard/StatsCard.tsx`
- `StatsGrid` for layout at `apps/web/components/dashboard/StatsGrid.tsx`
- CSS variable system: `--gray-rgb`, dark mode support, hover states

### Existing Patterns (Complete)
- `ValidationStatus` component at `apps/web/app/[locale]/data-sources/components/ValidationStatus.tsx`
- CSS Modules naming: `styles.container`, `styles.badge`, `styles[status]`
- Lucide icons used across codebase (FileSpreadsheet, Database, Cloud, etc.)

---

## What We're Building Now

### Phase 1: Core Component Structure (Priority: HIGH)

**Why HIGH:** Foundation component - all other phases depend on this

#### 1.1 DataSourceHealth Component
File: `apps/web/components/dashboard/DataSourceHealth.tsx`

- [x] Create component file with TypeScript interface
- [x] Import Lucide icons: `FileSpreadsheet` (CSV), `Sheet` (Google Sheets), `Cloud` (API), `Database` (manual)
- [x] Accept `dataSources: DataSource[]` and `loading: boolean` props
- [x] Render list of data source items with type icon, name, row count
- [x] Use `formatDistanceToNow(updatedAt, { addSuffix: true })` for relative time
- [x] Add click handler to navigate to `/data-sources/${id}`
- [x] Implement loading skeleton state (3 placeholder rows)
- [x] Implement empty state: "No data sources yet" with link to create

**Example Use Cases:**
- User sees "products.csv - 2,500 rows - Updated 2 hours ago"
- User sees "Inventory Sheet - 150 rows - Synced 5 minutes ago"
- User clicks row and navigates to `/data-sources/abc-123`

#### 1.2 CSS Module Styling
File: `apps/web/components/dashboard/DataSourceHealth.module.css`

- [x] Create container with card styling matching `StatsCard.module.css`
- [x] Add header section with title "Data Sources" and count badge
- [x] Style list items with hover state, icon alignment, flex layout
- [x] Add type-specific icon color variants (green=synced, yellow=warning, red=error)
- [x] Implement dark mode support using `@media (prefers-color-scheme: dark)`
- [x] Add responsive adjustments for smaller viewports

---

### Phase 2: Sync Status Display (Priority: HIGH)

**Why HIGH:** Core feature for Google Sheets/API sources - primary use case for this widget

#### 2.1 SyncStatusBadge Sub-component
File: `apps/web/components/dashboard/DataSourceHealth.tsx` (inline or separate file)

- [x] Create badge showing sync status: "Synced", "Syncing", "Error", "Scheduled"
- [x] Display last sync time: "Last sync: 5 min ago"
- [x] Show next scheduled sync for sources with `syncFrequency !== 'manual'`
- [x] Calculate next sync from `lastSyncAt` + `syncFrequency` duration
- [x] Style error state with red background, tooltip showing error message
- [x] Add pulsing animation for "Syncing" state

**Sync Frequency Mapping:**
```typescript
const FREQUENCY_MS: Record<SyncFrequency, number> = {
  'manual': 0,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};
```

#### 2.2 Type-Specific Display Logic

- [x] For type `csv`: Show only row count and last updated (no sync info)
- [x] For type `google-sheets`: Show sync badge, last sync, next sync, error if present
- [x] For type `api`: Show sync badge, last sync, next sync, error if present
- [x] For type `manual`: Show row count and last updated (no sync info)
- [x] Extract sync config from `config.googleSheets` or `config.apiFetch`

---

### Phase 3: Validation Health Indicators (Priority: MEDIUM)

**Why MEDIUM:** Adds significant value but component is usable without it

#### 3.1 Validation Status Integration

- [x] Add `validationErrors?: ValidationError[]` to component props (optional)
- [x] Display error count badge: "3 errors" (red), "5 warnings" (yellow)
- [ ] Show icon indicator: AlertTriangle for errors, AlertCircle for warnings
- [ ] Tooltip on hover showing first 2-3 error messages
- [x] Link to data source detail page validation tab

#### 3.2 Health Score Calculation (Optional Enhancement)

- [ ] Calculate health percentage: `(rowsWithoutErrors / totalRows) * 100`
- [ ] Display as color-coded indicator (green > 95%, yellow 80-95%, red < 80%)
- [ ] Show "Healthy" / "Needs attention" / "Critical" text labels

---

### Phase 4: Dashboard Integration (Priority: HIGH)

**Why HIGH:** Component must be integrated to be visible to users

#### 4.1 Dashboard Page Updates
File: `apps/web/app/[locale]/dashboard/page.tsx`

- [x] Import `DataSourceHealth` component
- [x] Add data source fetch to `getStats()` or create `getDataSourceHealth()` function
- [x] Pass data sources to component in the dashboard layout
- [x] Position in right column alongside `DashboardActions`

#### 4.2 API Enhancement (if needed)
File: `apps/api/src/routes/data-sources.ts`

- [ ] Add optional `limit` param to list endpoint for dashboard preview (default 5)
- [ ] Add `includeValidation=true` query param to include validation error counts
- [ ] Ensure response includes all fields needed: `type`, `config`, `rowCount`, `updatedAt`

---

## Not In Scope

### Real-time Sync Progress
- Showing live progress bar during sync operation
- **Why:** Requires WebSocket infrastructure not yet built; manual refresh sufficient for MVP

### Inline Sync Trigger
- "Sync Now" button directly in the widget
- **Why:** Sync operations are better handled in the detail page with proper confirmation UX

### Data Source Creation from Widget
- "Add Data Source" button in the widget
- **Why:** Already covered by QuickActions component; avoid duplicating functionality

### Validation Rule Management
- Editing or creating validation rules from the widget
- **Why:** Complex feature that belongs in dedicated rules UI; widget is for visibility only

### Historical Sync Charts
- Graphs showing sync success rate over time
- **Why:** Requires analytics infrastructure; better suited for future observability feature

---

## Implementation Plan

### Step 1: Component Foundation (2-3 hours)
- [x] Create `DataSourceHealth.tsx` with basic structure
- [x] Create `DataSourceHealth.module.css` with card styling
- [x] Implement type icon mapping function
- [x] Add loading skeleton and empty state
- [x] Add basic list rendering with name and row count

### Step 2: Time Formatting and Navigation (1-2 hours)
- [x] Import and configure `date-fns` formatDistanceToNow
- [x] Add "Updated X ago" display
- [x] Implement click-to-navigate with `useRouter`
- [x] Add hover styles for interactive rows

### Step 3: Sync Status Display (2-3 hours)
- [x] Create SyncStatusBadge sub-component
- [x] Implement sync frequency to next-sync calculation
- [x] Add conditional rendering based on data source type
- [x] Style sync states (synced, syncing, error)
- [x] Add error tooltip with message

### Step 4: Dashboard Integration (1-2 hours)
- [x] Update dashboard page to fetch data sources
- [x] Add DataSourceHealth to dashboard layout
- [x] Test loading, empty, and populated states
- [x] Verify dark mode styling

### Step 5: Validation Indicators (1-2 hours)
- [x] Add validation error count display
- [x] Implement severity-based styling
- [ ] Add tooltip for error preview
- [x] Connect to validation data if available

### Step 6: Testing and Polish (2-3 hours)
- [x] Write unit tests for DataSourceHealth component
- [x] Test type icon rendering for all 4 types
- [x] Test sync status display for all states
- [x] Test responsive behavior
- [x] Test dark mode appearance
- [ ] Manual QA on dashboard page

---

## Definition of Done

- [x] DataSourceHealth component renders all data source types with correct icons
- [x] Row count and relative time ("2 hours ago") display correctly
- [x] Google Sheets/API sources show sync status, last sync time, and next scheduled sync
- [x] Sync errors are displayed with red styling and tooltip message
- [x] Clicking a row navigates to `/data-sources/[id]`
- [x] Loading state shows skeleton placeholder rows
- [x] Empty state shows helpful message with link to create data source
- [x] Component uses CSS Modules matching dashboard design system
- [x] Dark mode styling works correctly
- [x] Unit tests cover key rendering scenarios
- [x] Component is integrated and visible on dashboard page

---

## Technical Notes

### Tech Stack
- **React** - Component library (Next.js App Router)
- **CSS Modules** - Scoped styling matching existing patterns
- **Lucide React** - Icon library already used in codebase
- **date-fns** - Time formatting with `formatDistanceToNow`
- **TypeScript** - Full type safety with existing schema types

### Key Types (from existing codebase)

```typescript
// apps/web/app/[locale]/data-sources/types.ts
interface DataSource {
  id: string;
  name: string;
  type: "csv" | "api" | "manual" | "google-sheets";
  rowCount: number;
  createdAt: Date;
  updatedAt: Date;
  status: "processing" | "ready" | "error";
  config?: DataSourceConfig | null;
  syncStatus?: SyncStatus;
  lastSyncedAt?: Date;
  syncFrequency?: SyncFrequency;
}

type SyncStatus = "synced" | "syncing" | "error" | "success";
type SyncFrequency = "manual" | "1h" | "6h" | "24h" | "7d";
```

### Icon Mapping

```typescript
import { FileSpreadsheet, Sheet, Cloud, Database } from "lucide-react";

const TYPE_ICONS: Record<DataSource["type"], React.ComponentType> = {
  csv: FileSpreadsheet,
  "google-sheets": Sheet,
  api: Cloud,
  manual: Database,
};
```

### Design Principles
- **Scan-ability:** Users should identify issues within 2 seconds of looking at widget
- **Progressive disclosure:** Basic info visible, details on hover/click
- **Consistency:** Match existing StatsCard and dashboard styling exactly
- **Accessibility:** Use semantic HTML, proper ARIA labels, keyboard navigation

---

## Next Steps

### Phase 2: Dashboard Stats API
- Build unified dashboard API endpoint
- Include data source health summary
- Add caching for performance

### Phase 3: Real-time Updates
- Add polling or WebSocket for live sync status
- Show toast notifications on sync completion

### Phase 4: Advanced Analytics
- Sync success rate over time
- Data freshness alerts
- Scheduled sync monitoring dashboard
