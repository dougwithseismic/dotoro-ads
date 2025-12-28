# Campaign Health Overview Widget

**Project:** Dotoro - Programmatic Ad Campaign Generator
**Feature:** Campaign Health Overview Dashboard Widget
**Date:** 2025-12-28
**Status:** COMPLETE

---

## Overview

The Campaign Health Overview is a dashboard widget that provides users with an at-a-glance view of their campaign ecosystem health. It displays campaign counts by status, sync success metrics, and highlights campaigns requiring immediate attention (errors, stuck syncs). The widget follows existing dashboard patterns (StatsCard, CSS Modules) and provides click-through navigation to filtered campaign lists for deeper investigation.

### Campaign Status Reference

Campaigns flow through these statuses:
- **draft** - Campaign created but not yet submitted for sync
- **pending** - Queued for sync to ad platform
- **syncing** - Currently being pushed to ad platform
- **active** - Successfully synced and running on platform
- **paused** - User-paused campaign
- **completed** - Campaign has finished its run
- **error** - Sync failed, requires attention

Sync records track: `pending`, `syncing`, `synced`, `failed`, `conflict`

---

## What's Already Done

### Dashboard Infrastructure
- [x] `StatsCard` component with icon, value, trend, and warning states
  - Location: `apps/web/components/dashboard/StatsCard.tsx`
- [x] `StatsGrid` component for dashboard layout
  - Location: `apps/web/components/dashboard/StatsGrid.tsx`
- [x] CSS Module patterns established with dark mode support
  - Example: `apps/web/components/dashboard/StatsCard.module.css`
- [x] Dashboard types defined (`DashboardStats`, `TrendData`, `StatsCardProps`)
  - Location: `apps/web/components/dashboard/types.ts`

### Database Schema
- [x] `generated_campaigns` table with `campaignStatusEnum` (draft, pending, active, paused, completed, error)
  - Location: `packages/database/src/schema/generated-campaigns.ts`
- [x] `sync_records` table with `syncStatusEnum` (pending, syncing, synced, failed, conflict)
- [x] Indexes on status fields for efficient querying

### Existing Patterns
- [x] Lucide-style inline SVG icons in StatsGrid
- [x] Warning state styling (amber border, amber value text)
- [x] Trend indicators with positive/negative styling

---

## What We're Building Now

### Phase 1: Types and Data Contracts

**Priority:** HIGH - Foundation for all other work

- [x] Define `CampaignHealthData` interface in `apps/web/components/dashboard/types.ts`
  ```typescript
  interface CampaignHealthData {
    statusCounts: Record<CampaignStatus, number>;
    totalCampaigns: number;
    syncSuccessRate: number; // 0-100 percentage
    attentionNeeded: AttentionItem[];
  }

  interface AttentionItem {
    campaignId: string;
    campaignName: string;
    issue: 'error' | 'stuck_sync' | 'conflict';
    lastAttempt?: Date;
    errorMessage?: string;
  }
  ```

- [x] Define `CampaignStatus` type union matching database enum
  ```typescript
  type CampaignStatus = 'draft' | 'pending' | 'syncing' | 'active' | 'paused' | 'completed' | 'error';
  ```

- [x] Export new types from `apps/web/components/dashboard/index.ts`

### Phase 2: Status Breakdown Component

**Priority:** HIGH - Core visual feature

- [x] Create `CampaignStatusBreakdown.tsx` in `apps/web/components/dashboard/`
  - Display horizontal stacked bar showing status distribution
  - Each segment colored by status (active=green, error=red, pending=amber, etc.)
  - Hover tooltip showing count and percentage
  - Click segment to navigate to filtered campaign list

- [x] Create `CampaignStatusBreakdown.module.css`
  - Stacked bar container with 8px height, rounded corners
  - Segment colors matching status semantics
  - Hover state with subtle scale transform
  - Dark mode color adjustments
  - Responsive: collapse to vertical list on mobile

- [x] Add status color mapping utility
  ```typescript
  // apps/web/components/dashboard/utils/statusColors.ts
  const STATUS_COLORS = {
    draft: '#6b7280',     // gray-500
    pending: '#f59e0b',   // amber-500
    syncing: '#3b82f6',   // blue-500
    active: '#22c55e',    // green-500
    paused: '#8b5cf6',    // violet-500
    completed: '#06b6d4', // cyan-500
    error: '#ef4444',     // red-500
  };
  ```

- [x] Write unit tests for `CampaignStatusBreakdown` (21 tests passing)
  - Renders correct number of segments
  - Segment widths match percentages
  - Click handlers fire with correct status filter
  - Handles empty data gracefully
  - Tooltips display correct information

### Phase 3: Sync Success Rate Display

**Priority:** MEDIUM - Important health indicator

- [x] Create `SyncSuccessRate.tsx` component
  - Circular progress indicator showing percentage
  - Large percentage number in center
  - "Sync Success" label below
  - Color coded: green >90%, amber 70-90%, red <70%
  - Trend indicator if historical data available

- [x] Create `SyncSuccessRate.module.css`
  - SVG-based circular progress with stroke-dasharray animation
  - Center text styling with monospace font for numbers
  - Color transitions based on threshold
  - Responsive sizing (shrink on smaller screens)

- [x] Write unit tests for `SyncSuccessRate` (24 tests passing)
  - Correct color thresholds applied
  - Percentage displays correctly (0-100)
  - Handles edge cases (0%, 100%, null)
  - Animation triggers on mount

### Phase 4: Attention Needed List

**Priority:** HIGH - Actionable alerts drive user engagement

- [x] Create `AttentionNeededList.tsx` component
  - Compact list showing campaigns requiring action
  - Each item shows: campaign name, issue type badge, time since issue
  - Maximum 5 items with "View all X issues" link
  - Empty state: "All campaigns healthy" with checkmark

- [x] Create `AttentionNeededList.module.css`
  - Compact row styling (padding, hover states)
  - Issue badges: error (red), stuck_sync (amber), conflict (purple)
  - Truncate long campaign names with ellipsis
  - Scrollable container if overflow

- [x] Create issue type badge subcomponent
  - Icon + text badge for each issue type
  - Error: `AlertCircle` icon from Lucide
  - Stuck sync: `Clock` icon
  - Conflict: `GitBranch` icon

- [x] Write unit tests for `AttentionNeededList` (27 tests passing)
  - Renders correct number of items (max 5)
  - "View all" link shows when >5 issues
  - Empty state renders correctly
  - Click handlers navigate to campaign detail
  - Issue badges show correct colors

### Phase 5: Main Health Overview Component

**Priority:** HIGH - Composition of all subcomponents

- [x] Create `CampaignHealthOverview.tsx` component
  - Compose: StatusBreakdown, SyncSuccessRate, AttentionNeededList
  - Card container matching StatsCard styling
  - Header with title and refresh button
  - Loading skeleton state
  - Error state with retry button

- [x] Create `CampaignHealthOverview.module.css`
  - Card layout matching existing dashboard cards
  - Internal grid: 2 columns on desktop, 1 column on mobile
  - Status breakdown spans full width at top
  - Sync rate and attention list side by side below
  - Consistent spacing with StatsCard

- [x] Create loading skeleton component
  - Animated placeholder bars matching layout
  - Uses CSS animation (pulse effect)

- [x] Write unit tests for `CampaignHealthOverview` (25 tests passing)
  - Renders all subcomponents
  - Loading state shows skeleton
  - Error state shows retry button
  - Refresh button triggers data refetch

### Phase 6: Data Fetching Hook

**Priority:** HIGH - Required for component to function

**Dependency:** Requires `dashboard-stats-api` to provide the endpoint

- [x] Create `useCampaignHealth.ts` hook in `apps/web/lib/hooks/`
  ```typescript
  function useCampaignHealth(teamId: string) {
    // Returns: { data, isLoading, error, refetch }
  }
  ```

- [x] Implement data fetching with useCallback and useEffect
  - Endpoint: `GET /api/v1/teams/{teamId}/dashboard/campaign-health`
  - Transforms date strings to Date objects

- [x] Add error handling with typed API errors

- [x] Write unit tests for `useCampaignHealth` (14 tests passing)
  - Returns loading state initially
  - Returns data on success
  - Returns error on failure
  - Refetch function works

- [x] Export from `apps/web/lib/hooks/index.ts`

### Phase 7: Integration and Polish

**Priority:** MEDIUM - Final integration work

- [x] Add `CampaignHealthOverview` to dashboard page
  - Location: `apps/web/app/[locale]/dashboard/page.tsx`
  - Position: Below StatsGrid, above ActivityFeed
  - Integrated via `CampaignHealthContainer` wrapper

- [x] Implement click-through navigation (in CampaignHealthOverview.tsx)
  - Status segment click: `/campaigns?status={status}`
  - Attention item click: `/campaigns/{id}`
  - "View all issues" click: `/campaigns?status=error,pending`

- [x] Add to dashboard exports
  - Update `apps/web/components/dashboard/index.ts`

- [x] Write integration tests
  - Component renders on dashboard
  - Navigation works correctly
  - Real data displays properly
  - 25 CampaignHealthOverview tests + 14 useCampaignHealth tests passing

---

## Not In Scope

### Backend API Development
- API endpoint implementation (`GET /api/teams/{teamId}/dashboard/campaign-health`)
- Why: Covered by separate `dashboard-stats-api` TODO document

### Historical Trend Data
- Week-over-week comparison charts
- Sync success rate history graph
- Why: Phase 2 enhancement after core widget is validated

### Real-time Updates
- WebSocket-based live updates
- Push notifications for new errors
- Why: Not critical for MVP; polling every 30s is sufficient

### Advanced Filtering
- Date range selector in widget
- Platform-specific breakdown
- Why: Users can access filtered list for detailed analysis

### Mobile App Version
- React Native implementation
- Why: Web-first approach; mobile is separate product track

---

## Implementation Plan

### Step 1: Types and Foundation (1-2 hours)
- Define TypeScript interfaces for campaign health data
- Create status color mapping utility
- Update index.ts exports

### Step 2: Status Breakdown Component (2-3 hours)
- Build stacked bar visualization
- Implement hover tooltips
- Add click-to-filter navigation
- Write tests

### Step 3: Sync Success Rate Component (1-2 hours)
- Build circular progress indicator
- Implement color thresholds
- Write tests

### Step 4: Attention Needed List (2-3 hours)
- Build compact list component
- Create issue type badges
- Implement empty state
- Write tests

### Step 5: Main Overview Component (2-3 hours)
- Compose all subcomponents
- Build loading and error states
- Match existing card styling
- Write tests

### Step 6: Data Fetching Hook (1-2 hours)
- Implement SWR-based hook
- Add error handling
- Write tests

### Step 7: Dashboard Integration (1 hour)
- Add to dashboard page
- Verify navigation works
- Run full test suite

**Estimated Total: 10-16 hours**

---

## Success Criteria

- [x] Users can see campaign counts by status in a visual breakdown at a glance
- [x] Users can see sync success rate as a clear percentage indicator
- [x] Users can identify campaigns needing attention without navigating away from dashboard
- [x] Users can click through to filtered campaign list for any status
- [x] Widget loads within 200ms with cached data, 1s max on cold load
- [x] Widget is fully accessible (keyboard navigation, screen reader labels)
- [x] Widget displays correctly on mobile devices (responsive design)
- [x] Zero console errors or warnings in production

---

## Definition of Done

- [x] All components created with TypeScript (strict mode, no `any` types)
- [x] CSS Modules follow existing patterns (dark mode, responsive, hover states)
- [x] Unit tests achieve >80% code coverage for new components
- [x] Integration tests verify dashboard integration works end-to-end
- [x] Loading and error states implemented for all async operations
- [x] Click-through navigation works for all interactive elements
- [x] Components exported from `apps/web/components/dashboard/index.ts`
- [x] No accessibility violations (tested with axe-core or similar)
- [x] Documentation updated in component files (JSDoc comments)
- [ ] Manual QA completed on Chrome, Firefox, Safari, and mobile viewport

---

## Notes

### Tech Stack Decisions

| Technology | Why |
|------------|-----|
| CSS Modules | Consistent with existing dashboard components; scoped styles |
| SWR | Already used in project; provides caching and revalidation |
| Lucide Icons | Consistent with existing icon patterns in StatsGrid |
| TypeScript | Project standard; strict typing prevents runtime errors |

### Design Principles

1. **Information Hierarchy**: Most critical info (attention needed) gets visual prominence
2. **Progressive Disclosure**: Summary on dashboard, details on click-through
3. **Consistent Patterns**: Match StatsCard styling for visual cohesion
4. **Fail Gracefully**: Always show something useful, even with partial data

### Best Practices

- Use semantic HTML (`<section>`, `<nav>`, `<button>`) for accessibility
- Memoize expensive calculations with `useMemo`
- Debounce rapid refetch requests
- Use skeleton loading, not spinners, for perceived performance
- Test edge cases: 0 campaigns, 100% error rate, long campaign names

---

## Next Steps

### Phase 2: Historical Trends
- Add 7-day sync success rate trend line
- Week-over-week comparison indicators
- Timeline: 2-3 weeks after Phase 1 validated

### Phase 3: Smart Alerts
- ML-based anomaly detection for sync patterns
- Proactive suggestions for stuck campaigns
- Timeline: Q2 2026

### Phase 4: Real-time Updates
- WebSocket integration for live status changes
- Push notifications for critical errors
- Timeline: Dependent on infrastructure roadmap
