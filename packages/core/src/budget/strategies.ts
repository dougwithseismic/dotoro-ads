/**
 * Platform-Specific Bidding Strategies
 *
 * Defines available bidding strategies for each platform with their
 * requirements, recommendations, and configuration needs.
 */

import type { Platform } from "../ad-types/types.js";
import type { BiddingStrategy } from "./types.js";

/**
 * Definition of a bidding strategy with its characteristics
 */
export interface BiddingStrategyDefinition {
  /** Strategy identifier */
  id: BiddingStrategy;

  /** Display name */
  name: string;

  /** Description of what the strategy does */
  description: string;

  /** Platform this strategy belongs to */
  platform: Platform;

  /** Whether target CPA is required */
  requiresTargetCpa?: boolean;

  /** Whether target ROAS is required */
  requiresTargetRoas?: boolean;

  /** Whether a maximum bid is required */
  requiresMaxBid?: boolean;

  /** Whether bid adjustments are supported */
  supportsAdjustments?: boolean;

  /** Recommended use cases */
  recommendedFor?: string[];

  /** Cases where this strategy is not recommended */
  notRecommendedFor?: string[];

  /** Minimum daily budget required */
  minimumBudget?: number;

  /** Minimum data requirements for optimization */
  minimumData?: {
    conversions?: number;
    clicks?: number;
  };
}

/**
 * All bidding strategies organized by platform
 */
export const BIDDING_STRATEGIES: Record<Platform, BiddingStrategyDefinition[]> =
  {
    // ─────────────────────────────────────────────────────────────────────────
    // Google Ads Strategies
    // ─────────────────────────────────────────────────────────────────────────
    google: [
      {
        id: "maximize_clicks",
        name: "Maximize Clicks",
        description:
          "Automatically sets bids to get as many clicks as possible within your budget.",
        platform: "google",
        supportsAdjustments: true,
        recommendedFor: [
          "Traffic campaigns",
          "Brand awareness",
          "New campaigns",
        ],
        notRecommendedFor: ["Conversion-focused campaigns with limited budget"],
      },
      {
        id: "maximize_conversions",
        name: "Maximize Conversions",
        description:
          "Automatically sets bids to get the most conversions within your budget.",
        platform: "google",
        supportsAdjustments: false,
        minimumData: { conversions: 15 },
        recommendedFor: [
          "Campaigns with conversion tracking",
          "Lead generation",
        ],
      },
      {
        id: "maximize_conversion_value",
        name: "Maximize Conversion Value",
        description:
          "Automatically sets bids to maximize total conversion value within your budget.",
        platform: "google",
        supportsAdjustments: false,
        minimumData: { conversions: 15 },
        recommendedFor: ["E-commerce", "Revenue-focused campaigns"],
      },
      {
        id: "target_cpa",
        name: "Target CPA",
        description:
          "Automatically sets bids to get as many conversions as possible at your target cost per acquisition.",
        platform: "google",
        requiresTargetCpa: true,
        supportsAdjustments: true,
        minimumData: { conversions: 30 },
        recommendedFor: [
          "Campaigns with consistent conversion rates",
          "Predictable CPA goals",
        ],
      },
      {
        id: "target_roas",
        name: "Target ROAS",
        description:
          "Automatically sets bids to maximize conversion value while trying to reach your target return on ad spend.",
        platform: "google",
        requiresTargetRoas: true,
        supportsAdjustments: true,
        minimumData: { conversions: 15 },
        recommendedFor: [
          "E-commerce with value tracking",
          "Revenue optimization",
        ],
      },
      {
        id: "target_impression_share",
        name: "Target Impression Share",
        description:
          "Automatically sets bids to show your ad at the target impression share percentage.",
        platform: "google",
        supportsAdjustments: true,
        recommendedFor: ["Brand campaigns", "Competitive positioning"],
      },
      {
        id: "manual_cpc",
        name: "Manual CPC",
        description: "You set the maximum cost per click for each ad.",
        platform: "google",
        requiresMaxBid: true,
        supportsAdjustments: true,
        recommendedFor: ["Full bid control", "Small campaigns", "Testing"],
      },
      {
        id: "enhanced_cpc",
        name: "Enhanced CPC",
        description:
          "Manual bidding with automatic adjustments for conversions.",
        platform: "google",
        requiresMaxBid: true,
        supportsAdjustments: true,
        recommendedFor: [
          "Transitioning from manual to automated",
          "Moderate control needs",
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // Reddit Ads Strategies
    // ─────────────────────────────────────────────────────────────────────────
    reddit: [
      {
        id: "reddit_cpm",
        name: "CPM (Cost per 1,000 Impressions)",
        description: "Pay for every 1,000 times your ad is shown.",
        platform: "reddit",
        requiresMaxBid: true,
        recommendedFor: ["Brand awareness", "Reach campaigns"],
        minimumBudget: 5,
      },
      {
        id: "reddit_cpc",
        name: "CPC (Cost per Click)",
        description: "Pay when someone clicks your ad.",
        platform: "reddit",
        requiresMaxBid: true,
        recommendedFor: ["Traffic campaigns", "Website visits"],
        minimumBudget: 5,
      },
      {
        id: "reddit_cpv",
        name: "CPV (Cost per View)",
        description: "Pay for video views (3+ seconds).",
        platform: "reddit",
        requiresMaxBid: true,
        recommendedFor: ["Video ad campaigns", "Engagement"],
        minimumBudget: 5,
      },
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // Facebook Ads Strategies
    // ─────────────────────────────────────────────────────────────────────────
    facebook: [
      {
        id: "lowest_cost",
        name: "Lowest Cost",
        description:
          "Get the most results for your budget. Facebook will bid to get the lowest cost per result.",
        platform: "facebook",
        supportsAdjustments: false,
        recommendedFor: ["Most campaigns", "Budget-conscious advertisers"],
      },
      {
        id: "cost_cap",
        name: "Cost Cap",
        description:
          "Control your average cost per result while maximizing results.",
        platform: "facebook",
        requiresTargetCpa: true,
        supportsAdjustments: false,
        recommendedFor: ["Predictable cost per result", "Scaling campaigns"],
      },
      {
        id: "bid_cap",
        name: "Bid Cap",
        description:
          "Set the maximum bid Facebook can use in each auction.",
        platform: "facebook",
        requiresMaxBid: true,
        supportsAdjustments: false,
        recommendedFor: ["Strict cost control", "Competitive auctions"],
      },
      {
        id: "minimum_roas",
        name: "Minimum ROAS",
        description:
          "Set a minimum return on ad spend for value optimization campaigns.",
        platform: "facebook",
        requiresTargetRoas: true,
        supportsAdjustments: false,
        recommendedFor: ["E-commerce", "Value-based optimization"],
      },
      {
        id: "highest_value",
        name: "Highest Value",
        description: "Get the highest value conversions within your budget.",
        platform: "facebook",
        supportsAdjustments: false,
        recommendedFor: ["High-value products", "Revenue optimization"],
      },
    ],
  };

/**
 * Get available bidding strategies for a platform
 */
export function getBiddingStrategies(
  platform: Platform
): BiddingStrategyDefinition[] {
  return BIDDING_STRATEGIES[platform] || [];
}

/**
 * Get a specific bidding strategy definition
 */
export function getBiddingStrategy(
  platform: Platform,
  strategyId: BiddingStrategy
): BiddingStrategyDefinition | undefined {
  return getBiddingStrategies(platform).find((s) => s.id === strategyId);
}

/**
 * Check if a bidding strategy is valid for a platform
 */
export function isValidStrategyForPlatform(
  platform: Platform,
  strategyId: BiddingStrategy
): boolean {
  return getBiddingStrategies(platform).some((s) => s.id === strategyId);
}

/**
 * Get all strategies that require a target CPA
 */
export function getStrategiesRequiringTargetCpa(
  platform: Platform
): BiddingStrategyDefinition[] {
  return getBiddingStrategies(platform).filter((s) => s.requiresTargetCpa);
}

/**
 * Get all strategies that require a target ROAS
 */
export function getStrategiesRequiringTargetRoas(
  platform: Platform
): BiddingStrategyDefinition[] {
  return getBiddingStrategies(platform).filter((s) => s.requiresTargetRoas);
}

/**
 * Get all strategies that support bid adjustments
 */
export function getStrategiesSupportingAdjustments(
  platform: Platform
): BiddingStrategyDefinition[] {
  return getBiddingStrategies(platform).filter((s) => s.supportsAdjustments);
}
