import { describe, it, expect, beforeEach } from "vitest";
import {
  ConfigPreviewService,
  ConfigPreviewError,
  type ConfigPreviewServiceDependencies,
} from "../../services/config-preview-service.js";

describe("ConfigPreviewService", () => {
  // Mock dependencies
  const createMockDependencies = (): ConfigPreviewServiceDependencies => {
    const dataSources = new Map([
      [
        "ds-1",
        {
          id: "ds-1",
          name: "Test Data Source",
          type: "csv",
        },
      ],
    ]);

    const dataRows = new Map<string, Record<string, unknown>[]>([
      [
        "ds-1",
        [
          { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
          { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top rated" },
          { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
          { brand: "Adidas", product: "Ultra Boost", headline: "Run Light", description: "Soft" },
        ],
      ],
    ]);

    const rules = new Map([
      [
        "rule-1",
        {
          id: "rule-1",
          name: "Skip Rule",
          description: "Skips Adidas products",
          enabled: true,
          priority: 1,
          conditionGroup: {
            id: "g1",
            logic: "AND" as const,
            conditions: [
              { id: "c1", field: "brand", operator: "equals", value: "Adidas" },
            ],
          },
          actions: [{ id: "a1", type: "skip" }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    ]);

    return {
      getDataSource: (id) => dataSources.get(id),
      getDataRows: (id) => dataRows.get(id) || [],
      getRule: (id) => rules.get(id),
    };
  };

  let service: ConfigPreviewService;
  let mockDeps: ConfigPreviewServiceDependencies;

  beforeEach(() => {
    mockDeps = createMockDependencies();
    service = new ConfigPreviewService(mockDeps);
  });

  describe("generatePreview", () => {
    const baseRequest = {
      dataSourceId: "ds-1",
      campaignConfig: {
        namePattern: "{brand}-performance",
        platform: "reddit" as const,
      },
      hierarchyConfig: {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      },
      limit: 20,
    };

    it("generates preview with correct campaign counts", async () => {
      const result = await service.generatePreview(baseRequest);

      // 2 brands (Nike, Adidas) = 2 campaigns
      expect(result.campaignCount).toBe(2);
    });

    it("generates preview with correct ad group counts", async () => {
      const result = await service.generatePreview(baseRequest);

      // Nike: Air Max, Jordan (2), Adidas: Ultra Boost (1) = 3 ad groups
      expect(result.adGroupCount).toBe(3);
    });

    it("generates preview with correct ad counts", async () => {
      const result = await service.generatePreview(baseRequest);

      // 4 rows = 4 ads
      expect(result.adCount).toBe(4);
    });

    it("includes rows processed in result", async () => {
      const result = await service.generatePreview(baseRequest);

      expect(result.rowsProcessed).toBe(4);
    });

    it("includes metadata with data source name", async () => {
      const result = await service.generatePreview(baseRequest);

      expect(result.metadata.dataSourceName).toBe("Test Data Source");
      expect(result.metadata.generatedAt).toBeDefined();
    });

    it("respects limit parameter for preview campaigns", async () => {
      const result = await service.generatePreview({
        ...baseRequest,
        limit: 1,
      });

      // Preview should be limited
      expect(result.preview.length).toBeLessThanOrEqual(1);
      // But stats should reflect full data
      expect(result.campaignCount).toBe(2);
    });

    it("throws error for non-existent data source", async () => {
      await expect(
        service.generatePreview({
          ...baseRequest,
          dataSourceId: "non-existent",
        })
      ).rejects.toThrow(ConfigPreviewError);

      try {
        await service.generatePreview({
          ...baseRequest,
          dataSourceId: "non-existent",
        });
      } catch (e) {
        expect(e instanceof ConfigPreviewError).toBe(true);
        expect((e as ConfigPreviewError).code).toBe("DATA_SOURCE_NOT_FOUND");
      }
    });

    it("handles empty data source", async () => {
      const depsWithEmptyData = {
        ...mockDeps,
        getDataRows: () => [],
      };
      const serviceWithEmptyData = new ConfigPreviewService(depsWithEmptyData);

      const result = await serviceWithEmptyData.generatePreview(baseRequest);

      expect(result.campaignCount).toBe(0);
      expect(result.adGroupCount).toBe(0);
      expect(result.adCount).toBe(0);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: "no_data",
          message: expect.stringContaining("no rows"),
        })
      );
    });

    it("includes preview campaigns with correct structure", async () => {
      const result = await service.generatePreview(baseRequest);

      expect(result.preview.length).toBeGreaterThan(0);
      const firstCampaign = result.preview[0];

      expect(firstCampaign).toHaveProperty("name");
      expect(firstCampaign).toHaveProperty("platform");
      expect(firstCampaign).toHaveProperty("adGroupCount");
      expect(firstCampaign).toHaveProperty("adGroups");
    });

    it("includes ad groups with sample ads", async () => {
      const result = await service.generatePreview(baseRequest);

      const firstCampaign = result.preview[0];
      expect(firstCampaign?.adGroups.length).toBeGreaterThan(0);

      const firstAdGroup = firstCampaign?.adGroups[0];
      expect(firstAdGroup).toHaveProperty("name");
      expect(firstAdGroup).toHaveProperty("adCount");
      expect(firstAdGroup).toHaveProperty("sampleAds");
    });
  });

  describe("generateFromConfig (full generation)", () => {
    const baseRequest = {
      dataSourceId: "ds-1",
      campaignConfig: {
        namePattern: "{brand}-performance",
        platform: "reddit" as const,
        objective: "CONVERSIONS",
        budget: {
          type: "daily" as const,
          amountPattern: "100",
          currency: "USD",
        },
      },
      hierarchyConfig: {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      },
    };

    it("generates full campaign structure", async () => {
      const result = await service.generateFromConfig(baseRequest);

      expect(result.campaigns.length).toBe(2);
      expect(result.stats.totalCampaigns).toBe(2);
    });

    it("includes budget with numeric amount", async () => {
      const result = await service.generateFromConfig(baseRequest);

      const campaignWithBudget = result.campaigns.find((c) => c.budget);
      expect(campaignWithBudget?.budget?.amount).toBe(100);
      expect(campaignWithBudget?.budget?.currency).toBe("USD");
      expect(campaignWithBudget?.budget?.type).toBe("daily");
    });

    it("includes objective in campaigns", async () => {
      const result = await service.generateFromConfig(baseRequest);

      expect(result.campaigns[0]?.objective).toBe("CONVERSIONS");
    });

    it("groups ads correctly by ad group", async () => {
      const result = await service.generateFromConfig(baseRequest);

      // Nike campaign should have 2 ad groups: Air Max (2 ads) and Jordan (1 ad)
      const nikeCampaign = result.campaigns.find((c) => c.name === "Nike-performance");
      expect(nikeCampaign).toBeDefined();
      expect(nikeCampaign?.adGroups.length).toBe(2);

      const airMaxGroup = nikeCampaign?.adGroups.find((ag) => ag.name === "Air Max");
      expect(airMaxGroup?.ads.length).toBe(2);

      const jordanGroup = nikeCampaign?.adGroups.find((ag) => ag.name === "Jordan");
      expect(jordanGroup?.ads.length).toBe(1);
    });

    it("interpolates ad fields correctly", async () => {
      const result = await service.generateFromConfig(baseRequest);

      const nikeCampaign = result.campaigns.find((c) => c.name === "Nike-performance");
      const jordanGroup = nikeCampaign?.adGroups.find((ag) => ag.name === "Jordan");
      const ad = jordanGroup?.ads[0];

      expect(ad?.headline).toBe("Jump High");
      expect(ad?.description).toBe("Classic");
    });

    it("throws error for non-existent data source", async () => {
      await expect(
        service.generateFromConfig({
          ...baseRequest,
          dataSourceId: "non-existent",
        })
      ).rejects.toThrow(ConfigPreviewError);
    });

    it("handles variable budget pattern", async () => {
      const depsWithBudgetData: ConfigPreviewServiceDependencies = {
        ...mockDeps,
        getDataRows: () => [
          { brand: "Nike", product: "Air Max", headline: "Test", description: "Test", budget: 150 },
        ],
      };
      const serviceWithBudget = new ConfigPreviewService(depsWithBudgetData);

      const result = await serviceWithBudget.generateFromConfig({
        ...baseRequest,
        campaignConfig: {
          ...baseRequest.campaignConfig,
          budget: {
            type: "daily" as const,
            amountPattern: "{budget}",
            currency: "USD",
          },
        },
      });

      expect(result.campaigns[0]?.budget?.amount).toBe(150);
    });

    it("returns empty campaigns for empty data source", async () => {
      const depsWithEmptyData = {
        ...mockDeps,
        getDataRows: () => [],
      };
      const serviceWithEmptyData = new ConfigPreviewService(depsWithEmptyData);

      const result = await serviceWithEmptyData.generateFromConfig(baseRequest);

      expect(result.campaigns).toHaveLength(0);
      expect(result.stats.totalCampaigns).toBe(0);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: "no_data",
        })
      );
    });
  });

  describe("rule application", () => {
    const baseRequest = {
      dataSourceId: "ds-1",
      campaignConfig: {
        namePattern: "{brand}-performance",
        platform: "reddit" as const,
      },
      hierarchyConfig: {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      },
    };

    it("applies skip rules to filter rows", async () => {
      // rule-1 skips Adidas products
      const result = await service.generateFromConfig({
        ...baseRequest,
        ruleIds: ["rule-1"],
      });

      // Only Nike products should remain
      expect(result.stats.totalCampaigns).toBe(1);
      expect(result.campaigns[0]?.name).toBe("Nike-performance");
    });

    it("adds warning for non-existent rule IDs", async () => {
      const result = await service.generateFromConfig({
        ...baseRequest,
        ruleIds: ["non-existent-rule"],
      });

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: "rule_not_found",
          message: expect.stringContaining("non-existent-rule"),
        })
      );
    });

    it("ignores disabled rules", async () => {
      const depsWithDisabledRule: ConfigPreviewServiceDependencies = {
        ...mockDeps,
        getRule: (id: string) => {
          if (id === "disabled-rule") {
            return {
              id: "disabled-rule",
              name: "Disabled Rule",
              enabled: false,
              priority: 1,
              conditionGroup: {
                id: "g1",
                logic: "AND" as const,
                conditions: [
                  { id: "c1", field: "brand", operator: "equals", value: "Nike" },
                ],
              },
              actions: [{ id: "a1", type: "skip" }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
          return mockDeps.getRule(id);
        },
      };
      const serviceWithDisabledRule = new ConfigPreviewService(depsWithDisabledRule);

      const result = await serviceWithDisabledRule.generateFromConfig({
        ...baseRequest,
        ruleIds: ["disabled-rule"],
      });

      // Rule should be ignored, all data should be processed
      expect(result.stats.totalCampaigns).toBe(2);
    });
  });

  describe("warning collection", () => {
    it("collects warnings for missing variables", async () => {
      const depsWithMissingData: ConfigPreviewServiceDependencies = {
        ...mockDeps,
        getDataRows: () => [
          { brand: "Nike", headline: "Test", description: "Test" }, // missing 'product'
        ],
      };
      const serviceWithMissingData = new ConfigPreviewService(depsWithMissingData);

      const result = await serviceWithMissingData.generateFromConfig({
        dataSourceId: "ds-1",
        campaignConfig: {
          namePattern: "{brand}-performance",
          platform: "reddit" as const,
        },
        hierarchyConfig: {
          adGroupNamePattern: "{product}",
          adMapping: {
            headline: "{headline}",
            description: "{description}",
          },
        },
      });

      expect(result.warnings.some((w) => w.type === "missing_variable")).toBe(true);
    });

    it("collects warnings for empty variable values", async () => {
      const depsWithEmptyValue: ConfigPreviewServiceDependencies = {
        ...mockDeps,
        getDataRows: () => [
          { brand: "Nike", product: "", headline: "Test", description: "Test" },
        ],
      };
      const serviceWithEmptyValue = new ConfigPreviewService(depsWithEmptyValue);

      const result = await serviceWithEmptyValue.generateFromConfig({
        dataSourceId: "ds-1",
        campaignConfig: {
          namePattern: "{brand}-performance",
          platform: "reddit" as const,
        },
        hierarchyConfig: {
          adGroupNamePattern: "{product}",
          adMapping: {
            headline: "{headline}",
            description: "{description}",
          },
        },
      });

      expect(result.warnings.some((w) => w.type === "empty_value")).toBe(true);
    });
  });

  describe("ConfigPreviewError", () => {
    it("has correct properties", () => {
      const error = new ConfigPreviewError("TEST_CODE", "Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.message).toBe("Test message");
      expect(error.name).toBe("ConfigPreviewError");
    });
  });
});
