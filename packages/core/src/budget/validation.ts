/**
 * Budget and Bidding Validation Functions
 *
 * Validates budget, bidding, and schedule configurations
 * against platform requirements.
 */

import type { Platform } from "../ad-types/types.js";
import type { ValidationResult } from "../shared/validation-types.js";
import type {
  BudgetConfig,
  BiddingConfig,
  ScheduleConfig,
  DayOfWeek,
} from "./types.js";
import { getBiddingStrategy } from "./strategies.js";

// Re-export ValidationResult for backwards compatibility
export type { ValidationResult };

/**
 * Platform-specific minimum daily budget requirements in USD
 * These are approximate minimums - actual requirements may vary by campaign type
 */
const PLATFORM_MIN_DAILY_BUDGETS: Record<Platform, number> = {
  google: 1, // Google Ads minimum is typically $1/day
  facebook: 1, // Meta Ads minimum is typically $1/day
  reddit: 5, // Reddit Ads minimum is typically $5/day
} as const;

/**
 * Validate a budget configuration
 */
export function validateBudgetConfig(
  config: BudgetConfig,
  platform: Platform
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Budget type validation
  if (!["daily", "lifetime", "shared"].includes(config.type)) {
    errors.push(`Invalid budget type: ${config.type}`);
  }

  // Shared budget validation
  if (
    config.type === "shared" &&
    !config.sharedBudgetId &&
    !config.sharedBudgetName
  ) {
    errors.push(
      "Shared budget requires either an existing budget ID or a name for a new budget"
    );
  }

  // Amount validation
  if (!config.amountPattern || config.amountPattern.trim() === "") {
    errors.push("Budget amount is required");
  } else {
    // Check if it's a valid number or variable pattern
    const amount = config.amountPattern.trim();
    const isVariable = amount.includes("{") && amount.includes("}");
    const isNumber = !isNaN(parseFloat(amount));

    if (!isVariable && !isNumber) {
      errors.push(
        "Budget amount must be a number or a variable pattern (e.g., {budget})"
      );
    }

    // Check for negative values if it's a number
    if (isNumber && parseFloat(amount) < 0) {
      errors.push("Budget amount cannot be negative");
    }

    // Platform-specific minimum budget validation
    if (isNumber && config.type === "daily") {
      const numAmount = parseFloat(amount);
      const minBudget = PLATFORM_MIN_DAILY_BUDGETS[platform];
      if (numAmount > 0 && numAmount < minBudget) {
        warnings.push(
          `${platform} typically requires a minimum daily budget of $${minBudget}. Your budget of $${numAmount} may be too low.`
        );
      }
    }
  }

  // Currency validation
  if (!config.currency) {
    errors.push("Currency is required");
  } else if (config.currency.length !== 3) {
    errors.push("Currency must be a 3-letter code (e.g., USD)");
  }

  // Pacing validation
  if (config.pacing === "accelerated") {
    warnings.push(
      "Accelerated pacing may exhaust your budget early in the day"
    );
  }

  // Caps validation
  if (config.caps) {
    const caps = ["dailyCap", "weeklyCap", "monthlyCap", "totalCap"] as const;
    for (const cap of caps) {
      const value = config.caps[cap];
      if (value !== undefined) {
        const isVariable = value.includes("{") && value.includes("}");
        const numValue = parseFloat(value);
        if (!isVariable && (isNaN(numValue) || numValue < 0)) {
          errors.push(`${cap} must be a positive number or variable pattern`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a bidding configuration
 */
export function validateBiddingConfig(
  config: BiddingConfig,
  platform: Platform
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const strategyDef = getBiddingStrategy(platform, config.strategy);
  if (!strategyDef) {
    errors.push(
      `Bidding strategy "${config.strategy}" is not available for ${platform}`
    );
    return { valid: false, errors, warnings };
  }

  // Check required fields based on strategy
  if (strategyDef.requiresTargetCpa && !config.targetCpa) {
    errors.push(`Target CPA is required for ${strategyDef.name} strategy`);
  }

  if (strategyDef.requiresTargetRoas && !config.targetRoas) {
    errors.push(`Target ROAS is required for ${strategyDef.name} strategy`);
  }

  if (
    strategyDef.requiresMaxBid &&
    !config.maxCpc &&
    !config.maxCpm &&
    !config.maxCpv
  ) {
    errors.push(`Maximum bid is required for ${strategyDef.name} strategy`);
  }

  // Validate target values are positive
  if (config.targetCpa) {
    const value = parseFloat(config.targetCpa);
    if (!isNaN(value) && value <= 0) {
      errors.push("Target CPA must be positive");
    }
  }

  if (config.targetRoas) {
    const value = parseFloat(config.targetRoas);
    if (!isNaN(value) && value <= 0) {
      errors.push("Target ROAS must be positive");
    }
  }

  // Validate bid adjustments
  if (config.adjustments) {
    if (!strategyDef.supportsAdjustments) {
      warnings.push(
        `Bid adjustments are not supported for ${strategyDef.name} strategy`
      );
    }

    for (const adj of config.adjustments) {
      if (adj.modifier < 0 || adj.modifier > 10) {
        errors.push(
          `Bid adjustment modifier must be between 0 and 10 (got ${adj.modifier})`
        );
      }
      if (!adj.target || adj.target.trim() === "") {
        errors.push("Bid adjustment target is required");
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a schedule configuration
 */
export function validateScheduleConfig(
  config: ScheduleConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Date validation
  if (config.startDate) {
    if (!isValidDateOrVariable(config.startDate)) {
      errors.push("Invalid start date format");
    }
  }

  if (config.endDate) {
    if (!isValidDateOrVariable(config.endDate)) {
      errors.push("Invalid end date format");
    }
  }

  // Check that end date is after start date (if both are fixed dates)
  if (config.startDate && config.endDate) {
    const startIsVariable =
      config.startDate.includes("{") && config.startDate.includes("}");
    const endIsVariable =
      config.endDate.includes("{") && config.endDate.includes("}");

    if (!startIsVariable && !endIsVariable) {
      const start = new Date(config.startDate);
      const end = new Date(config.endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (start >= end) {
          errors.push("End date must be after start date");
        }
      }
    }
  }

  // Day parting validation
  if (config.dayParting) {
    const { schedule, timezone, bidModifier } = config.dayParting;

    if (!timezone || timezone.trim() === "") {
      errors.push("Timezone is required for day parting");
    }

    // Validate schedule
    const validDays: DayOfWeek[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    for (const [day, ranges] of Object.entries(schedule)) {
      if (!validDays.includes(day as DayOfWeek)) {
        errors.push(`Invalid day: ${day}`);
        continue;
      }

      if (ranges) {
        for (const range of ranges) {
          if (!isValidTimeFormat(range.start)) {
            errors.push(`Invalid start time format in ${day} schedule`);
          }
          if (!isValidTimeFormat(range.end)) {
            errors.push(`Invalid end time format in ${day} schedule`);
          }

          // Check that end is after start
          if (
            isValidTimeFormat(range.start) &&
            isValidTimeFormat(range.end)
          ) {
            const startParts = range.start.split(":").map(Number);
            const endParts = range.end.split(":").map(Number);
            const startH = startParts[0] ?? 0;
            const startM = startParts[1] ?? 0;
            const endH = endParts[0] ?? 0;
            const endM = endParts[1] ?? 0;
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            if (endMinutes <= startMinutes) {
              warnings.push(
                `End time should be after start time in ${day} schedule`
              );
            }
          }
        }
      }
    }

    // Validate bid modifier
    if (bidModifier !== undefined) {
      if (bidModifier < 0 || bidModifier > 10) {
        errors.push("Day parting bid modifier must be between 0 and 10");
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Check if a string is a valid time format (HH:MM)
 */
function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/**
 * Check if a string is a valid date or variable pattern
 */
function isValidDateOrVariable(value: string): boolean {
  // Check if it's a variable pattern
  if (value.includes("{") && value.includes("}")) {
    return true;
  }

  // Check if it's a valid ISO date
  const date = new Date(value);
  return !isNaN(date.getTime());
}
