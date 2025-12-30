/**
 * Ad Group Validator
 *
 * Validates ad group data against Reddit v3 API requirements.
 *
 * Reddit v3 API Ad Group Requirements:
 * - name: Required, max 255 chars
 * - campaign_id: Required, must reference valid campaign
 * - bid_strategy: Required, valid enum value
 * - bid_type: Required, CPC/CPM/CPV
 * - configured_status: Required, ACTIVE or PAUSED
 * - start_time: Optional, ISO 8601 with timezone
 * - end_time: Optional, ISO 8601 with timezone, must be after start_time
 * - goal_type/goal_value: If budget set, both required
 */

import type { AdGroup } from "../../types.js";
import type { ValidationError } from "../types.js";
import { ValidationErrorCode } from "../types.js";
import {
  validateRequiredString,
  validateStringLength,
  validateEnumValue,
  validateDateTimeField,
  validateDateTimeRange,
} from "../utils/index.js";
import {
  PlatformDefaultsResolver,
  type Platform,
} from "../platform-defaults-resolver.js";

// ─────────────────────────────────────────────────────────────────────────────
// Reddit v3 API Valid Values
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid bid strategies for Reddit v3 API
 */
const VALID_BID_STRATEGIES = [
  "BIDLESS",
  "MANUAL_BIDDING",
  "MAXIMIZE_VOLUME",
  "TARGET_CPX",
] as const;

/**
 * Valid bid types for Reddit v3 API
 */
const VALID_BID_TYPES = ["CPC", "CPM", "CPV"] as const;

/**
 * Valid configured status for ad groups
 */
const VALID_CONFIGURED_STATUS = ["ACTIVE", "PAUSED"] as const;

/**
 * Valid goal types for budget configuration
 */
const VALID_GOAL_TYPES = ["DAILY_SPEND", "LIFETIME_SPEND"] as const;

/**
 * Maximum name length
 */
const MAX_NAME_LENGTH = 255;

// ─────────────────────────────────────────────────────────────────────────────
// Ad Group Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context for ad group validation including parent campaign info
 */
export interface AdGroupValidationContext {
  /** ID of the parent campaign (platform ID or local ID) */
  campaignId?: string;
  /** Map of campaign IDs that exist in this sync */
  validCampaignIds?: Set<string>;
  /**
   * Target platform - used to determine if missing fields have platform defaults.
   *
   * Can be any string - known platforms (reddit, google, etc.) have
   * built-in defaults, while unknown platforms receive empty defaults.
   */
  platform?: Platform;
}

/**
 * AdGroupValidator
 *
 * Validates ad group data for Reddit v3 API compatibility.
 * Collects all errors - does not fail fast.
 */
export class AdGroupValidator {
  private readonly defaultsResolver: PlatformDefaultsResolver;

  constructor() {
    this.defaultsResolver = new PlatformDefaultsResolver();
  }

  /**
   * Validate an ad group and return all errors.
   *
   * @param adGroup - The ad group to validate
   * @param context - Optional context with parent campaign info
   * @returns Array of validation errors (empty if valid)
   */
  validate(
    adGroup: AdGroup,
    context?: AdGroupValidationContext
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const entityId = adGroup.id;
    const entityName = adGroup.name || `Ad Group ${entityId}`;

    // Extract settings for validation
    const settings = adGroup.settings as AdGroupSettingsForValidation | undefined;
    const bidding = settings?.bidding;
    const budget = settings?.budget;
    const advancedSettings = settings?.advancedSettings?.reddit?.adGroup;

    // 1. Validate name (required, max 255 chars)
    const nameError = validateRequiredString(
      adGroup.name,
      "name",
      "adGroup",
      entityId,
      entityName
    );
    if (nameError) {
      errors.push(nameError);
    } else {
      const lengthError = validateStringLength(
        adGroup.name,
        "name",
        MAX_NAME_LENGTH,
        "adGroup",
        entityId,
        entityName
      );
      if (lengthError) errors.push(lengthError);
    }

    // 2. Validate campaign_id reference (if context provided)
    if (context?.validCampaignIds) {
      const campaignId = adGroup.campaignId;
      if (!context.validCampaignIds.has(campaignId)) {
        errors.push({
          entityType: "adGroup",
          entityId,
          entityName,
          field: "campaign_id",
          code: ValidationErrorCode.MISSING_DEPENDENCY,
          message: `Ad group references campaign "${campaignId}" which does not exist in this sync`,
          value: campaignId,
        });
      }
    }

    // 3. Validate bid_strategy (required, valid enum)
    const bidStrategy = this.extractBidStrategy(bidding);
    const strategyError = this.validateBidStrategy(
      bidStrategy,
      entityId,
      entityName,
      context?.platform
    );
    if (strategyError) errors.push(strategyError);

    // 4. Validate bid_type (required, CPC/CPM/CPV)
    const bidType = this.extractBidType(bidding);
    const typeError = this.validateBidType(
      bidType,
      entityId,
      entityName,
      context?.platform
    );
    if (typeError) errors.push(typeError);

    // 5. Validate bid_value for manual bidding
    if (bidStrategy && this.requiresBidValue(bidStrategy)) {
      const bidValue = this.extractBidValue(settings);
      if (bidValue === undefined || bidValue === null) {
        errors.push({
          entityType: "adGroup",
          entityId,
          entityName,
          field: "bid_value",
          code: ValidationErrorCode.REQUIRED_FIELD,
          message: `bid_value is required when bid_strategy is ${bidStrategy}`,
          value: bidValue,
        });
      } else if (typeof bidValue === "number" && bidValue <= 0) {
        errors.push({
          entityType: "adGroup",
          entityId,
          entityName,
          field: "bid_value",
          code: ValidationErrorCode.VALUE_OUT_OF_RANGE,
          message: "bid_value must be a positive number",
          value: bidValue,
          expected: "A positive number (micro-units)",
        });
      }
    }

    // 6. Validate start_time format (ISO 8601 with timezone)
    const startTime = advancedSettings?.startTime;
    const startTimeError = validateDateTimeField(
      startTime,
      "start_time",
      "adGroup",
      entityId,
      entityName
    );
    if (startTimeError) errors.push(startTimeError);

    // 7. Validate end_time format (ISO 8601 with timezone)
    const endTime = advancedSettings?.endTime;
    const endTimeError = validateDateTimeField(
      endTime,
      "end_time",
      "adGroup",
      entityId,
      entityName
    );
    if (endTimeError) errors.push(endTimeError);

    // 8. Validate end_time is after start_time
    const rangeError = validateDateTimeRange(
      startTime,
      endTime,
      "adGroup",
      entityId,
      entityName
    );
    if (rangeError) errors.push(rangeError);

    // 9. Validate budget goal_type/goal_value consistency
    const budgetErrors = this.validateBudget(
      budget,
      entityId,
      entityName
    );
    errors.push(...budgetErrors);

    return errors;
  }

  /**
   * Extract bid strategy from settings, normalizing to Reddit API format.
   */
  private extractBidStrategy(
    bidding: BiddingSettings | undefined
  ): string | undefined {
    if (!bidding?.strategy) return undefined;

    const strategy = bidding.strategy.toLowerCase();
    switch (strategy) {
      case "automatic":
      case "auto":
      case "maximize_volume":
        return "MAXIMIZE_VOLUME";
      case "manual_cpc":
      case "manual_cpm":
      case "manual":
      case "manual_bidding":
        return "MANUAL_BIDDING";
      case "target_cpa":
      case "target_cpx":
      case "target":
        return "TARGET_CPX";
      case "bidless":
      case "none":
        return "BIDLESS";
      default:
        return bidding.strategy.toUpperCase();
    }
  }

  /**
   * Extract bid type from settings.
   */
  private extractBidType(
    bidding: BiddingSettings | undefined
  ): string | undefined {
    if (!bidding) return undefined;

    // If explicit bid type is set
    if (bidding.bidType) {
      return bidding.bidType.toUpperCase();
    }

    // Infer from strategy
    const strategy = bidding.strategy?.toLowerCase();
    switch (strategy) {
      case "manual_cpm":
      case "cpm":
        return "CPM";
      case "cpv":
      case "video":
        return "CPV";
      default:
        return "CPC"; // Default
    }
  }

  /**
   * Extract bid value from settings.
   */
  private extractBidValue(
    settings: AdGroupSettingsForValidation | undefined
  ): number | undefined {
    const bidding = settings?.bidding;
    if (!bidding) return undefined;

    // Check for direct bid_value
    if (bidding.bid_value !== undefined) {
      return bidding.bid_value;
    }

    // Check for maxCpc/maxCpm (convert to micro-units would happen in adapter)
    if (bidding.maxCpc !== undefined) {
      const parsed = parseFloat(bidding.maxCpc);
      if (!isNaN(parsed)) return parsed;
    }
    if (bidding.maxCpm !== undefined) {
      const parsed = parseFloat(bidding.maxCpm);
      if (!isNaN(parsed)) return parsed;
    }

    return undefined;
  }

  /**
   * Check if a bid strategy requires a bid value.
   */
  private requiresBidValue(strategy: string): boolean {
    return strategy === "MANUAL_BIDDING" || strategy === "TARGET_CPX";
  }

  /**
   * Validate bid_strategy field.
   *
   * @param strategy - The bid strategy value to validate
   * @param entityId - The entity ID for error reporting
   * @param entityName - The entity name for error reporting
   * @param platform - Optional platform to check for defaults (any string)
   * @returns ValidationError if invalid, null if valid
   */
  private validateBidStrategy(
    strategy: string | undefined,
    entityId: string,
    entityName: string,
    platform?: Platform
  ): ValidationError | null {
    if (strategy === undefined || strategy === "") {
      // Check if the platform has a default for bid_strategy
      if (
        platform &&
        this.defaultsResolver.hasDefault(platform, "adGroup", "bidStrategy")
      ) {
        // Platform has a default, no error needed
        return null;
      }

      return {
        entityType: "adGroup",
        entityId,
        entityName,
        field: "bid_strategy",
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: "bid_strategy is required",
        value: strategy,
      };
    }

    if (!VALID_BID_STRATEGIES.includes(strategy as typeof VALID_BID_STRATEGIES[number])) {
      return {
        entityType: "adGroup",
        entityId,
        entityName,
        field: "bid_strategy",
        code: ValidationErrorCode.INVALID_ENUM_VALUE,
        message: `bid_strategy must be one of: ${VALID_BID_STRATEGIES.join(", ")}`,
        value: strategy,
        expected: VALID_BID_STRATEGIES.join(" | "),
      };
    }

    return null;
  }

  /**
   * Validate bid_type field.
   *
   * @param bidType - The bid type value to validate
   * @param entityId - The entity ID for error reporting
   * @param entityName - The entity name for error reporting
   * @param platform - Optional platform to check for defaults (any string)
   * @returns ValidationError if invalid, null if valid
   */
  private validateBidType(
    bidType: string | undefined,
    entityId: string,
    entityName: string,
    platform?: Platform
  ): ValidationError | null {
    if (bidType === undefined || bidType === "") {
      // Check if the platform has a default for bid_type
      if (
        platform &&
        this.defaultsResolver.hasDefault(platform, "adGroup", "bidType")
      ) {
        // Platform has a default, no error needed
        return null;
      }

      return {
        entityType: "adGroup",
        entityId,
        entityName,
        field: "bid_type",
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: "bid_type is required",
        value: bidType,
      };
    }

    if (!VALID_BID_TYPES.includes(bidType as typeof VALID_BID_TYPES[number])) {
      return {
        entityType: "adGroup",
        entityId,
        entityName,
        field: "bid_type",
        code: ValidationErrorCode.INVALID_ENUM_VALUE,
        message: `bid_type must be one of: ${VALID_BID_TYPES.join(", ")}`,
        value: bidType,
        expected: VALID_BID_TYPES.join(" | "),
      };
    }

    return null;
  }

  /**
   * Validate budget configuration.
   */
  private validateBudget(
    budget: BudgetSettings | undefined,
    entityId: string,
    entityName: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!budget) {
      return errors;
    }

    // Validate goal_type if present
    if (budget.type !== undefined) {
      const goalType = budget.type === "lifetime" ? "LIFETIME_SPEND" : "DAILY_SPEND";
      const typeError = validateEnumValue(
        goalType,
        "goal_type",
        VALID_GOAL_TYPES,
        "adGroup",
        entityId,
        entityName,
        false
      );
      if (typeError) errors.push(typeError);
    }

    // Validate goal_value is positive if present
    if (budget.amount !== undefined && budget.amount <= 0) {
      errors.push({
        entityType: "adGroup",
        entityId,
        entityName,
        field: "goal_value",
        code: ValidationErrorCode.VALUE_OUT_OF_RANGE,
        message: "goal_value (budget amount) must be a positive number",
        value: budget.amount,
        expected: "A positive number",
      });
    }

    return errors;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Types for Ad Group Settings
// ─────────────────────────────────────────────────────────────────────────────

interface BiddingSettings {
  strategy?: string;
  bidType?: string;
  bid_value?: number;
  maxCpc?: string;
  maxCpm?: string;
}

interface BudgetSettings {
  type?: "daily" | "lifetime";
  amount?: number;
}

interface AdGroupSettingsForValidation {
  bidding?: BiddingSettings;
  budget?: BudgetSettings;
  advancedSettings?: {
    reddit?: {
      adGroup?: {
        startTime?: string;
        endTime?: string;
      };
    };
  };
}
