import { describe, it, expect, beforeEach } from "vitest";
import { redditApp } from "../../routes/reddit.js";

describe("Reddit Routes", () => {
  describe("POST /api/v1/reddit/campaigns", () => {
    it("should create a new Reddit campaign", async () => {
      const response = await redditApp.request("/api/v1/reddit/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "t5_abc123",
          name: "Test Campaign",
          objective: "CONVERSIONS",
          fundingInstrumentId: "fi_xyz789",
          startDate: "2025-02-01T00:00:00Z",
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe("Test Campaign");
      expect(data.objective).toBe("CONVERSIONS");
      expect(data.status).toBe("PAUSED");
      expect(data.id).toBeDefined();
    });

    it("should validate required fields", async () => {
      const response = await redditApp.request("/api/v1/reddit/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "t5_abc123",
          // Missing required fields
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should validate campaign name length", async () => {
      const response = await redditApp.request("/api/v1/reddit/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "t5_abc123",
          name: "x".repeat(256), // Exceeds 255 limit
          objective: "CONVERSIONS",
          fundingInstrumentId: "fi_xyz789",
          startDate: "2025-02-01T00:00:00Z",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/reddit/campaigns/{id}", () => {
    it("should retrieve the seeded campaign", async () => {
      const response = await redditApp.request("/api/v1/reddit/campaigns/camp_mock_001", {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe("camp_mock_001");
      expect(data.name).toBe("Demo Campaign");
    });

    it("should return 404 for non-existent campaign", async () => {
      const response = await redditApp.request("/api/v1/reddit/campaigns/non_existent", {
        method: "GET",
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/v1/reddit/campaigns/{id}", () => {
    let createdCampaignId: string;

    beforeEach(async () => {
      // Create a campaign to update
      const createResponse = await redditApp.request("/api/v1/reddit/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "t5_abc123",
          name: "Campaign to Update",
          objective: "AWARENESS",
          fundingInstrumentId: "fi_xyz789",
          startDate: "2025-02-01T00:00:00Z",
        }),
      });
      const data = await createResponse.json();
      createdCampaignId = data.id;
    });

    it("should update campaign name", async () => {
      const response = await redditApp.request(`/api/v1/reddit/campaigns/${createdCampaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Campaign Name",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Updated Campaign Name");
    });

    it("should update campaign status", async () => {
      const response = await redditApp.request(`/api/v1/reddit/campaigns/${createdCampaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ACTIVE",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("ACTIVE");
    });

    it("should return 404 for non-existent campaign", async () => {
      const response = await redditApp.request("/api/v1/reddit/campaigns/non_existent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Name",
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/reddit/campaigns/{id}", () => {
    it("should delete a campaign", async () => {
      // Create campaign first
      const createResponse = await redditApp.request("/api/v1/reddit/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "t5_abc123",
          name: "Campaign to Delete",
          objective: "AWARENESS",
          fundingInstrumentId: "fi_xyz789",
          startDate: "2025-02-01T00:00:00Z",
        }),
      });
      const createData = await createResponse.json();

      // Delete it
      const deleteResponse = await redditApp.request(
        `/api/v1/reddit/campaigns/${createData.id}`,
        { method: "DELETE" }
      );

      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await redditApp.request(
        `/api/v1/reddit/campaigns/${createData.id}`,
        { method: "GET" }
      );
      expect(getResponse.status).toBe(404);
    });
  });

  describe("GET /api/v1/reddit/campaigns/{id}/status", () => {
    it("should return campaign status", async () => {
      const response = await redditApp.request("/api/v1/reddit/campaigns/camp_mock_001/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.campaignId).toBe("camp_mock_001");
      expect(data.platformStatus).toBeDefined();
      expect(data.syncStatus).toBeDefined();
    });
  });

  describe("POST /api/v1/reddit/sync", () => {
    it("should sync campaigns for an account", async () => {
      // Create a pending campaign
      await redditApp.request("/api/v1/reddit/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "t5_sync_test",
          name: "Campaign to Sync",
          objective: "CONVERSIONS",
          fundingInstrumentId: "fi_xyz789",
          startDate: "2025-02-01T00:00:00Z",
        }),
      });

      const response = await redditApp.request("/api/v1/reddit/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "t5_sync_test",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.syncedCount).toBeGreaterThanOrEqual(1);
    });

    it("should support dry run mode", async () => {
      const response = await redditApp.request("/api/v1/reddit/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "t5_abc123",
          dryRun: true,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      // In dry run, nothing should actually be created/updated
      expect(data.createdCount).toBe(0);
      expect(data.updatedCount).toBe(0);
    });
  });
});
