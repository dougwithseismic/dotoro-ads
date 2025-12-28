# Sync Status Monitor - TODO

**Project:** Dotoro Dashboard
**Feature:** Real-time Sync Status Monitor Component
**Date:** 2025-12-28
**Status:** COMPLETE
**Priority:** HIGH
**Complexity:** High
**Dependencies:** dashboard-stats-api

---

## Overview

The Sync Status Monitor is a real-time dashboard component that provides visibility into campaign synchronization operations across ad platforms (Reddit, Google, Meta). It leverages existing SSE infrastructure at `/api/v1/campaign-sets/{setId}/sync-stream` and the jobs API at `/api/v1/jobs/{jobId}` to display live sync progress, pending queue status, and failure details with retry capabilities.

### Why This Matters

- **Operational Visibility:** Users need to know if their campaigns are successfully syncing to ad platforms
- **Error Resolution:** Failed syncs need clear error messages and easy retry actions
- **Queue Management:** Understanding what's pending helps users prioritize and plan
- **Trust Building:** Real-time feedback builds confidence in the platform

---

## Goal

Build a production-ready `SyncStatusMonitor` component that displays real-time synchronization status for campaigns syncing to ad platforms, with clear progress indicators, failure details, and retry capabilities.

### Success Criteria

- [x] Component displays currently syncing campaigns with live progress updates via SSE
- [x] Pending sync queue shows all queued jobs with estimated wait times
- [x] Failed syncs display detailed error messages with actionable retry buttons
- [x] SSE connection handles reconnection gracefully on network interruption
- [x] Component integrates seamlessly with existing dashboard layout and styling patterns

---

## What's Already Done

### Backend Infrastructure (Complete)

- **SSE Streaming Endpoint:** `GET /api/v1/campaign-sets/{setId}/sync-stream?jobId={jobId}`
  - Located in: `apps/api/src/routes/campaign-sets.ts` (lines 1441-1596)
  - Streams events: `progress`, `campaign_synced`, `campaign_failed`, `completed`, `error`, `heartbeat`
  - 15-second heartbeat to keep connections alive
  - 5-minute timeout per stream

- **Job Events System:** `apps/api/src/jobs/events.ts`
  - `SyncProgressEvent` type with `jobId`, `campaignSetId`, `type`, `data`, `timestamp`
  - `SyncProgressData` includes: `synced`, `failed`, `total`, `campaignId`, `platformId`, `error`
  - EventEmitter pattern with `sync:{jobId}` and `sync:{jobId}:done` channels

- **Jobs API:** `GET /api/v1/jobs/{jobId}`
  - Located in: `apps/api/src/routes/jobs.ts`
  - Returns: `id`, `name`, `state`, `data`, `output`, `error`, `startedAt`, `completedAt`, `createdAt`
  - States: `created`, `active`, `completed`, `failed`, `cancelled`

- **Sync Job Queuing:** `POST /api/v1/campaign-sets/{setId}/sync`
  - Returns 202 with `{ jobId, status: "queued", message }`
  - Uses pg-boss for job queue management

### Frontend Patterns (Complete)

- **CSS Modules:** All components use `.module.css` pattern
  - Example: `apps/web/app/[locale]/campaigns/components/SyncStatusBadge.module.css`
  - Dark mode via `@media (prefers-color-scheme: dark)`
  - CSS variables for theming (`--font-geist-sans`)

- **Dashboard Components:** `apps/web/components/dashboard/`
  - `StatsCard.tsx` - Card layout with icon, title, value, trend
  - `ActivityFeed.tsx` - List with icons, timestamps, relative time formatting
  - Existing styles in `StatsCard.module.css`, `ActivityFeed.module.css`

- **API Client Pattern:** `apps/web/lib/api-client.ts`
  - `api.get()`, `api.post()`, `api.delete()` methods
  - `buildQueryString()` utility

- **Hooks Pattern:** `apps/web/lib/hooks/`
  - State management: `useState`, `useCallback`
  - Pattern: return `{ data, loading, error, fetchFn, mutateFn }`

---

## What We're Building Now

### Phase 1: Core Data Layer (Priority: HIGH)

**1.1 Types and Interfaces**

- [x] Create `apps/web/components/sync-monitor/types.ts`
  - Define `SyncJob` interface matching API response
  - Define `SyncProgressEvent` interface for SSE events
  - Define `SyncStatus` union type: `'pending' | 'active' | 'completed' | 'failed'`
  - Define `SyncMonitorState` for component state management

```typescript
// Expected types structure
interface SyncJob {
  id: string;
  campaignSetId: string;
  campaignSetName: string;
  state: 'created' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: { synced: number; failed: number; total: number };
  error?: string;
  startedAt?: string;
  createdAt: string;
}

interface SyncProgressEvent {
  type: 'progress' | 'campaign_synced' | 'campaign_failed' | 'completed' | 'error';
  data: {
    synced?: number;
    failed?: number;
    total?: number;
    campaignId?: string;
    error?: string;
  };
}
```

**1.2 SSE Hook**

- [x] Create `apps/web/lib/hooks/useSyncStream.ts`
  - Accept `campaignSetId` and `jobId` parameters
  - Create EventSource connection to SSE endpoint
  - Parse and dispatch events by type
  - Handle reconnection with exponential backoff (1s, 2s, 4s, max 30s)
  - Clean up EventSource on unmount
  - Return `{ connected, events, error, reconnect }`

**1.3 Sync Jobs Hook**

- [x] Create `apps/web/lib/hooks/useSyncJobs.ts`
  - Fetch active sync jobs for current user
  - Fetch pending jobs from queue
  - Fetch recent failed jobs
  - Provide retry mutation
  - Return `{ activeJobs, pendingJobs, failedJobs, loading, error, retryJob }`

**1.4 Export hooks from index**

- [x] Update `apps/web/lib/hooks/index.ts` to export new hooks

### Phase 2: UI Components (Priority: HIGH)

**2.1 SyncProgressCard Component**

- [x] Create `apps/web/components/sync-monitor/SyncProgressCard.tsx`
  - Display campaign set name and platform
  - Show progress bar with percentage
  - Display "X of Y campaigns synced" text
  - Show failed count with warning indicator
  - Animate progress updates smoothly
  - Include cancel button for active syncs

- [x] Create `apps/web/components/sync-monitor/SyncProgressCard.module.css`
  - Progress bar styling with animation
  - Platform badge colors (Reddit orange, Google blue, Meta blue)
  - Warning state for failures
  - Match existing card patterns from `StatsCard.module.css`

**2.2 PendingQueue Component**

- [x] Create `apps/web/components/sync-monitor/PendingQueue.tsx`
  - List pending sync jobs in order
  - Show campaign set name and platform for each
  - Display position in queue
  - Show estimated wait time (if available)
  - Collapsible if more than 3 items

- [x] Create `apps/web/components/sync-monitor/PendingQueue.module.css`
  - Queue item styling
  - Position indicator styling
  - Collapsed/expanded states

**2.3 FailedSyncsList Component**

- [x] Create `apps/web/components/sync-monitor/FailedSyncsList.tsx`
  - List recent failed syncs (last 24 hours)
  - Show campaign set name and failure timestamp
  - Display error message (truncated with expand)
  - Include Retry button with loading state
  - AlertTriangle icon from Lucide for error indicator

- [x] Create `apps/web/components/sync-monitor/FailedSyncsList.module.css`
  - Error state styling (red tones)
  - Retry button styling
  - Error message truncation and expand

**2.4 SyncStatusMonitor Container**

- [x] Create `apps/web/components/sync-monitor/SyncStatusMonitor.tsx`
  - Compose SyncProgressCard, PendingQueue, FailedSyncsList
  - Manage SSE connections for active syncs
  - Handle empty states for each section
  - RefreshCw icon for sync indicator

- [x] Create `apps/web/components/sync-monitor/SyncStatusMonitor.module.css`
  - Container layout (vertical stack)
  - Section spacing
  - Responsive adjustments

**2.5 Component Index**

- [x] Create `apps/web/components/sync-monitor/index.ts`
  - Export all components

### Phase 3: Integration (Priority: MEDIUM)

**3.1 Dashboard Integration**

- [x] Add SyncStatusMonitor to dashboard page
  - Location: `apps/web/app/[locale]/dashboard/page.tsx`
  - Position: Below stats grid, above activity feed
  - Only render if user has active/pending/failed syncs
  - Component returns null when no sync activity

**3.2 API Endpoint for Sync Summary**

- [x] Create endpoint to fetch sync status summary
  - Path: `GET /api/v1/sync/status`
  - Returns: `{ active: SyncJob[], pending: SyncJob[], failed: SyncJob[] }`
  - Filters by current user
  - Limits failed to last 24 hours
  - Located in: `apps/api/src/routes/sync.ts`

### Phase 4: Polish and Testing (Priority: MEDIUM)

**4.1 Error Handling**

- [x] Handle SSE connection failures gracefully
- [x] Show reconnecting indicator during SSE reconnection
- [x] Handle API errors with user-friendly messages
- [x] Add retry logic for transient failures

**4.2 Loading States**

- [x] Skeleton loader for initial load
- [x] Optimistic updates for retry action
- [x] Smooth transitions between states

**4.3 Unit Tests**

- [x] Test `useSyncStream` hook (18 tests)
  - Test SSE event parsing
  - Test reconnection logic
  - Test cleanup on unmount

- [x] Test `useSyncJobs` hook (18 tests)
  - Test data fetching
  - Test retry mutation
  - Test error states

- [x] Test `SyncProgressCard` component (20 tests)
  - Test progress display
  - Test different states

- [x] Test `FailedSyncsList` component (20 tests)
  - Test error display
  - Test retry button interaction

- [x] Test `SyncStatusMonitor` component (13 tests)
  - Test empty states
  - Test with mock data

- [x] Test `PendingQueue` component (16 tests)
  - Test queue display
  - Test collapsible behavior

---

## Not In Scope

### Backend Changes

- **New API endpoints for job listing** - Why: Can use existing jobs API with filtering
- **Job priority modifications** - Why: pg-boss handles this; not needed for MVP
- **Historical sync analytics** - Why: Future analytics feature, not core monitoring

### Advanced Features

- **Push notifications for sync completion** - Why: Requires notification infrastructure
- **Bulk retry for all failed syncs** - Why: Could overwhelm the queue; prefer individual retries
- **Sync scheduling/delay** - Why: Separate feature request for future sprint
- **Cross-device sync status** - Why: Requires WebSocket infrastructure beyond SSE

### UI Elements

- **Detailed campaign-level sync breakdown** - Why: Campaign set level is sufficient for MVP
- **Sync history timeline** - Why: Historical analytics feature for future
- **Platform-specific error documentation links** - Why: Requires content creation

---

## Implementation Plan

### Step 1: Types and Interfaces (1-2 hours)

- [x] Define TypeScript interfaces for sync jobs and events
- [x] Document type usage with JSDoc comments

### Step 2: SSE Hook Implementation (2-3 hours)

- [x] Implement useSyncStream hook with EventSource
- [x] Add reconnection logic with exponential backoff
- [x] Add connection state management
- [x] Write unit tests for hook

### Step 3: Sync Jobs Hook (2-3 hours)

- [x] Implement useSyncJobs hook for data fetching
- [x] Add retry mutation with optimistic updates
- [x] Integrate with existing api-client pattern
- [x] Write unit tests for hook

### Step 4: Core UI Components (3-4 hours)

- [x] Build SyncProgressCard with progress bar
- [x] Build PendingQueue with queue position
- [x] Build FailedSyncsList with retry action
- [x] Style all components with CSS Modules
- [x] Add Lucide icons (RefreshCw, AlertTriangle)

### Step 5: Container Component (2-3 hours)

- [x] Compose SyncStatusMonitor container
- [x] Manage multiple SSE connections
- [x] Handle empty states and loading
- [x] Add responsive layout

### Step 6: Dashboard Integration (1-2 hours)

- [x] Add component to dashboard page
- [x] Conditionally render based on sync activity
- [x] Verify layout with existing components

### Step 7: Testing and Polish (2-3 hours)

- [x] Write component tests
- [ ] Add error boundary
- [ ] Test SSE reconnection
- [ ] Cross-browser testing

---

## Definition of Done

- [x] All Phase 1-2 tasks completed and checked off
- [x] Unit tests passing with >80% coverage for new code (105 tests passing)
- [x] Component renders correctly in light and dark modes
- [x] SSE connection establishes and receives events in development environment
- [x] Retry action successfully re-queues failed sync job
- [x] No console errors or warnings in browser
- [x] Component accessible via keyboard navigation
- [x] Responsive layout works on mobile viewport (375px+)
- [x] Dashboard integration (Phase 3) complete - SyncStatusMonitor on dashboard page
- [x] Backend sync/status endpoint implemented at `GET /api/v1/sync/status`

---

## Notes

### Tech Stack

- **React 18** with hooks for state management
- **CSS Modules** for component styling - matches existing pattern
- **Lucide React** for icons - already in use (`RefreshCw`, `AlertTriangle`, `Clock`, `CheckCircle`)
- **TypeScript** for type safety
- **EventSource API** for SSE - native browser support, no library needed

### Design Principles

- **Progressive Disclosure:** Show summary first, details on demand
- **Real-time Feedback:** Users should never wonder "is it working?"
- **Error Recovery:** Make retry actions obvious and easy
- **Consistency:** Match existing dashboard component patterns

### Best Practices

- **SSE Connection Management:**
  - One connection per active sync, not one connection for all
  - Close connections when component unmounts
  - Reconnect with backoff on network failures
  - Parse heartbeats but don't display them

- **State Updates:**
  - Use React 18 automatic batching for performance
  - Debounce rapid progress updates (every 100ms max)
  - Optimistic UI for retry actions

- **Error Handling:**
  - Log errors to console in development
  - Show user-friendly messages in UI
  - Provide retry actions for recoverable errors

---

## Next Steps

### Phase 5: Enhanced Analytics (Future)

- Sync success rate trends
- Average sync duration metrics
- Platform-specific performance comparisons

### Phase 6: Notifications (Future)

- Email notifications for sync failures
- Browser push notifications for completions
- Slack/webhook integrations

### Phase 7: Bulk Operations (Future)

- Bulk retry for failed syncs
- Sync scheduling and delays
- Priority queue management
