import { describe, it, expect, beforeEach } from "vitest";
import {
  PreviewService,
  PreviewError,
  type PreviewServiceDependencies,
} from "../../services/preview-service.js";

describe("PreviewService", () => {
  // Mock dependencies
  const createMockDependencies = (): PreviewServiceDependencies => {
    const templates = new Map([
      [
        "tmpl-1",
        {
          id: "tmpl-1",
          name: "Test Campaign",
          platform: "reddit" as const,
          structure: {
            objective: "CONVERSIONS",
            budget: { type: "daily" as const, amount: 50, currency: "USD" },
          },
        },
      ],
    ]);

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
          { id: "row-1", product_name: "Product A", description: "Desc A" },
          { id: "row-2", product_name: "Product B", description: "Desc B" },
        ],
      ],
    ]);

    const rules = new Map([
      [
        "rule-1",
        {
          id: "rule-1",
          name: "Skip Rule",
          description: "Skips certain products",
          enabled: true,
          priority: 1,
          conditionGroup: {
            id: "g1",
            logic: "AND" as const,
            conditions: [
              { id: "c1", field: "product_name", operator: "equals", value: "Product B" },
            ],
          },
          actions: [{ id: "a1", type: "skip" }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    ]);

    return {
      getTemplate: (id) => templates.get(id),
      getDataSource: (id) => dataSources.get(id),
      getDataRows: (id) => dataRows.get(id) || [],
      getRule: (id) => rules.get(id),
    };
  };

  let service: PreviewService;
  let mockDeps: PreviewServiceDependencies;

  beforeEach(() => {
    mockDeps = createMockDependencies();
    service = new PreviewService(mockDeps);
  });

  describe("generatePreview", () => {
    it("should generate preview with correct counts", async () => {
      const result = await service.generatePreview({
        template_id: "tmpl-1",
        data_source_id: "ds-1",
        rules: [],
        limit: 20,
      });

      expect(result.campaign_count).toBe(2);
      expect(result.ad_group_count).toBe(2);
      expect(result.ad_count).toBe(2);
      expect(result.preview).toHaveLength(2);
    });

    it("should include metadata", async () => {
      const result = await service.generatePreview({
        template_id: "tmpl-1",
        data_source_id: "ds-1",
        rules: [],
        limit: 20,
      });

      expect(result.metadata.template_name).toBe("Test Campaign");
      expect(result.metadata.data_source_name).toBe("Test Data Source");
      expect(result.metadata.generated_at).toBeDefined();
    });

    it("should throw error for non-existent template", async () => {
      await expect(
        service.generatePreview({
          template_id: "non-existent",
          data_source_id: "ds-1",
          rules: [],
          limit: 20,
        })
      ).rejects.toThrow(PreviewError);

      try {
        await service.generatePreview({
          template_id: "non-existent",
          data_source_id: "ds-1",
          rules: [],
          limit: 20,
        });
      } catch (e) {
        expect(e instanceof PreviewError).toBe(true);
        expect((e as PreviewError).code).toBe("TEMPLATE_NOT_FOUND");
      }
    });

    it("should throw error for non-existent data source", async () => {
      await expect(
        service.generatePreview({
          template_id: "tmpl-1",
          data_source_id: "non-existent",
          rules: [],
          limit: 20,
        })
      ).rejects.toThrow(PreviewError);

      try {
        await service.generatePreview({
          template_id: "tmpl-1",
          data_source_id: "non-existent",
          rules: [],
          limit: 20,
        });
      } catch (e) {
        expect(e instanceof PreviewError).toBe(true);
        expect((e as PreviewError).code).toBe("DATA_SOURCE_NOT_FOUND");
      }
    });

    it("should handle empty data source", async () => {
      const depsWithEmptyData = {
        ...mockDeps,
        getDataRows: () => [],
      };
      const serviceWithEmptyData = new PreviewService(depsWithEmptyData);

      const result = await serviceWithEmptyData.generatePreview({
        template_id: "tmpl-1",
        data_source_id: "ds-1",
        rules: [],
        limit: 20,
      });

      expect(result.campaign_count).toBe(0);
      expect(result.preview).toHaveLength(0);
      expect(result.warnings).toContain("Data source contains no rows");
    });

    it("should respect limit parameter", async () => {
      const result = await service.generatePreview({
        template_id: "tmpl-1",
        data_source_id: "ds-1",
        rules: [],
        limit: 1,
      });

      // Preview should be limited to 1
      expect(result.preview.length).toBeLessThanOrEqual(1);
      // But total count should reflect all data
      expect(result.campaign_count).toBe(2);
    });

    it("should add warning for non-existent rule IDs", async () => {
      const result = await service.generatePreview({
        template_id: "tmpl-1",
        data_source_id: "ds-1",
        rules: ["non-existent-rule"],
        limit: 20,
      });

      // Should succeed without the non-existent rule
      expect(result.campaign_count).toBe(2);
      // Should include a warning about the missing rule
      expect(result.warnings).toContain("Rule 'non-existent-rule' not found");
    });

    it("should add warnings for multiple non-existent rule IDs", async () => {
      const result = await service.generatePreview({
        template_id: "tmpl-1",
        data_source_id: "ds-1",
        rules: ["missing-rule-1", "missing-rule-2", "rule-1"],
        limit: 20,
      });

      // Should succeed with the valid rule applied (rule-1 skips Product B, leaving 1 campaign)
      expect(result.campaign_count).toBe(1);
      // Should include warnings for both missing rules
      expect(result.warnings).toContain("Rule 'missing-rule-1' not found");
      expect(result.warnings).toContain("Rule 'missing-rule-2' not found");
      // Should not warn about the valid rule
      expect(result.warnings).not.toContain("Rule 'rule-1' not found");
    });

    it("should ignore disabled rules", async () => {
      // Add a disabled rule
      const depsWithDisabledRule = {
        ...mockDeps,
        getRule: (id: string) => {
          if (id === "disabled-rule") {
            return {
              id: "disabled-rule",
              name: "Disabled",
              enabled: false,
              priority: 1,
              conditionGroup: {
                id: "g1",
                logic: "AND" as const,
                conditions: [],
              },
              actions: [{ id: "a1", type: "skip" }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
          return mockDeps.getRule(id);
        },
      };
      const serviceWithDisabledRule = new PreviewService(depsWithDisabledRule);

      const result = await serviceWithDisabledRule.generatePreview({
        template_id: "tmpl-1",
        data_source_id: "ds-1",
        rules: ["disabled-rule"],
        limit: 20,
      });

      // Disabled rule should be ignored
      expect(result.campaign_count).toBe(2);
    });
  });

  describe("PreviewError", () => {
    it("should have correct properties", () => {
      const error = new PreviewError("TEST_CODE", "Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.message).toBe("Test message");
      expect(error.name).toBe("PreviewError");
    });
  });
});
