/**
 * Ad Validator
 *
 * Validates ad data against Reddit v3 API requirements.
 *
 * Reddit v3 API Ad Requirements:
 * - name: Required, max 255 chars
 * - ad_group_id: Required, must reference valid ad group
 * - click_url: Required, valid URL format
 * - headline: Optional (legacy), max 100 chars
 * - body: Optional (legacy), max 500 chars
 * - display_url: Optional, max 25 chars
 * - call_to_action: Optional, valid enum value
 * - post_id: For v3 API flow, should be present
 */

import type { Ad } from "../../types.js";
import type { ValidationError } from "../types.js";
import { ValidationErrorCode } from "../types.js";
import {
  validateStringLength,
  validateEnumValue,
  validateUrlField,
} from "../utils/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Reddit v3 API Valid Values
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid call-to-action values for Reddit v3 API
 */
const VALID_CALL_TO_ACTION = [
  "LEARN_MORE",
  "SIGN_UP",
  "SHOP_NOW",
  "DOWNLOAD",
  "INSTALL",
  "GET_QUOTE",
  "CONTACT_US",
  "BOOK_NOW",
  "APPLY_NOW",
  "WATCH_MORE",
  "GET_STARTED",
  "SUBSCRIBE",
  "ORDER_NOW",
  "SEE_MORE",
  "VIEW_MORE",
  "PLAY_NOW",
] as const;

/**
 * Field length limits
 */
const MAX_NAME_LENGTH = 255;
const MAX_HEADLINE_LENGTH = 100;
const MAX_BODY_LENGTH = 500;
const MAX_DISPLAY_URL_LENGTH = 25;

// ─────────────────────────────────────────────────────────────────────────────
// Ad Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context for ad validation including parent ad group info
 */
export interface AdValidationContext {
  /** ID of the parent ad group (platform ID or local ID) */
  adGroupId?: string;
  /** Map of ad group IDs that exist in this sync */
  validAdGroupIds?: Set<string>;
}

/**
 * AdValidator
 *
 * Validates ad data for Reddit v3 API compatibility.
 * Collects all errors - does not fail fast.
 */
export class AdValidator {
  /**
   * Validate an ad and return all errors.
   *
   * @param ad - The ad to validate
   * @param context - Optional context with parent ad group info
   * @returns Array of validation errors (empty if valid)
   */
  validate(ad: Ad, context?: AdValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const entityId = ad.id;
    const entityName = ad.headline || `Ad ${entityId}`;

    // 1. Validate name/headline (for Reddit, name comes from headline)
    // We need either headline to be present, or we'll auto-generate a name
    const nameValue = ad.headline;
    if (nameValue) {
      const lengthError = validateStringLength(
        nameValue,
        "headline",
        MAX_HEADLINE_LENGTH,
        "ad",
        entityId,
        entityName
      );
      if (lengthError) errors.push(lengthError);

      // Also check name length (name is often derived from headline but limited to 255)
      const nameLengthError = validateStringLength(
        nameValue,
        "name",
        MAX_NAME_LENGTH,
        "ad",
        entityId,
        entityName
      );
      if (nameLengthError) errors.push(nameLengthError);
    }

    // 2. Validate ad_group_id reference (if context provided)
    if (context?.validAdGroupIds) {
      const adGroupId = ad.adGroupId;
      if (!context.validAdGroupIds.has(adGroupId)) {
        errors.push({
          entityType: "ad",
          entityId,
          entityName,
          field: "ad_group_id",
          code: ValidationErrorCode.MISSING_DEPENDENCY,
          message: `Ad references ad group "${adGroupId}" which does not exist in this sync`,
          value: adGroupId,
        });
      }
    }

    // 3. Validate click_url (required, valid URL)
    const clickUrlError = validateUrlField(
      ad.finalUrl,
      "click_url",
      "ad",
      entityId,
      entityName,
      true // Required
    );
    if (clickUrlError) errors.push(clickUrlError);

    // 4. Validate body length (optional, max 500 chars)
    if (ad.description) {
      const bodyError = validateStringLength(
        ad.description,
        "body",
        MAX_BODY_LENGTH,
        "ad",
        entityId,
        entityName
      );
      if (bodyError) errors.push(bodyError);
    }

    // 5. Validate display_url length (optional, max 25 chars)
    if (ad.displayUrl) {
      const displayUrlError = validateStringLength(
        ad.displayUrl,
        "display_url",
        MAX_DISPLAY_URL_LENGTH,
        "ad",
        entityId,
        entityName
      );
      if (displayUrlError) errors.push(displayUrlError);
    }

    // 6. Validate call_to_action (optional, valid enum)
    if (ad.callToAction) {
      const ctaError = this.validateCallToAction(
        ad.callToAction,
        entityId,
        entityName
      );
      if (ctaError) errors.push(ctaError);
    }

    return errors;
  }

  /**
   * Validate call_to_action field.
   *
   * Normalizes common formats (lowercase, hyphenated) to Reddit API format.
   */
  private validateCallToAction(
    cta: string,
    entityId: string,
    entityName: string
  ): ValidationError | null {
    // Normalize to uppercase with underscores
    const normalizedCta = cta.toUpperCase().replace(/-/g, "_");

    if (!VALID_CALL_TO_ACTION.includes(normalizedCta as typeof VALID_CALL_TO_ACTION[number])) {
      return {
        entityType: "ad",
        entityId,
        entityName,
        field: "call_to_action",
        code: ValidationErrorCode.INVALID_ENUM_VALUE,
        message: `call_to_action must be one of: ${VALID_CALL_TO_ACTION.join(", ")}`,
        value: cta,
        expected: VALID_CALL_TO_ACTION.join(" | "),
      };
    }

    return null;
  }
}
