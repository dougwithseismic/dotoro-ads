/**
 * Campaign Validator
 *
 * Validates campaign data against Reddit v3 API requirements.
 *
 * Reddit v3 API Campaign Requirements:
 * - name: Required, max 255 chars
 * - objective: Required, valid enum value
 * - configured_status: Required, "ACTIVE" or "PAUSED"
 * - special_ad_categories: Required array, at least ["NONE"]
 * - funding_instrument_id: Optional
 * - goal_type/goal_value: If present, must be valid budget config
 * - daily_budget_micro/total_budget_micro: Must be positive integers
 */

import type { Campaign } from "../../types.js";
import type { ValidationError } from "../types.js";
import { ValidationErrorCode } from "../types.js";
import {
  validateRequiredString,
  validateStringLength,
  validateEnumValue,
  validateRequiredArray,
  validateEnumArray,
} from "../utils/index.js";
import {
  PlatformDefaultsResolver,
  type Platform,
} from "../platform-defaults-resolver.js";

// ─────────────────────────────────────────────────────────────────────────────
// Reddit v3 API Valid Values
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid campaign objectives for Reddit v3 API
 */
const VALID_OBJECTIVES = [
  "APP_INSTALLS",
  "CATALOG_SALES",
  "CLICKS",
  "CONVERSIONS",
  "IMPRESSIONS",
  "LEAD_GENERATION",
  "VIDEO_VIEWABLE_IMPRESSIONS",
] as const;

/**
 * Valid configured status values for Reddit v3 API
 */
const VALID_CONFIGURED_STATUS = ["ACTIVE", "PAUSED"] as const;

/**
 * Valid special ad categories for Reddit v3 API
 */
const VALID_SPECIAL_AD_CATEGORIES = [
  "NONE",
  "HOUSING",
  "EMPLOYMENT",
  "CREDIT",
  "HOUSING_EMPLOYMENT_CREDIT",
] as const;

/**
 * Valid goal types for Reddit v3 API budget configuration
 */
const VALID_GOAL_TYPES = ["DAILY_SPEND", "LIFETIME_SPEND"] as const;

/**
 * Maximum campaign name length
 */
const MAX_NAME_LENGTH = 255;

// ─────────────────────────────────────────────────────────────────────────────
// Validation Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context for campaign validation
 *
 * Provides platform-specific information to allow validation to
 * skip errors for fields that have platform defaults.
 */
export interface CampaignValidationContext {
  /**
   * The target platform for validation.
   *
   * When provided, the validator will check if missing fields have
   * platform defaults before flagging as errors.
   *
   * Can be any string - known platforms (reddit, google, etc.) have
   * built-in defaults, while unknown platforms receive empty defaults.
   */
  platform?: Platform;
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CampaignValidator
 *
 * Validates campaign data for Reddit v3 API compatibility.
 * Collects all errors - does not fail fast.
 */
export class CampaignValidator {
  private readonly defaultsResolver: PlatformDefaultsResolver;

  constructor() {
    this.defaultsResolver = new PlatformDefaultsResolver();
  }

  /**
   * Validate a campaign and return all errors.
   *
   * @param campaign - The campaign to validate
   * @param context - Optional validation context with platform info
   * @returns Array of validation errors (empty if valid)
   */
  validate(campaign: Campaign, context?: CampaignValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const entityId = campaign.id;
    const entityName = campaign.name || `Campaign ${entityId}`;

    // Extract campaign data for validation
    const campaignData = campaign.campaignData as CampaignDataForValidation | undefined;

    // 1. Validate name (required, max 255 chars)
    const nameError = validateRequiredString(
      campaign.name,
      "name",
      "campaign",
      entityId,
      entityName
    );
    if (nameError) {
      errors.push(nameError);
    } else {
      const lengthError = validateStringLength(
        campaign.name,
        "name",
        MAX_NAME_LENGTH,
        "campaign",
        entityId,
        entityName
      );
      if (lengthError) errors.push(lengthError);
    }

    // 2. Validate objective (required, valid enum)
    // Objective comes from campaignData.objective
    const objective = campaignData?.objective;
    const objectiveError = this.validateObjective(
      objective,
      entityId,
      entityName,
      context?.platform
    );
    if (objectiveError) errors.push(objectiveError);

    // 3. Validate configured_status (required, ACTIVE or PAUSED)
    // This is typically set during sync, but we validate if present
    const configuredStatus = campaignData?.configured_status;
    if (configuredStatus !== undefined) {
      const statusError = validateEnumValue(
        configuredStatus,
        "configured_status",
        VALID_CONFIGURED_STATUS,
        "campaign",
        entityId,
        entityName,
        false // Not required at validation time - set during sync
      );
      if (statusError) errors.push(statusError);
    }

    // 4. Validate special_ad_categories (required array)
    // Can come from advancedSettings or campaignData
    const specialAdCategories =
      campaignData?.advancedSettings?.reddit?.campaign?.specialAdCategories ??
      campaignData?.specialAdCategories;

    const categoriesError = this.validateSpecialAdCategories(
      specialAdCategories,
      entityId,
      entityName,
      context?.platform
    );
    if (categoriesError) errors.push(categoriesError);

    // 5. Validate budget (if present)
    const budgetErrors = this.validateBudget(campaign, entityId, entityName);
    errors.push(...budgetErrors);

    // 6. Validate goal_type/goal_value consistency
    const goalType = campaignData?.goal_type;
    const goalValue = campaignData?.goal_value;
    if (goalType !== undefined) {
      const goalTypeError = validateEnumValue(
        goalType,
        "goal_type",
        VALID_GOAL_TYPES,
        "campaign",
        entityId,
        entityName,
        false
      );
      if (goalTypeError) errors.push(goalTypeError);

      // If goal_type is set, goal_value should also be set
      if (goalValue === undefined || goalValue === null) {
        errors.push({
          entityType: "campaign",
          entityId,
          entityName,
          field: "goal_value",
          code: ValidationErrorCode.REQUIRED_FIELD,
          message: "goal_value is required when goal_type is set",
          value: goalValue,
        });
      } else if (typeof goalValue === "number" && goalValue <= 0) {
        errors.push({
          entityType: "campaign",
          entityId,
          entityName,
          field: "goal_value",
          code: ValidationErrorCode.VALUE_OUT_OF_RANGE,
          message: "goal_value must be a positive number",
          value: goalValue,
          expected: "A positive number (micro-units)",
        });
      }
    }

    return errors;
  }

  /**
   * Validate objective field.
   *
   * Maps common objective names to Reddit API values and validates.
   * If platform is provided and the field has a platform default, missing values are allowed.
   */
  private validateObjective(
    objective: string | undefined,
    entityId: string,
    entityName: string,
    platform?: Platform
  ): ValidationError | null {
    // Objective is required for campaigns, unless platform has a default
    if (objective === undefined || objective === null || objective === "") {
      // Check if platform has a default for this field
      if (platform && this.defaultsResolver.hasDefault(platform, "campaign", "objective")) {
        return null; // Platform will provide default
      }
      return {
        entityType: "campaign",
        entityId,
        entityName,
        field: "objective",
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: "objective is required",
        value: objective,
      };
    }

    // Map common objective names to Reddit API values
    const normalizedObjective = this.normalizeObjective(objective);

    if (!VALID_OBJECTIVES.includes(normalizedObjective as typeof VALID_OBJECTIVES[number])) {
      return {
        entityType: "campaign",
        entityId,
        entityName,
        field: "objective",
        code: ValidationErrorCode.INVALID_ENUM_VALUE,
        message: `objective must be one of: ${VALID_OBJECTIVES.join(", ")} (got "${objective}")`,
        value: objective,
        expected: VALID_OBJECTIVES.join(" | "),
      };
    }

    return null;
  }

  /**
   * Normalize common objective names to Reddit API format.
   */
  private normalizeObjective(objective: string): string {
    const lower = objective.toLowerCase();
    switch (lower) {
      case "awareness":
      case "impressions":
        return "IMPRESSIONS";
      case "consideration":
      case "clicks":
      case "traffic":
        return "CLICKS";
      case "conversions":
        return "CONVERSIONS";
      case "video_views":
      case "video":
        return "VIDEO_VIEWABLE_IMPRESSIONS";
      case "app_installs":
        return "APP_INSTALLS";
      case "lead_generation":
      case "leads":
        return "LEAD_GENERATION";
      case "catalog_sales":
        return "CATALOG_SALES";
      default:
        // Return uppercase version for direct API values
        return objective.toUpperCase();
    }
  }

  /**
   * Validate special_ad_categories field.
   *
   * Reddit v3 API requires this array to be non-empty.
   * At minimum, it should contain ["NONE"] for non-restricted campaigns.
   * If platform is provided and the field has a platform default, missing values are allowed.
   */
  private validateSpecialAdCategories(
    categories: string[] | undefined,
    entityId: string,
    entityName: string,
    platform?: Platform
  ): ValidationError | null {
    // Must be present and non-empty, unless platform has a default
    if (categories === undefined || categories === null) {
      // Check if platform has a default for this field
      if (platform && this.defaultsResolver.hasDefault(platform, "campaign", "specialAdCategories")) {
        return null; // Platform will provide default
      }
      return {
        entityType: "campaign",
        entityId,
        entityName,
        field: "special_ad_categories",
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: 'special_ad_categories is required (use ["NONE"] for non-restricted campaigns)',
        value: categories,
        expected: '["NONE"] or a valid category array',
      };
    }

    if (categories.length === 0) {
      // Check if platform has a default for this field
      if (platform && this.defaultsResolver.hasDefault(platform, "campaign", "specialAdCategories")) {
        return null; // Platform will provide default
      }
      return {
        entityType: "campaign",
        entityId,
        entityName,
        field: "special_ad_categories",
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: 'special_ad_categories must not be empty (use ["NONE"] for non-restricted campaigns)',
        value: categories,
        expected: '["NONE"] or a valid category array',
      };
    }

    // Validate each category value
    return validateEnumArray(
      categories,
      "special_ad_categories",
      VALID_SPECIAL_AD_CATEGORIES,
      "campaign",
      entityId,
      entityName
    );
  }

  /**
   * Validate budget configuration.
   */
  private validateBudget(
    campaign: Campaign,
    entityId: string,
    entityName: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const budget = campaign.budget;

    if (!budget) {
      return errors;
    }

    // Validate budget amount is positive
    if (budget.amount !== undefined && budget.amount <= 0) {
      errors.push({
        entityType: "campaign",
        entityId,
        entityName,
        field: "budget.amount",
        code: ValidationErrorCode.INVALID_BUDGET,
        message: "budget amount must be a positive number",
        value: budget.amount,
        expected: "A positive number",
      });
    }

    // Validate budget type
    const validBudgetTypes = ["daily", "lifetime", "shared"] as const;
    if (budget.type && !validBudgetTypes.includes(budget.type as typeof validBudgetTypes[number])) {
      errors.push({
        entityType: "campaign",
        entityId,
        entityName,
        field: "budget.type",
        code: ValidationErrorCode.INVALID_ENUM_VALUE,
        message: `budget type must be one of: ${validBudgetTypes.join(", ")}`,
        value: budget.type,
        expected: validBudgetTypes.join(" | "),
      });
    }

    return errors;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Types for Campaign Data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type for campaign data fields we validate
 */
interface CampaignDataForValidation {
  objective?: string;
  configured_status?: string;
  specialAdCategories?: string[];
  goal_type?: string;
  goal_value?: number;
  advancedSettings?: {
    reddit?: {
      campaign?: {
        specialAdCategories?: string[];
      };
    };
  };
}
