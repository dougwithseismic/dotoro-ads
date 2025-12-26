/**
 * Reddit Poller Tests
 *
 * Tests for the Reddit platform poller implementation.
 * Tests status fetching and transformation from Reddit API format.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedditPoller } from "../reddit-poller.js";
import type { RedditApiClient } from "@repo/reddit-ads";
import type { CampaignResponse, RedditApiResponse, RedditApiListResponse } from "@repo/reddit-ads";

// Mock Reddit API client
function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as unknown as RedditApiClient;
}

// Helper to create a mock campaign response
function createMockCampaignResponse(
  overrides: Partial<CampaignResponse> = {}
): CampaignResponse {
  return {
    id: "campaign-123",
    account_id: "account-456",
    name: "Test Campaign",
    objective: "AWARENESS",
    funding_instrument_id: "funding-789",
    status: "ACTIVE",
    start_date: "2025-01-01",
    end_date: null,
    total_budget_micro: null,
    daily_budget_micro: 10000000, // $10 in micro-units
    is_paid: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("RedditPoller", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let poller: RedditPoller;
  const accountId = "account-456";

  beforeEach(() => {
    mockClient = createMockClient();
    poller = new RedditPoller(mockClient, accountId);
  });

  describe("platform property", () => {
    it("should return 'reddit' as the platform", () => {
      expect(poller.platform).toBe("reddit");
    });
  });

  describe("getCampaignStatus", () => {
    it("should return correct status for ACTIVE campaign", async () => {
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({ status: "ACTIVE" }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(mockClient.get).toHaveBeenCalledWith(
        `/accounts/${accountId}/campaigns/campaign-123`
      );
      expect(result).not.toBeNull();
      expect(result?.platformId).toBe("campaign-123");
      expect(result?.status).toBe("active");
    });

    it("should return correct status for PAUSED campaign", async () => {
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({ status: "PAUSED" }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.status).toBe("paused");
    });

    it("should return correct status for COMPLETED campaign", async () => {
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({ status: "COMPLETED" }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.status).toBe("completed");
    });

    it("should return correct status for DELETED campaign", async () => {
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({ status: "DELETED" }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.status).toBe("deleted");
    });

    it("should include daily budget in response", async () => {
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({
          daily_budget_micro: 50000000, // $50
          total_budget_micro: null,
        }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.budget).toEqual({
        type: "daily",
        amount: 50,
      });
    });

    it("should include lifetime budget in response", async () => {
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({
          daily_budget_micro: null,
          total_budget_micro: 100000000, // $100
        }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.budget).toEqual({
        type: "lifetime",
        amount: 100,
      });
    });

    it("should prefer daily budget if both are set", async () => {
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({
          daily_budget_micro: 20000000, // $20
          total_budget_micro: 500000000, // $500
        }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.budget).toEqual({
        type: "daily",
        amount: 20,
      });
    });

    it("should include lastModified from updated_at", async () => {
      const updatedAt = "2025-01-15T10:30:00Z";
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({ updated_at: updatedAt }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.lastModified).toEqual(new Date(updatedAt));
    });

    it("should return null for 404 errors (deleted campaigns)", async () => {
      const error = new Error("Not found");
      (error as Error & { statusCode: number }).statusCode = 404;
      vi.mocked(mockClient.get).mockRejectedValue(error);

      const result = await poller.getCampaignStatus("deleted-campaign");

      expect(result).toBeNull();
    });

    it("should throw for other errors", async () => {
      const error = new Error("Internal server error");
      (error as Error & { statusCode: number }).statusCode = 500;
      vi.mocked(mockClient.get).mockRejectedValue(error);

      await expect(poller.getCampaignStatus("campaign-123")).rejects.toThrow(
        "Internal server error"
      );
    });
  });

  describe("listCampaignStatuses", () => {
    it("should return all campaigns for an account", async () => {
      const mockResponse: RedditApiListResponse<CampaignResponse> = {
        data: [
          createMockCampaignResponse({ id: "campaign-1", status: "ACTIVE" }),
          createMockCampaignResponse({ id: "campaign-2", status: "PAUSED" }),
          createMockCampaignResponse({ id: "campaign-3", status: "COMPLETED" }),
        ],
        pagination: { count: 3 },
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const results = await poller.listCampaignStatuses(accountId);

      expect(mockClient.get).toHaveBeenCalledWith(
        `/accounts/${accountId}/campaigns`,
        { params: undefined }
      );
      expect(results).toHaveLength(3);
      expect(results[0]?.platformId).toBe("campaign-1");
      expect(results[0]?.status).toBe("active");
      expect(results[1]?.platformId).toBe("campaign-2");
      expect(results[1]?.status).toBe("paused");
      expect(results[2]?.platformId).toBe("campaign-3");
      expect(results[2]?.status).toBe("completed");
    });

    it("should return empty array when no campaigns exist", async () => {
      const mockResponse: RedditApiListResponse<CampaignResponse> = {
        data: [],
        pagination: { count: 0 },
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const results = await poller.listCampaignStatuses(accountId);

      expect(results).toEqual([]);
    });

    it("should handle deleted campaigns in list", async () => {
      const mockResponse: RedditApiListResponse<CampaignResponse> = {
        data: [
          createMockCampaignResponse({ id: "campaign-1", status: "ACTIVE" }),
          createMockCampaignResponse({ id: "campaign-2", status: "DELETED" }),
        ],
        pagination: { count: 2 },
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const results = await poller.listCampaignStatuses(accountId);

      expect(results).toHaveLength(2);
      expect(results[1]?.status).toBe("deleted");
    });

    it("should include budget for all campaigns", async () => {
      const mockResponse: RedditApiListResponse<CampaignResponse> = {
        data: [
          createMockCampaignResponse({
            id: "campaign-1",
            daily_budget_micro: 10000000,
          }),
          createMockCampaignResponse({
            id: "campaign-2",
            daily_budget_micro: null,
            total_budget_micro: 50000000,
          }),
        ],
        pagination: { count: 2 },
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const results = await poller.listCampaignStatuses(accountId);

      expect(results[0]?.budget).toEqual({ type: "daily", amount: 10 });
      expect(results[1]?.budget).toEqual({ type: "lifetime", amount: 50 });
    });

    it("should throw on API errors", async () => {
      vi.mocked(mockClient.get).mockRejectedValue(new Error("API Error"));

      await expect(poller.listCampaignStatuses(accountId)).rejects.toThrow(
        "API Error"
      );
    });
  });

  describe("status mapping edge cases", () => {
    it("should map unknown status to error", async () => {
      // Create a response with an unknown status (cast to bypass type checking)
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: {
          ...createMockCampaignResponse(),
          status: "UNKNOWN_STATUS" as CampaignResponse["status"],
        },
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.status).toBe("error");
    });

    it("should handle campaign without budget", async () => {
      const mockResponse: RedditApiResponse<CampaignResponse> = {
        data: createMockCampaignResponse({
          daily_budget_micro: null,
          total_budget_micro: null,
        }),
      };
      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await poller.getCampaignStatus("campaign-123");

      expect(result?.budget).toBeUndefined();
    });
  });
});
