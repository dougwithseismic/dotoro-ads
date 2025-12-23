import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";

const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
const mockRuleId = "660e8400-e29b-41d4-a716-446655440001";

// Mock the database module
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    generatedCampaigns: { id: "id", status: "status", templateId: "template_id", createdAt: "created_at" },
    syncRecords: { id: "id", generatedCampaignId: "generated_campaign_id" },
    campaignTemplates: { id: "id" },
    dataSources: { id: "id" },
    dataRows: { id: "id", dataSourceId: "data_source_id", rowIndex: "row_index" },
    rules: { id: "id" },
  };
});

// Mock data-ingestion service
vi.mock("../../services/data-ingestion.js", () => ({
  hasStoredData: vi.fn().mockReturnValue(true),
  getStoredRows: vi.fn().mockReturnValue({
    rows: [
      { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
      { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top rated" },
      { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
      { brand: "Adidas", product: "Ultra Boost", headline: "Run Light", description: "Soft" },
    ],
    total: 4,
  }),
}));

// Import after mocking
import { campaignsApp } from "../../routes/campaigns.js";

describe("POST /api/v1/campaigns/generate-from-config", () => {
  const validRequest = {
    dataSourceId: mockDataSourceId,
    campaignConfig: {
      namePattern: "{brand}-performance",
      platform: "reddit",
      objective: "CONVERSIONS",
      budget: {
        type: "daily",
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("request validation", () => {
    it("returns 400 for invalid dataSourceId", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: {
          ...validRequest,
          dataSourceId: "not-a-uuid",
        },
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for missing campaignConfig", async () => {
      const client = testClient(campaignsApp);
      const { campaignConfig, ...requestWithoutConfig } = validRequest;
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: requestWithoutConfig as any,
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for missing hierarchyConfig", async () => {
      const client = testClient(campaignsApp);
      const { hierarchyConfig, ...requestWithoutHierarchy } = validRequest;
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: requestWithoutHierarchy as any,
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for empty namePattern", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: {
          ...validRequest,
          campaignConfig: {
            ...validRequest.campaignConfig,
            namePattern: "",
          },
        },
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid platform", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: {
          ...validRequest,
          campaignConfig: {
            ...validRequest.campaignConfig,
            platform: "invalid-platform",
          },
        },
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid ruleId format", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: {
          ...validRequest,
          ruleIds: ["not-a-uuid"],
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("successful generation", () => {
    // TODO: These tests require full database mocking or integration test setup.
    // The ConfigPreviewService uses getDataSource which queries the database.
    // Current mocking only handles hasStoredData/getStoredRows from data-ingestion.
    // To enable these tests:
    // 1. Mock db.select().from(dataSources).where(...) to return a valid data source
    // 2. Or set up a test database with seed data

    it.skip("generates campaigns from config with valid data source", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: validRequest,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.campaigns).toBeDefined();
      expect(body.stats).toBeDefined();
      expect(body.warnings).toBeDefined();
    });

    it.skip("returns correct campaign count based on unique campaign names", async () => {
      // With the mock data (Nike x3, Adidas x1)
      // Should result in 2 campaigns: Nike-performance, Adidas-performance
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: validRequest,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stats.totalCampaigns).toBe(2);
    });

    it.skip("returns correct ad group count", async () => {
      // Nike should have Air Max (2 ads) and Jordan (1 ad), Adidas should have Ultra Boost (1 ad)
      // Total: 3 ad groups
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: validRequest,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stats.totalAdGroups).toBe(3);
    });

    it.skip("returns correct ad count", async () => {
      // 4 rows = 4 ads
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: validRequest,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stats.totalAds).toBe(4);
    });

    it.skip("returns 404 when data source not found", async () => {
      // Use a data source ID that won't be found (mocked hasStoredData returns false)
      const { hasStoredData } = await import("../../services/data-ingestion.js");
      vi.mocked(hasStoredData).mockReturnValueOnce(false);

      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate-from-config"].$post({
        json: {
          ...validRequest,
          dataSourceId: "00000000-0000-0000-0000-000000000000", // Non-existent
        },
      });

      expect(res.status).toBe(404);
    });
  });
});

describe("POST /api/v1/campaigns/preview-from-config", () => {
  const validRequest = {
    dataSourceId: mockDataSourceId,
    campaignConfig: {
      namePattern: "{brand}-performance",
      platform: "reddit",
    },
    hierarchyConfig: {
      adGroupNamePattern: "{product}",
      adMapping: {
        headline: "{headline}",
        description: "{description}",
      },
    },
    limit: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("request validation", () => {
    it("returns 400 for invalid dataSourceId", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview-from-config"].$post({
        json: {
          ...validRequest,
          dataSourceId: "not-a-uuid",
        },
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for missing campaignConfig", async () => {
      const client = testClient(campaignsApp);
      const { campaignConfig, ...requestWithoutConfig } = validRequest;
      const res = await client["api"]["v1"]["campaigns"]["preview-from-config"].$post({
        json: requestWithoutConfig as any,
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for limit over 100", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview-from-config"].$post({
        json: {
          ...validRequest,
          limit: 101,
        },
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for limit under 1", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview-from-config"].$post({
        json: {
          ...validRequest,
          limit: 0,
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("successful preview", () => {
    // TODO: These tests require full database mocking or integration test setup.
    // The ConfigPreviewService uses getDataSource which queries the database.
    // Current mocking only handles hasStoredData/getStoredRows from data-ingestion.
    // To enable these tests:
    // 1. Mock db.select().from(dataSources).where(...) to return a valid data source
    // 2. Or set up a test database with seed data

    it.skip("returns preview with campaign counts", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview-from-config"].$post({
        json: validRequest,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.campaignCount).toBeDefined();
      expect(body.adGroupCount).toBeDefined();
      expect(body.adCount).toBeDefined();
      expect(body.rowsProcessed).toBeDefined();
    });

    it.skip("respects limit parameter", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview-from-config"].$post({
        json: {
          ...validRequest,
          limit: 1,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      // Preview should be limited but stats should reflect full data
      expect(body.preview.length).toBeLessThanOrEqual(1);
    });

    it.skip("returns correct campaign hierarchy structure", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview-from-config"].$post({
        json: validRequest,
      });

      expect(res.status).toBe(200);
      const body = await res.json();

      // Should have 2 campaigns based on mock data (Nike, Adidas)
      expect(body.campaignCount).toBe(2);

      // Should have 3 ad groups (Air Max, Jordan, Ultra Boost)
      expect(body.adGroupCount).toBe(3);

      // Should have 4 ads (4 rows of mock data)
      expect(body.adCount).toBe(4);

      // Preview array should contain campaign previews
      expect(body.preview).toBeInstanceOf(Array);
      if (body.preview.length > 0) {
        const firstCampaign = body.preview[0];
        expect(firstCampaign.name).toBeDefined();
        expect(firstCampaign.platform).toBe("reddit");
        expect(firstCampaign.adGroups).toBeInstanceOf(Array);
      }
    });

    it.skip("returns 404 when data source not found", async () => {
      // Use a data source ID that won't be found
      const { hasStoredData } = await import("../../services/data-ingestion.js");
      vi.mocked(hasStoredData).mockReturnValueOnce(false);

      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview-from-config"].$post({
        json: {
          ...validRequest,
          dataSourceId: "00000000-0000-0000-0000-000000000000",
        },
      });

      expect(res.status).toBe(404);
    });
  });
});
