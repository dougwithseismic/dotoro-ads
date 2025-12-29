import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdAccountService, type RedditAdAccount } from "../accounts.js";
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

  const mockAdAccount: RedditAdAccount = {
    id: "acc_123",
    name: "Test Ad Account",
    status: "ACTIVE",
    currency: "USD",
    timezone: "America/New_York",
    created_at: "2025-01-10T00:00:00Z",
    updated_at: "2025-01-10T00:00:00Z",
  };

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
    };

    accountService = new AdAccountService(mockClient as unknown as RedditApiClient);
    vi.clearAllMocks();
  });

  describe("listAdAccounts", () => {
    it("should fetch all ad accounts for the authenticated user", async () => {
      const mockAccounts = [mockAdAccount, { ...mockAdAccount, id: "acc_456", name: "Second Account" }];
      mockClient.get.mockResolvedValueOnce({
        data: mockAccounts,
        pagination: { count: 2 },
      });

      const result = await accountService.listAdAccounts();

      expect(mockClient.get).toHaveBeenCalledWith("/me/ad_accounts");
      expect(result).toEqual(mockAccounts);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no accounts exist", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [],
        pagination: { count: 0 },
      });

      const result = await accountService.listAdAccounts();

      expect(mockClient.get).toHaveBeenCalledWith("/me/ad_accounts");
      expect(result).toEqual([]);
    });
  });

  describe("getAdAccount", () => {
    it("should fetch a specific ad account by ID", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockAdAccount });

      const result = await accountService.getAdAccount("acc_123");

      expect(mockClient.get).toHaveBeenCalledWith("/ad_accounts/acc_123");
      expect(result).toEqual(mockAdAccount);
    });

    it("should include all expected account properties", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockAdAccount });

      const result = await accountService.getAdAccount("acc_123");

      expect(result.id).toBe("acc_123");
      expect(result.name).toBe("Test Ad Account");
      expect(result.status).toBe("ACTIVE");
      expect(result.currency).toBe("USD");
      expect(result.timezone).toBe("America/New_York");
    });
  });
});
