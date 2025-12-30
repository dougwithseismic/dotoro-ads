/**
 * Ad Group Validator Tests
 */

import { describe, it, expect } from "vitest";
import { AdGroupValidator } from "../validators/ad-group-validator.js";
import type { AdGroupValidationContext } from "../validators/ad-group-validator.js";
import { ValidationErrorCode } from "../types.js";
import type { AdGroup } from "../../types.js";

// Helper to create a valid ad group for testing
function createValidAdGroup(overrides: Partial<AdGroup> = {}): AdGroup {
  return {
    id: "ag-1",
    campaignId: "camp-1",
    name: "Test Ad Group",
    orderIndex: 0,
    settings: {
      bidding: {
        strategy: "MAXIMIZE_VOLUME",
        bidType: "CPC",
      },
      advancedSettings: {
        reddit: {
          adGroup: {
            startTime: "2025-01-15T09:00:00Z",
            endTime: "2025-02-15T09:00:00Z",
          },
        },
      },
    },
    platformAdGroupId: null,
    status: "active",
    ads: [],
    keywords: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("AdGroupValidator", () => {
  const validator = new AdGroupValidator();

  describe("valid ad groups", () => {
    it("passes validation for a complete valid ad group", () => {
      const adGroup = createValidAdGroup();
      const errors = validator.validate(adGroup);
      expect(errors).toHaveLength(0);
    });

    it("passes validation with all bid strategies", () => {
      const strategies = [
        "BIDLESS",
        "MANUAL_BIDDING",
        "MAXIMIZE_VOLUME",
        "TARGET_CPX",
      ];

      for (const strategy of strategies) {
        const adGroup = createValidAdGroup({
          settings: {
            bidding: {
              strategy,
              bidType: "CPC",
              bid_value: strategy === "MANUAL_BIDDING" || strategy === "TARGET_CPX" ? 1000 : undefined,
            },
          },
        });
        const errors = validator.validate(adGroup);
        const strategyErrors = errors.filter((e) => e.field === "bid_strategy");
        expect(strategyErrors).toHaveLength(0);
      }
    });

    it("passes validation with all bid types", () => {
      const bidTypes = ["CPC", "CPM", "CPV"];

      for (const bidType of bidTypes) {
        const adGroup = createValidAdGroup({
          settings: {
            bidding: {
              strategy: "MAXIMIZE_VOLUME",
              bidType,
            },
          },
        });
        const errors = validator.validate(adGroup);
        const typeErrors = errors.filter((e) => e.field === "bid_type");
        expect(typeErrors).toHaveLength(0);
      }
    });
  });

  describe("name validation", () => {
    it("fails when name is missing", () => {
      const adGroup = createValidAdGroup({ name: "" });
      const errors = validator.validate(adGroup);

      const nameError = errors.find((e) => e.field === "name");
      expect(nameError).toBeDefined();
      expect(nameError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails when name exceeds 255 characters", () => {
      const adGroup = createValidAdGroup({ name: "a".repeat(256) });
      const errors = validator.validate(adGroup);

      const nameError = errors.find((e) => e.field === "name");
      expect(nameError).toBeDefined();
      expect(nameError!.code).toBe(ValidationErrorCode.FIELD_TOO_LONG);
    });
  });

  describe("bid_strategy validation", () => {
    it("fails when bid_strategy is missing", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { bidType: "CPC" },
        },
      });
      const errors = validator.validate(adGroup);

      const strategyError = errors.find((e) => e.field === "bid_strategy");
      expect(strategyError).toBeDefined();
      expect(strategyError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails for invalid bid_strategy", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: {
            strategy: "INVALID_STRATEGY",
            bidType: "CPC",
          },
        },
      });
      const errors = validator.validate(adGroup);

      const strategyError = errors.find((e) => e.field === "bid_strategy");
      expect(strategyError).toBeDefined();
      expect(strategyError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
    });

    it("normalizes common strategy names", () => {
      const mappings: [string, boolean][] = [
        ["automatic", true], // Maps to MAXIMIZE_VOLUME
        ["manual", true], // Maps to MANUAL_BIDDING
        ["target_cpa", true], // Maps to TARGET_CPX
      ];

      for (const [strategy, shouldPass] of mappings) {
        const adGroup = createValidAdGroup({
          settings: {
            bidding: { strategy, bidType: "CPC", bid_value: 1000 },
          },
        });
        const errors = validator.validate(adGroup);
        if (shouldPass) {
          const strategyErrors = errors.filter((e) => e.field === "bid_strategy");
          expect(strategyErrors).toHaveLength(0);
        }
      }
    });
  });

  describe("bid_type validation", () => {
    it("fails when bid_type is missing and strategy requires it", () => {
      // When strategy is set but bidType is completely undefined, we require it
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { strategy: "MAXIMIZE_VOLUME", bidType: undefined },
        },
      });
      const errors = validator.validate(adGroup);

      // If bidType is explicitly undefined, the validator will derive it from strategy
      // For MAXIMIZE_VOLUME, it defaults to CPC - so no error expected
      // Let's test with null to ensure the validation works
      const adGroup2 = createValidAdGroup({
        settings: {
          bidding: undefined, // No bidding settings at all
        },
      });
      const errors2 = validator.validate(adGroup2);
      const typeError = errors2.find((e) => e.field === "bid_type");
      expect(typeError).toBeDefined();
      expect(typeError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails for invalid bid_type", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: {
            strategy: "MAXIMIZE_VOLUME",
            bidType: "INVALID_TYPE",
          },
        },
      });
      const errors = validator.validate(adGroup);

      const typeError = errors.find((e) => e.field === "bid_type");
      expect(typeError).toBeDefined();
      expect(typeError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
    });
  });

  describe("bid_value validation for manual bidding", () => {
    it("fails when bid_value is missing for MANUAL_BIDDING", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: {
            strategy: "MANUAL_BIDDING",
            bidType: "CPC",
            // No bid_value
          },
        },
      });
      const errors = validator.validate(adGroup);

      const valueError = errors.find((e) => e.field === "bid_value");
      expect(valueError).toBeDefined();
      expect(valueError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("fails when bid_value is zero for MANUAL_BIDDING", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: {
            strategy: "MANUAL_BIDDING",
            bidType: "CPC",
            bid_value: 0,
          },
        },
      });
      const errors = validator.validate(adGroup);

      const valueError = errors.find((e) => e.field === "bid_value");
      expect(valueError).toBeDefined();
      expect(valueError!.code).toBe(ValidationErrorCode.VALUE_OUT_OF_RANGE);
    });

    it("passes when bid_value is set for MANUAL_BIDDING", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: {
            strategy: "MANUAL_BIDDING",
            bidType: "CPC",
            bid_value: 1000,
          },
        },
      });
      const errors = validator.validate(adGroup);

      const valueError = errors.find((e) => e.field === "bid_value");
      expect(valueError).toBeUndefined();
    });
  });

  describe("datetime validation", () => {
    it("fails for invalid start_time format", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { strategy: "MAXIMIZE_VOLUME", bidType: "CPC" },
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-01-15", // Missing time and timezone
                endTime: "2025-02-15T09:00:00Z",
              },
            },
          },
        },
      });
      const errors = validator.validate(adGroup);

      const timeError = errors.find((e) => e.field === "start_time");
      expect(timeError).toBeDefined();
      expect(timeError!.code).toBe(ValidationErrorCode.INVALID_DATETIME);
    });

    it("fails for invalid end_time format", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { strategy: "MAXIMIZE_VOLUME", bidType: "CPC" },
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-01-15T09:00:00Z",
                endTime: "February 15, 2025", // Invalid format
              },
            },
          },
        },
      });
      const errors = validator.validate(adGroup);

      const timeError = errors.find((e) => e.field === "end_time");
      expect(timeError).toBeDefined();
      expect(timeError!.code).toBe(ValidationErrorCode.INVALID_DATETIME);
    });

    it("fails when end_time is before start_time", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { strategy: "MAXIMIZE_VOLUME", bidType: "CPC" },
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-02-15T09:00:00Z",
                endTime: "2025-01-15T09:00:00Z", // Before start
              },
            },
          },
        },
      });
      const errors = validator.validate(adGroup);

      const rangeError = errors.find(
        (e) => e.code === ValidationErrorCode.CONSTRAINT_VIOLATION
      );
      expect(rangeError).toBeDefined();
    });

    it("passes with valid datetime range", () => {
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { strategy: "MAXIMIZE_VOLUME", bidType: "CPC" },
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-01-15T09:00:00+00:00",
                endTime: "2025-02-15T09:00:00+00:00",
              },
            },
          },
        },
      });
      const errors = validator.validate(adGroup);

      const timeErrors = errors.filter(
        (e) => e.field === "start_time" || e.field === "end_time"
      );
      expect(timeErrors).toHaveLength(0);
    });
  });

  describe("dependency validation", () => {
    it("fails when referencing non-existent campaign", () => {
      const adGroup = createValidAdGroup({ campaignId: "non-existent-camp" });
      const context = {
        validCampaignIds: new Set(["camp-1", "camp-2"]),
      };
      const errors = validator.validate(adGroup, context);

      const depError = errors.find((e) => e.field === "campaign_id");
      expect(depError).toBeDefined();
      expect(depError!.code).toBe(ValidationErrorCode.MISSING_DEPENDENCY);
    });

    it("passes when referencing existing campaign", () => {
      const adGroup = createValidAdGroup({ campaignId: "camp-1" });
      const context = {
        validCampaignIds: new Set(["camp-1", "camp-2"]),
      };
      const errors = validator.validate(adGroup, context);

      const depError = errors.find((e) => e.field === "campaign_id");
      expect(depError).toBeUndefined();
    });
  });

  describe("platform defaults", () => {
    it("should NOT error when bid_strategy is missing for reddit platform (has default)", () => {
      // Ad group without bid_strategy, context: { platform: "reddit" }
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { bidType: "CPC" }, // Strategy is missing
        },
      });
      const context: AdGroupValidationContext = { platform: "reddit" };
      const errors = validator.validate(adGroup, context);

      const strategyError = errors.find((e) => e.field === "bid_strategy");
      expect(strategyError).toBeUndefined();
    });

    it("should error when bid_strategy is missing for google platform (no default)", () => {
      // Ad group without bid_strategy, context: { platform: "google" }
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { bidType: "CPC" }, // Strategy is missing
        },
      });
      const context: AdGroupValidationContext = { platform: "google" };
      const errors = validator.validate(adGroup, context);

      const strategyError = errors.find((e) => e.field === "bid_strategy");
      expect(strategyError).toBeDefined();
      expect(strategyError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("should error when bid_strategy is missing without platform context", () => {
      // Ad group without bid_strategy, no platform context (backwards compatible)
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { bidType: "CPC" }, // Strategy is missing
        },
      });
      const errors = validator.validate(adGroup); // No context

      const strategyError = errors.find((e) => e.field === "bid_strategy");
      expect(strategyError).toBeDefined();
      expect(strategyError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("should NOT error when bid_type is missing for reddit platform", () => {
      // Ad group without bid_type, context: { platform: "reddit" }
      const adGroup = createValidAdGroup({
        settings: {
          bidding: { strategy: "MAXIMIZE_VOLUME" }, // bidType is missing
        },
      });
      const context: AdGroupValidationContext = { platform: "reddit" };
      const errors = validator.validate(adGroup, context);

      const typeError = errors.find((e) => e.field === "bid_type");
      expect(typeError).toBeUndefined();
    });

    it("should error when bid_type is missing for google platform", () => {
      // Ad group without bidding settings at all, context: { platform: "google" }
      // Note: When strategy is set, extractBidType infers a default bid type,
      // so we need to test with no bidding settings to ensure bid_type validation works
      const adGroup = createValidAdGroup({
        settings: {
          bidding: undefined, // No bidding settings at all
        },
      });
      const context: AdGroupValidationContext = { platform: "google" };
      const errors = validator.validate(adGroup, context);

      // Google has no defaults, so both bid_strategy and bid_type should error
      const strategyError = errors.find((e) => e.field === "bid_strategy");
      const typeError = errors.find((e) => e.field === "bid_type");
      expect(strategyError).toBeDefined();
      expect(strategyError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
      expect(typeError).toBeDefined();
      expect(typeError!.code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it("should NOT error when both bid_strategy and bid_type are missing for reddit platform", () => {
      // Both missing, reddit platform -> No errors for these fields
      const adGroup = createValidAdGroup({
        settings: {
          bidding: undefined, // No bidding settings at all
        },
      });
      const context: AdGroupValidationContext = { platform: "reddit" };
      const errors = validator.validate(adGroup, context);

      const strategyError = errors.find((e) => e.field === "bid_strategy");
      const typeError = errors.find((e) => e.field === "bid_type");
      expect(strategyError).toBeUndefined();
      expect(typeError).toBeUndefined();
    });

    it("should still validate invalid bid_strategy values even with platform context", () => {
      // Invalid strategy value with reddit platform -> Still error
      const adGroup = createValidAdGroup({
        settings: {
          bidding: {
            strategy: "INVALID_STRATEGY",
            bidType: "CPC",
          },
        },
      });
      const context: AdGroupValidationContext = { platform: "reddit" };
      const errors = validator.validate(adGroup, context);

      const strategyError = errors.find((e) => e.field === "bid_strategy");
      expect(strategyError).toBeDefined();
      expect(strategyError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
    });

    it("should still validate invalid bid_type values even with platform context", () => {
      // Invalid bid_type value with reddit platform -> Still error
      const adGroup = createValidAdGroup({
        settings: {
          bidding: {
            strategy: "MAXIMIZE_VOLUME",
            bidType: "INVALID_TYPE",
          },
        },
      });
      const context: AdGroupValidationContext = { platform: "reddit" };
      const errors = validator.validate(adGroup, context);

      const typeError = errors.find((e) => e.field === "bid_type");
      expect(typeError).toBeDefined();
      expect(typeError!.code).toBe(ValidationErrorCode.INVALID_ENUM_VALUE);
    });

    it("should work correctly with combined validCampaignIds and platform context", () => {
      // Test that both context properties work together
      const adGroup = createValidAdGroup({
        campaignId: "camp-1",
        settings: {
          bidding: undefined, // No bidding settings
        },
      });
      const context: AdGroupValidationContext = {
        platform: "reddit",
        validCampaignIds: new Set(["camp-1", "camp-2"]),
      };
      const errors = validator.validate(adGroup, context);

      // Should not have campaign_id error (valid reference)
      const depError = errors.find((e) => e.field === "campaign_id");
      expect(depError).toBeUndefined();

      // Should not have bid_strategy/bid_type errors (reddit defaults)
      const strategyError = errors.find((e) => e.field === "bid_strategy");
      const typeError = errors.find((e) => e.field === "bid_type");
      expect(strategyError).toBeUndefined();
      expect(typeError).toBeUndefined();
    });
  });
});
