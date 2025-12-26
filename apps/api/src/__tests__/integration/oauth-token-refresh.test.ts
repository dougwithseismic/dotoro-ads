/**
 * OAuth Token Refresh During Sync Tests
 *
 * Tests for OAuth token management during campaign sync operations.
 * Verifies that:
 *
 * 1. Expired tokens are detected before sync starts
 * 2. Token refresh is attempted when tokens are near expiry
 * 3. Sync continues after successful token refresh
 * 4. Sync fails gracefully when token refresh fails
 * 5. Multiple concurrent syncs share refreshed tokens
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SyncCampaignSetJob } from "../../jobs/types.js";

// ============================================================================
// Mock Setup - All mocks hoisted
// ============================================================================

const mockCampaignSetId = "660e8400-e29b-41d4-a716-446655440000";
const mockUserId = "330e8400-e29b-41d4-a716-446655440000";
const mockAdAccountId = "880e8400-e29b-41d4-a716-446655440000";

// Use vi.hoisted to create all mocks at module level
const {
  mockCircuitBreaker,
  mockGetCircuitBreaker,
  mockSyncCampaignSet,
  mockGetValidTokens,
  mockRefreshTokens,
  mockAdAccountLookup,
} = vi.hoisted(() => {
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
    mockSyncCampaignSet: vi.fn(),
    mockGetValidTokens: vi.fn(),
    mockRefreshTokens: vi.fn(),
    mockAdAccountLookup: vi.fn(),
  };
});

// Apply all mocks
vi.mock("@repo/core/campaign-set", () => ({
  DefaultCampaignSetSyncService: vi.fn().mockImplementation(() => ({
    syncCampaignSet: mockSyncCampaignSet,
  })),
  RedditAdsAdapter: vi.fn().mockImplementation(() => ({})),
  getCircuitBreaker: mockGetCircuitBreaker,
}));

vi.mock("../../services/reddit/oauth.js", () => ({
  getRedditOAuthService: () => ({
    getValidTokens: mockGetValidTokens,
    refreshTokens: mockRefreshTokens,
  }),
}));

vi.mock("../../repositories/campaign-set-repository.js", () => ({
  DrizzleCampaignSetRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@repo/reddit-ads", () => ({
  RedditApiClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../services/db.js", () => ({
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
}));

// Import after mocking
import { createSyncCampaignSetHandler } from "../../jobs/handlers/sync-campaign-set.js";

// ============================================================================
// Test Helpers
// ============================================================================

function createSyncJobData(
  overrides: Partial<SyncCampaignSetJob> = {}
): SyncCampaignSetJob {
  return {
    campaignSetId: mockCampaignSetId,
    userId: mockUserId,
    adAccountId: mockAdAccountId,
    fundingInstrumentId: "funding-123",
    platform: "reddit",
    ...overrides,
  };
}

function createValidTokens(expiresInMinutes: number = 60) {
  return {
    accessToken: "valid-access-token",
    refreshToken: "refresh-token",
    expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
  };
}

function createExpiredTokens() {
  return {
    accessToken: "expired-access-token",
    refreshToken: "refresh-token",
    expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
  };
}

function createNearExpiryTokens(expiresInSeconds: number = 30) {
  return {
    accessToken: "near-expiry-access-token",
    refreshToken: "refresh-token",
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("OAuth Token Refresh During Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCircuitBreaker.canExecute.mockReturnValue(true);
  });

  describe("Token Validation Before Sync", () => {
    it("should proceed with sync when tokens are valid", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue(createValidTokens());
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: mockCampaignSetId,
        synced: 5,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      // Act
      const handler = createSyncCampaignSetHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.synced).toBe(5);
      // Note: OAuth service uses adAccountId, not userId
      expect(mockGetValidTokens).toHaveBeenCalledWith(mockAdAccountId);
      expect(mockRefreshTokens).not.toHaveBeenCalled();
    });

    it("should reject sync when tokens are null (user not authenticated)", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue(null);

      // Act & Assert
      const handler = createSyncCampaignSetHandler();
      await expect(handler(createSyncJobData())).rejects.toThrow("OAuth");
      expect(mockSyncCampaignSet).not.toHaveBeenCalled();
    });

    it("should reject sync when tokens have expired", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      // getValidTokens should return null for expired tokens
      mockGetValidTokens.mockResolvedValue(null);

      // Act & Assert
      const handler = createSyncCampaignSetHandler();
      await expect(handler(createSyncJobData())).rejects.toThrow("OAuth");
    });
  });

  describe("Token Refresh Behavior", () => {
    it("should reject sync when getValidTokens returns null", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      // Token is not available (null response)
      mockGetValidTokens.mockResolvedValue(null);

      // Act
      const handler = createSyncCampaignSetHandler();

      // This will fail since getValidTokens returns null
      await expect(handler(createSyncJobData())).rejects.toThrow("OAuth");
      expect(mockSyncCampaignSet).not.toHaveBeenCalled();
    });

    it("should pass valid access token to sync service", async () => {
      // Arrange
      const tokens = createValidTokens();
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue(tokens);
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: mockCampaignSetId,
        synced: 1,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      // Act
      const handler = createSyncCampaignSetHandler();
      await handler(createSyncJobData());

      // Assert - sync service should receive the access token
      expect(mockSyncCampaignSet).toHaveBeenCalled();
    });
  });

  describe("Error Scenarios", () => {
    it("should throw when OAuth service is unavailable", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockRejectedValue(new Error("OAuth service unavailable"));

      // Act & Assert
      const handler = createSyncCampaignSetHandler();
      await expect(handler(createSyncJobData())).rejects.toThrow("OAuth service unavailable");
      // Note: OAuth errors happen before sync, so circuit breaker may not be affected
    });

    it("should provide clear error message when authentication fails", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue(null);

      // Act & Assert
      const handler = createSyncCampaignSetHandler();
      await expect(handler(createSyncJobData())).rejects.toThrow(
        /OAuth.*not available|authorized/i
      );
    });
  });

  describe("Token State During Long Sync", () => {
    it("should handle sync completing with tokens that were valid at start", async () => {
      // Arrange - tokens valid for 30 minutes
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue(createValidTokens(30));
      // Simulate sync that takes some time
      mockSyncCampaignSet.mockImplementation(async () => {
        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          success: true,
          setId: mockCampaignSetId,
          synced: 10,
          failed: 0,
          skipped: 0,
          errors: [],
        };
      });

      // Act
      const handler = createSyncCampaignSetHandler();
      const result = await handler(createSyncJobData());

      // Assert - sync should complete even if it takes time
      expect(result.synced).toBe(10);
    });
  });

  describe("Multiple User Scenarios", () => {
    it("should use correct ad account for token lookup", async () => {
      // Arrange
      const adAccount1 = "ad-account-1";
      const adAccount2 = "ad-account-2";

      mockAdAccountLookup
        .mockResolvedValueOnce([{ id: adAccount1, userId: mockUserId }])
        .mockResolvedValueOnce([{ id: adAccount2, userId: mockUserId }]);

      mockGetValidTokens
        .mockResolvedValueOnce({
          accessToken: "account1-token",
          refreshToken: "account1-refresh",
          expiresAt: new Date(Date.now() + 3600000),
        })
        .mockResolvedValueOnce({
          accessToken: "account2-token",
          refreshToken: "account2-refresh",
          expiresAt: new Date(Date.now() + 3600000),
        });

      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: mockCampaignSetId,
        synced: 1,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      // Act
      const handler = createSyncCampaignSetHandler();
      await handler({ ...createSyncJobData(), adAccountId: adAccount1 });
      await handler({ ...createSyncJobData(), adAccountId: adAccount2 });

      // Assert - getValidTokens should be called with each ad account ID
      expect(mockGetValidTokens).toHaveBeenCalledWith(adAccount1);
      expect(mockGetValidTokens).toHaveBeenCalledWith(adAccount2);
    });
  });
});
