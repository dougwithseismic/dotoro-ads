import { describe, it, expect } from "vitest";
import type { GeneratedCampaignData } from "../../src/schema/generated-campaigns.js";
import type { CampaignSetConfig } from "../../src/schema/campaign-sets.js";

// Import helpers - these will be implemented after tests are written
import {
  buildConfigFromCampaign,
  mapCampaignStatusToSetStatus,
  extractMatchTypeFromKeyword,
  parseKeywordWithMatchType,
} from "../migrate-to-campaign-sets.js";

/**
 * Tests for mapCampaignStatusToSetStatus helper function
 * Maps campaign status enum values to campaign set status enum values
 */
describe("mapCampaignStatusToSetStatus", () => {
  it("should map 'draft' campaign status to 'draft' set status", () => {
    expect(mapCampaignStatusToSetStatus("draft")).toBe("draft");
  });

  it("should map 'pending' campaign status to 'pending' set status", () => {
    expect(mapCampaignStatusToSetStatus("pending")).toBe("pending");
  });

  it("should map 'active' campaign status to 'active' set status", () => {
    expect(mapCampaignStatusToSetStatus("active")).toBe("active");
  });

  it("should map 'paused' campaign status to 'paused' set status", () => {
    expect(mapCampaignStatusToSetStatus("paused")).toBe("paused");
  });

  it("should map 'completed' campaign status to 'completed' set status", () => {
    expect(mapCampaignStatusToSetStatus("completed")).toBe("completed");
  });

  it("should map 'error' campaign status to 'error' set status", () => {
    expect(mapCampaignStatusToSetStatus("error")).toBe("error");
  });

  it("should default to 'draft' for unknown status", () => {
    expect(mapCampaignStatusToSetStatus("unknown" as any)).toBe("draft");
  });

  it("should handle null/undefined gracefully", () => {
    expect(mapCampaignStatusToSetStatus(null as any)).toBe("draft");
    expect(mapCampaignStatusToSetStatus(undefined as any)).toBe("draft");
  });
});

/**
 * Tests for buildConfigFromCampaign helper function
 * Builds a CampaignSetConfig from existing campaign data
 */
describe("buildConfigFromCampaign", () => {
  const baseCampaign = {
    id: "campaign-uuid-1",
    userId: "user-uuid-1",
    campaignSetId: null,
    templateId: "template-uuid-1",
    dataRowId: "data-row-uuid-1",
    status: "draft" as const,
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseCampaignData: GeneratedCampaignData = {
    name: "Test Campaign",
    objective: "conversions",
    budget: {
      type: "daily",
      amount: 100,
      currency: "USD",
    },
    adGroups: [
      {
        name: "Ad Group 1",
        settings: { bidStrategy: "manual_cpc" },
        ads: [
          {
            headline: "Great Product",
            description: "Buy now and save!",
          },
        ],
      },
    ],
  };

  it("should build config with dataSourceId from dataRow relation", () => {
    const dataRow = {
      id: "data-row-uuid-1",
      dataSourceId: "data-source-uuid-1",
    };
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      dataRow
    );
    expect(config.dataSourceId).toBe("data-source-uuid-1");
  });

  it("should set empty dataSourceId when dataRow is null", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.dataSourceId).toBe("");
  });

  it("should build hierarchyConfig from campaign adGroups", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.hierarchyConfig).toBeDefined();
    expect(config.hierarchyConfig.adGroups).toHaveLength(1);
    expect(config.hierarchyConfig.adGroups[0].namePattern).toBe("Ad Group 1");
  });

  it("should extract ads from adGroups in hierarchyConfig", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.hierarchyConfig.adGroups[0].ads).toHaveLength(1);
    expect(config.hierarchyConfig.adGroups[0].ads[0].headline).toBe(
      "Great Product"
    );
  });

  it("should include budgetConfig when budget is present", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.budgetConfig).toBeDefined();
    expect(config.budgetConfig?.type).toBe("daily");
    expect(config.budgetConfig?.amountPattern).toBe("100");
    expect(config.budgetConfig?.currency).toBe("USD");
  });

  it("should not include budgetConfig when budget is absent", () => {
    const campaignDataWithoutBudget = { ...baseCampaignData };
    delete campaignDataWithoutBudget.budget;
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: campaignDataWithoutBudget },
      null
    );
    expect(config.budgetConfig).toBeUndefined();
  });

  it("should set campaignConfig with namePattern from campaign name", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.campaignConfig.namePattern).toBe("Test Campaign");
  });

  it("should set generatedAt to current ISO date string", () => {
    const beforeTest = new Date().toISOString();
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    const afterTest = new Date().toISOString();
    expect(config.generatedAt >= beforeTest).toBe(true);
    expect(config.generatedAt <= afterTest).toBe(true);
  });

  it("should set rowCount to 1 for single campaign migration", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.rowCount).toBe(1);
  });

  it("should set campaignCount to 1 for single campaign migration", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.campaignCount).toBe(1);
  });

  it("should set default empty arrays for availableColumns and selectedPlatforms", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.availableColumns).toEqual([]);
    expect(config.selectedPlatforms).toEqual([]);
  });

  it("should set default empty object for selectedAdTypes", () => {
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: baseCampaignData },
      null
    );
    expect(config.selectedAdTypes).toEqual({});
  });

  it("should handle campaign with empty adGroups", () => {
    const campaignDataNoAdGroups = {
      ...baseCampaignData,
      adGroups: [],
    };
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: campaignDataNoAdGroups },
      null
    );
    expect(config.hierarchyConfig.adGroups).toEqual([]);
  });

  it("should handle campaign with null adGroups", () => {
    const campaignDataNullAdGroups = { ...baseCampaignData };
    delete campaignDataNullAdGroups.adGroups;
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: campaignDataNullAdGroups },
      null
    );
    expect(config.hierarchyConfig.adGroups).toEqual([]);
  });

  it("should handle adGroups with empty ads array", () => {
    const campaignDataEmptyAds = {
      ...baseCampaignData,
      adGroups: [{ name: "No Ads Group", ads: [] }],
    };
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: campaignDataEmptyAds },
      null
    );
    expect(config.hierarchyConfig.adGroups[0].ads).toEqual([]);
  });

  it("should handle adGroups with null ads", () => {
    const campaignDataNullAds = {
      ...baseCampaignData,
      adGroups: [{ name: "Null Ads Group" }],
    };
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: campaignDataNullAds },
      null
    );
    expect(config.hierarchyConfig.adGroups[0].ads).toEqual([]);
  });

  it("should preserve targeting config when present", () => {
    const campaignDataWithTargeting = {
      ...baseCampaignData,
      targeting: {
        locations: ["US", "CA"],
        age: { min: 18, max: 65 },
      },
    };
    const config = buildConfigFromCampaign(
      { ...baseCampaign, campaignData: campaignDataWithTargeting },
      null
    );
    expect(config.targetingConfig).toEqual({
      locations: ["US", "CA"],
      age: { min: 18, max: 65 },
    });
  });
});

/**
 * Tests for extractMatchTypeFromKeyword helper function
 * Determines keyword match type from bracket notation
 */
describe("extractMatchTypeFromKeyword", () => {
  it("should return 'exact' for keywords wrapped in brackets [keyword]", () => {
    expect(extractMatchTypeFromKeyword("[buy shoes online]")).toBe("exact");
  });

  it("should return 'phrase' for keywords wrapped in quotes \"keyword\"", () => {
    expect(extractMatchTypeFromKeyword('"running shoes"')).toBe("phrase");
  });

  it("should return 'broad' for keywords without modifiers", () => {
    expect(extractMatchTypeFromKeyword("best running shoes")).toBe("broad");
  });

  it("should return 'broad' for keywords with + modifier (broad match modifier)", () => {
    expect(extractMatchTypeFromKeyword("+running +shoes")).toBe("broad");
  });

  it("should handle empty string as broad", () => {
    expect(extractMatchTypeFromKeyword("")).toBe("broad");
  });

  it("should handle whitespace-only string as broad", () => {
    expect(extractMatchTypeFromKeyword("   ")).toBe("broad");
  });
});

/**
 * Tests for parseKeywordWithMatchType helper function
 * Extracts the clean keyword and match type from notation
 */
describe("parseKeywordWithMatchType", () => {
  it("should strip brackets and return exact match type", () => {
    const result = parseKeywordWithMatchType("[buy shoes online]");
    expect(result.keyword).toBe("buy shoes online");
    expect(result.matchType).toBe("exact");
  });

  it("should strip quotes and return phrase match type", () => {
    const result = parseKeywordWithMatchType('"running shoes"');
    expect(result.keyword).toBe("running shoes");
    expect(result.matchType).toBe("phrase");
  });

  it("should return keyword as-is with broad match type", () => {
    const result = parseKeywordWithMatchType("best running shoes");
    expect(result.keyword).toBe("best running shoes");
    expect(result.matchType).toBe("broad");
  });

  it("should trim whitespace from keyword", () => {
    const result = parseKeywordWithMatchType("  best shoes  ");
    expect(result.keyword).toBe("best shoes");
    expect(result.matchType).toBe("broad");
  });

  it("should handle nested brackets correctly (take outer)", () => {
    const result = parseKeywordWithMatchType("[test [nested] keyword]");
    expect(result.keyword).toBe("test [nested] keyword");
    expect(result.matchType).toBe("exact");
  });

  it("should handle empty string", () => {
    const result = parseKeywordWithMatchType("");
    expect(result.keyword).toBe("");
    expect(result.matchType).toBe("broad");
  });
});
