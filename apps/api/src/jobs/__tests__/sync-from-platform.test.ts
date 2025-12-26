/**
 * Sync From Platform Job Handler Tests
 *
 * Tests for the bidirectional sync job that pulls status changes
 * from ad platforms back to the local database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SyncFromPlatformJob, SyncFromPlatformResult } from "../types.js";

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
  const mockGetCampaignStatus = vi.fn();
  const mockListCampaignStatuses = vi.fn();
  return {
    RedditPoller: vi.fn().mockImplementation(() => ({
      platform: "reddit",
      getCampaignStatus: mockGetCampaignStatus,
      listCampaignStatuses: mockListCampaignStatuses,
    })),
    __mockGetCampaignStatus: mockGetCampaignStatus,
    __mockListCampaignStatuses: mockListCampaignStatuses,
  };
});

vi.mock("../../repositories/campaign-set-repository.js", () => {
  const mockGetSyncedCampaignsForAccount = vi.fn();
  const mockMarkCampaignConflict = vi.fn();
  const mockUpdateCampaignFromPlatform = vi.fn();
  const mockMarkCampaignDeletedOnPlatform = vi.fn();
  return {
    DrizzleCampaignSetRepository: vi.fn().mockImplementation(() => ({
      getSyncedCampaignsForAccount: mockGetSyncedCampaignsForAccount,
      markCampaignConflict: mockMarkCampaignConflict,
      updateCampaignFromPlatform: mockUpdateCampaignFromPlatform,
      markCampaignDeletedOnPlatform: mockMarkCampaignDeletedOnPlatform,
    })),
    __mockGetSyncedCampaignsForAccount: mockGetSyncedCampaignsForAccount,
    __mockMarkCampaignConflict: mockMarkCampaignConflict,
    __mockUpdateCampaignFromPlatform: mockUpdateCampaignFromPlatform,
    __mockMarkCampaignDeletedOnPlatform: mockMarkCampaignDeletedOnPlatform,
  };
});

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
  SYNC_FROM_PLATFORM_JOB,
  createSyncFromPlatformHandler,
} from "../handlers/sync-from-platform.js";

// Get mock references after imports
const oauthModule = await vi.importMock<{
  __mockGetValidTokens: ReturnType<typeof vi.fn>;
}>("../../services/reddit/oauth.js");
const coreModule = await vi.importMock<{
  __mockGetCampaignStatus: ReturnType<typeof vi.fn>;
  __mockListCampaignStatuses: ReturnType<typeof vi.fn>;
}>("@repo/core/campaign-set");
const repoModule = await vi.importMock<{
  __mockGetSyncedCampaignsForAccount: ReturnType<typeof vi.fn>;
  __mockMarkCampaignConflict: ReturnType<typeof vi.fn>;
  __mockUpdateCampaignFromPlatform: ReturnType<typeof vi.fn>;
  __mockMarkCampaignDeletedOnPlatform: ReturnType<typeof vi.fn>;
}>("../../repositories/campaign-set-repository.js");
const dbModule = await vi.importMock<{
  __mockAdAccountLookup: ReturnType<typeof vi.fn>;
}>("../../services/db.js");

const mockGetValidTokens = oauthModule.__mockGetValidTokens;
const mockListCampaignStatuses = coreModule.__mockListCampaignStatuses;
const mockGetSyncedCampaignsForAccount = repoModule.__mockGetSyncedCampaignsForAccount;
const mockMarkCampaignConflict = repoModule.__mockMarkCampaignConflict;
const mockUpdateCampaignFromPlatform = repoModule.__mockUpdateCampaignFromPlatform;
const mockMarkCampaignDeletedOnPlatform = repoModule.__mockMarkCampaignDeletedOnPlatform;
const mockAdAccountLookup = dbModule.__mockAdAccountLookup;

describe("Sync From Platform Job Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SYNC_FROM_PLATFORM_JOB constant", () => {
    it("should export the correct job name", () => {
      expect(SYNC_FROM_PLATFORM_JOB).toBe("sync-from-platform");
    });
  });

  describe("createSyncFromPlatformHandler", () => {
    const mockJobData: SyncFromPlatformJob = {
      adAccountId: "ad-account-789",
      userId: "user-456",
      platform: "reddit",
    };

    it("should return empty result when no synced campaigns exist", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockGetSyncedCampaignsForAccount.mockResolvedValue([]);

      const handler = createSyncFromPlatformHandler();
      const result = await handler(mockJobData);

      expect(result.updated).toBe(0);
      expect(result.conflicts).toBe(0);
      expect(result.unchanged).toBe(0);
      expect(result.deleted).toBe(0);
    });

    it("should detect status conflict when local was modified after sync", async () => {
      const lastSynced = new Date("2025-01-01T00:00:00Z");
      const localUpdated = new Date("2025-01-02T00:00:00Z"); // After sync

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        {
          id: "campaign-1",
          platformCampaignId: "reddit_campaign_1",
          localStatus: "active",
          lastSyncedAt: lastSynced,
          localUpdatedAt: localUpdated,
          platform: "reddit",
        },
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        {
          platformId: "reddit_campaign_1",
          status: "paused", // Different from local
          lastModified: new Date("2025-01-01T12:00:00Z"),
        },
      ]);

      const handler = createSyncFromPlatformHandler();
      const result = await handler(mockJobData);

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

    it("should update local when platform changed and local not modified", async () => {
      const lastSynced = new Date("2025-01-01T00:00:00Z");
      const localUpdated = new Date("2025-01-01T00:00:00Z"); // Same as sync (not modified)

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        {
          id: "campaign-1",
          platformCampaignId: "reddit_campaign_1",
          localStatus: "active",
          lastSyncedAt: lastSynced,
          localUpdatedAt: localUpdated,
          platform: "reddit",
        },
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        {
          platformId: "reddit_campaign_1",
          status: "paused", // Different from local
          lastModified: new Date("2025-01-02T00:00:00Z"),
        },
      ]);

      const handler = createSyncFromPlatformHandler();
      const result = await handler(mockJobData);

      expect(result.updated).toBe(1);
      expect(result.conflicts).toBe(0);
      expect(mockUpdateCampaignFromPlatform).toHaveBeenCalledWith(
        "campaign-1",
        expect.objectContaining({
          platformId: "reddit_campaign_1",
          status: "paused",
        })
      );
    });

    it("should report unchanged when local and platform match", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        {
          id: "campaign-1",
          platformCampaignId: "reddit_campaign_1",
          localStatus: "active",
          lastSyncedAt: new Date(),
          localUpdatedAt: new Date(),
          platform: "reddit",
        },
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        {
          platformId: "reddit_campaign_1",
          status: "active", // Same as local
        },
      ]);

      const handler = createSyncFromPlatformHandler();
      const result = await handler(mockJobData);

      expect(result.unchanged).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.conflicts).toBe(0);
    });

    it("should detect deleted campaigns and update local state", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        {
          id: "campaign-1",
          platformCampaignId: "reddit_campaign_1",
          localStatus: "active",
          lastSyncedAt: new Date(),
          localUpdatedAt: new Date(),
          platform: "reddit",
        },
      ]);
      // Platform returns empty - campaign was deleted
      mockListCampaignStatuses.mockResolvedValue([]);

      const handler = createSyncFromPlatformHandler();
      const result = await handler(mockJobData);

      expect(result.deleted).toBe(1);
      // Should call repository to mark campaign as deleted
      expect(mockMarkCampaignDeletedOnPlatform).toHaveBeenCalledWith("campaign-1");
    });

    it("should treat campaigns with epoch lastSyncedAt as not modified", async () => {
      // A campaign with epoch (0) lastSyncedAt means it was never synced,
      // so any platform status is considered authoritative (platform wins)
      const epochTime = new Date(0); // Unix epoch - never synced
      const localUpdated = new Date("2025-01-02T00:00:00Z"); // Modified locally

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        {
          id: "campaign-1",
          platformCampaignId: "reddit_campaign_1",
          localStatus: "active",
          lastSyncedAt: epochTime, // Never actually synced (epoch)
          localUpdatedAt: localUpdated,
          platform: "reddit",
        },
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        {
          platformId: "reddit_campaign_1",
          status: "paused", // Different from local
        },
      ]);

      const handler = createSyncFromPlatformHandler();
      const result = await handler(mockJobData);

      // Should NOT be a conflict - platform wins because lastSyncedAt is epoch
      expect(result.conflicts).toBe(0);
      expect(result.updated).toBe(1);
      expect(mockUpdateCampaignFromPlatform).toHaveBeenCalledWith(
        "campaign-1",
        expect.objectContaining({
          platformId: "reddit_campaign_1",
          status: "paused",
        })
      );
    });

    it("should throw error when ad account is not found", async () => {
      mockAdAccountLookup.mockResolvedValue([]);

      const handler = createSyncFromPlatformHandler();

      await expect(handler(mockJobData)).rejects.toThrow(
        "Invalid or unauthorized ad account"
      );
    });

    it("should throw error when OAuth tokens are not available", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue(null);

      const handler = createSyncFromPlatformHandler();

      await expect(handler(mockJobData)).rejects.toThrow("OAuth");
    });

    it("should only support reddit platform", async () => {
      const unsupportedJob: SyncFromPlatformJob = {
        ...mockJobData,
        platform: "facebook",
      };

      const handler = createSyncFromPlatformHandler();

      await expect(handler(unsupportedJob)).rejects.toThrow(
        "Unsupported platform"
      );
    });

    it("should process multiple campaigns correctly", async () => {
      const lastSynced = new Date("2025-01-01T00:00:00Z");

      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        {
          id: "campaign-1",
          platformCampaignId: "reddit_1",
          localStatus: "active",
          lastSyncedAt: lastSynced,
          localUpdatedAt: lastSynced, // Not modified
          platform: "reddit",
        },
        {
          id: "campaign-2",
          platformCampaignId: "reddit_2",
          localStatus: "active",
          lastSyncedAt: lastSynced,
          localUpdatedAt: new Date("2025-01-02T00:00:00Z"), // Modified after sync
          platform: "reddit",
        },
        {
          id: "campaign-3",
          platformCampaignId: "reddit_3",
          localStatus: "active",
          lastSyncedAt: lastSynced,
          localUpdatedAt: lastSynced,
          platform: "reddit",
        },
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        { platformId: "reddit_1", status: "paused" }, // Changed, local not modified -> update
        { platformId: "reddit_2", status: "paused" }, // Changed, local modified -> conflict
        { platformId: "reddit_3", status: "active" }, // Same -> unchanged
      ]);

      const handler = createSyncFromPlatformHandler();
      const result = await handler(mockJobData);

      expect(result.updated).toBe(1);
      expect(result.conflicts).toBe(1);
      expect(result.unchanged).toBe(1);
    });

    it("should handle errors gracefully and continue processing", async () => {
      mockAdAccountLookup.mockResolvedValue([
        { id: "ad-account-789", userId: "user-456" },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockGetSyncedCampaignsForAccount.mockResolvedValue([
        {
          id: "campaign-1",
          platformCampaignId: "reddit_1",
          localStatus: "active",
          lastSyncedAt: new Date(),
          localUpdatedAt: new Date(),
          platform: "reddit",
        },
        {
          id: "campaign-2",
          platformCampaignId: "reddit_2",
          localStatus: "active",
          lastSyncedAt: new Date(),
          localUpdatedAt: new Date(),
          platform: "reddit",
        },
      ]);
      mockListCampaignStatuses.mockResolvedValue([
        { platformId: "reddit_1", status: "paused" },
        { platformId: "reddit_2", status: "active" },
      ]);
      // First update fails
      mockUpdateCampaignFromPlatform
        .mockRejectedValueOnce(new Error("Database error"))
        .mockResolvedValueOnce(undefined);

      const handler = createSyncFromPlatformHandler();
      const result = await handler(mockJobData);

      expect(result.errors).toBe(1);
      expect(result.unchanged).toBe(1);
      expect(result.errorMessages).toHaveLength(1);
      expect(result.errorMessages[0].message).toContain("Database error");
    });
  });
});
