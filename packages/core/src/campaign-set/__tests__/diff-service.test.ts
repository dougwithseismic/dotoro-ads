/**
 * Diff Sync Service Tests
 *
 * TDD tests for the diff-based sync service that handles incremental
 * updates to campaign sets.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DiffSyncService,
  DefaultDiffSyncService,
  type CampaignSetDiff,
  type DiffSyncResult,
  type CampaignUpdate,
  type AdGroupWithCampaign,
  type AdWithAdGroup,
  type KeywordWithAdGroup,
} from "../diff-service.js";
import type { CampaignSetPlatformAdapter } from "../platform-adapter.js";
import type {
  CampaignSet,
  CampaignSetConfig,
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
    deleteCampaign: vi.fn().mockResolvedValue(undefined),
    deleteAdGroup: vi.fn().mockResolvedValue(undefined),
    deleteAd: vi.fn().mockResolvedValue(undefined),
    deleteKeyword: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockCampaignSet(overrides: Partial<CampaignSet> = {}): CampaignSet {
  const now = new Date();
  return {
    id: "set-1",
    userId: "user-1",
    name: "Test Campaign Set",
    description: "A test campaign set",
    status: "active",
    syncStatus: "synced",
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

function createMockConfig(overrides: Partial<CampaignSetConfig> = {}): CampaignSetConfig {
  const now = new Date();
  return {
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
    status: "active",
    syncStatus: "synced",
    platformCampaignId: "platform_campaign_1",
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
    platformAdGroupId: "platform_adgroup_1",
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
    platformAdId: "platform_ad_1",
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
    platformKeywordId: "platform_keyword_1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("DiffSyncService", () => {
  let service: DiffSyncService;

  beforeEach(() => {
    service = new DefaultDiffSyncService();
  });

  describe("calculateDiff", () => {
    describe("campaign changes", () => {
      it("should detect campaigns to add", () => {
        const currentSet = createMockCampaignSet({
          campaigns: [],
        });
        const newConfig = createMockConfig({
          campaignCount: 1,
        });

        // New config would generate 1 campaign, current has 0
        const diff = service.calculateDiff(currentSet, newConfig, {
          generatedCampaigns: [createMockCampaign({ id: "new-campaign" })],
        });

        expect(diff.campaignsToAdd).toHaveLength(1);
        expect(diff.campaignsToAdd[0].id).toBe("new-campaign");
      });

      it("should detect campaigns to update", () => {
        const existingCampaign = createMockCampaign({
          id: "campaign-1",
          name: "Old Name",
        });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });
        const updatedCampaign = createMockCampaign({
          id: "campaign-1",
          name: "New Name",
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [updatedCampaign],
        });

        expect(diff.campaignsToUpdate).toHaveLength(1);
        expect(diff.campaignsToUpdate[0].campaign.name).toBe("New Name");
        expect(diff.campaignsToUpdate[0].changes).toContain("name");
      });

      it("should detect campaigns to remove", () => {
        const existingCampaign = createMockCampaign({ id: "campaign-1" });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        // New config generates 0 campaigns
        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [],
        });

        expect(diff.campaignsToRemove).toHaveLength(1);
        expect(diff.campaignsToRemove[0]).toBe("campaign-1");
      });

      it("should not flag unchanged campaigns", () => {
        const existingCampaign = createMockCampaign({ id: "campaign-1" });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [existingCampaign],
        });

        expect(diff.campaignsToAdd).toHaveLength(0);
        expect(diff.campaignsToUpdate).toHaveLength(0);
        expect(diff.campaignsToRemove).toHaveLength(0);
      });
    });

    describe("ad group changes", () => {
      it("should detect ad groups to add", () => {
        const existingCampaign = createMockCampaign({
          adGroups: [],
        });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        const newAdGroup = createMockAdGroup({ id: "new-adgroup" });
        const updatedCampaign = createMockCampaign({
          adGroups: [newAdGroup],
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [updatedCampaign],
        });

        expect(diff.adGroupsToAdd).toHaveLength(1);
        expect(diff.adGroupsToAdd[0].adGroup.id).toBe("new-adgroup");
        expect(diff.adGroupsToAdd[0].campaignId).toBe("campaign-1");
      });

      it("should detect ad groups to remove", () => {
        const existingAdGroup = createMockAdGroup({ id: "adgroup-1" });
        const existingCampaign = createMockCampaign({
          adGroups: [existingAdGroup],
        });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        const updatedCampaign = createMockCampaign({
          adGroups: [],
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [updatedCampaign],
        });

        expect(diff.adGroupsToRemove).toHaveLength(1);
        expect(diff.adGroupsToRemove[0]).toBe("adgroup-1");
      });
    });

    describe("ad changes", () => {
      it("should detect ads to add", () => {
        const existingAdGroup = createMockAdGroup({ ads: [] });
        const existingCampaign = createMockCampaign({
          adGroups: [existingAdGroup],
        });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        const newAd = createMockAd({ id: "new-ad" });
        const updatedAdGroup = createMockAdGroup({ ads: [newAd] });
        const updatedCampaign = createMockCampaign({
          adGroups: [updatedAdGroup],
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [updatedCampaign],
        });

        expect(diff.adsToAdd).toHaveLength(1);
        expect(diff.adsToAdd[0].ad.id).toBe("new-ad");
        expect(diff.adsToAdd[0].adGroupId).toBe("adgroup-1");
      });

      it("should detect ads to remove", () => {
        const existingAd = createMockAd({ id: "ad-1" });
        const existingAdGroup = createMockAdGroup({ ads: [existingAd] });
        const existingCampaign = createMockCampaign({
          adGroups: [existingAdGroup],
        });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        const updatedAdGroup = createMockAdGroup({ ads: [] });
        const updatedCampaign = createMockCampaign({
          adGroups: [updatedAdGroup],
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [updatedCampaign],
        });

        expect(diff.adsToRemove).toHaveLength(1);
        expect(diff.adsToRemove[0]).toBe("ad-1");
      });
    });

    describe("keyword changes", () => {
      it("should detect keywords to add", () => {
        const existingAdGroup = createMockAdGroup({ keywords: [] });
        const existingCampaign = createMockCampaign({
          adGroups: [existingAdGroup],
        });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        const newKeyword = createMockKeyword({ id: "new-keyword" });
        const updatedAdGroup = createMockAdGroup({ keywords: [newKeyword] });
        const updatedCampaign = createMockCampaign({
          adGroups: [updatedAdGroup],
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [updatedCampaign],
        });

        expect(diff.keywordsToAdd).toHaveLength(1);
        expect(diff.keywordsToAdd[0].keyword.id).toBe("new-keyword");
        expect(diff.keywordsToAdd[0].adGroupId).toBe("adgroup-1");
      });

      it("should detect keywords to remove", () => {
        const existingKeyword = createMockKeyword({ id: "keyword-1" });
        const existingAdGroup = createMockAdGroup({ keywords: [existingKeyword] });
        const existingCampaign = createMockCampaign({
          adGroups: [existingAdGroup],
        });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        const updatedAdGroup = createMockAdGroup({ keywords: [] });
        const updatedCampaign = createMockCampaign({
          adGroups: [updatedAdGroup],
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [updatedCampaign],
        });

        expect(diff.keywordsToRemove).toHaveLength(1);
        expect(diff.keywordsToRemove[0]).toBe("keyword-1");
      });
    });

    describe("complex scenarios", () => {
      it("should handle mixed add, update, and remove operations", () => {
        const existingCampaign1 = createMockCampaign({
          id: "campaign-1",
          name: "Campaign 1 Old",
        });
        const existingCampaign2 = createMockCampaign({
          id: "campaign-2",
          name: "Campaign 2",
        });
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign1, existingCampaign2],
        });

        const updatedCampaign1 = createMockCampaign({
          id: "campaign-1",
          name: "Campaign 1 New",
        });
        const newCampaign3 = createMockCampaign({
          id: "campaign-3",
          name: "Campaign 3",
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [updatedCampaign1, newCampaign3],
        });

        expect(diff.campaignsToAdd).toHaveLength(1);
        expect(diff.campaignsToAdd[0].id).toBe("campaign-3");

        expect(diff.campaignsToUpdate).toHaveLength(1);
        expect(diff.campaignsToUpdate[0].campaign.id).toBe("campaign-1");

        expect(diff.campaignsToRemove).toHaveLength(1);
        expect(diff.campaignsToRemove[0]).toBe("campaign-2");
      });

      it("should handle empty current set", () => {
        const currentSet = createMockCampaignSet({ campaigns: [] });
        const newCampaign = createMockCampaign();

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [newCampaign],
        });

        expect(diff.campaignsToAdd).toHaveLength(1);
        expect(diff.campaignsToUpdate).toHaveLength(0);
        expect(diff.campaignsToRemove).toHaveLength(0);
      });

      it("should handle empty new config", () => {
        const existingCampaign = createMockCampaign();
        const currentSet = createMockCampaignSet({
          campaigns: [existingCampaign],
        });

        const diff = service.calculateDiff(currentSet, createMockConfig(), {
          generatedCampaigns: [],
        });

        expect(diff.campaignsToAdd).toHaveLength(0);
        expect(diff.campaignsToUpdate).toHaveLength(0);
        expect(diff.campaignsToRemove).toHaveLength(1);
      });
    });
  });

  describe("applyDiff", () => {
    let mockAdapter: CampaignSetPlatformAdapter;
    let mockRepository: ReturnType<typeof createMockRepository>;
    let applyService: DefaultDiffSyncService;

    beforeEach(() => {
      mockAdapter = createMockAdapter();
      mockRepository = createMockRepository();
      const adapters = new Map<string, CampaignSetPlatformAdapter>();
      adapters.set("google", mockAdapter);
      adapters.set("mock", mockAdapter);
      applyService = new DefaultDiffSyncService(adapters, mockRepository);
    });

    it("should apply an empty diff without errors", async () => {
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(
        createMockCampaignSet()
      );

      const emptyDiff: CampaignSetDiff = {
        campaignsToAdd: [],
        campaignsToUpdate: [],
        campaignsToRemove: [],
        adGroupsToAdd: [],
        adGroupsToRemove: [],
        adsToAdd: [],
        adsToRemove: [],
        keywordsToAdd: [],
        keywordsToRemove: [],
      };

      const result = await applyService.applyDiff("set-1", emptyDiff);

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.removed).toBe(0);
    });

    it("should create new campaigns", async () => {
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(
        createMockCampaignSet()
      );

      const diff: CampaignSetDiff = {
        campaignsToAdd: [createMockCampaign({ id: "new-campaign" })],
        campaignsToUpdate: [],
        campaignsToRemove: [],
        adGroupsToAdd: [],
        adGroupsToRemove: [],
        adsToAdd: [],
        adsToRemove: [],
        keywordsToAdd: [],
        keywordsToRemove: [],
      };

      const result = await applyService.applyDiff("set-1", diff);

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(mockAdapter.createCampaign).toHaveBeenCalledTimes(1);
    });

    it("should update existing campaigns", async () => {
      // Include the existing campaign with a platformCampaignId so the update can find it
      const existingCampaign = createMockCampaign({
        id: "campaign-1",
        platformCampaignId: "platform_campaign_1",
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(
        createMockCampaignSet({ campaigns: [existingCampaign] })
      );

      const diff: CampaignSetDiff = {
        campaignsToAdd: [],
        campaignsToUpdate: [
          {
            campaign: createMockCampaign({ id: "campaign-1", name: "Updated Name" }),
            changes: ["name"],
          },
        ],
        campaignsToRemove: [],
        adGroupsToAdd: [],
        adGroupsToRemove: [],
        adsToAdd: [],
        adsToRemove: [],
        keywordsToAdd: [],
        keywordsToRemove: [],
      };

      const result = await applyService.applyDiff("set-1", diff);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
      expect(mockAdapter.updateCampaign).toHaveBeenCalledTimes(1);
    });

    it("should delete campaigns", async () => {
      const existingCampaign = createMockCampaign({
        platformCampaignId: "platform_1",
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(
        createMockCampaignSet({ campaigns: [existingCampaign] })
      );

      const diff: CampaignSetDiff = {
        campaignsToAdd: [],
        campaignsToUpdate: [],
        campaignsToRemove: ["campaign-1"],
        adGroupsToAdd: [],
        adGroupsToRemove: [],
        adsToAdd: [],
        adsToRemove: [],
        keywordsToAdd: [],
        keywordsToRemove: [],
      };

      const result = await applyService.applyDiff("set-1", diff);

      expect(result.success).toBe(true);
      expect(result.removed).toBe(1);
      expect(mockAdapter.deleteCampaign).toHaveBeenCalledWith("platform_1");
    });

    it("should handle errors during apply", async () => {
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(
        createMockCampaignSet()
      );
      (mockAdapter.createCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Creation failed",
      });

      const diff: CampaignSetDiff = {
        campaignsToAdd: [createMockCampaign()],
        campaignsToUpdate: [],
        campaignsToRemove: [],
        adGroupsToAdd: [],
        adGroupsToRemove: [],
        adsToAdd: [],
        adsToRemove: [],
        keywordsToAdd: [],
        keywordsToRemove: [],
      };

      const result = await applyService.applyDiff("set-1", diff);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it("should return error when campaign set not found", async () => {
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(null);

      const diff: CampaignSetDiff = {
        campaignsToAdd: [],
        campaignsToUpdate: [],
        campaignsToRemove: [],
        adGroupsToAdd: [],
        adGroupsToRemove: [],
        adsToAdd: [],
        adsToRemove: [],
        keywordsToAdd: [],
        keywordsToRemove: [],
      };

      const result = await applyService.applyDiff("non-existent", diff);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("CAMPAIGN_SET_NOT_FOUND");
    });
  });
});

describe("Diff Calculation Edge Cases", () => {
  let service: DiffSyncService;

  beforeEach(() => {
    service = new DefaultDiffSyncService();
  });

  it("should detect status changes as updates", () => {
    const existingCampaign = createMockCampaign({
      id: "campaign-1",
      status: "active",
    });
    const currentSet = createMockCampaignSet({
      campaigns: [existingCampaign],
    });

    const updatedCampaign = createMockCampaign({
      id: "campaign-1",
      status: "paused",
    });

    const diff = service.calculateDiff(currentSet, createMockConfig(), {
      generatedCampaigns: [updatedCampaign],
    });

    expect(diff.campaignsToUpdate).toHaveLength(1);
    expect(diff.campaignsToUpdate[0].changes).toContain("status");
  });

  it("should detect budget changes as updates", () => {
    const existingCampaign = createMockCampaign({
      id: "campaign-1",
      budget: { type: "daily", amount: 50, currency: "USD" },
    });
    const currentSet = createMockCampaignSet({
      campaigns: [existingCampaign],
    });

    const updatedCampaign = createMockCampaign({
      id: "campaign-1",
      budget: { type: "daily", amount: 100, currency: "USD" },
    });

    const diff = service.calculateDiff(currentSet, createMockConfig(), {
      generatedCampaigns: [updatedCampaign],
    });

    expect(diff.campaignsToUpdate).toHaveLength(1);
    expect(diff.campaignsToUpdate[0].changes).toContain("budget");
  });

  it("should match campaigns by ID, not by name", () => {
    const existingCampaign = createMockCampaign({
      id: "campaign-1",
      name: "Original Name",
    });
    const currentSet = createMockCampaignSet({
      campaigns: [existingCampaign],
    });

    // Same ID, different name = update, not add+remove
    const renamedCampaign = createMockCampaign({
      id: "campaign-1",
      name: "New Name",
    });

    const diff = service.calculateDiff(currentSet, createMockConfig(), {
      generatedCampaigns: [renamedCampaign],
    });

    expect(diff.campaignsToAdd).toHaveLength(0);
    expect(diff.campaignsToRemove).toHaveLength(0);
    expect(diff.campaignsToUpdate).toHaveLength(1);
  });
});

describe("Adapter Exception Handling in applyDiff", () => {
  let mockAdapter: CampaignSetPlatformAdapter;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let applyService: DefaultDiffSyncService;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    mockRepository = createMockRepository();
    const adapters = new Map<string, CampaignSetPlatformAdapter>();
    adapters.set("google", mockAdapter);
    adapters.set("mock", mockAdapter);
    applyService = new DefaultDiffSyncService(adapters, mockRepository);
  });

  it("should handle createCampaign throwing an exception", async () => {
    mockRepository.getCampaignSetWithRelations.mockResolvedValue(
      createMockCampaignSet()
    );
    (mockAdapter.createCampaign as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network timeout during campaign creation")
    );

    const diff: CampaignSetDiff = {
      campaignsToAdd: [createMockCampaign()],
      campaignsToUpdate: [],
      campaignsToRemove: [],
      adGroupsToAdd: [],
      adGroupsToRemove: [],
      adsToAdd: [],
      adsToRemove: [],
      keywordsToAdd: [],
      keywordsToRemove: [],
    };

    const result = await applyService.applyDiff("set-1", diff);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("CREATE_EXCEPTION");
    expect(result.errors[0].message).toContain("Network timeout");
  });

  it("should handle updateCampaign throwing an exception", async () => {
    const existingCampaign = createMockCampaign({
      id: "campaign-1",
      platformCampaignId: "platform_campaign_1",
    });
    mockRepository.getCampaignSetWithRelations.mockResolvedValue(
      createMockCampaignSet({ campaigns: [existingCampaign] })
    );
    (mockAdapter.updateCampaign as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("API rate limit exceeded")
    );

    const diff: CampaignSetDiff = {
      campaignsToAdd: [],
      campaignsToUpdate: [
        {
          campaign: createMockCampaign({ id: "campaign-1", name: "Updated Name" }),
          changes: ["name"],
        },
      ],
      campaignsToRemove: [],
      adGroupsToAdd: [],
      adGroupsToRemove: [],
      adsToAdd: [],
      adsToRemove: [],
      keywordsToAdd: [],
      keywordsToRemove: [],
    };

    const result = await applyService.applyDiff("set-1", diff);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("UPDATE_EXCEPTION");
    expect(result.errors[0].message).toContain("API rate limit exceeded");
  });

  it("should handle deleteCampaign throwing an exception", async () => {
    const existingCampaign = createMockCampaign({
      id: "campaign-1",
      platformCampaignId: "platform_campaign_1",
    });
    mockRepository.getCampaignSetWithRelations.mockResolvedValue(
      createMockCampaignSet({ campaigns: [existingCampaign] })
    );
    (mockAdapter.deleteCampaign as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Permission denied")
    );

    const diff: CampaignSetDiff = {
      campaignsToAdd: [],
      campaignsToUpdate: [],
      campaignsToRemove: ["campaign-1"],
      adGroupsToAdd: [],
      adGroupsToRemove: [],
      adsToAdd: [],
      adsToRemove: [],
      keywordsToAdd: [],
      keywordsToRemove: [],
    };

    const result = await applyService.applyDiff("set-1", diff);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("DELETE_FAILED");
    expect(result.errors[0].message).toContain("Permission denied");
  });

  it("should handle non-Error exceptions gracefully", async () => {
    mockRepository.getCampaignSetWithRelations.mockResolvedValue(
      createMockCampaignSet()
    );
    // Simulate throwing a non-Error object
    (mockAdapter.createCampaign as ReturnType<typeof vi.fn>).mockRejectedValue(
      "String error message"
    );

    const diff: CampaignSetDiff = {
      campaignsToAdd: [createMockCampaign()],
      campaignsToUpdate: [],
      campaignsToRemove: [],
      adGroupsToAdd: [],
      adGroupsToRemove: [],
      adsToAdd: [],
      adsToRemove: [],
      keywordsToAdd: [],
      keywordsToRemove: [],
    };

    const result = await applyService.applyDiff("set-1", diff);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("CREATE_EXCEPTION");
    expect(result.errors[0].message).toBe("Unknown error");
  });

  it("should continue processing after an exception and report all errors", async () => {
    const campaign1 = createMockCampaign({ id: "campaign-1" });
    const campaign2 = createMockCampaign({ id: "campaign-2" });
    mockRepository.getCampaignSetWithRelations.mockResolvedValue(
      createMockCampaignSet()
    );
    (mockAdapter.createCampaign as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("First campaign failed"))
      .mockRejectedValueOnce(new Error("Second campaign failed"));

    const diff: CampaignSetDiff = {
      campaignsToAdd: [campaign1, campaign2],
      campaignsToUpdate: [],
      campaignsToRemove: [],
      adGroupsToAdd: [],
      adGroupsToRemove: [],
      adsToAdd: [],
      adsToRemove: [],
      keywordsToAdd: [],
      keywordsToRemove: [],
    };

    const result = await applyService.applyDiff("set-1", diff);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].message).toContain("First campaign failed");
    expect(result.errors[1].message).toContain("Second campaign failed");
  });

  it("should handle adapter returning error object instead of throwing", async () => {
    mockRepository.getCampaignSetWithRelations.mockResolvedValue(
      createMockCampaignSet()
    );
    (mockAdapter.createCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Validation failed: budget too low",
    });

    const diff: CampaignSetDiff = {
      campaignsToAdd: [createMockCampaign()],
      campaignsToUpdate: [],
      campaignsToRemove: [],
      adGroupsToAdd: [],
      adGroupsToRemove: [],
      adsToAdd: [],
      adsToRemove: [],
      keywordsToAdd: [],
      keywordsToRemove: [],
    };

    const result = await applyService.applyDiff("set-1", diff);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("CREATE_FAILED");
    expect(result.errors[0].message).toContain("Validation failed");
  });

  it("should handle missing adapter for platform", async () => {
    mockRepository.getCampaignSetWithRelations.mockResolvedValue(
      createMockCampaignSet()
    );
    // Create a campaign for a platform that has no adapter
    const unknownPlatformCampaign = createMockCampaign({
      platform: "unknown_platform" as any,
    });

    const diff: CampaignSetDiff = {
      campaignsToAdd: [unknownPlatformCampaign],
      campaignsToUpdate: [],
      campaignsToRemove: [],
      adGroupsToAdd: [],
      adGroupsToRemove: [],
      adsToAdd: [],
      adsToRemove: [],
      keywordsToAdd: [],
      keywordsToRemove: [],
    };

    const result = await applyService.applyDiff("set-1", diff);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("NO_ADAPTER");
    expect(result.errors[0].message).toContain("unknown_platform");
  });
});
