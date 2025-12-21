import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { campaignsApp, seedMockCampaigns } from "../../routes/campaigns.js";

describe("Campaigns API", () => {
  // Reset mock data before each test
  beforeEach(() => {
    seedMockCampaigns();
  });

  const mockCampaignId = "880e8400-e29b-41d4-a716-446655440000";

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
          templateId: "660e8400-e29b-41d4-a716-446655440000",
          dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
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
          dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
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
});
