/**
 * Campaign Set Sync Service - Resume-Aware Tests
 *
 * Tests for the resume-aware sync functionality that enables idempotent
 * sync operations with deduplication. These tests verify that:
 *
 * 1. Interrupted syncs can be safely re-run without creating duplicates
 * 2. Entities created on platform but not saved locally are recovered via dedup
 * 3. Recovered platform IDs are immediately persisted
 * 4. Sync operations are idempotent
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

function createMockAdapter(): CampaignSetPlatformAdapter & {
  findExistingCampaign: ReturnType<typeof vi.fn>;
  findExistingAdGroup: ReturnType<typeof vi.fn>;
  findExistingAd: ReturnType<typeof vi.fn>;
  findExistingKeyword: ReturnType<typeof vi.fn>;
} {
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
    // Deduplication methods
    findExistingCampaign: vi.fn().mockResolvedValue(null),
    findExistingAdGroup: vi.fn().mockResolvedValue(null),
    findExistingAd: vi.fn().mockResolvedValue(null),
    findExistingKeyword: vi.fn().mockResolvedValue(null),
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

describe("Resume-Aware Sync", () => {
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

  describe("Campaign Deduplication Recovery", () => {
    it("should recover campaign platform ID via dedup when not stored in DB", async () => {
      // Scenario: Campaign was created on platform but crash happened before ID was saved
      const campaign = createMockCampaign({ platformCampaignId: undefined });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const recoveredId = "recovered_campaign_456";
      mockAdapter.findExistingCampaign.mockResolvedValue(recoveredId);
      mockAdapter.updateCampaign.mockResolvedValue({
        success: true,
        platformCampaignId: recoveredId,
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should have called findExistingCampaign
      expect(mockAdapter.findExistingCampaign).toHaveBeenCalledWith(
        "account_123",
        "Test Campaign"
      );
      // Should have persisted the recovered ID
      expect(mockRepository.updateCampaignPlatformId).toHaveBeenCalledWith(
        "campaign-1",
        recoveredId
      );
      // Should have called update (not create) since we found existing
      expect(mockAdapter.updateCampaign).toHaveBeenCalled();
      expect(mockAdapter.createCampaign).not.toHaveBeenCalled();
    });

    it("should create campaign when dedup finds nothing", async () => {
      const campaign = createMockCampaign({ platformCampaignId: undefined });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Dedup returns null (no existing entity)
      mockAdapter.findExistingCampaign.mockResolvedValue(null);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should have attempted dedup
      expect(mockAdapter.findExistingCampaign).toHaveBeenCalled();
      // Should have created new campaign
      expect(mockAdapter.createCampaign).toHaveBeenCalled();
      expect(mockAdapter.updateCampaign).not.toHaveBeenCalled();
    });

    it("should skip dedup when campaign already has platform ID", async () => {
      const campaign = createMockCampaign({
        platformCampaignId: "existing_id_789",
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should NOT have called findExistingCampaign (already have ID)
      expect(mockAdapter.findExistingCampaign).not.toHaveBeenCalled();
      // Should have called update directly
      expect(mockAdapter.updateCampaign).toHaveBeenCalledWith(
        expect.anything(),
        "existing_id_789"
      );
    });

    it("should continue with create if dedup lookup fails", async () => {
      const campaign = createMockCampaign({ platformCampaignId: undefined });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Dedup throws an error
      mockAdapter.findExistingCampaign.mockRejectedValue(new Error("API timeout"));

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should have tried dedup
      expect(mockAdapter.findExistingCampaign).toHaveBeenCalled();
      // Should have fallen back to create
      expect(mockAdapter.createCampaign).toHaveBeenCalled();
    });

    it("should skip dedup if no ad account ID available", async () => {
      const campaign = createMockCampaign({
        platformCampaignId: undefined,
        platformData: undefined, // No platform data means no ad account ID
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should NOT have called findExistingCampaign (no account ID)
      expect(mockAdapter.findExistingCampaign).not.toHaveBeenCalled();
      // Should have created directly
      expect(mockAdapter.createCampaign).toHaveBeenCalled();
    });
  });

  describe("Ad Group Deduplication Recovery", () => {
    it("should recover ad group platform ID via dedup when not stored in DB", async () => {
      const adGroup = createMockAdGroup({ platformAdGroupId: undefined });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const recoveredId = "recovered_adgroup_456";
      mockAdapter.findExistingAdGroup.mockResolvedValue(recoveredId);
      mockAdapter.updateAdGroup.mockResolvedValue({
        success: true,
        platformAdGroupId: recoveredId,
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should have called findExistingAdGroup
      expect(mockAdapter.findExistingAdGroup).toHaveBeenCalledWith(
        "new_campaign_123", // parent platform campaign ID
        "Test Ad Group"
      );
      // Should have persisted the recovered ID
      expect(mockRepository.updateAdGroupPlatformId).toHaveBeenCalledWith(
        "adgroup-1",
        recoveredId
      );
      // Should have called update (not create)
      expect(mockAdapter.updateAdGroup).toHaveBeenCalled();
      expect(mockAdapter.createAdGroup).not.toHaveBeenCalled();
    });

    it("should create ad group when dedup finds nothing", async () => {
      const adGroup = createMockAdGroup({ platformAdGroupId: undefined });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      mockAdapter.findExistingAdGroup.mockResolvedValue(null);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.createAdGroup).toHaveBeenCalled();
      expect(mockAdapter.updateAdGroup).not.toHaveBeenCalled();
    });

    it("should skip dedup when ad group already has platform ID", async () => {
      const adGroup = createMockAdGroup({
        platformAdGroupId: "existing_adgroup_789",
      });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.findExistingAdGroup).not.toHaveBeenCalled();
      expect(mockAdapter.updateAdGroup).toHaveBeenCalledWith(
        expect.anything(),
        "existing_adgroup_789"
      );
    });
  });

  describe("Ad Deduplication Recovery", () => {
    it("should recover ad platform ID via dedup when not stored in DB", async () => {
      const ad = createMockAd({ platformAdId: undefined });
      const adGroup = createMockAdGroup({ ads: [ad] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const recoveredId = "recovered_ad_456";
      mockAdapter.findExistingAd.mockResolvedValue(recoveredId);
      mockAdapter.updateAd.mockResolvedValue({
        success: true,
        platformAdId: recoveredId,
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should have called findExistingAd with headline
      expect(mockAdapter.findExistingAd).toHaveBeenCalledWith(
        "new_adgroup_123", // parent platform ad group ID
        "Test Headline"
      );
      // Should have persisted the recovered ID
      expect(mockRepository.updateAdPlatformId).toHaveBeenCalledWith(
        "ad-1",
        recoveredId
      );
      // Should have called update (not create)
      expect(mockAdapter.updateAd).toHaveBeenCalled();
      expect(mockAdapter.createAd).not.toHaveBeenCalled();
    });

    it("should use description for dedup if headline is missing", async () => {
      const ad = createMockAd({
        platformAdId: undefined,
        headline: undefined,
        description: "Fallback Description",
      });
      const adGroup = createMockAdGroup({ ads: [ad] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      mockAdapter.findExistingAd.mockResolvedValue(null);

      await service.syncCampaignSet("set-1");

      expect(mockAdapter.findExistingAd).toHaveBeenCalledWith(
        expect.any(String),
        "Fallback Description"
      );
    });

    it("should skip dedup if ad has no headline or description", async () => {
      const ad = createMockAd({
        platformAdId: undefined,
        headline: undefined,
        description: undefined,
      });
      const adGroup = createMockAdGroup({ ads: [ad] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      await service.syncCampaignSet("set-1");

      // Should NOT call findExistingAd when no name available
      expect(mockAdapter.findExistingAd).not.toHaveBeenCalled();
      // Should create directly
      expect(mockAdapter.createAd).toHaveBeenCalled();
    });
  });

  describe("Keyword Deduplication Recovery", () => {
    it("should recover keyword platform ID via dedup when not stored in DB", async () => {
      const keyword = createMockKeyword({ platformKeywordId: undefined });
      const adGroup = createMockAdGroup({ keywords: [keyword] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const recoveredId = "recovered_keyword_456";
      mockAdapter.findExistingKeyword.mockResolvedValue(recoveredId);
      mockAdapter.updateKeyword.mockResolvedValue({
        success: true,
        platformKeywordId: recoveredId,
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Keywords use text + matchType for dedup
      expect(mockAdapter.findExistingKeyword).toHaveBeenCalledWith(
        "new_adgroup_123",
        "test keyword",
        "broad"
      );
      expect(mockRepository.updateKeywordPlatformId).toHaveBeenCalledWith(
        "keyword-1",
        recoveredId
      );
      expect(mockAdapter.updateKeyword).toHaveBeenCalled();
      expect(mockAdapter.createKeyword).not.toHaveBeenCalled();
    });

    it("should create keyword when dedup finds nothing", async () => {
      const keyword = createMockKeyword({ platformKeywordId: undefined });
      const adGroup = createMockAdGroup({ keywords: [keyword] });
      const campaign = createMockCampaign({ adGroups: [adGroup] });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      mockAdapter.findExistingKeyword.mockResolvedValue(null);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      expect(mockAdapter.createKeyword).toHaveBeenCalled();
      expect(mockAdapter.updateKeyword).not.toHaveBeenCalled();
    });
  });

  describe("Full Sync Resume After Partial Failure", () => {
    it("should resume correctly after partial failure - campaign exists but children not", async () => {
      // Scenario: Previous sync created campaign but crashed before ad group was created
      const adGroup = createMockAdGroup({ platformAdGroupId: undefined });
      const campaign = createMockCampaign({
        platformCampaignId: undefined,
        adGroups: [adGroup],
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Campaign exists on platform (recovered via dedup)
      const recoveredCampaignId = "recovered_campaign_abc";
      mockAdapter.findExistingCampaign.mockResolvedValue(recoveredCampaignId);
      mockAdapter.updateCampaign.mockResolvedValue({
        success: true,
        platformCampaignId: recoveredCampaignId,
      });

      // Ad group does NOT exist (not recovered)
      mockAdapter.findExistingAdGroup.mockResolvedValue(null);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Campaign should be updated (recovered)
      expect(mockAdapter.updateCampaign).toHaveBeenCalled();
      expect(mockAdapter.createCampaign).not.toHaveBeenCalled();
      // Ad group should be created (not found)
      expect(mockAdapter.createAdGroup).toHaveBeenCalled();
    });

    it("should handle mixed recovery - some entities found, some not", async () => {
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

      // Campaign: found via dedup
      mockAdapter.findExistingCampaign.mockResolvedValue("recovered_campaign");
      mockAdapter.updateCampaign.mockResolvedValue({
        success: true,
        platformCampaignId: "recovered_campaign",
      });

      // Ad Group: found via dedup
      mockAdapter.findExistingAdGroup.mockResolvedValue("recovered_adgroup");
      mockAdapter.updateAdGroup.mockResolvedValue({
        success: true,
        platformAdGroupId: "recovered_adgroup",
      });

      // Ad: NOT found
      mockAdapter.findExistingAd.mockResolvedValue(null);

      // Keyword: NOT found
      mockAdapter.findExistingKeyword.mockResolvedValue(null);

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Campaign & AdGroup recovered
      expect(mockAdapter.updateCampaign).toHaveBeenCalled();
      expect(mockAdapter.updateAdGroup).toHaveBeenCalled();
      // Ad & Keyword created new
      expect(mockAdapter.createAd).toHaveBeenCalled();
      expect(mockAdapter.createKeyword).toHaveBeenCalled();
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

    it("should not create duplicates when retrying after crash with dedup", async () => {
      // Simulate crash scenario where entity was created but ID not saved
      const campaign = createMockCampaign({ platformCampaignId: undefined });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      // Dedup finds the existing entity
      mockAdapter.findExistingCampaign.mockResolvedValue("existing_on_platform");
      mockAdapter.updateCampaign.mockResolvedValue({
        success: true,
        platformCampaignId: "existing_on_platform",
      });

      const result = await service.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should NOT have created (would be duplicate)
      expect(mockAdapter.createCampaign).not.toHaveBeenCalled();
      // Should have updated existing
      expect(mockAdapter.updateCampaign).toHaveBeenCalled();
    });
  });

  describe("Backward Compatibility", () => {
    it("should work when adapter does not implement findExisting methods", async () => {
      // Create adapter without dedup methods
      const basicAdapter: CampaignSetPlatformAdapter = {
        platform: "basic",
        createCampaign: vi.fn().mockResolvedValue({
          success: true,
          platformCampaignId: "basic_campaign_123",
        }),
        updateCampaign: vi.fn().mockResolvedValue({
          success: true,
          platformCampaignId: "basic_campaign_123",
        }),
        pauseCampaign: vi.fn(),
        resumeCampaign: vi.fn(),
        deleteCampaign: vi.fn(),
        createAdGroup: vi.fn().mockResolvedValue({
          success: true,
          platformAdGroupId: "basic_adgroup_123",
        }),
        updateAdGroup: vi.fn().mockResolvedValue({
          success: true,
          platformAdGroupId: "basic_adgroup_123",
        }),
        deleteAdGroup: vi.fn(),
        createAd: vi.fn().mockResolvedValue({
          success: true,
          platformAdId: "basic_ad_123",
        }),
        updateAd: vi.fn().mockResolvedValue({
          success: true,
          platformAdId: "basic_ad_123",
        }),
        deleteAd: vi.fn(),
        createKeyword: vi.fn().mockResolvedValue({
          success: true,
          platformKeywordId: "basic_keyword_123",
        }),
        updateKeyword: vi.fn().mockResolvedValue({
          success: true,
          platformKeywordId: "basic_keyword_123",
        }),
        deleteKeyword: vi.fn(),
        // NOTE: No findExisting* methods - simulating old adapter
        findExistingCampaign: vi.fn().mockResolvedValue(null),
        findExistingAdGroup: vi.fn().mockResolvedValue(null),
        findExistingAd: vi.fn().mockResolvedValue(null),
      };

      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("basic", basicAdapter);
      const basicService = new DefaultCampaignSetSyncService(adapters, mockRepository);

      const campaign = createMockCampaign({
        platform: "basic",
        platformCampaignId: undefined,
      });
      const campaignSet = createMockCampaignSet({ campaigns: [campaign] });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);

      const result = await basicService.syncCampaignSet("set-1");

      expect(result.success).toBe(true);
      // Should work fine with create path
      expect(basicAdapter.createCampaign).toHaveBeenCalled();
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
      mockAdapter.updateCampaign.mockResolvedValue({
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
});
