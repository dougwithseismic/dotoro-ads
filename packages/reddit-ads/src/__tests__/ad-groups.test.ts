import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdGroupService } from "../ad-groups.js";
import { RedditApiClient } from "../client.js";
import type { RedditAdGroup, AdGroupResponse, AdGroupFilters } from "../types.js";

// Mock the client
vi.mock("../client.js", () => ({
  RedditApiClient: vi.fn(),
}));

describe("AdGroupService", () => {
  let adGroupService: AdGroupService;
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockAdGroupResponse: AdGroupResponse = {
    id: "ag_123",
    account_id: "acc_456",
    campaign_id: "camp_789",
    name: "Test Ad Group",
    status: "ACTIVE",
    bid_strategy: "AUTOMATIC",
    bid_micro: null,
    start_date: "2025-01-15T00:00:00Z",
    end_date: null,
    created_at: "2025-01-10T00:00:00Z",
    updated_at: "2025-01-10T00:00:00Z",
  };

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    adGroupService = new AdGroupService(mockClient as unknown as RedditApiClient);
    vi.clearAllMocks();
  });

  describe("createAdGroup", () => {
    it("should create an ad group with required fields", async () => {
      const newAdGroup: RedditAdGroup = {
        name: "My New Ad Group",
        campaign_id: "camp_789",
        bid_strategy: "AUTOMATIC",
        start_date: "2025-02-01T00:00:00Z",
      };

      mockClient.post.mockResolvedValueOnce({ data: mockAdGroupResponse });

      const result = await adGroupService.createAdGroup("acc_456", newAdGroup);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups",
        newAdGroup
      );
      expect(result).toEqual(mockAdGroupResponse);
    });

    it("should validate ad group name length", async () => {
      const invalidAdGroup: RedditAdGroup = {
        name: "x".repeat(256),
        campaign_id: "camp_789",
        bid_strategy: "AUTOMATIC",
        start_date: "2025-02-01T00:00:00Z",
      };

      await expect(
        adGroupService.createAdGroup("acc_456", invalidAdGroup)
      ).rejects.toThrow("Ad group name must not exceed 255 characters");
    });

    it("should include targeting when provided", async () => {
      const adGroupWithTargeting: RedditAdGroup = {
        name: "Targeted Ad Group",
        campaign_id: "camp_789",
        bid_strategy: "MANUAL_CPC",
        bid_micro: 100000,
        start_date: "2025-02-01T00:00:00Z",
        targeting: {
          subreddits: ["r/technology", "r/programming"],
          interests: ["technology", "gaming"],
          devices: ["DESKTOP", "MOBILE"],
        },
      };

      mockClient.post.mockResolvedValueOnce({ data: mockAdGroupResponse });

      await adGroupService.createAdGroup("acc_456", adGroupWithTargeting);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups",
        adGroupWithTargeting
      );
    });
  });

  describe("getAdGroup", () => {
    it("should fetch an ad group by ID", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockAdGroupResponse });

      const result = await adGroupService.getAdGroup("acc_456", "ag_123");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups/ag_123"
      );
      expect(result).toEqual(mockAdGroupResponse);
    });
  });

  describe("updateAdGroup", () => {
    it("should update an ad group with partial fields", async () => {
      const updates = {
        name: "Updated Ad Group Name",
        bid_micro: 150000,
      };

      const updatedResponse = { ...mockAdGroupResponse, ...updates };
      mockClient.put.mockResolvedValueOnce({ data: updatedResponse });

      const result = await adGroupService.updateAdGroup("acc_456", "ag_123", updates);

      expect(mockClient.put).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups/ag_123",
        updates
      );
      expect(result.name).toBe("Updated Ad Group Name");
    });
  });

  describe("deleteAdGroup", () => {
    it("should delete an ad group", async () => {
      mockClient.delete.mockResolvedValueOnce(undefined);

      await adGroupService.deleteAdGroup("acc_456", "ag_123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups/ag_123"
      );
    });
  });

  describe("listAdGroups", () => {
    it("should list ad groups without filters", async () => {
      const mockList = [mockAdGroupResponse];
      mockClient.get.mockResolvedValueOnce({
        data: mockList,
        pagination: { count: 1 },
      });

      const result = await adGroupService.listAdGroups("acc_456");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups",
        expect.objectContaining({})
      );
      expect(result).toEqual(mockList);
    });

    it("should list ad groups with campaign filter", async () => {
      const filters: AdGroupFilters = {
        campaign_id: "camp_789",
        status: "ACTIVE",
      };

      mockClient.get.mockResolvedValueOnce({
        data: [mockAdGroupResponse],
        pagination: { count: 1 },
      });

      await adGroupService.listAdGroups("acc_456", filters);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups",
        expect.objectContaining({
          params: expect.objectContaining({
            campaign_id: "camp_789",
            status: "ACTIVE",
          }),
        })
      );
    });
  });

  describe("pauseAdGroup", () => {
    it("should pause an active ad group", async () => {
      const pausedResponse = { ...mockAdGroupResponse, status: "PAUSED" as const };
      mockClient.put.mockResolvedValueOnce({ data: pausedResponse });

      const result = await adGroupService.pauseAdGroup("acc_456", "ag_123");

      expect(mockClient.put).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups/ag_123",
        { status: "PAUSED" }
      );
      expect(result.status).toBe("PAUSED");
    });
  });

  describe("activateAdGroup", () => {
    it("should activate a paused ad group", async () => {
      mockClient.put.mockResolvedValueOnce({ data: mockAdGroupResponse });

      const result = await adGroupService.activateAdGroup("acc_456", "ag_123");

      expect(mockClient.put).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups/ag_123",
        { status: "ACTIVE" }
      );
      expect(result.status).toBe("ACTIVE");
    });
  });

  describe("getAdGroupsByCampaign", () => {
    it("should list all ad groups for a campaign", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [mockAdGroupResponse],
        pagination: { count: 1 },
      });

      const result = await adGroupService.getAdGroupsByCampaign("acc_456", "camp_789");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/accounts/acc_456/adgroups",
        expect.objectContaining({
          params: expect.objectContaining({
            campaign_id: "camp_789",
          }),
        })
      );
      expect(result).toEqual([mockAdGroupResponse]);
    });
  });
});
