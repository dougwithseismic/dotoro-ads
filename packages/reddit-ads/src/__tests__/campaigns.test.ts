import { describe, it, expect, beforeEach, vi } from "vitest";
import { CampaignService } from "../campaigns.js";
import { RedditApiClient } from "../client.js";
import type { RedditCampaign, CampaignResponse, CampaignFilters } from "../types.js";

// Mock the client
vi.mock("../client.js", () => ({
  RedditApiClient: vi.fn(),
}));

describe("CampaignService", () => {
  let campaignService: CampaignService;
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockCampaignResponse: CampaignResponse = {
    id: "camp_123",
    account_id: "acc_456",
    name: "Test Campaign",
    objective: "CONVERSIONS",
    funding_instrument_id: "fi_789",
    status: "ACTIVE",
    start_date: "2025-01-15T00:00:00Z",
    end_date: null,
    total_budget_micro: 100000000,
    daily_budget_micro: 10000000,
    is_paid: true,
    created_at: "2025-01-10T00:00:00Z",
    updated_at: "2025-01-10T00:00:00Z",
  };

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    campaignService = new CampaignService(mockClient as unknown as RedditApiClient);
    vi.clearAllMocks();
  });

  describe("createCampaign", () => {
    it("should create a campaign with required fields", async () => {
      // Reddit v3 API uses configured_status instead of start_date
      const newCampaign: RedditCampaign = {
        name: "My New Campaign",
        objective: "IMPRESSIONS",
        configured_status: "ACTIVE",
        funding_instrument_id: "fi_123",
      };

      mockClient.post.mockResolvedValueOnce({ data: mockCampaignResponse });

      const result = await campaignService.createCampaign("acc_456", newCampaign);

      // v3 API wraps payload in { data: ... }
      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/campaigns",
        { data: newCampaign }
      );
      expect(result).toEqual(mockCampaignResponse);
    });

    it("should validate campaign name length", async () => {
      const invalidCampaign: RedditCampaign = {
        name: "x".repeat(256), // Exceeds 255 char limit
        objective: "IMPRESSIONS",
        configured_status: "ACTIVE",
        funding_instrument_id: "fi_123",
      };

      await expect(
        campaignService.createCampaign("acc_456", invalidCampaign)
      ).rejects.toThrow("Campaign name must not exceed 255 characters");
    });

    it("should validate campaign name is not empty", async () => {
      const invalidCampaign: RedditCampaign = {
        name: "",
        objective: "IMPRESSIONS",
        configured_status: "ACTIVE",
        funding_instrument_id: "fi_123",
      };

      await expect(
        campaignService.createCampaign("acc_456", invalidCampaign)
      ).rejects.toThrow("Campaign name is required");
    });

    it("should validate campaign name is not whitespace only", async () => {
      const invalidCampaign: RedditCampaign = {
        name: "   ",
        objective: "IMPRESSIONS",
        configured_status: "ACTIVE",
        funding_instrument_id: "fi_123",
      };

      await expect(
        campaignService.createCampaign("acc_456", invalidCampaign)
      ).rejects.toThrow("Campaign name is required");
    });

    it("should validate objective is required", async () => {
      const invalidCampaign = {
        name: "Valid Name",
        objective: undefined,
        configured_status: "ACTIVE",
        funding_instrument_id: "fi_123",
      } as unknown as RedditCampaign;

      await expect(
        campaignService.createCampaign("acc_456", invalidCampaign)
      ).rejects.toThrow("Campaign objective is required");
    });

    it("should validate configured_status is required", async () => {
      const invalidCampaign = {
        name: "Valid Name",
        objective: "IMPRESSIONS",
        configured_status: "",
        funding_instrument_id: "fi_123",
      } as unknown as RedditCampaign;

      await expect(
        campaignService.createCampaign("acc_456", invalidCampaign)
      ).rejects.toThrow("Configured status is required");
    });

    it("should include optional fields when provided", async () => {
      const campaignWithOptionals: RedditCampaign = {
        name: "Campaign with Budget",
        objective: "CONVERSIONS",
        configured_status: "ACTIVE",
        funding_instrument_id: "fi_123",
        total_budget_micro: 500000000,
        daily_budget_micro: 20000000,
      };

      mockClient.post.mockResolvedValueOnce({ data: mockCampaignResponse });

      await campaignService.createCampaign("acc_456", campaignWithOptionals);

      // v3 API wraps payload in { data: ... }
      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/campaigns",
        { data: campaignWithOptionals }
      );
    });
  });

  describe("getCampaign", () => {
    it("should fetch a campaign by ID using /campaigns/{id} path", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockCampaignResponse });

      const result = await campaignService.getCampaign("acc_456", "camp_123");

      // v3 API uses /campaigns/{id} path (not under ad_accounts)
      expect(mockClient.get).toHaveBeenCalledWith(
        "/campaigns/camp_123"
      );
      expect(result).toEqual(mockCampaignResponse);
    });
  });

  describe("updateCampaign", () => {
    it("should update a campaign using PATCH method and /campaigns/{id} path", async () => {
      const updates = {
        name: "Updated Campaign Name",
        daily_budget_micro: 15000000,
      };

      const updatedResponse = { ...mockCampaignResponse, ...updates };
      mockClient.patch.mockResolvedValueOnce({ data: updatedResponse });

      const result = await campaignService.updateCampaign("acc_456", "camp_123", updates);

      // v3 API uses PATCH method and /campaigns/{id} path (not PUT, not under ad_accounts)
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/campaigns/camp_123",
        { data: updates }
      );
      expect(result.name).toBe("Updated Campaign Name");
    });

    it("should validate updated name length", async () => {
      const updates = {
        name: "y".repeat(256),
      };

      await expect(
        campaignService.updateCampaign("acc_456", "camp_123", updates)
      ).rejects.toThrow("Campaign name must not exceed 255 characters");
    });
  });

  describe("deleteCampaign", () => {
    it("should delete a campaign using /campaigns/{id} path", async () => {
      mockClient.delete.mockResolvedValueOnce(undefined);

      await campaignService.deleteCampaign("acc_456", "camp_123");

      // v3 API uses /campaigns/{id} path (not under ad_accounts)
      expect(mockClient.delete).toHaveBeenCalledWith(
        "/campaigns/camp_123"
      );
    });
  });

  describe("listCampaigns", () => {
    it("should list campaigns without filters", async () => {
      const mockList = [mockCampaignResponse];
      mockClient.get.mockResolvedValueOnce({
        data: mockList,
        pagination: { count: 1 },
      });

      const result = await campaignService.listCampaigns("acc_456");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/campaigns",
        expect.objectContaining({})
      );
      expect(result).toEqual(mockList);
    });

    it("should list campaigns with filters", async () => {
      const filters: CampaignFilters = {
        status: "ACTIVE",
        objective: "CONVERSIONS",
        page: 1,
        limit: 50,
      };

      mockClient.get.mockResolvedValueOnce({
        data: [mockCampaignResponse],
        pagination: { count: 1 },
      });

      await campaignService.listCampaigns("acc_456", filters);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/campaigns",
        expect.objectContaining({
          params: expect.objectContaining({
            status: "ACTIVE",
            objective: "CONVERSIONS",
          }),
        })
      );
    });

    it("should handle pagination parameters", async () => {
      const filters: CampaignFilters = {
        page: 2,
        limit: 25,
      };

      mockClient.get.mockResolvedValueOnce({
        data: [],
        pagination: { count: 0 },
      });

      await campaignService.listCampaigns("acc_456", filters);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/campaigns",
        expect.objectContaining({
          params: expect.objectContaining({
            page: 2,
            limit: 25,
          }),
        })
      );
    });
  });

  describe("pauseCampaign", () => {
    it("should pause an active campaign using PATCH and /campaigns/{id} path", async () => {
      const pausedResponse = { ...mockCampaignResponse, status: "PAUSED" as const };
      mockClient.patch.mockResolvedValueOnce({ data: pausedResponse });

      const result = await campaignService.pauseCampaign("acc_456", "camp_123");

      // v3 API uses PATCH method, configured_status and /campaigns/{id} path
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/campaigns/camp_123",
        { data: { configured_status: "PAUSED" } }
      );
      expect(result.status).toBe("PAUSED");
    });
  });

  describe("activateCampaign", () => {
    it("should activate a paused campaign using PATCH and /campaigns/{id} path", async () => {
      mockClient.patch.mockResolvedValueOnce({ data: mockCampaignResponse });

      const result = await campaignService.activateCampaign("acc_456", "camp_123");

      // v3 API uses PATCH method, configured_status and /campaigns/{id} path
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/campaigns/camp_123",
        { data: { configured_status: "ACTIVE" } }
      );
      expect(result.status).toBe("ACTIVE");
    });
  });
});
