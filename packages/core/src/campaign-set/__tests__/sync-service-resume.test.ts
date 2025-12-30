/**
 * Campaign Set Sync Service - ID-Based Sync Tests
 *
 * Tests for the ID-based sync functionality that ensures:
 *
 * 1. Entities with platform IDs are updated (not recreated)
 * 2. New entities are created and IDs are immediately persisted
 * 3. Immediate persistence prevents duplicates on retry after partial failure
 * 4. Sync operations are idempotent when IDs are stored
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DefaultCampaignSetSyncService,
} from "../sync-service.js";
import type { CampaignSetPlatformAdapter } from "../platform-adapter.js";
import type {
  CampaignSet,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
} from "../types.js";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAdapter(): CampaignSetPlatformAdapter {
  return {
    platform: "mock",
    createCampaign: vi.fn().mockResolvedValue({
      success: true,
      platformCampaignId: "new_campaign_123",
    }),
    updateCampaign: vi.fn().mockResolvedValue({
      success: true,
      platformCampaignId: "updated_campaign_123",
    }),
    pauseCampaign: vi.fn().mockResolvedValue(undefined),
    resumeCampaign: vi.fn().mockResolvedValue(undefined),
    deleteCampaign: vi.fn().mockResolvedValue(undefined),
    createAdGroup: vi.fn().mockResolvedValue({
      success: true,
      platformAdGroupId: "new_adgroup_123",
    }),
    updateAdGroup: vi.fn().mockResolvedValue({
      success: true,
      platformAdGroupId: "updated_adgroup_123",
    }),
    deleteAdGroup: vi.fn().mockResolvedValue(undefined),
    createAd: vi.fn().mockResolvedValue({
      success: true,
      platformAdId: "new_ad_123",
    }),
    updateAd: vi.fn().mockResolvedValue({
      success: true,
      platformAdId: "updated_ad_123",
    }),
    deleteAd: vi.fn().mockResolvedValue(undefined),
    createKeyword: vi.fn().mockResolvedValue({
      success: true,
      platformKeywordId: "new_keyword_123",
    }),
    updateKeyword: vi.fn().mockResolvedValue({
      success: true,
      platformKeywordId: "updated_keyword_123",
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
      selectedPlatforms: ["mock"],
      selectedAdTypes: { mock: ["search"] },
      campaignConfig: { namePattern: "{brand} Campaign" },
      hierarchyConfig: {
        adGroups: [],
      },
      generatedAt: now.toISOString(),
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
    platform: "mock",
    orderIndex: 0,
    status: "pending",
    syncStatus: "pending",
    adGroups: [],
    platformData: { adAccountId: "account_123" },
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

describe("ID-Based Sync", () => {
  let mockAdapter: ReturnType<typeof createMockAdapter>;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let service: DefaultCampaignSetSyncService;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    mockRepository = createMockRepository();
    const adapters = new Map<string, CampaignSetPlatformAdapter>();
    adapters.set("mock", mockAdapter);
    service = new DefaultCampaignSetSyncService(adapters, mockRepository);
  });

  describe("Campaign Sync", () => {
    it("should create campaign when no platform ID exists", async () => {
      const campaign = createMockCampaign({ platformCampaignId: undefined });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.createCampaign).toHaveBeenCalled();
      expect(mockAdapter.updateCampaign).not.toHaveBeenCalled();
    });

    it("should update campaign when platform ID exists", async () => {
      const campaign = createMockCampaign({
        platformCampaignId: "existing_id_789",
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.updateCampaign).toHaveBeenCalledWith(
        expect.anything(),
        "existing_id_789"
      );
      expect(mockAdapter.createCampaign).not.toHaveBeenCalled();
    });

    it("should immediately persist platform ID after campaign creation", async () => {
      const campaign = createMockCampaign({ platformCampaignId: undefined });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      await service.syncCampaignSet("set-1");

      // Verify immediate persistence was called with the new ID
      expect(mockRepository.updateCampaignPlatformId).toHaveBeenCalledWith(
        "campaign-1",
        "new_campaign_123"
      );
    });
  });

  describe("Ad Group Sync", () => {
    it("should create ad group when no platform ID exists", async () => {
      const adGroup = createMockAdGroup({ platformAdGroupId: undefined });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.createAdGroup).toHaveBeenCalled();
      expect(mockAdapter.updateAdGroup).not.toHaveBeenCalled();
    });

    it("should update ad group when platform ID exists", async () => {
      const adGroup = createMockAdGroup({
        platformAdGroupId: "existing_adgroup_789",
      });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.updateAdGroup).toHaveBeenCalledWith(
        expect.anything(),
        "existing_adgroup_789"
      );
      expect(mockAdapter.createAdGroup).not.toHaveBeenCalled();
    });

    it("should immediately persist platform ID after ad group creation", async () => {
      const adGroup = createMockAdGroup({ platformAdGroupId: undefined });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      await service.syncCampaignSet("set-1");

      expect(mockRepository.updateAdGroupPlatformId).toHaveBeenCalledWith(
        "adgroup-1",
        "new_adgroup_123"
      );
    });
  });

  describe("Ad Sync", () => {
    it("should create ad when no platform ID exists", async () => {
      const ad = createMockAd({ platformAdId: undefined });
      const adGroup = createMockAdGroup({ ads: [ad] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.createAd).toHaveBeenCalled();
      expect(mockAdapter.updateAd).not.toHaveBeenCalled();
    });

    it("should update ad when platform ID exists", async () => {
      const ad = createMockAd({ platformAdId: "existing_ad_789" });
      const adGroup = createMockAdGroup({ ads: [ad] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.updateAd).toHaveBeenCalledWith(
        expect.anything(),
        "existing_ad_789"
      );
      expect(mockAdapter.createAd).not.toHaveBeenCalled();
    });

    it("should immediately persist platform ID after ad creation", async () => {
      const ad = createMockAd({ platformAdId: undefined });
      const adGroup = createMockAdGroup({ ads: [ad] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      await service.syncCampaignSet("set-1");

      expect(mockRepository.updateAdPlatformId).toHaveBeenCalledWith(
        "ad-1",
        "new_ad_123"
      );
    });
  });

  describe("Keyword Sync", () => {
    it("should create keyword when no platform ID exists", async () => {
      const keyword = createMockKeyword({ platformKeywordId: undefined });
      const adGroup = createMockAdGroup({ keywords: [keyword] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.createKeyword).toHaveBeenCalled();
      expect(mockAdapter.updateKeyword).not.toHaveBeenCalled();
    });

    it("should update keyword when platform ID exists", async () => {
      const keyword = createMockKeyword({
        platformKeywordId: "existing_keyword_789",
      });
      const adGroup = createMockAdGroup({ keywords: [keyword] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.updateKeyword).toHaveBeenCalledWith(
        expect.anything(),
        "existing_keyword_789"
      );
      expect(mockAdapter.createKeyword).not.toHaveBeenCalled();
    });

    it("should immediately persist platform ID after keyword creation", async () => {
      const keyword = createMockKeyword({ platformKeywordId: undefined });
      const adGroup = createMockAdGroup({ keywords: [keyword] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      await service.syncCampaignSet("set-1");

      expect(mockRepository.updateKeywordPlatformId).toHaveBeenCalledWith(
        "keyword-1",
        "new_keyword_123"
      );
    });
  });

  describe("Immediate Persistence for Retry Safety", () => {
    it("should persist campaign ID before syncing child ad groups", async () => {
      const adGroup = createMockAdGroup({ platformAdGroupId: undefined });
      const campaign = createMockCampaign({
        platformCampaignId: undefined,
        adGroups: [adGroup],
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Make ad group creation fail
      (mockAdapter.createAdGroup as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Ad group creation failed",
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(false);
      // Campaign ID should still have been persisted before the failure
      expect(mockRepository.updateCampaignPlatformId).toHaveBeenCalledWith(
        "campaign-1",
        "new_campaign_123"
      );
    });

    it("should persist ad group ID before syncing child ads", async () => {
      const ad = createMockAd({ platformAdId: undefined });
      const adGroup = createMockAdGroup({
        platformAdGroupId: undefined,
        ads: [ad],
      });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Make ad creation fail
      (mockAdapter.createAd as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Ad creation failed",
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(false);
      // Ad group ID should still have been persisted before the failure
      expect(mockRepository.updateAdGroupPlatformId).toHaveBeenCalledWith(
        "adgroup-1",
        "new_adgroup_123"
      );
    });
  });

  describe("Idempotency Verification", () => {
    it("should produce same result when running sync twice with stored IDs", async () => {
      // First sync: creates entities
      const campaign = createMockCampaign({ platformCampaignId: undefined });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result1 = await service.syncCampaignSet("set-1");
      expect(result1.success).toBe(true);
      expect(mockAdapter.createCampaign).toHaveBeenCalledTimes(1);

      // Second sync: campaign now has platform ID (from first sync)
      const campaignWithId = createMockCampaign({
        platformCampaignId: "new_campaign_123",
      });
      const campaignSetWithId = createMockCampaignSet({
        campaigns: [campaignWithId],
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSetWithId);

      const result2 = await service.syncCampaignSet("set-1");
      expect(result2.success).toBe(true);
      // Should have called update on second sync
      expect(mockAdapter.updateCampaign).toHaveBeenCalled();
      // Should NOT have created again
      expect(mockAdapter.createCampaign).toHaveBeenCalledTimes(1); // Still just 1
    });
  });

  describe("Platform ID Change Handling", () => {
    it("should update DB when platform returns different ID on update", async () => {
      const campaign = createMockCampaign({
        platformCampaignId: "old_platform_id",
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Platform returns a different ID (rare but possible)
      (mockAdapter.updateCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        platformCampaignId: "new_platform_id_from_platform",
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should have updated the platform ID in DB
      expect(mockRepository.updateCampaignPlatformId).toHaveBeenCalledWith(
        "campaign-1",
        "new_platform_id_from_platform"
      );
    });
  });

  describe("Full Hierarchy Sync", () => {
    it("should sync complete hierarchy: campaign -> ad groups -> ads + keywords", async () => {
      const keyword = createMockKeyword({ platformKeywordId: undefined });
      const ad = createMockAd({ platformAdId: undefined });
      const adGroup = createMockAdGroup({
        platformAdGroupId: undefined,
        ads: [ad],
        keywords: [keyword],
      });
      const campaign = createMockCampaign({
        platformCampaignId: undefined,
        adGroups: [adGroup],
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.createCampaign).toHaveBeenCalled();
      expect(mockAdapter.createAdGroup).toHaveBeenCalled();
      expect(mockAdapter.createAd).toHaveBeenCalled();
      expect(mockAdapter.createKeyword).toHaveBeenCalled();

      // All IDs should be persisted
      expect(mockRepository.updateCampaignPlatformId).toHaveBeenCalled();
      expect(mockRepository.updateAdGroupPlatformId).toHaveBeenCalled();
      expect(mockRepository.updateAdPlatformId).toHaveBeenCalled();
      expect(mockRepository.updateKeywordPlatformId).toHaveBeenCalled();
    });
  });
});
