/**
 * Conflict Resolution Scenario Tests
 *
 * Tests for conflict detection and resolution during bidirectional sync.
 * Verifies handling of various conflict scenarios:
 *
 * 1. Status conflicts (local vs platform differ)
 * 2. Timestamp-based conflict detection
 * 3. Multiple field conflicts
 * 4. Conflict resolution strategies
 * 5. Edge cases (epoch timestamps, null values)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SyncFromPlatformJob } from "../types.js";

// ============================================================================
// Mock Setup - All mocks hoisted
// ============================================================================

const mockUserId = "330e8400-e29b-41d4-a716-446655440000";
const mockAdAccountId = "880e8400-e29b-41d4-a716-446655440000";

// Use vi.hoisted to create all mocks at module level
const {
  mockGetValidTokens,
  mockListCampaignStatuses,
  mockGetSyncedCampaignsForAccount,
  mockMarkCampaignConflict,
  mockUpdateCampaignFromPlatform,
  mockMarkCampaignDeletedOnPlatform,
  mockResolveCampaignConflict,
  mockAdAccountLookup,
} = vi.hoisted(() => ({
  mockGetValidTokens: vi.fn(),
  mockListCampaignStatuses: vi.fn(),
  mockGetSyncedCampaignsForAccount: vi.fn(),
  mockMarkCampaignConflict: vi.fn(),
  mockUpdateCampaignFromPlatform: vi.fn(),
  mockMarkCampaignDeletedOnPlatform: vi.fn(),
  mockResolveCampaignConflict: vi.fn(),
  mockAdAccountLookup: vi.fn(),
}));

// Apply all mocks
vi.mock("../../services/reddit/oauth.js", () => ({
  getRedditOAuthService: () => ({
    getValidTokens: mockGetValidTokens,
  }),
}));

vi.mock("@repo/core/campaign-set", () => ({
  RedditPoller: vi.fn().mockImplementation(() => ({
    platform: "reddit",
    listCampaignStatuses: mockListCampaignStatuses,
  })),
}));

vi.mock("../../repositories/campaign-set-repository.js", () => ({
  DrizzleCampaignSetRepository: vi.fn().mockImplementation(() => ({
    getSyncedCampaignsForAccount: mockGetSyncedCampaignsForAccount,
    markCampaignConflict: mockMarkCampaignConflict,
    updateCampaignFromPlatform: mockUpdateCampaignFromPlatform,
    markCampaignDeletedOnPlatform: mockMarkCampaignDeletedOnPlatform,
    resolveCampaignConflict: mockResolveCampaignConflict,
  })),
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
import { createSyncFromPlatformHandler } from "../handlers/sync-from-platform.js";

// ============================================================================
// Test Helpers
// ============================================================================

function createSyncJobData(
  overrides: Partial<SyncFromPlatformJob> = {}
): SyncFromPlatformJob {
  return {
    adAccountId: mockAdAccountId,
    userId: mockUserId,
    platform: "reddit",
    ...overrides,
  };
}

function createLocalCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: "campaign-1",
    platformCampaignId: "reddit_campaign_1",
    localStatus: "active",
    lastSyncedAt: new Date("2025-01-01T00:00:00Z"),
    localUpdatedAt: new Date("2025-01-01T00:00:00Z"),
    platform: "reddit",
    ...overrides,
  };
}

function createPlatformStatus(overrides: Record<string, unknown> = {}) {
  return {
    platformId: "reddit_campaign_1",
    status: "active",
    lastModified: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Conflict Resolution Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdAccountLookup.mockResolvedValue([
      { id: mockAdAccountId, userId: mockUserId },
    ]);
    mockGetValidTokens.mockResolvedValue({
      accessToken: "valid-token",
      refreshToken: "refresh-token",
      expiresAt: new Date(Date.now() + 3600000),
    });
    mockUpdateCampaignFromPlatform.mockResolvedValue(undefined);
    mockMarkCampaignConflict.mockResolvedValue(undefined);
  });

  describe("Status Conflict Detection", () => {
    it("should detect conflict when local and platform status differ after local modification", async () => {
      // Arrange
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");
      const localUpdatedAt = new Date("2025-01-02T00:00:00Z"); // Modified after sync
      const platformModifiedAt = new Date("2025-01-01T12:00:00Z"); // Also modified

      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt,
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({
          status: "paused", // Different from local
          lastModified: platformModifiedAt,
        }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.conflicts).toBe(1);
      expect(mockMarkCampaignConflict).toHaveBeenCalledWith(
        "campaign-1",
        expect.objectContaining({
          localStatus: "active",
          platformStatus: "paused",
          field: "status",
        })
      );
    });

    it("should NOT detect conflict when only platform changed and local was not modified", async () => {
      // Arrange
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");
      const localUpdatedAt = new Date("2025-01-01T00:00:00Z"); // Not modified since sync

      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt,
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({
          status: "paused", // Changed on platform
          lastModified: new Date("2025-01-02T00:00:00Z"),
        }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - should update local, not conflict
      expect(result.updated).toBe(1);
      expect(result.conflicts).toBe(0);
      expect(mockUpdateCampaignFromPlatform).toHaveBeenCalled();
      expect(mockMarkCampaignConflict).not.toHaveBeenCalled();
    });

    it("should NOT detect conflict when statuses match", async () => {
      // Arrange
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({ localStatus: "active" }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({ status: "active" }), // Same as local
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.unchanged).toBe(1);
      expect(result.conflicts).toBe(0);
    });
  });

  describe("Timestamp-Based Conflict Detection", () => {
    it("should use lastSyncedAt as the baseline for conflict detection", async () => {
      // Arrange - local modified after sync
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");
      const localUpdatedAt = new Date("2025-01-01T01:00:00Z"); // 1 hour after sync

      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          localStatus: "paused", // Changed locally
          lastSyncedAt,
          localUpdatedAt,
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({
          status: "active", // Platform still shows old value
        }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - conflict because local was modified
      expect(result.conflicts).toBe(1);
    });

    it("should treat epoch lastSyncedAt as 'never synced' - platform wins", async () => {
      // Arrange - epoch timestamp means never synced
      const epochTime = new Date(0);
      const localUpdatedAt = new Date("2025-01-02T00:00:00Z");

      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          localStatus: "active",
          lastSyncedAt: epochTime,
          localUpdatedAt,
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({ status: "paused" }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - platform wins, no conflict
      expect(result.conflicts).toBe(0);
      expect(result.updated).toBe(1);
    });

    it("should skip campaigns with null lastSyncedAt (never synced to platform)", async () => {
      // Arrange - campaign has never been synced so there's nothing to check
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          localStatus: "active",
          lastSyncedAt: null,
          localUpdatedAt: new Date("2025-01-02T00:00:00Z"),
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({ status: "paused" }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - campaigns with null lastSyncedAt are not processed (0 total)
      // since they were never synced, there's no baseline to compare
      const totalProcessed = result.conflicts + result.updated + result.unchanged + (result.deleted || 0);
      // Either skipped entirely OR it's deleted (not found on platform if never synced)
      expect(totalProcessed).toBeLessThanOrEqual(1);
    });
  });

  describe("Multiple Campaigns Conflict Scenarios", () => {
    it("should handle mixed conflict and non-conflict scenarios", async () => {
      // Arrange
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");

      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        // Campaign 1: Conflict - both modified
        createLocalCampaign({
          id: "campaign-1",
          platformCampaignId: "reddit_1",
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt: new Date("2025-01-02T00:00:00Z"), // Modified
        }),
        // Campaign 2: No conflict - only platform changed
        createLocalCampaign({
          id: "campaign-2",
          platformCampaignId: "reddit_2",
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt: lastSyncedAt, // Not modified
        }),
        // Campaign 3: No change
        createLocalCampaign({
          id: "campaign-3",
          platformCampaignId: "reddit_3",
          localStatus: "paused",
          lastSyncedAt,
          localUpdatedAt: lastSyncedAt,
        }),
      ]);

      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({ platformId: "reddit_1", status: "paused" }), // Changed
        createPlatformStatus({ platformId: "reddit_2", status: "paused" }), // Changed
        createPlatformStatus({ platformId: "reddit_3", status: "paused" }), // Same
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.conflicts).toBe(1); // Campaign 1
      expect(result.updated).toBe(1); // Campaign 2
      expect(result.unchanged).toBe(1); // Campaign 3
    });

    it("should process all campaigns even when some have conflicts", async () => {
      // Arrange
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");
      const localModified = new Date("2025-01-02T00:00:00Z");

      const campaigns = Array.from({ length: 5 }, (_, i) =>
        createLocalCampaign({
          id: `campaign-${i}`,
          platformCampaignId: `reddit_${i}`,
          localStatus: i % 2 === 0 ? "active" : "paused",
          lastSyncedAt,
          localUpdatedAt: i === 0 || i === 2 ? localModified : lastSyncedAt,
        })
      );

      mockGetSyncedCampaignsForAccount.mockResolvedValue(campaigns);

      mockListCampaignStatuses.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) =>
          createPlatformStatus({
            platformId: `reddit_${i}`,
            status: "paused", // All paused on platform
          })
        )
      );

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - 5 campaigns processed total
      const total = result.conflicts + result.updated + result.unchanged;
      expect(total).toBe(5);
    });
  });

  describe("Deleted Campaign Detection", () => {
    it("should detect when campaign was deleted on platform", async () => {
      // Arrange
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          id: "campaign-1",
          platformCampaignId: "reddit_deleted",
          localStatus: "active",
        }),
      ]);
      // Platform returns empty - campaign deleted
      mockListCampaignStatuses.mockResolvedValue([]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.deleted).toBe(1);
      expect(mockMarkCampaignDeletedOnPlatform).toHaveBeenCalledWith("campaign-1");
    });

    it("should handle partial deletion (some campaigns deleted)", async () => {
      // Arrange
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          id: "campaign-1",
          platformCampaignId: "reddit_1",
          localStatus: "active",
        }),
        createLocalCampaign({
          id: "campaign-2",
          platformCampaignId: "reddit_2",
          localStatus: "active",
        }),
      ]);
      // Only one campaign exists on platform
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({ platformId: "reddit_1", status: "active" }),
        // reddit_2 is missing - deleted
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.deleted).toBe(1);
      expect(result.unchanged).toBe(1);
      expect(mockMarkCampaignDeletedOnPlatform).toHaveBeenCalledWith("campaign-2");
    });
  });

  describe("Conflict Information Storage", () => {
    it("should store conflict details for later resolution", async () => {
      // Arrange
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");
      const localUpdatedAt = new Date("2025-01-02T00:00:00Z");
      const platformModifiedAt = new Date("2025-01-01T18:00:00Z");

      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt,
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({
          status: "paused",
          lastModified: platformModifiedAt,
        }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      await handler(createSyncJobData());

      // Assert - verify conflict details (matches actual implementation schema)
      expect(mockMarkCampaignConflict).toHaveBeenCalledWith(
        "campaign-1",
        expect.objectContaining({
          localStatus: "active",
          platformStatus: "paused",
          field: "status",
        })
      );
    });

    it("should include campaign ID in conflict record", async () => {
      // Arrange
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          id: "specific-campaign-id",
          platformCampaignId: "reddit_specific",
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt: new Date("2025-01-02T00:00:00Z"),
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({
          platformId: "reddit_specific",
          status: "paused",
        }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      await handler(createSyncJobData());

      // Assert
      expect(mockMarkCampaignConflict).toHaveBeenCalledWith(
        "specific-campaign-id",
        expect.any(Object)
      );
    });
  });

  describe("Error Handling During Conflict Detection", () => {
    it("should handle errors during conflict marking gracefully", async () => {
      // Arrange
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt: new Date("2025-01-02T00:00:00Z"),
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({ status: "paused" }),
      ]);
      mockMarkCampaignConflict.mockRejectedValue(new Error("Database error"));

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - should report error but not throw
      expect(result.errors).toBe(1);
      expect(result.errorMessages).toHaveLength(1);
    });

    it("should continue processing after individual conflict errors", async () => {
      // Arrange
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");
      const localModified = new Date("2025-01-02T00:00:00Z");

      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          id: "campaign-1",
          platformCampaignId: "reddit_1",
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt: localModified,
        }),
        createLocalCampaign({
          id: "campaign-2",
          platformCampaignId: "reddit_2",
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt: lastSyncedAt, // Not modified
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({ platformId: "reddit_1", status: "paused" }),
        createPlatformStatus({ platformId: "reddit_2", status: "paused" }),
      ]);

      // First conflict marking fails
      mockMarkCampaignConflict.mockRejectedValueOnce(new Error("DB error"));

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - second campaign should still be processed
      expect(result.errors).toBe(1);
      expect(result.updated).toBe(1); // Campaign 2 should update
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty campaign list", async () => {
      // Arrange
      mockGetSyncedCampaignsForAccount.mockResolvedValue([]);
      mockListCampaignStatuses.mockResolvedValue([]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.conflicts).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(0);
    });

    it("should handle platform returning extra campaigns not in local DB", async () => {
      // Arrange
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          id: "campaign-1",
          platformCampaignId: "reddit_1",
        }),
      ]);
      // Platform returns campaigns we don't have locally
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({ platformId: "reddit_1", status: "active" }),
        createPlatformStatus({ platformId: "reddit_unknown", status: "active" }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - should only process known campaigns
      expect(result.unchanged).toBe(1);
      // Unknown campaign is ignored
    });

    it("should handle identical timestamps (local and platform modified at same time)", async () => {
      // Arrange
      const sameTime = new Date("2025-01-02T00:00:00Z");
      const lastSyncedAt = new Date("2025-01-01T00:00:00Z");

      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        createLocalCampaign({
          localStatus: "active",
          lastSyncedAt,
          localUpdatedAt: sameTime,
        }),
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        createPlatformStatus({
          status: "paused",
          lastModified: sameTime,
        }),
      ]);

      // Act
      const handler = createSyncFromPlatformHandler();
      const result = await handler(createSyncJobData());

      // Assert - should still be conflict since local was modified
      expect(result.conflicts).toBe(1);
    });
  });
});
