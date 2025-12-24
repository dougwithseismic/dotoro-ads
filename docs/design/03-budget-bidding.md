# Budget & Bidding Configuration

## Overview

This document defines the enhanced budget and bidding configuration system, enabling full control over campaign spending, scheduling, and optimization strategies across all supported platforms.

---

## Current State

The existing `BudgetConfig` is minimal:

```typescript
// Current implementation
interface BudgetConfig {
  type: 'daily' | 'lifetime';
  amountPattern: string;  // Supports {variable} patterns
  currency: string;
}
```

**Limitations:**
- No bidding strategy configuration
- No scheduling (start/end dates)
- No pacing controls
- No budget caps
- No bid adjustments

---

## Enhanced Type Definitions

### BudgetConfig (Enhanced)

```typescript
// packages/core/src/budget/types.ts

export type BudgetType = 'daily' | 'lifetime' | 'shared';

export interface BudgetConfig {
  // ─────────────────────────────────────────────────────────────────────
  // Core Budget Settings
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Budget type
   * - daily: Resets each day
   * - lifetime: Total for campaign duration
   * - shared: Shared across multiple campaigns (requires sharedBudgetId)
   */
  type: BudgetType;

  /**
   * Budget amount pattern
   * Can be a fixed value ("100") or variable pattern ("{budget}")
   */
  amountPattern: string;

  /**
   * Currency code (ISO 4217)
   */
  currency: string;

  // ─────────────────────────────────────────────────────────────────────
  // Shared Budget (only for type: 'shared')
  // ─────────────────────────────────────────────────────────────────────

  /**
   * ID of the shared budget group
   * Only applicable when type is 'shared'
   */
  sharedBudgetId?: string;

  /**
   * Name for the shared budget (when creating new)
   */
  sharedBudgetName?: string;

  // ─────────────────────────────────────────────────────────────────────
  // Pacing
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Budget pacing strategy
   * - standard: Spend evenly throughout the day/period
   * - accelerated: Spend as fast as possible (may exhaust budget early)
   */
  pacing?: 'standard' | 'accelerated';

  // ─────────────────────────────────────────────────────────────────────
  // Delivery Method (Platform-specific)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Delivery optimization method
   * Platform-specific; not all platforms support all options
   */
  deliveryMethod?: 'standard' | 'accelerated' | 'sequenced';

  // ─────────────────────────────────────────────────────────────────────
  // Budget Caps (optional)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Optional spending caps to prevent overspending
   */
  caps?: BudgetCaps;
}

export interface BudgetCaps {
  /**
   * Maximum daily spend (overrides daily budget if lower)
   */
  dailyCap?: string;

  /**
   * Maximum weekly spend
   */
  weeklyCap?: string;

  /**
   * Maximum monthly spend
   */
  monthlyCap?: string;

  /**
   * Maximum total spend (for lifetime campaigns)
   */
  totalCap?: string;
}
```

### ScheduleConfig

```typescript
export interface ScheduleConfig {
  // ─────────────────────────────────────────────────────────────────────
  // Campaign Duration
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Campaign start date (ISO 8601 string or variable pattern)
   * If not set, campaign starts immediately upon activation
   */
  startDate?: string;

  /**
   * Campaign end date (ISO 8601 string or variable pattern)
   * If not set, campaign runs indefinitely
   */
  endDate?: string;

  /**
   * Timezone for scheduling (IANA timezone name)
   * e.g., 'America/New_York', 'Europe/London'
   */
  timezone?: string;

  // ─────────────────────────────────────────────────────────────────────
  // Day Parting (Ad Scheduling)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Day parting configuration
   * Specify which hours of which days ads should run
   */
  dayParting?: DayPartingConfig;
}

export interface DayPartingConfig {
  /**
   * Timezone for day parting schedule
   */
  timezone: string;

  /**
   * Schedule by day of week
   * Key is day (0-6, where 0 is Sunday)
   * Value is array of time ranges
   */
  schedule: DaySchedule;

  /**
   * Bid adjustment during scheduled hours
   * e.g., 1.2 = +20% bid during these hours
   */
  bidModifier?: number;
}

export type DaySchedule = {
  [day in DayOfWeek]?: TimeRange[];
};

export type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface TimeRange {
  /**
   * Start time in 24-hour format (HH:MM)
   */
  start: string;

  /**
   * End time in 24-hour format (HH:MM)
   */
  end: string;
}
```

### BiddingConfig

```typescript
export interface BiddingConfig {
  // ─────────────────────────────────────────────────────────────────────
  // Bidding Strategy
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Bidding strategy to use
   * Available strategies vary by platform
   */
  strategy: BiddingStrategy;

  // ─────────────────────────────────────────────────────────────────────
  // Target Values (for target-based strategies)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Target CPA (Cost Per Acquisition)
   * For strategies: 'target_cpa', 'cost_cap'
   * Can be fixed value or variable pattern
   */
  targetCpa?: string;

  /**
   * Target ROAS (Return On Ad Spend)
   * For strategies: 'target_roas', 'minimum_roas'
   * Value is a multiplier (e.g., 4.0 = 400% return)
   */
  targetRoas?: string;

  /**
   * Target CPM (Cost Per Mille / 1000 impressions)
   * For strategies: 'cpm'
   */
  targetCpm?: string;

  /**
   * Target CPV (Cost Per View)
   * For strategies: 'cpv'
   */
  targetCpv?: string;

  // ─────────────────────────────────────────────────────────────────────
  // Bid Limits
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Maximum CPC (Cost Per Click)
   * For strategies: 'manual_cpc', 'enhanced_cpc', 'cpc', 'bid_cap'
   */
  maxCpc?: string;

  /**
   * Maximum CPM
   * For strategies: 'cpm'
   */
  maxCpm?: string;

  /**
   * Maximum CPV
   * For strategies: 'cpv'
   */
  maxCpv?: string;

  // ─────────────────────────────────────────────────────────────────────
  // Bid Adjustments
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Bid adjustments by dimension
   */
  adjustments?: BidAdjustment[];
}

export type BiddingStrategy =
  // ─────────────────────────────────────────────────────────────────────
  // Google Ads Strategies
  // ─────────────────────────────────────────────────────────────────────
  | 'maximize_clicks'           // Get as many clicks as possible
  | 'maximize_conversions'      // Get as many conversions as possible
  | 'maximize_conversion_value' // Maximize total conversion value
  | 'target_cpa'                // Target cost per acquisition
  | 'target_roas'               // Target return on ad spend
  | 'target_impression_share'   // Target impression share percentage
  | 'manual_cpc'                // Manual cost per click
  | 'enhanced_cpc'              // Manual CPC with smart adjustments

  // ─────────────────────────────────────────────────────────────────────
  // Reddit Ads Strategies
  // ─────────────────────────────────────────────────────────────────────
  | 'reddit_cpm'                // Cost per 1000 impressions
  | 'reddit_cpc'                // Cost per click
  | 'reddit_cpv'                // Cost per video view

  // ─────────────────────────────────────────────────────────────────────
  // Facebook Ads Strategies
  // ─────────────────────────────────────────────────────────────────────
  | 'lowest_cost'               // Get most results for budget
  | 'cost_cap'                  // Control average cost per result
  | 'bid_cap'                   // Set maximum bid
  | 'minimum_roas'              // Set minimum return on ad spend
  | 'highest_value';            // Get highest value conversions

export interface BidAdjustment {
  /**
   * Type of adjustment
   */
  type: BidAdjustmentType;

  /**
   * Target for the adjustment
   * e.g., 'mobile' for device, 'US' for location
   */
  target: string;

  /**
   * Bid modifier (multiplier)
   * e.g., 1.2 = +20%, 0.8 = -20%
   * Range: 0.0 to 10.0 (0 = don't show, 10 = 10x bid)
   */
  modifier: number;
}

export type BidAdjustmentType =
  | 'device'      // Device type (mobile, desktop, tablet)
  | 'location'    // Geographic location
  | 'audience'    // Audience segment
  | 'time'        // Time of day
  | 'demographic' // Age, gender
  | 'placement';  // Where ad appears
```

---

## Platform-Specific Bidding Strategies

### Strategy Definitions

```typescript
// packages/core/src/budget/strategies.ts

import { Platform, BiddingStrategy } from './types';

export interface BiddingStrategyDefinition {
  id: BiddingStrategy;
  name: string;
  description: string;
  platform: Platform;

  // What inputs are required
  requiresTargetCpa?: boolean;
  requiresTargetRoas?: boolean;
  requiresMaxBid?: boolean;
  supportsAdjustments?: boolean;

  // Recommendations
  recommendedFor?: string[];
  notRecommendedFor?: string[];

  // Minimum requirements
  minimumBudget?: number;  // Minimum daily budget
  minimumData?: {
    conversions?: number;  // Minimum conversions for learning
    clicks?: number;
  };
}

export const BIDDING_STRATEGIES: Record<Platform, BiddingStrategyDefinition[]> = {
  // ─────────────────────────────────────────────────────────────────────
  // Google Ads
  // ─────────────────────────────────────────────────────────────────────
  google: [
    {
      id: 'maximize_clicks',
      name: 'Maximize Clicks',
      description: 'Automatically sets bids to get as many clicks as possible within your budget.',
      platform: 'google',
      supportsAdjustments: true,
      recommendedFor: ['Traffic campaigns', 'Brand awareness', 'New campaigns'],
      notRecommendedFor: ['Conversion-focused campaigns with limited budget'],
    },
    {
      id: 'maximize_conversions',
      name: 'Maximize Conversions',
      description: 'Automatically sets bids to get the most conversions within your budget.',
      platform: 'google',
      supportsAdjustments: false,
      minimumData: { conversions: 15 },
      recommendedFor: ['Campaigns with conversion tracking', 'Lead generation'],
    },
    {
      id: 'maximize_conversion_value',
      name: 'Maximize Conversion Value',
      description: 'Automatically sets bids to maximize total conversion value within your budget.',
      platform: 'google',
      supportsAdjustments: false,
      minimumData: { conversions: 15 },
      recommendedFor: ['E-commerce', 'Revenue-focused campaigns'],
    },
    {
      id: 'target_cpa',
      name: 'Target CPA',
      description: 'Automatically sets bids to get as many conversions as possible at your target cost per acquisition.',
      platform: 'google',
      requiresTargetCpa: true,
      supportsAdjustments: true,
      minimumData: { conversions: 30 },
      recommendedFor: ['Campaigns with consistent conversion rates', 'Predictable CPA goals'],
    },
    {
      id: 'target_roas',
      name: 'Target ROAS',
      description: 'Automatically sets bids to maximize conversion value while trying to reach your target return on ad spend.',
      platform: 'google',
      requiresTargetRoas: true,
      supportsAdjustments: true,
      minimumData: { conversions: 15 },
      recommendedFor: ['E-commerce with value tracking', 'Revenue optimization'],
    },
    {
      id: 'target_impression_share',
      name: 'Target Impression Share',
      description: 'Automatically sets bids to show your ad at the target impression share percentage.',
      platform: 'google',
      supportsAdjustments: true,
      recommendedFor: ['Brand campaigns', 'Competitive positioning'],
    },
    {
      id: 'manual_cpc',
      name: 'Manual CPC',
      description: 'You set the maximum cost per click for each ad.',
      platform: 'google',
      requiresMaxBid: true,
      supportsAdjustments: true,
      recommendedFor: ['Full bid control', 'Small campaigns', 'Testing'],
    },
    {
      id: 'enhanced_cpc',
      name: 'Enhanced CPC',
      description: 'Manual bidding with automatic adjustments for conversions.',
      platform: 'google',
      requiresMaxBid: true,
      supportsAdjustments: true,
      recommendedFor: ['Transitioning from manual to automated', 'Moderate control needs'],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────
  // Reddit Ads
  // ─────────────────────────────────────────────────────────────────────
  reddit: [
    {
      id: 'reddit_cpm',
      name: 'CPM (Cost per 1,000 Impressions)',
      description: 'Pay for every 1,000 times your ad is shown.',
      platform: 'reddit',
      requiresMaxBid: true,
      recommendedFor: ['Brand awareness', 'Reach campaigns'],
      minimumBudget: 5,
    },
    {
      id: 'reddit_cpc',
      name: 'CPC (Cost per Click)',
      description: 'Pay when someone clicks your ad.',
      platform: 'reddit',
      requiresMaxBid: true,
      recommendedFor: ['Traffic campaigns', 'Website visits'],
      minimumBudget: 5,
    },
    {
      id: 'reddit_cpv',
      name: 'CPV (Cost per View)',
      description: 'Pay for video views (3+ seconds).',
      platform: 'reddit',
      requiresMaxBid: true,
      recommendedFor: ['Video ad campaigns', 'Engagement'],
      minimumBudget: 5,
    },
  ],

  // ─────────────────────────────────────────────────────────────────────
  // Facebook Ads
  // ─────────────────────────────────────────────────────────────────────
  facebook: [
    {
      id: 'lowest_cost',
      name: 'Lowest Cost',
      description: 'Get the most results for your budget. Facebook will bid to get the lowest cost per result.',
      platform: 'facebook',
      supportsAdjustments: false,
      recommendedFor: ['Most campaigns', 'Budget-conscious advertisers'],
    },
    {
      id: 'cost_cap',
      name: 'Cost Cap',
      description: 'Control your average cost per result while maximizing results.',
      platform: 'facebook',
      requiresTargetCpa: true,
      supportsAdjustments: false,
      recommendedFor: ['Predictable cost per result', 'Scaling campaigns'],
    },
    {
      id: 'bid_cap',
      name: 'Bid Cap',
      description: 'Set the maximum bid Facebook can use in each auction.',
      platform: 'facebook',
      requiresMaxBid: true,
      supportsAdjustments: false,
      recommendedFor: ['Strict cost control', 'Competitive auctions'],
    },
    {
      id: 'minimum_roas',
      name: 'Minimum ROAS',
      description: 'Set a minimum return on ad spend for value optimization campaigns.',
      platform: 'facebook',
      requiresTargetRoas: true,
      supportsAdjustments: false,
      recommendedFor: ['E-commerce', 'Value-based optimization'],
    },
    {
      id: 'highest_value',
      name: 'Highest Value',
      description: 'Get the highest value conversions within your budget.',
      platform: 'facebook',
      supportsAdjustments: false,
      recommendedFor: ['High-value products', 'Revenue optimization'],
    },
  ],
};

/**
 * Get available bidding strategies for a platform
 */
export function getBiddingStrategies(platform: Platform): BiddingStrategyDefinition[] {
  return BIDDING_STRATEGIES[platform] || [];
}

/**
 * Get a specific bidding strategy definition
 */
export function getBiddingStrategy(
  platform: Platform,
  strategyId: BiddingStrategy
): BiddingStrategyDefinition | undefined {
  return getBiddingStrategies(platform).find(s => s.id === strategyId);
}
```

---

## UX Components

### Budget Configuration Component

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Budget Configuration                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Budget Type                                                          │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │   │
│  │  │   📅 Daily       │ │   🎯 Lifetime    │ │   🔗 Shared      │    │   │
│  │  │   ━━━━━━━━━━     │ │                  │ │                  │    │   │
│  │  │   Resets daily   │ │   Fixed total    │ │   Share across   │    │   │
│  │  │                  │ │   for duration   │ │   campaigns      │    │   │
│  │  └──────────────────┘ └──────────────────┘ └──────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Budget Amount                                                        │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────┐  ┌─────────────────┐  │   │
│  │  │ $ │ {daily_budget}                      │  │ USD         ▾ │  │   │
│  │  └─────────────────────────────────────────┘  └─────────────────┘  │   │
│  │                                                                      │   │
│  │  💡 Use a fixed value (e.g., "100") or a variable from your data   │   │
│  │     source (e.g., "{budget}").                                      │   │
│  │                                                                      │   │
│  │  Preview: Row 1 → $50.00 USD                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ▸ Pacing                                                    [Expand] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ▸ Spending Caps (Optional)                                  [Expand] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pacing Configuration (Expanded)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▾ Pacing                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  How should your budget be spent?                                          │
│                                                                             │
│  ┌──────────────────────────────────────┐ ┌──────────────────────────────┐ │
│  │   ⏱️ Standard (Recommended)          │ │   ⚡ Accelerated             │ │
│  │   ━━━━━━━━━━━━━━━━━━━━━━            │ │                              │ │
│  │   Spend evenly throughout the       │ │   Spend as quickly as        │ │
│  │   day to maximize exposure          │ │   possible. May exhaust      │ │
│  │                                      │ │   budget early.              │ │
│  └──────────────────────────────────────┘ └──────────────────────────────┘ │
│                                                                             │
│  ⚠️ Accelerated pacing is not available for all platforms or budgets      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Spending Caps (Expanded)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▾ Spending Caps (Optional)                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Set maximum spending limits to prevent overspending.                      │
│                                                                             │
│  Daily Cap:   ┌────────────────────────────────────────┐                   │
│               │ (Leave empty for no cap)               │                   │
│               └────────────────────────────────────────┘                   │
│                                                                             │
│  Weekly Cap:  ┌────────────────────────────────────────┐                   │
│               │ (Leave empty for no cap)               │                   │
│               └────────────────────────────────────────┘                   │
│                                                                             │
│  Monthly Cap: ┌────────────────────────────────────────┐                   │
│               │ 5000                                    │                   │
│               └────────────────────────────────────────┘                   │
│                                                                             │
│  💡 Caps override your budget if exceeded. For example, with a $100       │
│     daily budget and $500 weekly cap, spending stops at $500/week.        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Schedule Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Schedule                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Campaign Duration                                                    │   │
│  │                                                                      │   │
│  │  ○ Run continuously (start immediately, no end date)                │   │
│  │  ● Set start and end dates                                          │   │
│  │                                                                      │   │
│  │  Start Date:  ┌─────────────────────┐  End Date: ┌─────────────────┐│   │
│  │               │ 📅 2024-01-15      │            │ 📅 2024-02-15   ││   │
│  │               └─────────────────────┘            └─────────────────┘│   │
│  │                                                                      │   │
│  │  Timezone:    ┌─────────────────────────────────────────────────┐   │   │
│  │               │ America/New_York (EST/EDT)                    ▾ │   │   │
│  │               └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ▸ Day Parting (Run ads only during specific hours)          [Expand] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Day Parting Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▾ Day Parting                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Run ads only during these hours (in America/New_York timezone):           │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │      │ 12a  3a  6a  9a  12p  3p  6p  9p  12a                        │  │
│  │ ─────┼────────────────────────────────────────────────────────────── │  │
│  │ Mon  │           ████████████████████████████                       │  │
│  │ Tue  │           ████████████████████████████                       │  │
│  │ Wed  │           ████████████████████████████                       │  │
│  │ Thu  │           ████████████████████████████                       │  │
│  │ Fri  │           ████████████████████████████████████               │  │
│  │ Sat  │      ██████████████████████████████████████████              │  │
│  │ Sun  │      ██████████████████████████████████████████              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Quick Presets:                                                            │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                  │
│  │ Business Hours │ │ Evenings Only  │ │ Weekends Only  │                  │
│  └────────────────┘ └────────────────┘ └────────────────┘                  │
│                                                                             │
│  Bid adjustment during scheduled hours: ┌────────────────────────────────┐ │
│                                          │ No adjustment (1.0x)        ▾ │ │
│                                          └────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bidding Strategy Selector

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Bidding Strategy                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Platform: Google Ads                                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ● Maximize Conversions (Recommended)                                │   │
│  │   Automatically sets bids to get the most conversions within        │   │
│  │   your budget.                                                       │   │
│  │   ✓ Best for: Campaigns with conversion tracking                    │   │
│  │   ⚠️ Requires: 15+ conversions in last 30 days for optimization    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Target CPA                                                         │   │
│  │   Automatically sets bids to get as many conversions as possible    │   │
│  │   at your target cost per acquisition.                               │   │
│  │   ✓ Best for: Predictable CPA goals                                 │   │
│  │   ⚠️ Requires: 30+ conversions in last 30 days                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Target ROAS                                                        │   │
│  │   Maximize conversion value while targeting a specific return on    │   │
│  │   ad spend.                                                          │   │
│  │   ✓ Best for: E-commerce with value tracking                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Manual CPC                                                         │   │
│  │   You set the maximum cost per click for each ad.                   │   │
│  │   ✓ Best for: Full control over bids                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ▸ More strategies...                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Target CPA Configuration (when selected)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Target CPA Configuration                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Target Cost Per Acquisition:                                              │
│                                                                             │
│  ┌───────────────────────────────────────────────┐  ┌───────────────────┐  │
│  │ $ │ 25.00                                     │  │ USD           ▾ │  │
│  └───────────────────────────────────────────────┘  └───────────────────┘  │
│                                                                             │
│  💡 Set this to your target cost per conversion. The system will try to   │
│     average at or below this cost while maximizing conversions.            │
│                                                                             │
│  You can also use a variable: {target_cpa}                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☑️ Set a maximum CPC limit                                           │   │
│  │                                                                      │   │
│  │    Max CPC: ┌─────────────────────────────────┐                     │   │
│  │             │ $ │ 5.00                        │                     │   │
│  │             └─────────────────────────────────┘                     │   │
│  │                                                                      │   │
│  │    ⚠️ Setting a max CPC may limit the system's ability to hit your │   │
│  │       target CPA.                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bid Adjustments

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Bid Adjustments                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Adjust bids based on device, location, audience, or time.                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Device Adjustments                                                   │   │
│  │                                                                      │   │
│  │  Desktop:  ━━━━━━━━━━━━━●━━━━━━━━  +20% ($6.00 max CPC)            │   │
│  │  Mobile:   ━━━━━━━●━━━━━━━━━━━━━━  -10% ($4.50 max CPC)            │   │
│  │  Tablet:   ━━━━━━━━━━●━━━━━━━━━━━  No adjustment ($5.00)           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Location Adjustments                                     [+ Add]    │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ California, US        ━━━━━━━━━━━●━━━━  +15%    [✕]        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ New York, US          ━━━━━━━━━━━━━●━━  +25%    [✕]        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ▸ Audience Adjustments                                       [Expand] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Validation

```typescript
// packages/core/src/budget/validation.ts

import { BudgetConfig, BiddingConfig, ScheduleConfig } from './types';
import { ValidationResult } from '../types';

export function validateBudgetConfig(
  config: BudgetConfig,
  platform: Platform
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Budget type validation
  if (!['daily', 'lifetime', 'shared'].includes(config.type)) {
    errors.push(`Invalid budget type: ${config.type}`);
  }

  // Shared budget validation
  if (config.type === 'shared' && !config.sharedBudgetId && !config.sharedBudgetName) {
    errors.push('Shared budget requires either an existing budget ID or a name for a new budget');
  }

  // Amount validation
  if (!config.amountPattern || config.amountPattern.trim() === '') {
    errors.push('Budget amount is required');
  }

  // Currency validation
  if (!config.currency || config.currency.length !== 3) {
    errors.push('Currency must be a 3-letter code (e.g., USD)');
  }

  // Pacing validation
  if (config.pacing === 'accelerated') {
    warnings.push('Accelerated pacing may exhaust your budget early in the day');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateBiddingConfig(
  config: BiddingConfig,
  platform: Platform
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const strategyDef = getBiddingStrategy(platform, config.strategy);
  if (!strategyDef) {
    errors.push(`Bidding strategy "${config.strategy}" is not available for ${platform}`);
    return { valid: false, errors, warnings };
  }

  // Check required fields based on strategy
  if (strategyDef.requiresTargetCpa && !config.targetCpa) {
    errors.push(`Target CPA is required for ${strategyDef.name} strategy`);
  }

  if (strategyDef.requiresTargetRoas && !config.targetRoas) {
    errors.push(`Target ROAS is required for ${strategyDef.name} strategy`);
  }

  if (strategyDef.requiresMaxBid && !config.maxCpc && !config.maxCpm && !config.maxCpv) {
    errors.push(`Maximum bid is required for ${strategyDef.name} strategy`);
  }

  // Validate bid adjustments
  if (config.adjustments) {
    for (const adj of config.adjustments) {
      if (adj.modifier < 0 || adj.modifier > 10) {
        errors.push(`Bid adjustment modifier must be between 0 and 10 (got ${adj.modifier})`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateScheduleConfig(
  config: ScheduleConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Date validation
  if (config.startDate && config.endDate) {
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);

    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format');
    }
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format');
    }
    if (start >= end) {
      errors.push('End date must be after start date');
    }
  }

  // Day parting validation
  if (config.dayParting) {
    const { schedule } = config.dayParting;

    for (const [day, ranges] of Object.entries(schedule)) {
      if (ranges) {
        for (const range of ranges) {
          if (!isValidTimeFormat(range.start) || !isValidTimeFormat(range.end)) {
            errors.push(`Invalid time format in ${day} schedule`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
```

---

## Integration with Wizard

```typescript
// Updated WizardState type
export interface WizardState {
  // ... existing fields ...

  // Budget & Bidding (Step 6)
  budgetConfig: BudgetConfig | null;
  biddingConfig: BiddingConfig | null;
  scheduleConfig: ScheduleConfig | null;

  // Per-platform overrides (optional)
  platformOverrides: Record<Platform, {
    budgetConfig?: Partial<BudgetConfig>;
    biddingConfig?: Partial<BiddingConfig>;
  }>;
}
```
