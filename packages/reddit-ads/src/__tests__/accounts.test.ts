import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdAccountService, type RedditAdAccount, type RedditBusiness } from "../accounts.js";
import { RedditApiClient } from "../client.js";

// Mock the client
vi.mock("../client.js", () => ({
  RedditApiClient: vi.fn(),
}));

describe("AdAccountService", () => {
  let accountService: AdAccountService;
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
  };

  const mockBusiness: RedditBusiness = {
    id: "1e200a0b-4e98-32cc-dd47-3006e4c85bb2",
    name: "Test Business",
    industry: "RETAIL_AND_ECOMMERCE",
    created_at: "2023-03-27T21:18:39Z",
    modified_at: "2023-03-27T21:18:39Z",
  };

  const mockAdAccount: RedditAdAccount = {
    id: "t2_123456",
    name: "Test Ad Account",
    type: "SELF_SERVE",
    currency: "USD",
    business_id: "1e200a0b-4e98-32cc-dd47-3006e4c85bb2",
    time_zone_id: "America/New_York",
    admin_approval: "ADMIN",
    created_at: "2023-03-27T21:18:39Z",
    modified_at: "2023-03-27T21:18:39Z",
  };

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
    };

    accountService = new AdAccountService(mockClient as unknown as RedditApiClient);
    vi.clearAllMocks();
  });

  describe("listBusinesses", () => {
    it("should fetch all businesses for the authenticated user", async () => {
      const mockBusinesses = [mockBusiness, { ...mockBusiness, id: "biz_456", name: "Second Business" }];
      mockClient.get.mockResolvedValueOnce({
        data: mockBusinesses,
      });

      const result = await accountService.listBusinesses();

      expect(mockClient.get).toHaveBeenCalledWith("/me/businesses");
      expect(result).toEqual(mockBusinesses);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no businesses exist", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [],
      });

      const result = await accountService.listBusinesses();

      expect(mockClient.get).toHaveBeenCalledWith("/me/businesses");
      expect(result).toEqual([]);
    });
  });

  describe("listAdAccountsByBusiness", () => {
    it("should fetch ad accounts for a specific business", async () => {
      const businessId = "1e200a0b-4e98-32cc-dd47-3006e4c85bb2";
      const mockAccounts = [mockAdAccount, { ...mockAdAccount, id: "t2_789", name: "Second Account" }];
      mockClient.get.mockResolvedValueOnce({
        data: mockAccounts,
      });

      const result = await accountService.listAdAccountsByBusiness(businessId);

      expect(mockClient.get).toHaveBeenCalledWith(`/businesses/${businessId}/ad_accounts`);
      expect(result).toEqual(mockAccounts);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when business has no ad accounts", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [],
      });

      const result = await accountService.listAdAccountsByBusiness("empty_biz");

      expect(mockClient.get).toHaveBeenCalledWith("/businesses/empty_biz/ad_accounts");
      expect(result).toEqual([]);
    });
  });

  describe("listAdAccounts", () => {
    it("should fetch all ad accounts across all businesses (two-step flow)", async () => {
      // Step 1: listBusinesses returns two businesses
      mockClient.get.mockResolvedValueOnce({
        data: [mockBusiness, { ...mockBusiness, id: "biz_456", name: "Second Business" }],
      });

      // Step 2a: First business has one account
      mockClient.get.mockResolvedValueOnce({
        data: [mockAdAccount],
      });

      // Step 2b: Second business has two accounts
      mockClient.get.mockResolvedValueOnce({
        data: [
          { ...mockAdAccount, id: "t2_789", name: "Second Account", business_id: "biz_456" },
          { ...mockAdAccount, id: "t2_101", name: "Third Account", business_id: "biz_456" },
        ],
      });

      const result = await accountService.listAdAccounts();

      // Verify the correct endpoints were called
      expect(mockClient.get).toHaveBeenCalledTimes(3);
      expect(mockClient.get).toHaveBeenNthCalledWith(1, "/me/businesses");
      expect(mockClient.get).toHaveBeenNthCalledWith(2, `/businesses/${mockBusiness.id}/ad_accounts`);
      expect(mockClient.get).toHaveBeenNthCalledWith(3, "/businesses/biz_456/ad_accounts");

      // Should aggregate all accounts
      expect(result).toHaveLength(3);
      expect(result.map((a) => a.id)).toEqual(["t2_123456", "t2_789", "t2_101"]);
    });

    it("should return empty array when no businesses exist", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [],
      });

      const result = await accountService.listAdAccounts();

      expect(mockClient.get).toHaveBeenCalledWith("/me/businesses");
      expect(mockClient.get).toHaveBeenCalledTimes(1); // Only called once
      expect(result).toEqual([]);
    });

    it("should continue fetching other businesses if one fails", async () => {
      // Step 1: Two businesses
      mockClient.get.mockResolvedValueOnce({
        data: [mockBusiness, { ...mockBusiness, id: "biz_failing" }],
      });

      // Step 2a: First business succeeds
      mockClient.get.mockResolvedValueOnce({
        data: [mockAdAccount],
      });

      // Step 2b: Second business fails
      mockClient.get.mockRejectedValueOnce(new Error("API Error"));

      // Suppress console.warn for this test
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await accountService.listAdAccounts();

      // Should still return accounts from the successful business
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t2_123456");

      // Should have logged a warning
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[AdAccountService] Failed to fetch accounts for business"),
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });
  });

  describe("getAdAccount", () => {
    it("should fetch a specific ad account by ID", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockAdAccount });

      const result = await accountService.getAdAccount("t2_123456");

      expect(mockClient.get).toHaveBeenCalledWith("/ad_accounts/t2_123456");
      expect(result).toEqual(mockAdAccount);
    });

    it("should include all expected account properties from Reddit API v3", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockAdAccount });

      const result = await accountService.getAdAccount("t2_123456");

      expect(result.id).toBe("t2_123456");
      expect(result.name).toBe("Test Ad Account");
      expect(result.type).toBe("SELF_SERVE");
      expect(result.currency).toBe("USD");
      expect(result.business_id).toBe("1e200a0b-4e98-32cc-dd47-3006e4c85bb2");
      expect(result.time_zone_id).toBe("America/New_York");
    });
  });
});
