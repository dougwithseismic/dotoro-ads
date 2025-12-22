import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";

const mockTemplateId = "660e8400-e29b-41d4-a716-446655440000";
const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";

// Mock the database module - routes are tightly coupled to db
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
      { product_name: "Product A", description: "Desc A" },
      { product_name: "Product B", description: "Desc B" },
    ],
    total: 2,
  }),
}));

// Import after mocking
import { campaignsApp } from "../../routes/campaigns.js";

describe("Campaigns API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: Tests that require database interaction are skipped.
  // These should be implemented as integration tests with a test database.

  describe("POST /api/v1/campaigns/generate - validation", () => {
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

    it("should return 400 for invalid dataSourceId", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["generate"].$post({
        json: {
          templateId: mockTemplateId,
          dataSourceId: "not-a-uuid",
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/campaigns/preview - validation", () => {
    it("should return 400 for invalid UUID format in template_id", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: "not-a-uuid",
          data_source_id: mockDataSourceId,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid UUID format in data_source_id", async () => {
      const client = testClient(campaignsApp);
      const res = await client["api"]["v1"]["campaigns"]["preview"].$post({
        json: {
          template_id: mockTemplateId,
          data_source_id: "not-a-uuid",
        },
      });

      expect(res.status).toBe(400);
    });

    // This test requires database to fetch template - skipped
    it.skip("should generate preview with valid inputs using stored data", async () => {
      // Integration test required - needs database to fetch template
    });
  });

  // Database-dependent tests are skipped - these require integration testing
  describe.skip("GET /api/v1/campaigns (requires database)", () => {
    it("should return a paginated list of campaigns", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/campaigns/generate (requires database)", () => {
    it("should generate campaigns from template", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/campaigns/:id (requires database)", () => {
    it("should return a campaign by id", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/campaigns/:id/sync (requires database)", () => {
    it("should sync campaign to platform", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/campaigns/:id/diff (requires database)", () => {
    it("should return diff with platform state", async () => {
      // Integration test required
    });
  });
});
