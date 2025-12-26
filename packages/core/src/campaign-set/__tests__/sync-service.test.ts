/**
 * Campaign Set Sync Service Tests
 *
 * TDD tests for the campaign set sync service that handles syncing
 * campaign sets to ad platforms.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CampaignSetSyncService,
  DefaultCampaignSetSyncService,
  type CampaignSetSyncResult,
  type CampaignSyncResult,
  type PauseResult,
  type ResumeResult,
  type SyncError,
} from "../sync-service.js";
import type { CampaignSetPlatformAdapter } from "../platform-adapter.js";
import type {
  CampaignSet,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  CampaignSetSyncStatus,
  CampaignStatus,
} from "../types.js";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAdapter(): CampaignSetPlatformAdapter {
  return {
    platform: "mock",
    createCampaign: vi.fn().mockResolvedValue({
      success: true,
      platformCampaignId: "mock_campaign_123",
    }),
    updateCampaign: vi.fn().mockResolvedValue({
      success: true,
      platformCampaignId: "mock_campaign_123",
    }),
    pauseCampaign: vi.fn().mockResolvedValue(undefined),
    resumeCampaign: vi.fn().mockResolvedValue(undefined),
    deleteCampaign: vi.fn().mockResolvedValue(undefined),
    createAdGroup: vi.fn().mockResolvedValue({
      success: true,
      platformAdGroupId: "mock_adgroup_123",
    }),
    updateAdGroup: vi.fn().mockResolvedValue({
      success: true,
      platformAdGroupId: "mock_adgroup_123",
    }),
    deleteAdGroup: vi.fn().mockResolvedValue(undefined),
    createAd: vi.fn().mockResolvedValue({
      success: true,
      platformAdId: "mock_ad_123",
    }),
    updateAd: vi.fn().mockResolvedValue({
      success: true,
      platformAdId: "mock_ad_123",
    }),
    deleteAd: vi.fn().mockResolvedValue(undefined),
    createKeyword: vi.fn().mockResolvedValue({
      success: true,
      platformKeywordId: "mock_keyword_123",
    }),
    updateKeyword: vi.fn().mockResolvedValue({
      success: true,
      platformKeywordId: "mock_keyword_123",
    }),
    deleteKeyword: vi.fn().mockResolvedValue(undefined),
  };
}

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

function createMockCampaignSet(overrides: Partial<CampaignSet> = {}): CampaignSet {
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
      selectedPlatforms: ["google"],
      selectedAdTypes: { google: ["search"] },
      campaignConfig: { namePattern: "{brand} Campaign" },
      hierarchyConfig: {
        campaignGroupBy: "brand",
        campaignNamePattern: "{brand} Campaign",
        adGroupGroupBy: "product",
        adGroupNamePattern: "{product} Ad Group",
      },
      generatedAt: now,
      rowCount: 10,
      campaignCount: 2,
    },
    campaigns: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockCampaign(overrides: Partial<Campaign> = {}): Campaign {
  const now = new Date();
  return {
    id: "campaign-1",
    campaignSetId: "set-1",
    name: "Test Campaign",
    platform: "google",
    orderIndex: 0,
    status: "pending",
    syncStatus: "pending",
    adGroups: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockAdGroup(overrides: Partial<AdGroup> = {}): AdGroup {
  const now = new Date();
  return {
    id: "adgroup-1",
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

function createMockAd(overrides: Partial<Ad> = {}): Ad {
  const now = new Date();
  return {
    id: "ad-1",
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

function createMockKeyword(overrides: Partial<Keyword> = {}): Keyword {
  const now = new Date();
  return {
    id: "keyword-1",
    adGroupId: "adgroup-1",
    keyword: "test keyword",
    matchType: "broad",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("CampaignSetSyncService", () => {
  let mockAdapter: CampaignSetPlatformAdapter;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let service: CampaignSetSyncService;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    mockRepository = createMockRepository();
    const adapters = new Map<string, CampaignSetPlatformAdapter>();
    adapters.set("google", mockAdapter);
    adapters.set("mock", mockAdapter);
    service = new DefaultCampaignSetSyncService(adapters, mockRepository);
  });

  describe("syncCampaignSet", () => {
    it("should return error when campaign set is not found", async () => {
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(null);

      const result = await service.syncCampaignSet("non-existent");

      expect(result.success).toBe(false);
      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("CAMPAIGN_SET_NOT_FOUND");
    });

    it("should sync an empty campaign set successfully", async () => {
      const campaignSet = createMockCampaignSet({ campaigns: [] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(result.setId).toBe("set-1");
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.campaigns).toHaveLength(0);
    });

    it("should sync a campaign set with one campaign", async () => {
      const campaign = createMockCampaign();
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0].success).toBe(true);
      expect(result.campaigns[0].platformCampaignId).toBe("mock_campaign_123");
      expect(mockAdapter.createCampaign).toHaveBeenCalledTimes(1);
    });

    it("should sync campaigns with ad groups, ads, and keywords", async () => {
      const keyword = createMockKeyword();
      const ad = createMockAd();
      const adGroup = createMockAdGroup({ ads: [ad], keywords: [keyword] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
      expect(mockAdapter.createCampaign).toHaveBeenCalledTimes(1);
      expect(mockAdapter.createAdGroup).toHaveBeenCalledTimes(1);
      expect(mockAdapter.createAd).toHaveBeenCalledTimes(1);
      expect(mockAdapter.createKeyword).toHaveBeenCalledTimes(1);
    });

    it("should update existing campaigns when platformCampaignId exists", async () => {
      const campaign = createMockCampaign({
        platformCampaignId: "existing_platform_id",
        syncStatus: "synced",
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.updateCampaign).toHaveBeenCalledTimes(1);
      expect(mockAdapter.createCampaign).not.toHaveBeenCalled();
    });

    it("should skip draft campaigns", async () => {
      const draftCampaign = createMockCampaign({ status: "draft" });
      const activeCampaign = createMockCampaign({
        id: "campaign-2",
        status: "pending",
      });
      const campaignSet = createMockCampaignSet({
        campaigns: [draftCampaign, activeCampaign],
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.synced).toBe(1);
      expect(result.skipped).toBe(1);
      expect(mockAdapter.createCampaign).toHaveBeenCalledTimes(1);
    });

    it("should handle sync failures gracefully", async () => {
      const campaign = createMockCampaign();
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      (mockAdapter.createCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "API rate limit exceeded",
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(false);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("API rate limit exceeded");
    });

    it("should continue syncing after individual campaign failure", async () => {
      const campaign1 = createMockCampaign({ id: "campaign-1" });
      const campaign2 = createMockCampaign({ id: "campaign-2" });
      const campaignSet = createMockCampaignSet({
        campaigns: [campaign1, campaign2],
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      (mockAdapter.createCampaign as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ success: false, error: "First failed" })
        .mockResolvedValueOnce({ success: true, platformCampaignId: "mock_2" });

      const result = await service.syncCampaignSet("set-1");

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.campaigns).toHaveLength(2);
    });

    it("should update campaign set status to syncing during sync", async () => {
      const campaign = createMockCampaign();
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      await service.syncCampaignSet("set-1");

      expect(mockRepository.updateCampaignSetStatus).toHaveBeenCalledWith(
        "set-1",
        "syncing",
        expect.any(String)
      );
    });

    it("should group campaigns by platform and use correct adapter", async () => {
      const googleCampaign = createMockCampaign({
        id: "google-campaign",
        platform: "google",
      });
      const facebookCampaign = createMockCampaign({
        id: "facebook-campaign",
        platform: "facebook",
      });
      const campaignSet = createMockCampaignSet({
        campaigns: [googleCampaign, facebookCampaign],
        config: {
          ...createMockCampaignSet().config,
          selectedPlatforms: ["google", "facebook"],
        },
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const facebookAdapter = createMockAdapter();
      facebookAdapter.platform = "facebook";
      (facebookAdapter.createCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        platformCampaignId: "fb_campaign_123",
      });

      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("google", mockAdapter);
      adapters.set("facebook", facebookAdapter);
      service = new DefaultCampaignSetSyncService(adapters, mockRepository);

      const result = await service.syncCampaignSet("set-1");

      expect(result.synced).toBe(2);
      expect(mockAdapter.createCampaign).toHaveBeenCalledTimes(1);
      expect(facebookAdapter.createCampaign).toHaveBeenCalledTimes(1);
    });

    it("should skip campaigns with no adapter available", async () => {
      const unknownPlatformCampaign = createMockCampaign({
        platform: "unknown" as any,
      });
      const campaignSet = createMockCampaignSet({
        campaigns: [unknownPlatformCampaign],
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("NO_ADAPTER_FOR_PLATFORM");
    });
  });

  describe("syncCampaign", () => {
    it("should sync a single campaign by ID", async () => {
      const campaign = createMockCampaign();
      mockRepository.getCampaignById.mockResolvedValue({
        campaign,
        setId: "set-1",
      });

      const result = await service.syncCampaign("campaign-1");

      expect(result.success).toBe(true);
      expect(result.campaignId).toBe("campaign-1");
      expect(result.platformCampaignId).toBe("mock_campaign_123");
    });

    it("should return error when campaign is not found", async () => {
      mockRepository.getCampaignById.mockResolvedValue(null);

      const result = await service.syncCampaign("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Campaign not found");
    });

    it("should return error when no adapter available for platform", async () => {
      const campaign = createMockCampaign({ platform: "unknown_platform" as any });
      mockRepository.getCampaignById.mockResolvedValue({
        campaign,
        setId: "set-1",
      });

      const result = await service.syncCampaign("campaign-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No adapter available");
    });
  });

  describe("pauseCampaignSet", () => {
    it("should pause all campaigns in a set", async () => {
      const campaign1 = createMockCampaign({
        id: "campaign-1",
        platformCampaignId: "platform_1",
        status: "active",
      });
      const campaign2 = createMockCampaign({
        id: "campaign-2",
        platformCampaignId: "platform_2",
        status: "active",
      });
      const campaignSet = createMockCampaignSet({
        campaigns: [campaign1, campaign2],
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.pauseCampaignSet("set-1");

      expect(result.setId).toBe("set-1");
      expect(result.paused).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockAdapter.pauseCampaign).toHaveBeenCalledTimes(2);
    });

    it("should skip campaigns without platform ID", async () => {
      const campaignWithoutPlatformId = createMockCampaign({
        platformCampaignId: undefined,
      });
      const campaignSet = createMockCampaignSet({
        campaigns: [campaignWithoutPlatformId],
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.pauseCampaignSet("set-1");

      expect(result.paused).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockAdapter.pauseCampaign).not.toHaveBeenCalled();
    });

    it("should handle pause failures", async () => {
      const campaign = createMockCampaign({
        platformCampaignId: "platform_1",
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      (mockAdapter.pauseCampaign as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API error")
      );

      const result = await service.pauseCampaignSet("set-1");

      expect(result.paused).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it("should return error when campaign set not found", async () => {
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(null);

      const result = await service.pauseCampaignSet("non-existent");

      expect(result.paused).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("CAMPAIGN_SET_NOT_FOUND");
    });
  });

  describe("resumeCampaignSet", () => {
    it("should resume all campaigns in a set", async () => {
      const campaign1 = createMockCampaign({
        id: "campaign-1",
        platformCampaignId: "platform_1",
        status: "paused",
      });
      const campaign2 = createMockCampaign({
        id: "campaign-2",
        platformCampaignId: "platform_2",
        status: "paused",
      });
      const campaignSet = createMockCampaignSet({
        campaigns: [campaign1, campaign2],
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.resumeCampaignSet("set-1");

      expect(result.setId).toBe("set-1");
      expect(result.resumed).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockAdapter.resumeCampaign).toHaveBeenCalledTimes(2);
    });

    it("should skip campaigns without platform ID", async () => {
      const campaignWithoutPlatformId = createMockCampaign({
        platformCampaignId: undefined,
      });
      const campaignSet = createMockCampaignSet({
        campaigns: [campaignWithoutPlatformId],
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.resumeCampaignSet("set-1");

      expect(result.resumed).toBe(0);
      expect(mockAdapter.resumeCampaign).not.toHaveBeenCalled();
    });

    it("should handle resume failures", async () => {
      const campaign = createMockCampaign({
        platformCampaignId: "platform_1",
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      (mockAdapter.resumeCampaign as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API error")
      );

      const result = await service.resumeCampaignSet("set-1");

      expect(result.resumed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("should handle concurrent sync requests gracefully", async () => {
      const campaign = createMockCampaign();
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Simulate slow sync
      (mockAdapter.createCampaign as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true, platformCampaignId: "mock_1" }), 10)
          )
      );

      const [result1, result2] = await Promise.all([
        service.syncCampaignSet("set-1"),
        service.syncCampaignSet("set-1"),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it("should handle adapter exceptions", async () => {
      const campaign = createMockCampaign();
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      (mockAdapter.createCampaign as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network timeout")
      );

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain("Network timeout");
    });

    it("should update platform IDs after successful sync", async () => {
      const campaign = createMockCampaign();
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      await service.syncCampaignSet("set-1");

      expect(mockRepository.updateCampaignPlatformId).toHaveBeenCalledWith(
        "campaign-1",
        "mock_campaign_123"
      );
    });
  });
});
