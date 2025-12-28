# Platform Distribution Component

**Date:** 2025-12-28
**Status:** Complete
**Priority:** Medium
**Estimated Effort:** 4-6 hours

---

## Overview

Create a PlatformDistribution component that provides users with a visual breakdown of their campaigns across advertising platforms (Reddit Ads, Google Ads, Meta/Facebook Ads). This component will be integrated into the dashboard to give users immediate insight into their cross-platform campaign distribution.

### Core Requirements

- Visual breakdown of campaigns by platform (CSS-based visualization, no heavy chart libraries)
- Campaign count per platform with percentage representation
- Platform icons reusing existing PlatformBadge SVG assets
- Status breakdown within each platform (draft, pending_sync, synced, sync_error)
- Click-to-filter functionality to navigate to filtered campaigns list

### User Value

Users managing campaigns across multiple ad platforms need to quickly understand:
1. How their campaigns are distributed across platforms
2. Which platforms have the most activity
3. Where sync issues or pending work exists
4. Easy navigation to platform-specific campaign views

---

## What's Already Done

### Existing Components (Reusable)

- **PlatformBadge Component** (`apps/web/app/[locale]/campaigns/components/PlatformBadge.tsx`)
  - Platform-specific SVG icons for reddit, google, facebook
  - Color-coded styling per platform (Reddit: #ff4500, Google: #4285f4, Facebook: #1877f2)
  - CSS Modules styling with dark mode support
  - Compact mode variant available

- **StatsCard Component** (`apps/web/components/dashboard/StatsCard.tsx`)
  - Card-based layout with header, icon, value display
  - Trend indicators with positive/negative styling
  - Warning state for attention-grabbing visuals
  - Consistent dashboard styling patterns

- **Dashboard Infrastructure** (`apps/web/app/[locale]/dashboard/page.tsx`)
  - StatsGrid layout for metrics
  - Two-column layout with ActivityFeed and QuickActions
  - CSS Modules-based styling
  - Async data fetching pattern

### Types Already Defined

- `Platform` type: `"reddit" | "google" | "facebook"` (`apps/web/types/platform.ts`)
- `CampaignSyncStatus` type: `"draft" | "pending_sync" | "synced" | "sync_error"`
- `DashboardStats` interface for dashboard metrics

---

## What We're Building Now

### Phase 1: Component Foundation (2-3 hours)

**Priority: HIGH** - Core component structure must be established first

- [x] Create `PlatformDistribution.tsx` component file at `apps/web/components/dashboard/PlatformDistribution.tsx`
- [x] Create `PlatformDistribution.module.css` with CSS Modules styling
- [x] Define `PlatformDistributionData` interface for component props:
  ```typescript
  interface PlatformStats {
    platform: Platform;
    totalCampaigns: number;
    percentage: number;
    statusBreakdown: {
      draft: number;
      pending_sync: number;
      synced: number;
      sync_error: number;
    };
  }

  interface PlatformDistributionProps {
    data: PlatformStats[];
    onPlatformClick?: (platform: Platform) => void;
    loading?: boolean;
  }
  ```
- [x] Implement basic card layout matching StatsCard visual style
- [x] Add section title "Platform Distribution" with consistent typography
- [x] Export component from `apps/web/components/dashboard/index.ts`

### Phase 2: Visual Distribution Display (1-2 hours)

**Priority: HIGH** - Primary user value is visual representation

- [x] Create CSS-based horizontal bar chart for platform distribution
  - Each platform gets a colored segment proportional to campaign percentage
  - Platform colors: Reddit (#ff4500), Google (#4285f4), Facebook (#1877f2)
  - Minimum 4px width for non-zero values (visibility)
- [x] Implement platform legend below the bar chart
  - Platform icon (reuse PLATFORM_ICONS from PlatformBadge)
  - Platform name
  - Campaign count
  - Percentage (e.g., "42%")
- [x] Add hover state on legend items highlighting corresponding bar segment
- [x] Implement empty state when no campaigns exist
  - "No campaigns yet" message
  - Link to create first campaign set

**Example Layout:**
```
Platform Distribution
[=====Reddit=====][===Google===][==Meta==]

Reddit        45 campaigns (42%)
Google        35 campaigns (32%)
Meta          28 campaigns (26%)
```

### Phase 3: Status Breakdown Per Platform (1 hour)

**Priority: MEDIUM** - Adds depth but not critical for MVP

- [x] Add expandable/collapsible status details for each platform row
- [x] Create mini status bars within each platform row
  - Draft: gray (#6b7280)
  - Pending Sync: amber (#f59e0b)
  - Synced: green (#22c55e)
  - Sync Error: red (#ef4444)
- [x] Display status counts on hover or in expanded view
- [x] Add visual indicator for platforms with sync errors (attention dot)

### Phase 4: Interactive Filtering (30 min)

**Priority: MEDIUM** - Enhances usability significantly

- [x] Make each platform row clickable
- [x] Implement `onPlatformClick` callback prop
- [x] Add appropriate cursor and hover states
- [x] Add aria-role="button" and keyboard navigation (Enter/Space)
- [x] In dashboard context, wire click to navigate to `/campaigns?platform={platform}`

### Phase 5: Loading and Error States (30 min)

**Priority: MEDIUM** - Polish and production readiness

- [x] Create skeleton loading state matching component dimensions
- [x] Add loading prop to show skeleton while data fetches
- [x] Handle edge case: all platforms have 0 campaigns
- [x] Handle edge case: only one platform has campaigns

### Phase 6: Testing (1 hour)

**Priority: HIGH** - Required for code quality

- [x] Create test file at `apps/web/components/dashboard/__tests__/PlatformDistribution.test.tsx`
- [x] Test: renders all three platforms correctly
- [x] Test: displays correct campaign counts
- [x] Test: calculates and displays correct percentages
- [x] Test: handles empty data (no campaigns)
- [x] Test: handles single platform data
- [x] Test: click handler fires with correct platform
- [x] Test: loading state displays skeleton
- [x] Test: status breakdown renders correctly
- [x] Test: accessibility - keyboard navigation works
- [x] Test: accessibility - proper ARIA labels present

### Phase 7: Dashboard Integration (30 min)

**Priority: HIGH** - Component must be visible to users

- [x] Import PlatformDistribution into dashboard page
- [x] Add platform stats to `getStats()` function return type
- [x] Create placeholder data structure matching API response
- [x] Position component in dashboard layout (below StatsGrid, above columns)
- [x] Add router navigation for platform filtering

---

## Not In Scope

### Visual Enhancements (Future Sprint)

- Animated bar chart transitions - **Why:** Initial version prioritizes simplicity and performance; animations add complexity without core value
- Pie chart or donut chart variants - **Why:** CSS-based bar is more maintainable and accessible; chart libraries introduce bundle bloat
- Time-range selectors for distribution data - **Why:** Requires API changes and additional state management; defer to dedicated analytics feature

### Data Features (Blocked on API)

- Real-time campaign count updates - **Why:** Requires WebSocket infrastructure not yet built
- Historical distribution trends - **Why:** Requires time-series data storage and API endpoints not in current sprint
- Cross-team platform comparison - **Why:** Team-scoped analytics is a separate feature

### Platform Expansion

- Additional platforms (TikTok, LinkedIn, etc.) - **Why:** Business has not yet integrated these platforms; component is extensible when ready
- Platform API connection status - **Why:** Belongs in Accounts/Connections page, not dashboard distribution

---

## Implementation Plan

1. **Set up component skeleton** (30 min)
   - Create files, define interfaces, export from index
   - Establish CSS Modules with base variables

2. **Build distribution bar** (45 min)
   - Implement flexbox-based proportional segments
   - Add platform colors and styling
   - Test with various data distributions

3. **Create platform legend** (45 min)
   - Reuse platform icons from PlatformBadge
   - Layout with counts and percentages
   - Add hover interactions

4. **Add status breakdown** (45 min)
   - Expandable row pattern
   - Mini status indicator bars
   - Error attention indicators

5. **Implement interactivity** (30 min)
   - Click handlers
   - Keyboard navigation
   - ARIA attributes

6. **Write comprehensive tests** (1 hour)
   - Follow existing test patterns (vitest, @testing-library/react)
   - Cover all user interactions and edge cases

7. **Integrate into dashboard** (30 min)
   - Import and position component
   - Wire up navigation
   - Add placeholder data

---

## SUCCESS CRITERIA

- [x] Component displays campaign counts for all three platforms (Reddit, Google, Facebook)
- [x] Visual bar chart accurately reflects percentage distribution
- [x] Clicking a platform navigates to filtered campaigns list
- [x] Status breakdown shows draft, pending, synced, and error counts per platform
- [x] Component matches existing dashboard visual style (StatsCard patterns)
- [x] Loading skeleton appears while data fetches
- [x] Empty state handles zero-campaign scenario gracefully
- [x] All tests pass with >80% coverage for new code
- [x] Component is keyboard accessible (Tab, Enter, Space)
- [x] Dark mode styling works correctly

---

## DEFINITION OF DONE

- [x] `PlatformDistribution.tsx` component implemented and exported
- [x] `PlatformDistribution.module.css` with responsive styles and dark mode
- [x] All Phase 6 tests written and passing
- [x] Component integrated into `/dashboard` page
- [x] No TypeScript errors or warnings (in PlatformDistribution files)
- [x] No ESLint errors
- [x] CSS matches existing design system (font families, colors, spacing)
- [x] Component works on mobile viewport (responsive)
- [ ] Manual testing completed for all three platforms
- [ ] Code reviewed (if team process requires)

---

## Technical Notes

### Tech Stack
- **React 18+** with TypeScript - Component library
- **CSS Modules** - Scoped styling (no Tailwind in this codebase)
- **Next.js 14+ App Router** - Page routing and navigation
- **Vitest + @testing-library/react** - Testing framework

### Design Principles
- **Reuse over rebuild:** Leverage PlatformBadge icons and StatsCard patterns
- **CSS-first visualizations:** Avoid chart libraries for simple visualizations
- **Progressive disclosure:** Show summary first, details on demand
- **Mobile-first responsive:** Component must work on small screens

### File Structure
```
apps/web/components/dashboard/
  PlatformDistribution.tsx       # Main component
  PlatformDistribution.module.css # Styles
  __tests__/
    PlatformDistribution.test.tsx # Tests
  types.ts                        # Add PlatformDistributionData types
  index.ts                        # Add export
```

### Platform Colors (from PlatformBadge.module.css)
- Reddit: `#ff4500` (light), `#ff6b3d` (dark)
- Google: `#4285f4` (light), `#6fa8ff` (dark)
- Facebook: `#1877f2` (light), `#4d9aff` (dark)

---

## Next Steps

1. **API Integration** - When `dashboard-stats-api` feature is complete, replace placeholder data with real API calls
2. **Analytics Expansion** - Consider adding click-through to platform-specific analytics
3. **Comparison View** - Allow comparing distribution across time periods
4. **Export Feature** - Add ability to export distribution data as CSV/image
