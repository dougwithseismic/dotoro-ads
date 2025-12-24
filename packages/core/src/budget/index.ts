/**
 * Budget Module
 *
 * Exports all budget-related types, strategies, and validation functions.
 */

// Export all types
export type {
  BudgetType,
  BudgetCaps,
  BudgetConfig,
  DayOfWeek,
  TimeRange,
  DaySchedule,
  DayPartingConfig,
  ScheduleConfig,
  BiddingStrategy,
  BidAdjustmentType,
  BidAdjustment,
  BiddingConfig,
  CampaignBudgetConfig,
  PlatformBudgetOverrides,
  BudgetWithOverrides,
} from "./types.js";

// Export strategy-related items
export type { BiddingStrategyDefinition } from "./strategies.js";
export {
  BIDDING_STRATEGIES,
  getBiddingStrategies,
  getBiddingStrategy,
  isValidStrategyForPlatform,
  getStrategiesRequiringTargetCpa,
  getStrategiesRequiringTargetRoas,
  getStrategiesSupportingAdjustments,
} from "./strategies.js";

// Export validation functions
export type { ValidationResult } from "./validation.js";
export {
  validateBudgetConfig,
  validateBiddingConfig,
  validateScheduleConfig,
} from "./validation.js";
