import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";
import { campaignsApp, seedMockCampaigns } from "../../routes/campaigns.js";
import { seedMockTemplates, mockTemplates } from "../../routes/templates.js";
import { seedMockData, mockDataSources, mockDataRows } from "../../routes/data-sources.js";
import { seedMockRules, mockRules } from "../../routes/rules.js";
import * as dataIngestion from "../../services/data-ingestion.js";

describe("Campaigns API", () => {
  // Mock IDs from seeded data
  const mockCampaignId = "880e8400-e29b-41d4-a716-446655440000";
  const mockTemplateId = "660e8400-e29b-41d4-a716-446655440000";
  const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
  const mockRuleId = "770e8400-e29b-41d4-a716-446655440000";

  // Reset mock data before each test
  beforeEach(() => {
    seedMockCampaigns();
    seedMockTemplates();
    seedMockData();
    seedMockRules();
  });

  describe("GET /api/v1/campaigns", () => {
    it("should return a paginated list of campaigns", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"].$get({
        query: { page: "1", limit: "10" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should filter campaigns by status", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"].$get({
        query: { status: "draft" },
      });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/v1/campaigns/generate", () => {
    it("should generate campaigns from template", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate"].$post({
        json: {
          templateId: mockTemplateId,
          dataSourceId: mockDataSourceId,
          ruleIds: [],
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toHaveProperty("generatedCount");
      expect(json).toHaveProperty("campaigns");
      expect(Array.isArray(json.campaigns)).toBe(true);
    });

    it("should return 400 for invalid templateId", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate"].$post({
        json: {
          templateId: "not-a-uuid",
          dataSourceId: mockDataSourceId,
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/campaigns/:id", () => {
    it("should return a campaign by id", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"][":id"].$get({
        param: { id: mockCampaignId },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(mockCampaignId);
      expect(json).toHaveProperty("campaignData");
      expect(json).toHaveProperty("status");
    });

    it("should return 404 for non-existent campaign", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"][":id"].$get({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/campaigns/:id/sync", () => {
    it("should sync campaign to platform", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"][":id"]["sync"].$post({
        param: { id: mockCampaignId },
        json: {
          platform: "reddit",
          accountId: "990e8400-e29b-41d4-a716-446655440000",
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("campaignId");
      expect(json).toHaveProperty("syncRecord");
      expect(json).toHaveProperty("message");
    });

    it("should return 404 for non-existent campaign", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"][":id"]["sync"].$post({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: {
          platform: "reddit",
          accountId: "990e8400-e29b-41d4-a716-446655440000",
        },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/campaigns/:id/diff", () => {
    it("should return diff with platform state", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"][":id"]["diff"].$get({
        param: { id: mockCampaignId },
        query: { platform: "reddit" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("campaignId");
      expect(json).toHaveProperty("status");
      expect(json).toHaveProperty("differences");
    });

    it("should return 404 for non-existent campaign", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"][":id"]["diff"].$get({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        query: { platform: "reddit" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/campaigns/preview", () => {
    it("should generate preview with template_id and data_source_id", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: mockDataSourceId,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("campaign_count");
      expect(json).toHaveProperty("ad_group_count");
      expect(json).toHaveProperty("ad_count");
      expect(json).toHaveProperty("preview");
      expect(json).toHaveProperty("warnings");
      expect(json).toHaveProperty("metadata");
      expect(Array.isArray(json.preview)).toBe(true);
    });

    it("should include metadata with template and data source names", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: mockDataSourceId,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.metadata).toHaveProperty("template_name");
      expect(json.metadata).toHaveProperty("data_source_name");
      expect(json.metadata).toHaveProperty("generated_at");
      expect(json.metadata.template_name).toBe("Reddit Product Ads");
      expect(json.metadata.data_source_name).toBe("Test CSV Source");
    });

    it("should return 404 for non-existent template", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: "00000000-0000-0000-0000-000000000000",
          data_source_id: mockDataSourceId,
        },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe("NOT_FOUND");
    });

    it("should return 404 for non-existent data source", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: "00000000-0000-0000-0000-000000000000",
        },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe("NOT_FOUND");
    });

    it("should return 400 for invalid UUID format", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: "not-a-uuid",
          data_source_id: mockDataSourceId,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should respect limit parameter", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: mockDataSourceId,
          limit: 1,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Preview should be limited
      expect(json.preview.length).toBeLessThanOrEqual(1);
    });

    it("should handle empty data source gracefully", async () => {
      // Create empty data source
      const emptySourceId = "550e8400-e29b-41d4-a716-446655440099";
      mockDataSources.set(emptySourceId, {
        id: emptySourceId,
        userId: null,
        name: "Empty Source",
        type: "csv",
        config: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mockDataRows.set(emptySourceId, []);

      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: emptySourceId,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.campaign_count).toBe(0);
      expect(json.ad_group_count).toBe(0);
      expect(json.ad_count).toBe(0);
      expect(json.preview).toHaveLength(0);
      expect(json.warnings).toContain("Data source contains no rows");
    });

    it("should use default limit of 20 when not specified", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: mockDataSourceId,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Default limit is 20, but we have only 2 rows in mock data
      expect(json.preview.length).toBeLessThanOrEqual(20);
    });

    it("should accept optional rules array", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: mockDataSourceId,
          rules: [mockRuleId],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Rule should be acknowledged even if it doesn't affect output
      expect(json).toHaveProperty("preview");
    });

    it("should warn about non-existent rule IDs", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: mockDataSourceId,
          rules: ["00000000-0000-0000-0000-000000000000"],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Should succeed but with warning about non-existent rule
      expect(json).toHaveProperty("preview");
      expect(json.warnings.some((w: string) => w.includes("not found"))).toBe(true);
    });
  });

  describe("Mock data fallback behavior", () => {
    it("should use stored data when available instead of mock data", async () => {
      // This test verifies that stored data takes precedence over mock data
      const client = testClient(campaignsApp);

      // When hasStoredData returns true, getStoredRows should be called
      const hasStoredDataSpy = vi.spyOn(dataIngestion, "hasStoredData");
      const getStoredRowsSpy = vi.spyOn(dataIngestion, "getStoredRows");

      hasStoredDataSpy.mockReturnValue(true);
      getStoredRowsSpy.mockReturnValue({
        rows: [
          { product_name: "Stored Product 1", description: "From storage" },
          { product_name: "Stored Product 2", description: "From storage" },
        ],
        total: 2,
      });

      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: mockDataSourceId,
        },
      });

      expect(res.status).toBe(200);
      expect(hasStoredDataSpy).toHaveBeenCalledWith(mockDataSourceId);
      expect(getStoredRowsSpy).toHaveBeenCalledWith(mockDataSourceId, 1, 10000);

      // Clean up
      hasStoredDataSpy.mockRestore();
      getStoredRowsSpy.mockRestore();
    });

    it("should warn in development when falling back to mock data", async () => {
      const client = testClient(campaignsApp);

      // Mock hasStoredData to return false
      const hasStoredDataSpy = vi.spyOn(dataIngestion, "hasStoredData");
      hasStoredDataSpy.mockReturnValue(false);

      // Spy on console.warn
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: mockDataSourceId,
        },
      });

      expect(res.status).toBe(200);
      // In development mode, should log a warning about falling back to mock data
      if (process.env.NODE_ENV !== "production") {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Falling back to mock data")
        );
      }

      // Clean up
      hasStoredDataSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});
