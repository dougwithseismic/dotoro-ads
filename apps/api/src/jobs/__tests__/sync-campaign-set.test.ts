import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SyncCampaignSetJob } from "../types.js";
import { jobEvents, type SyncProgressEvent } from "../events.js";

// Use vi.hoisted to create mock circuit breaker
const { mockCircuitBreaker, mockGetCircuitBreaker } = vi.hoisted(() => {
  const mockCircuitBreaker = {
    canExecute: vi.fn().mockReturnValue(true),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    getState: vi.fn().mockReturnValue("closed"),
    getName: vi.fn().mockReturnValue("reddit"),
  };
  return {
    mockCircuitBreaker,
    mockGetCircuitBreaker: vi.fn().mockReturnValue(mockCircuitBreaker),
  };
});

// Create mock functions at module level for hoisting
vi.mock("../../services/reddit/oauth.js", () => {
  const mockGetValidTokens = vi.fn();
  return {
    getRedditOAuthService: () => ({
      getValidTokens: mockGetValidTokens,
    }),
    __mockGetValidTokens: mockGetValidTokens,
  };
});

vi.mock("@repo/core/campaign-set", () => {
  const mockSyncCampaignSet = vi.fn();
  return {
    DefaultCampaignSetSyncService: vi.fn().mockImplementation(() => ({
      syncCampaignSet: mockSyncCampaignSet,
    })),
    RedditAdsAdapter: vi.fn().mockImplementation(() => ({})),
    getCircuitBreaker: mockGetCircuitBreaker,
    __mockSyncCampaignSet: mockSyncCampaignSet,
  };
});

vi.mock("../../repositories/campaign-set-repository.js", () => ({
  DrizzleCampaignSetRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@repo/reddit-ads", () => ({
  RedditApiClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../services/db.js", () => {
  const mockAdAccountLookup = vi.fn();
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: mockAdAccountLookup,
          }),
        }),
      }),
    },
    adAccounts: {},
    __mockAdAccountLookup: mockAdAccountLookup,
  };
});

// Import after mocking
import {
  SYNC_CAMPAIGN_SET_JOB,
  createSyncCampaignSetHandler,
  createSyncCampaignSetHandlerWithEvents,
} from "../handlers/sync-campaign-set.js";

// Get mock references after imports
const oauthModule = await vi.importMock<{
  __mockGetValidTokens: ReturnType<typeof vi.fn>;
}>("../../services/reddit/oauth.js");
const coreModule = await vi.importMock<{
  __mockSyncCampaignSet: ReturnType<typeof vi.fn>;
}>("@repo/core/campaign-set");
const dbModule = await vi.importMock<{
  __mockAdAccountLookup: ReturnType<typeof vi.fn>;
}>("../../services/db.js");

const mockGetValidTokens = oauthModule.__mockGetValidTokens;
const mockSyncCampaignSet = coreModule.__mockSyncCampaignSet;
const mockAdAccountLookup = dbModule.__mockAdAccountLookup;

describe("Sync Campaign Set Job Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset circuit breaker mock to default state
    mockCircuitBreaker.canExecute.mockReturnValue(true);
    mockCircuitBreaker.getState.mockReturnValue("closed");
  });

  describe("SYNC_CAMPAIGN_SET_JOB constant", () => {
    it("should export the correct job name", () => {
      expect(SYNC_CAMPAIGN_SET_JOB).toBe("sync-campaign-set");
    });
  });

  describe("createSyncCampaignSetHandler", () => {
    const mockJobData: SyncCampaignSetJob = {
      campaignSetId: "campaign-set-123",
      userId: "user-456",
      adAccountId: "ad-account-789",
      fundingInstrumentId: "funding-instrument-abc",
      platform: "reddit",
    };

    it("should successfully sync a campaign set", async () => {
      // Setup mocks
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: "campaign-set-123",
        synced: 5,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      const handler = createSyncCampaignSetHandler();
      const result = await handler(mockJobData);

      expect(result).toEqual({
        synced: 5,
        failed: 0,
        skipped: 0,
        errors: [],
      });
    });

    it("should return partial success with errors", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: false,
        setId: "campaign-set-123",
        synced: 3,
        failed: 2,
        skipped: 0,
        errors: [
          { campaignId: "camp-1", message: "Rate limit exceeded" },
          { campaignId: "camp-2", message: "Invalid targeting" },
        ],
      });

      const handler = createSyncCampaignSetHandler();
      const result = await handler(mockJobData);

      expect(result.synced).toBe(3);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it("should throw error when ad account is not found", async () => {
      mockAdAccountLookup.mockResolvedValue([]);

      const handler = createSyncCampaignSetHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        "Invalid or unauthorized ad account"
      );
    });

    it("should throw error when OAuth tokens are not available", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue(null);

      const handler = createSyncCampaignSetHandler();

      await expect(handler(mockJobData)).rejects.toThrow("OAuth");
    });

    it("should throw error when sync service fails", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockRejectedValue(new Error("Network error"));

      const handler = createSyncCampaignSetHandler();

      await expect(handler(mockJobData)).rejects.toThrow("Network error");
    });

    it("should only support reddit platform", async () => {
      const unsupportedJob: SyncCampaignSetJob = {
        ...mockJobData,
        platform: "facebook",
      };

      const handler = createSyncCampaignSetHandler();

      await expect(handler(unsupportedJob)).rejects.toThrow(
        "Unsupported platform"
      );
    });

    it("should throw error when circuit breaker is open", async () => {
      mockCircuitBreaker.canExecute.mockReturnValue(false);

      const handler = createSyncCampaignSetHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        "Circuit breaker open"
      );
    });

    it("should record success on circuit breaker when campaigns sync successfully", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: "campaign-set-123",
        synced: 5,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      const handler = createSyncCampaignSetHandler();
      await handler(mockJobData);

      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
    });

    it("should record failure on circuit breaker when all campaigns fail", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: false,
        setId: "campaign-set-123",
        synced: 0,
        failed: 5,
        skipped: 0,
        errors: [{ campaignId: "camp-1", message: "Error" }],
      });

      const handler = createSyncCampaignSetHandler();
      await handler(mockJobData);

      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
    });

    it("should record failure on circuit breaker when sync throws error", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockRejectedValue(new Error("API error"));

      const handler = createSyncCampaignSetHandler();

      await expect(handler(mockJobData)).rejects.toThrow("API error");
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
    });

    it("should record success when at least some campaigns succeed", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: false,
        setId: "campaign-set-123",
        synced: 3,
        failed: 2,
        skipped: 0,
        errors: [{ campaignId: "camp-1", message: "Error" }],
      });

      const handler = createSyncCampaignSetHandler();
      await handler(mockJobData);

      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
      expect(mockCircuitBreaker.recordFailure).not.toHaveBeenCalled();
    });
  });

  describe("createSyncCampaignSetHandlerWithEvents", () => {
    const mockJobData: SyncCampaignSetJob = {
      campaignSetId: "campaign-set-123",
      userId: "user-456",
      adAccountId: "ad-account-789",
      fundingInstrumentId: "funding-instrument-abc",
      platform: "reddit",
    };

    const mockJobId = "job-id-abc";

    beforeEach(() => {
      // Clear all listeners before each test
      jobEvents.removeAllListeners();
    });

    afterEach(() => {
      // Clean up listeners after each test
      jobEvents.removeAllListeners();
    });

    it("should emit progress event at start", async () => {
      const events: SyncProgressEvent[] = [];
      jobEvents.on(`sync:${mockJobId}`, (event: SyncProgressEvent) => {
        events.push(event);
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: "campaign-set-123",
        synced: 5,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      const handler = createSyncCampaignSetHandlerWithEvents();
      await handler(mockJobData, mockJobId);

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe("progress");
      expect(events[0].jobId).toBe(mockJobId);
      expect(events[0].campaignSetId).toBe("campaign-set-123");
    });

    it("should emit completed event on success", async () => {
      const events: SyncProgressEvent[] = [];
      jobEvents.on(`sync:${mockJobId}`, (event: SyncProgressEvent) => {
        events.push(event);
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: "campaign-set-123",
        synced: 5,
        failed: 2,
        skipped: 1,
        errors: [],
      });

      const handler = createSyncCampaignSetHandlerWithEvents();
      await handler(mockJobData, mockJobId);

      const completedEvent = events.find((e) => e.type === "completed");
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data.synced).toBe(5);
      expect(completedEvent?.data.failed).toBe(2);
      expect(completedEvent?.data.total).toBe(8); // 5 + 2 + 1
    });

    it("should emit done event on completion", async () => {
      const doneReceived = vi.fn();
      jobEvents.on(`sync:${mockJobId}:done`, doneReceived);

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: "campaign-set-123",
        synced: 5,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      const handler = createSyncCampaignSetHandlerWithEvents();
      await handler(mockJobData, mockJobId);

      expect(doneReceived).toHaveBeenCalledTimes(1);
    });

    it("should emit error event on failure", async () => {
      const events: SyncProgressEvent[] = [];
      jobEvents.on(`sync:${mockJobId}`, (event: SyncProgressEvent) => {
        events.push(event);
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockRejectedValue(new Error("Network error"));

      const handler = createSyncCampaignSetHandlerWithEvents();

      await expect(handler(mockJobData, mockJobId)).rejects.toThrow(
        "Network error"
      );

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.error).toBe("Network error");
    });

    it("should emit done event on error", async () => {
      const doneReceived = vi.fn();
      jobEvents.on(`sync:${mockJobId}:done`, doneReceived);

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockRejectedValue(new Error("Sync failed"));

      const handler = createSyncCampaignSetHandlerWithEvents();

      await expect(handler(mockJobData, mockJobId)).rejects.toThrow();

      expect(doneReceived).toHaveBeenCalledTimes(1);
    });

    it("should include valid timestamps in events", async () => {
      const events: SyncProgressEvent[] = [];
      jobEvents.on(`sync:${mockJobId}`, (event: SyncProgressEvent) => {
        events.push(event);
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456", accountId: "reddit-account-abc123" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: "campaign-set-123",
        synced: 1,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      const handler = createSyncCampaignSetHandlerWithEvents();
      await handler(mockJobData, mockJobId);

      for (const event of events) {
        expect(event.timestamp).toBeDefined();
        // Verify it's a valid ISO date string
        expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
      }
    });
  });
});
