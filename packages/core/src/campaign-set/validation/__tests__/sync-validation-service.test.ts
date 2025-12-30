/**
 * Sync Validation Service Tests
 */

import { describe, it, expect } from "vitest";
import { SyncValidationService, getSyncValidationService } from "../sync-validation-service.js";
import type { CampaignSet, Campaign, AdGroup, Ad } from "../../types.js";

// Helper to create a complete valid campaign set hierarchy
function createValidCampaignSet(overrides: Partial<CampaignSet> = {}): CampaignSet {
  const ad1: Ad = {
    id: "ad-1",
    adGroupId: "ag-1",
    orderIndex: 0,
    headline: "Test Headline",
    description: "Test description",
    displayUrl: "example.com",
    finalUrl: "https://example.com/landing",
    callToAction: "LEARN_MORE",
    assets: null,
    platformAdId: null,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const adGroup1: AdGroup = {
    id: "ag-1",
    campaignId: "camp-1",
    name: "Test Ad Group",
    orderIndex: 0,
    settings: {
      bidding: {
        strategy: "MAXIMIZE_VOLUME",
        bidType: "CPC",
      },
    },
    platformAdGroupId: null,
    status: "active",
    ads: [ad1],
    keywords: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const campaign1: Campaign = {
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
    adGroups: [adGroup1],
    budget: {
      type: "daily",
      amount: 100,
      currency: "USD",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    id: "set-1",
    userId: null,
    teamId: "team-1",
    name: "Test Campaign Set",
    description: null,
    dataSourceId: null,
    templateId: null,
    config: {
      dataSourceId: "ds-1",
      availableColumns: ["col1", "col2"],
      selectedPlatforms: ["reddit"],
      selectedAdTypes: { reddit: ["promoted_post"] },
      campaignConfig: { namePattern: "Campaign - {col1}" },
      hierarchyConfig: { adGroups: [] },
      generatedAt: new Date().toISOString(),
      rowCount: 1,
      campaignCount: 1,
    },
    campaigns: [campaign1],
    status: "draft",
    syncStatus: "pending",
    lastSyncedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("SyncValidationService", () => {
  describe("getSyncValidationService", () => {
    it("returns a singleton instance", () => {
      const service1 = getSyncValidationService();
      const service2 = getSyncValidationService();
      expect(service1).toBe(service2);
    });
  });

  describe("validateCampaignSet", () => {
    const service = new SyncValidationService();

    describe("valid campaign sets", () => {
      it("returns isValid=true for a complete valid campaign set", () => {
        const campaignSet = createValidCampaignSet();
        const result = service.validateCampaignSet(campaignSet);

        expect(result.isValid).toBe(true);
        expect(result.totalErrors).toBe(0);
        expect(result.campaignSetId).toBe("set-1");
      });

      it("validates summary counts correctly", () => {
        const campaignSet = createValidCampaignSet();
        const result = service.validateCampaignSet(campaignSet);

        expect(result.summary.campaignsValidated).toBe(1);
        expect(result.summary.adGroupsValidated).toBe(1);
        expect(result.summary.adsValidated).toBe(1);
        expect(result.summary.keywordsValidated).toBe(0);
        expect(result.summary.campaignsWithErrors).toBe(0);
        expect(result.summary.adGroupsWithErrors).toBe(0);
        expect(result.summary.adsWithErrors).toBe(0);
      });

      it("completes validation within 100ms for typical campaign set", () => {
        const campaignSet = createValidCampaignSet();
        const result = service.validateCampaignSet(campaignSet);

        expect(result.validationTimeMs).toBeLessThan(100);
      });
    });

    describe("invalid campaign sets", () => {
      it("collects campaign-level errors", () => {
        const campaignSet = createValidCampaignSet();
        campaignSet.campaigns[0].name = ""; // Invalid name
        (campaignSet.campaigns[0].campaignData as Record<string, unknown>).objective = undefined; // Missing objective

        const result = service.validateCampaignSet(campaignSet);

        expect(result.isValid).toBe(false);
        expect(result.totalErrors).toBeGreaterThan(0);
        expect(result.summary.campaignsWithErrors).toBe(1);
      });

      it("collects ad group-level errors", () => {
        const campaignSet = createValidCampaignSet();
        const settings = campaignSet.campaigns[0].adGroups[0].settings as Record<string, unknown>;
        settings.bidding = { strategy: "INVALID_STRATEGY" };

        const result = service.validateCampaignSet(campaignSet);

        expect(result.isValid).toBe(false);
        expect(result.summary.adGroupsWithErrors).toBe(1);
      });

      it("collects ad-level errors", () => {
        const campaignSet = createValidCampaignSet();
        campaignSet.campaigns[0].adGroups[0].ads[0].finalUrl = "invalid-url";

        const result = service.validateCampaignSet(campaignSet);

        expect(result.isValid).toBe(false);
        expect(result.summary.adsWithErrors).toBe(1);
      });

      it("collects errors from multiple entities in one pass", () => {
        const campaignSet = createValidCampaignSet();

        // Add errors at each level
        campaignSet.campaigns[0].name = ""; // Campaign error
        const settings = campaignSet.campaigns[0].adGroups[0].settings as Record<string, unknown>;
        settings.bidding = undefined; // Ad group error (missing bidding config entirely)
        campaignSet.campaigns[0].adGroups[0].ads[0].finalUrl = ""; // Ad error

        const result = service.validateCampaignSet(campaignSet);

        expect(result.isValid).toBe(false);
        expect(result.totalErrors).toBeGreaterThanOrEqual(3); // At least 3 errors
        expect(result.summary.campaignsWithErrors).toBe(1);
        expect(result.summary.adGroupsWithErrors).toBe(1);
        expect(result.summary.adsWithErrors).toBe(1);
      });
    });

    describe("hierarchical validation results", () => {
      it("nests ad group results under campaigns", () => {
        const campaignSet = createValidCampaignSet();
        const result = service.validateCampaignSet(campaignSet);

        expect(result.campaigns).toHaveLength(1);
        expect(result.campaigns[0].adGroups).toHaveLength(1);
        expect(result.campaigns[0].entityId).toBe("camp-1");
        expect(result.campaigns[0].adGroups[0].entityId).toBe("ag-1");
      });

      it("nests ad results under ad groups", () => {
        const campaignSet = createValidCampaignSet();
        const result = service.validateCampaignSet(campaignSet);

        expect(result.campaigns[0].adGroups[0].ads).toHaveLength(1);
        expect(result.campaigns[0].adGroups[0].ads[0].entityId).toBe("ad-1");
      });

      it("includes entity names for display", () => {
        const campaignSet = createValidCampaignSet();
        const result = service.validateCampaignSet(campaignSet);

        expect(result.campaigns[0].entityName).toBe("Test Campaign");
        expect(result.campaigns[0].adGroups[0].entityName).toBe("Test Ad Group");
        expect(result.campaigns[0].adGroups[0].ads[0].entityName).toBe("Test Headline");
      });
    });

    describe("multiple campaigns", () => {
      it("validates all campaigns in the set", () => {
        const campaignSet = createValidCampaignSet();

        // Add a second campaign
        const campaign2: Campaign = {
          ...campaignSet.campaigns[0],
          id: "camp-2",
          name: "Second Campaign",
          adGroups: [
            {
              ...campaignSet.campaigns[0].adGroups[0],
              id: "ag-2",
              campaignId: "camp-2",
              ads: [
                {
                  ...campaignSet.campaigns[0].adGroups[0].ads[0],
                  id: "ad-2",
                  adGroupId: "ag-2",
                },
              ],
            },
          ],
        };
        campaignSet.campaigns.push(campaign2);

        const result = service.validateCampaignSet(campaignSet);

        expect(result.isValid).toBe(true);
        expect(result.campaigns).toHaveLength(2);
        expect(result.summary.campaignsValidated).toBe(2);
        expect(result.summary.adGroupsValidated).toBe(2);
        expect(result.summary.adsValidated).toBe(2);
      });

      it("reports errors from specific campaigns", () => {
        const campaignSet = createValidCampaignSet();

        // Add a second campaign with an error
        const campaign2: Campaign = {
          ...campaignSet.campaigns[0],
          id: "camp-2",
          name: "", // Invalid
          adGroups: [
            {
              ...campaignSet.campaigns[0].adGroups[0],
              id: "ag-2",
              campaignId: "camp-2",
            },
          ],
        };
        campaignSet.campaigns.push(campaign2);

        const result = service.validateCampaignSet(campaignSet);

        expect(result.isValid).toBe(false);
        expect(result.campaigns[0].isValid).toBe(true);
        expect(result.campaigns[1].isValid).toBe(false);
        expect(result.summary.campaignsWithErrors).toBe(1);
      });
    });
  });

  describe("collectAllErrors", () => {
    const service = new SyncValidationService();

    it("flattens all errors into a single array", () => {
      const campaignSet = createValidCampaignSet();
      campaignSet.campaigns[0].name = "";
      const settings = campaignSet.campaigns[0].adGroups[0].settings as Record<string, unknown>;
      settings.bidding = {};
      campaignSet.campaigns[0].adGroups[0].ads[0].finalUrl = "";

      const result = service.validateCampaignSet(campaignSet);
      const allErrors = service.collectAllErrors(result);

      expect(allErrors.length).toBe(result.totalErrors);
      expect(allErrors.some((e) => e.entityType === "campaign")).toBe(true);
      expect(allErrors.some((e) => e.entityType === "adGroup")).toBe(true);
      expect(allErrors.some((e) => e.entityType === "ad")).toBe(true);
    });
  });

  describe("formatValidationSummary", () => {
    const service = new SyncValidationService();

    it("formats passing validation", () => {
      const campaignSet = createValidCampaignSet();
      const result = service.validateCampaignSet(campaignSet);
      const summary = service.formatValidationSummary(result);

      expect(summary).toContain("Validation passed");
      expect(summary).toContain("1 campaigns");
    });

    it("formats failing validation", () => {
      const campaignSet = createValidCampaignSet();
      campaignSet.campaigns[0].name = "";

      const result = service.validateCampaignSet(campaignSet);
      const summary = service.formatValidationSummary(result);

      expect(summary).toContain("Validation failed");
      expect(summary).toContain("error");
    });
  });

  describe("platform defaults", () => {
    const service = new SyncValidationService();

    /**
     * Creates a campaign set with missing fields that have Reddit platform defaults:
     * - Campaign: missing objective and specialAdCategories
     * - Ad Group: missing bid_strategy and bid_type
     */
    function createCampaignSetWithMissingDefaultableFields(): CampaignSet {
      const ad: Ad = {
        id: "ad-1",
        adGroupId: "ag-1",
        orderIndex: 0,
        headline: "Test Headline",
        description: "Test description",
        displayUrl: "example.com",
        finalUrl: "https://example.com/landing",
        callToAction: "LEARN_MORE",
        assets: null,
        platformAdId: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const adGroup: AdGroup = {
        id: "ag-1",
        campaignId: "camp-1",
        name: "Test Ad Group",
        orderIndex: 0,
        settings: {
          // Missing bidding config - no bid_strategy or bid_type
        },
        platformAdGroupId: null,
        status: "active",
        ads: [ad],
        keywords: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const campaign: Campaign = {
        id: "camp-1",
        campaignSetId: "set-1",
        name: "Test Campaign",
        platform: "reddit",
        orderIndex: 0,
        templateId: null,
        dataRowId: null,
        campaignData: {
          // Missing objective and specialAdCategories - both have Reddit defaults
        },
        status: "draft",
        syncStatus: "pending",
        lastSyncedAt: null,
        syncError: null,
        platformCampaignId: null,
        platformData: null,
        adGroups: [adGroup],
        budget: {
          type: "daily",
          amount: 100,
          currency: "USD",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        id: "set-1",
        userId: null,
        teamId: "team-1",
        name: "Test Campaign Set",
        description: null,
        dataSourceId: null,
        templateId: null,
        config: {
          dataSourceId: "ds-1",
          availableColumns: ["col1", "col2"],
          selectedPlatforms: ["reddit"],
          selectedAdTypes: { reddit: ["promoted_post"] },
          campaignConfig: { namePattern: "Campaign - {col1}" },
          hierarchyConfig: { adGroups: [] },
          generatedAt: new Date().toISOString(),
          rowCount: 1,
          campaignCount: 1,
        },
        campaigns: [campaign],
        status: "draft",
        syncStatus: "pending",
        lastSyncedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    it("should pass validation when required fields have reddit defaults", () => {
      const campaignSet = createCampaignSetWithMissingDefaultableFields();

      const result = service.validateCampaignSet(campaignSet, { platform: "reddit" });

      // Should be valid because Reddit platform has defaults for these fields
      expect(result.isValid).toBe(true);
      expect(result.totalErrors).toBe(0);
    });

    it("should fail validation when required fields missing for google platform", () => {
      const campaignSet = createCampaignSetWithMissingDefaultableFields();

      const result = service.validateCampaignSet(campaignSet, { platform: "google" });

      // Should fail because Google platform doesn't have defaults for these Reddit-specific fields
      expect(result.isValid).toBe(false);
      expect(result.totalErrors).toBeGreaterThan(0);

      // Verify we get errors for the missing fields
      const allErrors = service.collectAllErrors(result);
      const fieldNames = allErrors.map(e => e.field);

      // Should have errors for campaign objective and special_ad_categories
      expect(fieldNames).toContain("objective");
      expect(fieldNames).toContain("special_ad_categories");

      // Should have errors for ad group bid_strategy and bid_type
      expect(fieldNames).toContain("bid_strategy");
      expect(fieldNames).toContain("bid_type");
    });

    it("should fail validation when required fields missing without platform option (backwards compatible)", () => {
      const campaignSet = createCampaignSetWithMissingDefaultableFields();

      // No platform option - backwards compatible behavior
      const result = service.validateCampaignSet(campaignSet);

      // Should fail because no platform defaults are applied without platform option
      expect(result.isValid).toBe(false);
      expect(result.totalErrors).toBeGreaterThan(0);

      // Verify we get errors for the missing fields
      const allErrors = service.collectAllErrors(result);
      const fieldNames = allErrors.map(e => e.field);

      expect(fieldNames).toContain("objective");
      expect(fieldNames).toContain("special_ad_categories");
      expect(fieldNames).toContain("bid_strategy");
      expect(fieldNames).toContain("bid_type");
    });

    it("should pass platform context through to nested ad group validation", () => {
      // Create a campaign set where only ad group fields are missing
      const campaignSet = createValidCampaignSet();

      // Clear the bidding config to test ad group validation with platform context
      const adGroup = campaignSet.campaigns[0].adGroups[0];
      (adGroup.settings as Record<string, unknown>).bidding = undefined;

      // Without platform, should fail
      const resultNoPlatform = service.validateCampaignSet(campaignSet);
      expect(resultNoPlatform.isValid).toBe(false);

      // With reddit platform, should pass
      const resultWithPlatform = service.validateCampaignSet(campaignSet, { platform: "reddit" });
      expect(resultWithPlatform.isValid).toBe(true);
    });
  });
});
