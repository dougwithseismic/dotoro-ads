import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdService } from "../ads.js";
import { RedditApiClient } from "../client.js";
import type { RedditAd, AdResponse, AdFilters } from "../types.js";

// Mock the client
vi.mock("../client.js", () => ({
  RedditApiClient: vi.fn(),
}));

describe("AdService", () => {
  let adService: AdService;
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockAdResponse: AdResponse = {
    id: "ad_123",
    account_id: "acc_456",
    ad_group_id: "ag_789",
    name: "Test Ad",
    status: "ACTIVE",
    headline: "Great Product!",
    body: "Check out our amazing product.",
    click_url: "https://example.com/product",
    display_url: "example.com",
    call_to_action: "SHOP_NOW",
    creative_id: "cr_111",
    rejection_reason: null,
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

    adService = new AdService(mockClient as unknown as RedditApiClient);
    vi.clearAllMocks();
  });

  describe("createAd", () => {
    it("should create an ad with required fields", async () => {
      const newAd: RedditAd = {
        name: "My New Ad",
        ad_group_id: "ag_789",
        headline: "Amazing Offer!",
        click_url: "https://example.com/offer",
        call_to_action: "LEARN_MORE",
      };

      mockClient.post.mockResolvedValueOnce({ data: mockAdResponse });

      const result = await adService.createAd("acc_456", newAd);

      // v3 API wraps payload in { data: ... }
      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/ads",
        { data: newAd }
      );
      expect(result).toEqual(mockAdResponse);
    });

    it("should validate headline length (max 100 chars)", async () => {
      const invalidAd: RedditAd = {
        name: "Ad with long headline",
        ad_group_id: "ag_789",
        headline: "x".repeat(101),
        click_url: "https://example.com",
        call_to_action: "SHOP_NOW",
      };

      await expect(
        adService.createAd("acc_456", invalidAd)
      ).rejects.toThrow("Headline must not exceed 100 characters");
    });

    it("should validate display URL length (max 25 chars)", async () => {
      const invalidAd: RedditAd = {
        name: "Ad with long display URL",
        ad_group_id: "ag_789",
        headline: "Great Product!",
        click_url: "https://example.com",
        display_url: "x".repeat(26),
        call_to_action: "SHOP_NOW",
      };

      await expect(
        adService.createAd("acc_456", invalidAd)
      ).rejects.toThrow("Display URL must not exceed 25 characters");
    });

    it("should include optional body when provided", async () => {
      const adWithBody: RedditAd = {
        name: "Ad with body",
        ad_group_id: "ag_789",
        headline: "Great Product!",
        body: "This is the description of the product.",
        click_url: "https://example.com",
        call_to_action: "SHOP_NOW",
      };

      mockClient.post.mockResolvedValueOnce({ data: mockAdResponse });

      await adService.createAd("acc_456", adWithBody);

      // v3 API wraps payload in { data: ... }
      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/ads",
        { data: adWithBody }
      );
    });
  });

  describe("getAd", () => {
    it("should fetch an ad by ID using /ads/{id} path", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockAdResponse });

      const result = await adService.getAd("acc_456", "ad_123");

      // v3 API uses /ads/{id} path (not under ad_accounts)
      expect(mockClient.get).toHaveBeenCalledWith(
        "/ads/ad_123"
      );
      expect(result).toEqual(mockAdResponse);
    });
  });

  describe("updateAd", () => {
    it("should update an ad using PATCH method and /ads/{id} path", async () => {
      const updates = {
        headline: "Updated Headline!",
      };

      const updatedResponse = { ...mockAdResponse, ...updates };
      mockClient.patch.mockResolvedValueOnce({ data: updatedResponse });

      const result = await adService.updateAd("acc_456", "ad_123", updates);

      // v3 API uses PATCH method and /ads/{id} path (not PUT, not under ad_accounts)
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/ads/ad_123",
        { data: updates }
      );
      expect(result.headline).toBe("Updated Headline!");
    });

    it("should validate updated headline length", async () => {
      const updates = {
        headline: "h".repeat(101),
      };

      await expect(
        adService.updateAd("acc_456", "ad_123", updates)
      ).rejects.toThrow("Headline must not exceed 100 characters");
    });
  });

  describe("deleteAd", () => {
    it("should delete an ad using /ads/{id} path", async () => {
      mockClient.delete.mockResolvedValueOnce(undefined);

      await adService.deleteAd("acc_456", "ad_123");

      // v3 API uses /ads/{id} path (not under ad_accounts)
      expect(mockClient.delete).toHaveBeenCalledWith(
        "/ads/ad_123"
      );
    });
  });

  describe("listAds", () => {
    it("should list ads without filters", async () => {
      const mockList = [mockAdResponse];
      mockClient.get.mockResolvedValueOnce({
        data: mockList,
        pagination: { count: 1 },
      });

      const result = await adService.listAds("acc_456");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/ads",
        expect.objectContaining({})
      );
      expect(result).toEqual(mockList);
    });

    it("should list ads with ad group filter", async () => {
      const filters: AdFilters = {
        ad_group_id: "ag_789",
        status: "ACTIVE",
      };

      mockClient.get.mockResolvedValueOnce({
        data: [mockAdResponse],
        pagination: { count: 1 },
      });

      await adService.listAds("acc_456", filters);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/ads",
        expect.objectContaining({
          params: expect.objectContaining({
            ad_group_id: "ag_789",
            status: "ACTIVE",
          }),
        })
      );
    });
  });

  describe("pauseAd", () => {
    it("should pause an active ad using PATCH and /ads/{id} path", async () => {
      const pausedResponse = { ...mockAdResponse, status: "PAUSED" as const };
      mockClient.patch.mockResolvedValueOnce({ data: pausedResponse });

      const result = await adService.pauseAd("acc_456", "ad_123");

      // v3 API uses PATCH method and /ads/{id} path
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/ads/ad_123",
        { data: { status: "PAUSED" } }
      );
      expect(result.status).toBe("PAUSED");
    });
  });

  describe("activateAd", () => {
    it("should activate a paused ad using PATCH and /ads/{id} path", async () => {
      mockClient.patch.mockResolvedValueOnce({ data: mockAdResponse });

      const result = await adService.activateAd("acc_456", "ad_123");

      // v3 API uses PATCH method and /ads/{id} path
      expect(mockClient.patch).toHaveBeenCalledWith(
        "/ads/ad_123",
        { data: { status: "ACTIVE" } }
      );
      expect(result.status).toBe("ACTIVE");
    });
  });

  describe("getAdsByAdGroup", () => {
    it("should list all ads for an ad group", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [mockAdResponse],
        pagination: { count: 1 },
      });

      const result = await adService.getAdsByAdGroup("acc_456", "ag_789");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/ads",
        expect.objectContaining({
          params: expect.objectContaining({
            ad_group_id: "ag_789",
          }),
        })
      );
      expect(result).toEqual([mockAdResponse]);
    });
  });
});
