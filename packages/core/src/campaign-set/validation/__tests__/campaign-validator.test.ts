/**
 * Campaign Validator Tests
 */

import { describe, it, expect } from "vitest";
import { CampaignValidator } from "../validators/campaign-validator.js";
import { ValidationErrorCode } from "../types.js";
import type { Campaign } from "../../types.js";

// Helper to create a valid campaign for testing
function createValidCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "camp-1",
    campaignSetId: "set-1",
    name: "Test Campaign",
    platform: "reddit",
    orderIndex: 0,
    templateId: null,
    dataRowId: null,
    campaignData: {
      objective: "CONVERSIONS",
      specialAdCategories: ["NONE"],
    },
    status: "draft",
    syncStatus: "pending",
    lastSyncedAt: null,
    syncError: null,
    platformCampaignId: null,
    platformData: null,
    adGroups: [],
    budget: {
      type: "daily",
      amount: 100,
      currency: "USD",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("CampaignValidator", () => {
  const validator = new CampaignValidator();

  describe("valid campaigns", () => {
    it("passes validation for a complete valid campaign", () => {
      const campaign = createValidCampaign();
      const errors = validator.validate(campaign);
      expect(errors).toHaveLength(0);
    });

    it("passes validation with all objectives", () => {
      const objectives = [
        "APP_INSTALLS",
        "CATALOG_SALES",
        "CLICKS",
        "CONVERSIONS",
        "IMPRESSIONS",
        "LEAD_GENERATION",
        "VIDEO_VIEWABLE_IMPRESSIONS",
      ];

      for (const objective of objectives) {
        const campaign = createValidCampaign({
          campaignData: { objective, specialAdCategories: ["NONE"] },
        });
        const errors = validator.validate(campaign);
        expect(errors).toHaveLength(0);
      }
    });

    it("normalizes common objective names", () => {
      const mappings: [string, boolean][] = [
        ["awareness", true], // Maps to IMPRESSIONS
        ["traffic", true], // Maps to CLICKS
        ["conversions", true], // Maps to CONVERSIONS
        ["video_views", true], // Maps to VIDEO_VIEWABLE_IMPRESSIONS
      ];

      for (const [objective, shouldPass] of mappings) {
        const campaign = createValidCampaign({
          campaignData: { objective, specialAdCategories: ["NONE"] },
        });
        const errors = validator.validate(campaign);
        if (shouldPass) {
          expect(errors.filter((e) => e.field === "objective")).toHaveLength(0);
        }
      }
    });
  });

  describe("name validation", () => {
    it("fails when name is missing", () => {
      const campaign = createValidCampaign({ name: "" });
      const errors = validator.validate(campaign);

      const nameError = errors.find((e) => e.field === "name");
      expect(nameError).toBeDefined();
      expect(nameError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails when name exceeds 255 characters", () => {
      const campaign = createValidCampaign({ name: "a".repeat(256) });
      const errors = validator.validate(campaign);

      const nameError = errors.find((e) => e.field === "name");
      expect(nameError).toBeDefined();
      expect(nameError!.code).toBe(ValidationErrorCode.FIELD_TOO_LONG);
    });

    it("passes with exactly 255 characters", () => {
      const campaign = createValidCampaign({ name: "a".repeat(255) });
      const errors = validator.validate(campaign);

      const nameError = errors.find((e) => e.field === "name");
      expect(nameError).toBeUndefined();
    });
  });

  describe("objective validation", () => {
    it("fails when objective is missing", () => {
      const campaign = createValidCampaign({
        campaignData: { specialAdCategories: ["NONE"] },
      });
      const errors = validator.validate(campaign);

      const objectiveError = errors.find((e) => e.field === "objective");
      expect(objectiveError).toBeDefined();
      expect(objectiveError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails for invalid objective value", () => {
      const campaign = createValidCampaign({
        campaignData: { objective: "INVALID_OBJECTIVE", specialAdCategories: ["NONE"] },
      });
      const errors = validator.validate(campaign);

      const objectiveError = errors.find((e) => e.field === "objective");
      expect(objectiveError).toBeDefined();
      expect(objectiveError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
    });
  });

  describe("special_ad_categories validation", () => {
    it("fails when special_ad_categories is missing", () => {
      const campaign = createValidCampaign({
        campaignData: { objective: "CONVERSIONS" },
      });
      const errors = validator.validate(campaign);

      const categoryError = errors.find(
        (e) => e.field === "special_ad_categories"
      );
      expect(categoryError).toBeDefined();
      expect(categoryError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails when special_ad_categories is empty array", () => {
      const campaign = createValidCampaign({
        campaignData: { objective: "CONVERSIONS", specialAdCategories: [] },
      });
      const errors = validator.validate(campaign);

      const categoryError = errors.find(
        (e) => e.field === "special_ad_categories"
      );
      expect(categoryError).toBeDefined();
      expect(categoryError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails for invalid category value", () => {
      const campaign = createValidCampaign({
        campaignData: {
          objective: "CONVERSIONS",
          specialAdCategories: ["INVALID_CATEGORY"],
        },
      });
      const errors = validator.validate(campaign);

      const categoryError = errors.find(
        (e) => e.field === "special_ad_categories"
      );
      expect(categoryError).toBeDefined();
      expect(categoryError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
    });

    it("passes with valid categories", () => {
      const validCategories = [
        ["NONE"],
        ["HOUSING"],
        ["EMPLOYMENT"],
        ["CREDIT"],
        ["HOUSING_EMPLOYMENT_CREDIT"],
      ];

      for (const categories of validCategories) {
        const campaign = createValidCampaign({
          campaignData: { objective: "CONVERSIONS", specialAdCategories: categories },
        });
        const errors = validator.validate(campaign);
        const categoryError = errors.find(
          (e) => e.field === "special_ad_categories"
        );
        expect(categoryError).toBeUndefined();
      }
    });
  });

  describe("budget validation", () => {
    it("fails when budget amount is negative", () => {
      const campaign = createValidCampaign({
        budget: { type: "daily", amount: -100, currency: "USD" },
      });
      const errors = validator.validate(campaign);

      const budgetError = errors.find((e) => e.field === "budget.amount");
      expect(budgetError).toBeDefined();
      expect(budgetError!.code).toBe(ValidationErrorCode.INVALID_BUDGET);
    });

    it("fails when budget amount is zero", () => {
      const campaign = createValidCampaign({
        budget: { type: "daily", amount: 0, currency: "USD" },
      });
      const errors = validator.validate(campaign);

      const budgetError = errors.find((e) => e.field === "budget.amount");
      expect(budgetError).toBeDefined();
      expect(budgetError!.code).toBe(ValidationErrorCode.INVALID_BUDGET);
    });

    it("passes when budget is not set", () => {
      const campaign = createValidCampaign({ budget: undefined });
      const errors = validator.validate(campaign);

      const budgetError = errors.find((e) => e.field.startsWith("budget"));
      expect(budgetError).toBeUndefined();
    });
  });

  describe("collects all errors", () => {
    it("collects multiple errors in a single pass", () => {
      const campaign = createValidCampaign({
        name: "",
        campaignData: {}, // Missing objective and special_ad_categories
        budget: { type: "daily", amount: -100, currency: "USD" },
      });
      const errors = validator.validate(campaign);

      // Should have at least 3 errors
      expect(errors.length).toBeGreaterThanOrEqual(3);

      // Check each error type is present
      expect(errors.some((e) => e.field === "name")).toBe(true);
      expect(errors.some((e) => e.field === "objective")).toBe(true);
      expect(errors.some((e) => e.field === "budget.amount")).toBe(true);
    });
  });

  describe("platform defaults", () => {
    it("should NOT error when objective is missing for reddit platform (has default)", () => {
      const campaign = createValidCampaign({
        campaignData: { specialAdCategories: ["NONE"] }, // objective missing
      });
      const errors = validator.validate(campaign, { platform: "reddit" });

      const objectiveError = errors.find((e) => e.field === "objective");
      expect(objectiveError).toBeUndefined();
    });

    it("should error when objective is missing for google platform (no default)", () => {
      const campaign = createValidCampaign({
        campaignData: { specialAdCategories: ["NONE"] }, // objective missing
      });
      const errors = validator.validate(campaign, { platform: "google" });

      const objectiveError = errors.find((e) => e.field === "objective");
      expect(objectiveError).toBeDefined();
      expect(objectiveError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("should error when objective is missing without platform context", () => {
      const campaign = createValidCampaign({
        campaignData: { specialAdCategories: ["NONE"] }, // objective missing
      });
      const errors = validator.validate(campaign); // No platform context

      const objectiveError = errors.find((e) => e.field === "objective");
      expect(objectiveError).toBeDefined();
      expect(objectiveError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("should NOT error when specialAdCategories is missing for reddit platform", () => {
      const campaign = createValidCampaign({
        campaignData: { objective: "CONVERSIONS" }, // specialAdCategories missing
      });
      const errors = validator.validate(campaign, { platform: "reddit" });

      const categoryError = errors.find(
        (e) => e.field === "special_ad_categories"
      );
      expect(categoryError).toBeUndefined();
    });

    it("should error when specialAdCategories is missing for google platform", () => {
      const campaign = createValidCampaign({
        campaignData: { objective: "CONVERSIONS" }, // specialAdCategories missing
      });
      const errors = validator.validate(campaign, { platform: "google" });

      const categoryError = errors.find(
        (e) => e.field === "special_ad_categories"
      );
      expect(categoryError).toBeDefined();
      expect(categoryError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("should error when specialAdCategories is missing without platform context", () => {
      const campaign = createValidCampaign({
        campaignData: { objective: "CONVERSIONS" }, // specialAdCategories missing
      });
      const errors = validator.validate(campaign); // No platform context

      const categoryError = errors.find(
        (e) => e.field === "special_ad_categories"
      );
      expect(categoryError).toBeDefined();
      expect(categoryError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("should pass validation when both fields are missing for reddit platform", () => {
      const campaign = createValidCampaign({
        campaignData: {}, // Both objective and specialAdCategories missing
      });
      const errors = validator.validate(campaign, { platform: "reddit" });

      const objectiveError = errors.find((e) => e.field === "objective");
      const categoryError = errors.find(
        (e) => e.field === "special_ad_categories"
      );
      expect(objectiveError).toBeUndefined();
      expect(categoryError).toBeUndefined();
    });

    it("should still validate invalid values even with platform context", () => {
      const campaign = createValidCampaign({
        campaignData: {
          objective: "INVALID_OBJECTIVE",
          specialAdCategories: ["INVALID_CATEGORY"],
        },
      });
      const errors = validator.validate(campaign, { platform: "reddit" });

      // Invalid values should still produce errors
      const objectiveError = errors.find((e) => e.field === "objective");
      const categoryError = errors.find(
        (e) => e.field === "special_ad_categories"
      );
      expect(objectiveError).toBeDefined();
      expect(objectiveError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
      expect(categoryError).toBeDefined();
      expect(categoryError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
    });
  });
});
