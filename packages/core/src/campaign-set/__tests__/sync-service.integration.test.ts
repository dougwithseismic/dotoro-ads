/**
 * Sync Service Integration Tests
 *
 * Tests for integration between sync service components including:
 * 1. Multi-platform campaign set sync
 * 2. Large campaign set performance (N+1 query detection)
 * 3. Configurable mock adapter behaviors
 * 4. End-to-end sync flow with hierarchical data
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DefaultCampaignSetSyncService } from "../sync-service.js";
import type { CampaignSetPlatformAdapter } from "../platform-adapter.js";
import type {
  CampaignSet,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  Platform,
} from "../types.js";
import {
  ConfigurableMockAdapter,
  createSuccessAdapter,
  createPartialFailureAdapter,
  createRateLimitedAdapter,
} from "./configurable-mock-adapter.js";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRepository() {
  return {
    getCampaignSetWithRelations: vi.fn(),
    getCampaignById: vi.fn(),
    updateCampaignSetStatus: vi.fn().mockResolvedValue(undefined),
    updateCampaignSyncStatus: vi.fn().mockResolvedValue(undefined),
    updateCampaignPlatformId: vi.fn().mockResolvedValue(undefined),
    updateAdGroupPlatformId: vi.fn().mockResolvedValue(undefined),
    updateAdPlatformId: vi.fn().mockResolvedValue(undefined),
    updateKeywordPlatformId: vi.fn().mockResolvedValue(undefined),
  };
}

function createCampaignSet(overrides: Partial<CampaignSet> = {}): CampaignSet {
  const now = new Date();
  return {
    id: "set-1",
    userId: "user-1",
    name: "Test Campaign Set",
    description: "A test campaign set",
    status: "pending",
    syncStatus: "pending",
    config: {
      dataSourceId: "ds-1",
      availableColumns: ["brand", "product"],
      selectedPlatforms: ["reddit"],
      selectedAdTypes: { reddit: ["link"] },
      campaignConfig: { namePattern: "{brand} Campaign" },
      hierarchyConfig: {
        adGroups: [
          {
            namePattern: "{product} Ad Group",
            ads: [{ headline: "Buy {product}" }],
          },
        ],
      },
      generatedAt: now.toISOString(),
      rowCount: 10,
      campaignCount: 5,
    },
    campaigns: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createCampaign(overrides: Partial<Campaign> = {}): Campaign {
  const now = new Date();
  return {
    id: `campaign-${Math.random().toString(36).substring(7)}`,
    campaignSetId: "set-1",
    name: "Test Campaign",
    platform: "reddit" as Platform,
    orderIndex: 0,
    status: "pending",
    syncStatus: "pending",
    adGroups: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createAdGroup(overrides: Partial<AdGroup> = {}): AdGroup {
  const now = new Date();
  return {
    id: `adgroup-${Math.random().toString(36).substring(7)}`,
    campaignId: "campaign-1",
    name: "Test Ad Group",
    orderIndex: 0,
    status: "active",
    ads: [],
    keywords: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createAd(overrides: Partial<Ad> = {}): Ad {
  const now = new Date();
  return {
    id: `ad-${Math.random().toString(36).substring(7)}`,
    adGroupId: "adgroup-1",
    orderIndex: 0,
    headline: "Test Headline",
    description: "Test Description",
    finalUrl: "https://example.com",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createKeyword(overrides: Partial<Keyword> = {}): Keyword {
  const now = new Date();
  return {
    id: `keyword-${Math.random().toString(36).substring(7)}`,
    adGroupId: "adgroup-1",
    keyword: "test keyword",
    matchType: "broad",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Generate a large campaign set with many campaigns for performance testing
 */
function createLargeCampaignSet(campaignCount: number): CampaignSet {
  const campaigns: Campaign[] = [];

  for (let i = 0; i < campaignCount; i++) {
    const adGroup = createAdGroup({
      id: `adgroup-${i}`,
      campaignId: `campaign-${i}`,
      ads: [createAd({ id: `ad-${i}`, adGroupId: `adgroup-${i}` })],
      keywords: [createKeyword({ id: `keyword-${i}`, adGroupId: `adgroup-${i}` })],
    });

    campaigns.push(
      createCampaign({
        id: `campaign-${i}`,
        name: `Campaign ${i}`,
        orderIndex: i,
        adGroups: [adGroup],
      })
    );
  }

  return createCampaignSet({ campaigns });
}

// ============================================================================
// Tests
// ============================================================================

describe("Sync Service Integration Tests", () => {
  let repository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    repository = createMockRepository();
  });

  describe("Multi-Platform Campaign Set Sync", () => {
    it("should sync campaign set targeting multiple platforms", async () => {
      // Arrange
      const redditAdapter = createSuccessAdapter("reddit" as Platform);
      const googleAdapter = createSuccessAdapter("google" as Platform);

      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", redditAdapter);
      adapters.set("google", googleAdapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      // Create campaign set with campaigns for both platforms
      const campaignSet = createCampaignSet({
        config: {
          ...createCampaignSet().config,
          selectedPlatforms: ["reddit", "google"],
        },
        campaigns: [
          createCampaign({ id: "reddit-campaign", platform: "reddit" as Platform }),
          createCampaign({ id: "google-campaign", platform: "google" as Platform }),
        ],
      });

      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert
      expect(result.success).toBe(true);
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);

      // Verify each adapter was called for its platform
      expect(redditAdapter.getCallCount("createCampaign")).toBe(1);
      expect(googleAdapter.getCallCount("createCampaign")).toBe(1);
    });

    it("should handle partial platform failures", async () => {
      // Arrange
      const redditAdapter = createSuccessAdapter("reddit" as Platform);
      const googleAdapter = createRateLimitedAdapter("google" as Platform);

      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", redditAdapter);
      adapters.set("google", googleAdapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const campaignSet = createCampaignSet({
        campaigns: [
          createCampaign({ id: "reddit-campaign", platform: "reddit" as Platform }),
          createCampaign({ id: "google-campaign", platform: "google" as Platform }),
        ],
      });

      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert
      expect(result.synced).toBe(1); // Reddit succeeded
      expect(result.failed).toBe(1); // Google failed
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].campaignId).toBe("google-campaign");
    });

    it("should skip campaigns with no adapter available", async () => {
      // Arrange - only reddit adapter, but campaign targets facebook
      const redditAdapter = createSuccessAdapter("reddit" as Platform);

      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", redditAdapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const campaignSet = createCampaignSet({
        campaigns: [
          createCampaign({ id: "reddit-campaign", platform: "reddit" as Platform }),
          createCampaign({ id: "facebook-campaign", platform: "facebook" as Platform }),
        ],
      });

      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert
      expect(result.synced).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("NO_ADAPTER_FOR_PLATFORM");
    });
  });

  describe("Large Campaign Set Performance", () => {
    it("should sync 50+ campaigns without N+1 query issues", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const largeCampaignSet = createLargeCampaignSet(50);
      repository.getCampaignSetWithRelations.mockResolvedValue(largeCampaignSet);

      // Track repository calls
      const repoCallsBefore = repository.getCampaignSetWithRelations.mock.calls.length;

      // Act
      const startTime = Date.now();
      const result = await service.syncCampaignSet("set-1");
      const duration = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(result.synced).toBe(50);

      // Verify getCampaignSetWithRelations was called only once (no N+1)
      const repoCalls = repository.getCampaignSetWithRelations.mock.calls.length;
      expect(repoCalls - repoCallsBefore).toBe(1);

      // Verify all operations were executed
      expect(adapter.getCallCount("createCampaign")).toBe(50);
      expect(adapter.getCallCount("createAdGroup")).toBe(50);
      expect(adapter.getCallCount("createAd")).toBe(50);
      expect(adapter.getCallCount("createKeyword")).toBe(50);

      // Performance sanity check (should complete in reasonable time)
      // With mocked adapter, should be very fast
      expect(duration).toBeLessThan(1000);
    });

    it("should handle 100 campaigns efficiently", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const largeCampaignSet = createLargeCampaignSet(100);
      repository.getCampaignSetWithRelations.mockResolvedValue(largeCampaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert
      expect(result.success).toBe(true);
      expect(result.synced).toBe(100);
      expect(adapter.getTotalCallCount()).toBe(400); // 100 * 4 (campaign + adgroup + ad + keyword)
    });

    it("should track platform IDs efficiently for large sets", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const largeCampaignSet = createLargeCampaignSet(25);
      repository.getCampaignSetWithRelations.mockResolvedValue(largeCampaignSet);

      // Act
      await service.syncCampaignSet("set-1");

      // Assert - verify platform IDs were stored
      // Note: Campaign IDs are persisted twice per campaign:
      // 1. Immediately after creation (for idempotent retry)
      // 2. In the success handler (safety net)
      expect(repository.updateCampaignPlatformId).toHaveBeenCalledTimes(50); // 25 campaigns * 2 calls
      expect(repository.updateAdGroupPlatformId).toHaveBeenCalledTimes(25);
      expect(repository.updateAdPlatformId).toHaveBeenCalledTimes(25);
      expect(repository.updateKeywordPlatformId).toHaveBeenCalledTimes(25);
    });
  });

  describe("Configurable Mock Adapter Behaviors", () => {
    it("should simulate rate limiting with retryable flag", async () => {
      // Arrange
      const adapter = new ConfigurableMockAdapter({
        platform: "reddit" as Platform,
        operationConfigs: {
          createCampaign: {
            alwaysFail: true,
            errorType: "rate_limit",
            retryable: true,
            retryAfterSeconds: 60,
          },
        },
      });

      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const campaignSet = createCampaignSet({
        campaigns: [createCampaign()],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert
      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain("Rate limit");
    });

    it("should simulate partial failures with configurable rate", async () => {
      // Arrange - 30% failure rate
      const adapter = createPartialFailureAdapter("reddit" as Platform, 0.3);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      // Create 20 campaigns for statistical significance
      const campaigns = Array.from({ length: 20 }, (_, i) =>
        createCampaign({ id: `campaign-${i}` })
      );
      const campaignSet = createCampaignSet({ campaigns });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert - with 30% failure rate and 20 campaigns, expect some failures
      // Due to randomness, we just verify the mechanism works
      expect(result.synced + result.failed).toBe(20);
    });

    it("should simulate sequence-based behavior (fail then succeed)", async () => {
      // Arrange - first call fails, subsequent succeed
      const adapter = new ConfigurableMockAdapter({
        platform: "reddit" as Platform,
        operationConfigs: {
          createCampaign: {
            sequence: [false, true, true, true],
            errorType: "server_error",
            retryable: true,
          },
        },
      });

      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const campaignSet = createCampaignSet({
        campaigns: [
          createCampaign({ id: "campaign-1" }),
          createCampaign({ id: "campaign-2" }),
          createCampaign({ id: "campaign-3" }),
        ],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert - first fails, next two succeed
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(1);
    });

    it("should track all operation calls for verification", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const adGroup = createAdGroup({
        ads: [createAd()],
        keywords: [createKeyword(), createKeyword()],
      });
      const campaignSet = createCampaignSet({
        campaigns: [createCampaign({ adGroups: [adGroup] })],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      await service.syncCampaignSet("set-1");

      // Assert - verify call tracking
      expect(adapter.getCallCount("createCampaign")).toBe(1);
      expect(adapter.getCallCount("createAdGroup")).toBe(1);
      expect(adapter.getCallCount("createAd")).toBe(1);
      expect(adapter.getCallCount("createKeyword")).toBe(2);

      // Verify call details are tracked
      const calls = adapter.getCalls();
      expect(calls).toHaveLength(5);
      expect(calls.every((c) => c.result === "success")).toBe(true);
    });

    it("should allow entity-specific failure configuration", async () => {
      // Arrange - fail only specific campaign
      const adapter = new ConfigurableMockAdapter({
        platform: "reddit" as Platform,
      });
      adapter.failEntity("campaign-2", "validation_error", "Invalid budget");

      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const campaignSet = createCampaignSet({
        campaigns: [
          createCampaign({ id: "campaign-1" }),
          createCampaign({ id: "campaign-2" }),
          createCampaign({ id: "campaign-3" }),
        ],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert - only campaign-2 fails
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors[0].campaignId).toBe("campaign-2");
      expect(result.errors[0].message).toContain("Invalid budget");
    });
  });

  describe("Hierarchical Data Sync", () => {
    it("should sync complete hierarchy: campaign -> adgroup -> ads + keywords", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const adGroup = createAdGroup({
        id: "adgroup-1",
        ads: [createAd({ id: "ad-1" }), createAd({ id: "ad-2" })],
        keywords: [createKeyword({ id: "kw-1" }), createKeyword({ id: "kw-2" })],
      });

      const campaignSet = createCampaignSet({
        campaigns: [createCampaign({ id: "campaign-1", adGroups: [adGroup] })],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert
      expect(result.success).toBe(true);
      expect(adapter.getCallCount("createCampaign")).toBe(1);
      expect(adapter.getCallCount("createAdGroup")).toBe(1);
      expect(adapter.getCallCount("createAd")).toBe(2);
      expect(adapter.getCallCount("createKeyword")).toBe(2);
    });

    it("should handle campaigns with multiple ad groups", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const campaignSet = createCampaignSet({
        campaigns: [
          createCampaign({
            id: "campaign-1",
            adGroups: [
              createAdGroup({ id: "adgroup-1", ads: [createAd()], keywords: [] }),
              createAdGroup({ id: "adgroup-2", ads: [createAd()], keywords: [] }),
              createAdGroup({ id: "adgroup-3", ads: [createAd()], keywords: [] }),
            ],
          }),
        ],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      const result = await service.syncCampaignSet("set-1");

      // Assert
      expect(result.success).toBe(true);
      expect(adapter.getCallCount("createAdGroup")).toBe(3);
      expect(adapter.getCallCount("createAd")).toBe(3);
    });

    it("should store all platform IDs after successful sync", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      const adGroup = createAdGroup({
        id: "adgroup-1",
        ads: [createAd({ id: "ad-1" })],
        keywords: [createKeyword({ id: "kw-1" })],
      });
      const campaignSet = createCampaignSet({
        campaigns: [createCampaign({ id: "campaign-1", adGroups: [adGroup] })],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      await service.syncCampaignSet("set-1");

      // Assert - verify platform IDs were stored
      expect(repository.updateCampaignPlatformId).toHaveBeenCalledWith(
        "campaign-1",
        expect.stringContaining("mock_campaign_")
      );
      expect(repository.updateAdGroupPlatformId).toHaveBeenCalledWith(
        "adgroup-1",
        expect.stringContaining("mock_adgroup_")
      );
      expect(repository.updateAdPlatformId).toHaveBeenCalledWith(
        "ad-1",
        expect.stringContaining("mock_ad_")
      );
      expect(repository.updateKeywordPlatformId).toHaveBeenCalledWith(
        "kw-1",
        expect.stringContaining("mock_keyword_")
      );
    });
  });

  describe("Update vs Create Logic", () => {
    it("should call updateCampaign when platformCampaignId exists", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      // Campaign with existing platform ID
      const campaignSet = createCampaignSet({
        campaigns: [
          createCampaign({
            id: "campaign-1",
            platformCampaignId: "existing_platform_id",
            syncStatus: "synced",
          }),
        ],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      await service.syncCampaignSet("set-1");

      // Assert
      expect(adapter.getCallCount("updateCampaign")).toBe(1);
      expect(adapter.getCallCount("createCampaign")).toBe(0);
    });

    it("should call createCampaign when platformCampaignId is missing", async () => {
      // Arrange
      const adapter = createSuccessAdapter("reddit" as Platform);
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("reddit", adapter);

      const service = new DefaultCampaignSetSyncService(adapters, repository);

      // Campaign without platform ID
      const campaignSet = createCampaignSet({
        campaigns: [
          createCampaign({
            id: "campaign-1",
            platformCampaignId: undefined,
          }),
        ],
      });
      repository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Act
      await service.syncCampaignSet("set-1");

      // Assert
      expect(adapter.getCallCount("createCampaign")).toBe(1);
      expect(adapter.getCallCount("updateCampaign")).toBe(0);
    });
  });
});
