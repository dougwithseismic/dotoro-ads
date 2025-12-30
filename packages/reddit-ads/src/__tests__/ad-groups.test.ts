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
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  // Reddit v3 API response format - uses configured_status and bid_value
  const mockAdGroupResponse: AdGroupResponse = {
    id: "ag_123",
    account_id: "acc_456",
    campaign_id: "camp_789",
    name: "Test Ad Group",
    status: "ACTIVE",
    configured_status: "ACTIVE",
    bid_strategy: "MAXIMIZE_VOLUME",
    bid_type: "CPC",
    bid_value: null,
    start_time: null,
    end_time: null,
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

    adGroupService = new AdGroupService(mockClient as unknown as RedditApiClient);
    vi.clearAllMocks();
  });

  describe("createAdGroup", () => {
    it("should create an ad group with required fields", async () => {
      // Reddit v3 API uses configured_status instead of start_date, requires bid_type
      const newAdGroup: RedditAdGroup = {
        name: "My New Ad Group",
        campaign_id: "camp_789",
        bid_strategy: "MAXIMIZE_VOLUME",
        bid_type: "CPC",
        configured_status: "ACTIVE",
      };

      mockClient.post.mockResolvedValueOnce({ data: mockAdGroupResponse });

      const result = await adGroupService.createAdGroup("acc_456", newAdGroup);

      // v3 API wraps payload in { data: ... }
      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/ad_groups",
        { data: newAdGroup }
      );
      expect(result).toEqual(mockAdGroupResponse);
    });

    it("should validate ad group name length", async () => {
      const invalidAdGroup: RedditAdGroup = {
        name: "x".repeat(256),
        campaign_id: "camp_789",
        bid_strategy: "MAXIMIZE_VOLUME",
        bid_type: "CPC",
        configured_status: "ACTIVE",
      };

      await expect(
        adGroupService.createAdGroup("acc_456", invalidAdGroup)
      ).rejects.toThrow("Ad group name must not exceed 255 characters");
    });

    it("should include targeting when provided", async () => {
      const adGroupWithTargeting: RedditAdGroup = {
        name: "Targeted Ad Group",
        campaign_id: "camp_789",
        bid_strategy: "MANUAL_BIDDING",
        bid_type: "CPC",
        configured_status: "ACTIVE",
        bid_micro: 100000,
        targeting: {
          subreddits: ["r/technology", "r/programming"],
          interests: ["technology", "gaming"],
          devices: ["DESKTOP", "MOBILE"],
        },
      };

      mockClient.post.mockResolvedValueOnce({ data: mockAdGroupResponse });

      await adGroupService.createAdGroup("acc_456", adGroupWithTargeting);

      // v3 API wraps payload in { data: ... }
      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/ad_groups",
        { data: adGroupWithTargeting }
      );
    });
  });

  describe("getAdGroup", () => {
    it("should fetch an ad group by ID using /ad_groups/{id} path", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockAdGroupResponse });

      const result = await adGroupService.getAdGroup("acc_456", "ag_123");

      // v3 API uses /ad_groups/{id} path (not under ad_accounts)
      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_groups/ag_123"
      );
      expect(result).toEqual(mockAdGroupResponse);
    });
  });

  describe("updateAdGroup", () => {
    it("should update an ad group using PATCH method and /ad_groups/{id} path", async () => {
      const updates = {
        name: "Updated Ad Group Name",
        bid_micro: 150000,
      };

      const updatedResponse = { ...mockAdGroupResponse, ...updates };
      mockClient.patch.mockResolvedValueOnce({ data: updatedResponse });

      const result = await adGroupService.updateAdGroup("acc_456", "ag_123", updates);

      // v3 API uses PATCH method and /ad_groups/{id} path (not PUT, not under ad_accounts)
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/ad_groups/ag_123",
        { data: updates }
      );
      expect(result.name).toBe("Updated Ad Group Name");
    });
  });

  describe("deleteAdGroup", () => {
    it("should delete an ad group using /ad_groups/{id} path", async () => {
      mockClient.delete.mockResolvedValueOnce(undefined);

      await adGroupService.deleteAdGroup("acc_456", "ag_123");

      // v3 API uses /ad_groups/{id} path (not under ad_accounts)
      expect(mockClient.delete).toHaveBeenCalledWith(
        "/ad_groups/ag_123"
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
        "/ad_accounts/acc_456/ad_groups",
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
        "/ad_accounts/acc_456/ad_groups",
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
    it("should pause an active ad group using PATCH and /ad_groups/{id} path", async () => {
      const pausedResponse = { ...mockAdGroupResponse, status: "PAUSED" as const };
      mockClient.patch.mockResolvedValueOnce({ data: pausedResponse });

      const result = await adGroupService.pauseAdGroup("acc_456", "ag_123");

      // v3 API uses PATCH method and /ad_groups/{id} path
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/ad_groups/ag_123",
        { data: { status: "PAUSED" } }
      );
      expect(result.status).toBe("PAUSED");
    });
  });

  describe("activateAdGroup", () => {
    it("should activate a paused ad group using PATCH and /ad_groups/{id} path", async () => {
      mockClient.patch.mockResolvedValueOnce({ data: mockAdGroupResponse });

      const result = await adGroupService.activateAdGroup("acc_456", "ag_123");

      // v3 API uses PATCH method and /ad_groups/{id} path
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/ad_groups/ag_123",
        { data: { status: "ACTIVE" } }
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
        "/ad_accounts/acc_456/ad_groups",
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
