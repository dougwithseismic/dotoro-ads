/**
 * Budget & Bidding Configuration Types
 *
 * Enhanced budget and bidding configuration system enabling full control
 * over campaign spending, scheduling, and optimization strategies.
 */

import type { Platform } from "../ad-types/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Budget Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Budget type
 * - daily: Resets each day
 * - lifetime: Total for campaign duration
 * - shared: Shared across multiple campaigns
 */
export type BudgetType = "daily" | "lifetime" | "shared";

/**
 * Optional spending caps to prevent overspending
 */
export interface BudgetCaps {
  /** Maximum daily spend (overrides daily budget if lower) */
  dailyCap?: string;

  /** Maximum weekly spend */
  weeklyCap?: string;

  /** Maximum monthly spend */
  monthlyCap?: string;

  /** Maximum total spend (for lifetime campaigns) */
  totalCap?: string;
}

/**
 * Budget configuration for campaigns
 */
export interface BudgetConfig {
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

  /**
   * ID of the shared budget group
   * Only applicable when type is 'shared'
   */
  sharedBudgetId?: string;

  /**
   * Name for the shared budget (when creating new)
   */
  sharedBudgetName?: string;

  /**
   * Budget pacing strategy
   * - standard: Spend evenly throughout the day/period
   * - accelerated: Spend as fast as possible (may exhaust budget early)
   */
  pacing?: "standard" | "accelerated";

  /**
   * Delivery optimization method
   * Platform-specific; not all platforms support all options
   */
  deliveryMethod?: "standard" | "accelerated" | "sequenced";

  /**
   * Optional spending caps to prevent overspending
   */
  caps?: BudgetCaps;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Day of week for scheduling
 */
export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

/**
 * Time range for day parting
 */
export interface TimeRange {
  /** Start time in 24-hour format (HH:MM) */
  start: string;

  /** End time in 24-hour format (HH:MM) */
  end: string;
}

/**
 * Schedule by day of week
 */
export type DaySchedule = {
  [day in DayOfWeek]?: TimeRange[];
};

/**
 * Day parting configuration
 */
export interface DayPartingConfig {
  /** Timezone for day parting schedule */
  timezone: string;

  /** Schedule by day of week */
  schedule: DaySchedule;

  /**
   * Bid adjustment during scheduled hours
   * e.g., 1.2 = +20% bid during these hours
   */
  bidModifier?: number;
}

/**
 * Campaign schedule configuration
 */
export interface ScheduleConfig {
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

  /**
   * Day parting configuration
   * Specify which hours of which days ads should run
   */
  dayParting?: DayPartingConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bidding Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Available bidding strategies across all platforms
 */
export type BiddingStrategy =
  // Google Ads Strategies
  | "maximize_clicks" // Get as many clicks as possible
  | "maximize_conversions" // Get as many conversions as possible
  | "maximize_conversion_value" // Maximize total conversion value
  | "target_cpa" // Target cost per acquisition
  | "target_roas" // Target return on ad spend
  | "target_impression_share" // Target impression share percentage
  | "manual_cpc" // Manual cost per click
  | "enhanced_cpc" // Manual CPC with smart adjustments
  // Reddit Ads Strategies
  | "reddit_cpm" // Cost per 1000 impressions
  | "reddit_cpc" // Cost per click
  | "reddit_cpv" // Cost per video view
  // Facebook Ads Strategies
  | "lowest_cost" // Get most results for budget
  | "cost_cap" // Control average cost per result
  | "bid_cap" // Set maximum bid
  | "minimum_roas" // Set minimum return on ad spend
  | "highest_value"; // Get highest value conversions

/**
 * Type of bid adjustment
 */
export type BidAdjustmentType =
  | "device" // Device type (mobile, desktop, tablet)
  | "location" // Geographic location
  | "audience" // Audience segment
  | "time" // Time of day
  | "demographic" // Age, gender
  | "placement"; // Where ad appears

/**
 * Bid adjustment configuration
 */
export interface BidAdjustment {
  /** Type of adjustment */
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

/**
 * Bidding configuration for campaigns
 */
export interface BiddingConfig {
  /**
   * Bidding strategy to use
   * Available strategies vary by platform
   */
  strategy: BiddingStrategy;

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

  /**
   * Bid adjustments by dimension
   */
  adjustments?: BidAdjustment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete budget, bidding, and schedule configuration
 */
export interface CampaignBudgetConfig {
  budget: BudgetConfig;
  bidding?: BiddingConfig;
  schedule?: ScheduleConfig;
}

/**
 * Platform-specific overrides for budget and bidding
 */
export interface PlatformBudgetOverrides {
  budgetConfig?: Partial<BudgetConfig>;
  biddingConfig?: Partial<BiddingConfig>;
}

/**
 * Budget configuration with platform overrides
 */
export interface BudgetWithOverrides extends CampaignBudgetConfig {
  platformOverrides?: Record<Platform, PlatformBudgetOverrides>;
}

// Re-export Platform type for convenience
export type { Platform };
