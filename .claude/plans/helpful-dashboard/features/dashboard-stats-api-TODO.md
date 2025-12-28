# Dashboard Stats API Integration

**Project:** Dotoro - Programmatic Ad Campaign Generator
**Feature:** Dashboard Stats API
**Date:** 2025-12-28
**Status:** COMPLETE

---

## Overview

Replace hardcoded placeholder data in the dashboard StatsGrid with real API data. This feature creates a dedicated dashboard stats endpoint on the API, a React hook on the frontend, and integrates with the existing StatsGrid component.

### Current State (UPDATED)

The dashboard page at `apps/web/app/[locale]/dashboard/page.tsx` now uses the `DashboardStatsContainer` component that fetches real data from the API via the `useDashboardStats()` hook.

### Target State (ACHIEVED)

- [x] API endpoint `GET /api/v1/dashboard/stats` returns aggregated statistics
- [x] Frontend `useDashboardStats()` hook fetches data with loading/error states
- [x] StatsGrid receives real data with loading and error states
- [x] Trend calculations based on 7-day comparison windows

---

## Goal

Enable users to see real-time, accurate statistics on the dashboard reflecting their actual campaign activity, data sources, and sync status.

### Success Criteria

- [x] Dashboard displays accurate count of active campaigns (status = "active")
- [x] Pending syncs count reflects campaign sets with syncStatus = "pending" or "syncing"
- [x] Recent uploads count shows data sources created in last 7 days
- [x] Total data rows aggregates across all user's data sources
- [x] Trend indicators compare current period to previous 7-day period
- [x] Loading skeleton displays while fetching data
- [x] Error state displays gracefully with retry option

---

## What Was Built

### Phase 1: API Endpoint - COMPLETE

#### 1.1 Create Dashboard Stats Route

- [x] Created `apps/api/src/routes/dashboard.ts` with OpenAPIHono router
- [x] Defined `dashboardStatsResponseSchema` response schema using Zod
- [x] Registered route in `apps/api/src/routes/index.ts`
- [x] Added to main app in `apps/api/src/app.ts`
- [x] Added "Dashboard" tag to OpenAPI config in `apps/api/src/lib/openapi.ts`

**Response Schema:**
```typescript
{
  activeCampaigns: number;
  activeCampaignsTrend?: { value: number; isPositive: boolean } | null;
  pendingSyncs: number;
  recentUploads: number;
  lastUploadDate?: string | null; // ISO date
  totalDataRows: number;
  totalDataRowsTrend?: { value: number; isPositive: boolean } | null;
}
```

#### 1.2 Implement Stats Aggregation Queries

- [x] Query active campaigns: count from generated_campaigns where status = 'active' and user_id matches
- [x] Query pending syncs: count from campaign_sets where sync_status IN ('pending', 'syncing')
- [x] Query recent uploads: count from data_sources where created_at > 7 days ago
- [x] Query total data rows: count from data_rows joined with user's data_sources
- [x] Query last upload date: most recent data_source creation date

#### 1.3 Implement Trend Calculations

- [x] Calculate 7-day windows (current week vs previous week)
- [x] Compute percentage change for activeCampaigns trend
- [x] Compute percentage change for totalDataRows trend
- [x] Handle edge cases: new users with no previous data return null trends
- [x] Helper function `calculateTrend()` exported for testing
- [x] Helper function `getDaysAgo()` exported for testing

---

### Phase 2: Frontend Hook - COMPLETE

#### 2.1 Create useDashboardStats Hook

- [x] Created `apps/web/lib/hooks/useDashboardStats.ts`
- [x] Defined `DashboardStatsResponse` and `TrendData` interfaces matching API response
- [x] Implemented fetch using `api.get<DashboardStatsResponse>('/api/v1/dashboard/stats')`
- [x] Added loading, error, and data states
- [x] Exported hook and types from `apps/web/lib/hooks/index.ts`

**Hook Interface:**
```typescript
function useDashboardStats(): {
  stats: DashboardStatsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

---

### Phase 3: Dashboard Integration - COMPLETE

#### 3.1 Create DashboardStatsContainer Component

- [x] Created `apps/web/components/dashboard/DashboardStatsContainer.tsx` (client component)
- [x] Uses `useDashboardStats()` hook to fetch data
- [x] Transforms API response (ISO dates to Date objects, null trends to undefined)
- [x] Passes real stats to `<StatsGrid stats={stats} />`
- [x] Exported from `apps/web/components/dashboard/index.ts`

#### 3.2 Add Loading States

- [x] Created skeleton loading state in DashboardStatsContainer with shimmer animation
- [x] Shows 4 skeleton cards while `loading === true`
- [x] Created CSS module `DashboardStatsContainer.module.css` with styles

#### 3.3 Add Error Handling

- [x] Displays error message when `error !== null`
- [x] Added "Try Again" button that calls `refetch()`
- [x] Styled error state with danger colors

#### 3.4 Update Dashboard Page

- [x] Updated `apps/web/app/[locale]/dashboard/page.tsx`
- [x] Added skeleton styles to `Dashboard.module.css`
- [x] Uses `<Suspense>` boundary with fallback for stats section
- [x] Imports and renders `<DashboardStatsContainer />`
- [x] Removed hardcoded `getStats()` function
- [x] Keeps activity feed and quick actions unchanged

---

## Tests Added

### API Tests (21 passing)

File: `apps/api/src/__tests__/routes/dashboard.test.ts`

- [x] Unit tests for `calculateTrend()` helper (7 tests)
  - Returns null when both current and previous are 0
  - Returns 100% increase when previous is 0 but current is not
  - Calculates positive trend correctly
  - Calculates negative trend correctly
  - Returns 0% when current equals previous
  - Rounds percentage to nearest integer
  - Handles large percentage changes
- [x] Unit tests for `getDaysAgo()` helper (3 tests)
  - Returns a date 7 days ago
  - Returns a date 14 days ago
  - Returns today for 0 days
- [x] Schema validation tests (3 tests)
  - Should export the correct schema structure
  - Should accept null trends for new users
  - Should reject invalid trend structure
- [x] Authentication tests (2 tests)
  - Returns 401 when session is invalid
  - Calls validateSession with request headers
- [x] Authenticated request tests (4 tests)
  - Returns stats with all expected fields when authenticated
  - Returns non-negative counts
  - Returns valid response structure for new user with zero stats
  - Calls database queries when authenticated
- [x] Security tests (2 tests)
  - Should not accept x-user-id header for authentication
  - Should use user ID from validated session, not from headers

### Frontend Tests (12 passing)

File: `apps/web/lib/hooks/__tests__/useDashboardStats.test.ts`

- [x] Returns initial loading state
- [x] Fetches stats on mount
- [x] Returns stats data on successful fetch
- [x] Handles new user with zero stats
- [x] Sets error state when fetch fails
- [x] Handles non-Error rejection gracefully
- [x] Provides a refetch function
- [x] Refetches data when refetch is called
- [x] Clears error on successful refetch
- [x] Sets loading state during refetch
- [x] Type: contains all required fields
- [x] Type: allows null for optional trend fields

---

## Files Created/Modified

### Created

1. `apps/api/src/routes/dashboard.ts` - API endpoint with stats aggregation
2. `apps/api/src/__tests__/routes/dashboard.test.ts` - API unit and schema tests
3. `apps/web/lib/hooks/useDashboardStats.ts` - Frontend data fetching hook
4. `apps/web/lib/hooks/__tests__/useDashboardStats.test.ts` - Hook tests
5. `apps/web/components/dashboard/DashboardStatsContainer.tsx` - Client component wrapper
6. `apps/web/components/dashboard/DashboardStatsContainer.module.css` - Container styles

### Modified

1. `apps/api/src/app.ts` - Added dashboard route import and registration
2. `apps/api/src/routes/index.ts` - Exported dashboardApp
3. `apps/api/src/lib/openapi.ts` - Added Dashboard tag to OpenAPI config
4. `apps/web/lib/hooks/index.ts` - Exported useDashboardStats hook and types
5. `apps/web/components/dashboard/index.ts` - Exported DashboardStatsContainer
6. `apps/web/app/[locale]/dashboard/page.tsx` - Integrated DashboardStatsContainer, removed mock data
7. `apps/web/app/[locale]/dashboard/Dashboard.module.css` - Added skeleton loading styles

---

## Definition of Done - COMPLETE

- [x] API endpoint implemented with OpenAPI documentation
- [x] API returns accurate counts based on database queries
- [x] Frontend hook follows existing pattern in `apps/web/lib/hooks/`
- [x] Dashboard displays real data from API (not mock data)
- [x] Loading state shows skeleton while fetching
- [x] Error state displays message and retry button
- [x] No TypeScript errors in API files
- [x] 33 tests passing (21 API + 12 frontend)

---

## Notes

### Security Fix (2025-12-28)

**Issue:** The original implementation used an insecure `x-user-id` header for authentication, which allowed any client to impersonate any user by setting this header.

**Fix Applied:** Replaced the `x-user-id` header pattern with proper session validation using `validateSession()` from the auth middleware. The route now:
1. Validates the session cookie via Better Auth
2. Extracts the user ID from the validated session object
3. Returns 401 Unauthorized if the session is invalid

**Tests Added:** Security-focused tests to verify:
- The route rejects requests without valid sessions
- The route ignores any `x-user-id` header attempts
- Authentication is done via session cookies, not headers

### Error Handling Improvements (2025-12-28)

**Issues Fixed:**

1. **Database query errors not caught (Issue #1)**
   - Added `DashboardQueryError` custom error class with query name context
   - Wrapped all query functions with `wrapQuery()` helper that logs and re-throws with context
   - Each query failure now logs which specific query failed before propagating

2. **Promise.all obscures failures (Issue #2)**
   - Individual query wrapping ensures each query's failure is logged with its name
   - Error handler now checks for `DashboardQueryError` and includes `failedQuery` in response
   - Response includes `details.failedQuery` field for debugging

3. **Error details discarded in hook (Issue #3)**
   - Changed error state from `string | null` to `DashboardStatsError | null`
   - `DashboardStatsError` interface includes `message`, `status?`, and `code?`
   - Hook now checks for `ApiError` and preserves status code and error code
   - Container displays status code in error message when available

4. **Null stats fallback shows loading indefinitely (Issue #4)**
   - Container now treats `loading=false, error=null, stats=null` as error state
   - Shows "Unable to load dashboard statistics" message with retry button
   - Prevents infinite skeleton display in edge cases

### Implementation Details

- Used Drizzle ORM `count()` aggregates for efficient database queries
- All 7 queries run in parallel via `Promise.all` for performance
- Trend calculation returns `null` for new users (both current and previous = 0)
- Percentage shown as absolute value with `isPositive` boolean for direction
- API returns ISO date strings; frontend converts to Date objects when needed

### Patterns Followed

- OpenAPIHono router pattern consistent with existing routes
- Hook pattern matches `useDataSources.ts` and `useCreateTeam.ts`
- Client component wrapper keeps page as server component
- CSS module pattern for component-scoped styles

---

## Not In Scope (for future phases)

### Real-time Updates via WebSockets

- **Why:** MVP prioritizes simple polling; WebSocket infrastructure would add complexity without immediate user value

### Historical Trend Charts

- **Why:** Focus on numeric stats first; charting library integration planned for Phase 2

### Per-Campaign Set Stats Breakdown

- **Why:** Dashboard shows aggregates; detailed views exist on individual campaign set pages

### Activity Feed API Integration

- **Why:** Separate feature; activity feed has different data requirements and pagination needs

### Admin-level Cross-User Statistics

- **Why:** Multi-tenant considerations out of scope; current implementation is user-scoped

---

## Next Steps (Out of Scope for This Feature)

### Phase 2: Enhanced Stats

- Add per-platform campaign breakdowns
- Include sync success/failure rates
- Add data freshness indicators

### Phase 3: Activity Feed Integration

- Create activity feed API endpoint
- Replace mock activity data with real events
- Add real-time activity updates

### Phase 4: Performance Dashboard

- Add time-series charts for trends
- Include budget utilization metrics
- Display campaign performance summaries
