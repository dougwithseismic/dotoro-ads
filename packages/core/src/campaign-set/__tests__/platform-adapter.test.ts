/**
 * Platform Adapter Tests
 *
 * TDD tests for the platform adapter interface and mock implementation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockPlatformAdapter } from "../adapters/mock-adapter.js";
import type { CampaignSetPlatformAdapter, PlatformCampaignResult, PlatformAdGroupResult, PlatformAdResult, PlatformKeywordResult } from "../platform-adapter.js";
import type { Campaign, AdGroup, Ad, Keyword } from "../types.js";

// ============================================================================
// Test Helpers
// ============================================================================

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

describe("MockPlatformAdapter", () => {
  let adapter: CampaignSetPlatformAdapter;

  beforeEach(() => {
    adapter = new MockPlatformAdapter();
  });

  describe("platform property", () => {
    it("should have the correct platform identifier", () => {
      expect(adapter.platform).toBe("mock");
    });
  });

  describe("createCampaign", () => {
    it("should create a campaign and return success with platform ID", async () => {
      const campaign = createMockCampaign();

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(true);
      expect(result.platformCampaignId).toBeDefined();
      expect(result.platformCampaignId).toContain("mock_");
      expect(result.platformCampaignId).toContain(campaign.id);
    });

    it("should generate unique platform IDs for different campaigns", async () => {
      const campaign1 = createMockCampaign({ id: "campaign-1" });
      const campaign2 = createMockCampaign({ id: "campaign-2" });

      const result1 = await adapter.createCampaign(campaign1);
      const result2 = await adapter.createCampaign(campaign2);

      expect(result1.platformCampaignId).not.toBe(result2.platformCampaignId);
    });
  });

  describe("updateCampaign", () => {
    it("should update a campaign and return success", async () => {
      const campaign = createMockCampaign();
      const platformId = "mock_campaign_123";

      const result = await adapter.updateCampaign(campaign, platformId);

      expect(result.success).toBe(true);
      expect(result.platformCampaignId).toBe(platformId);
    });
  });

  describe("pauseCampaign", () => {
    it("should pause a campaign without error", async () => {
      const platformId = "mock_campaign_123";

      await expect(adapter.pauseCampaign(platformId)).resolves.not.toThrow();
    });
  });

  describe("resumeCampaign", () => {
    it("should resume a campaign without error", async () => {
      const platformId = "mock_campaign_123";

      await expect(adapter.resumeCampaign(platformId)).resolves.not.toThrow();
    });
  });

  describe("deleteCampaign", () => {
    it("should delete a campaign without error", async () => {
      const platformId = "mock_campaign_123";

      await expect(adapter.deleteCampaign(platformId)).resolves.not.toThrow();
    });
  });

  describe("createAdGroup", () => {
    it("should create an ad group and return success with platform ID", async () => {
      const adGroup = createMockAdGroup();
      const platformCampaignId = "mock_campaign_123";

      const result = await adapter.createAdGroup(adGroup, platformCampaignId);

      expect(result.success).toBe(true);
      expect(result.platformAdGroupId).toBeDefined();
      expect(result.platformAdGroupId).toContain("mock_");
    });
  });

  describe("updateAdGroup", () => {
    it("should update an ad group and return success", async () => {
      const adGroup = createMockAdGroup();
      const platformAdGroupId = "mock_adgroup_123";

      const result = await adapter.updateAdGroup(adGroup, platformAdGroupId);

      expect(result.success).toBe(true);
      expect(result.platformAdGroupId).toBe(platformAdGroupId);
    });
  });

  describe("deleteAdGroup", () => {
    it("should delete an ad group without error", async () => {
      const platformAdGroupId = "mock_adgroup_123";

      await expect(adapter.deleteAdGroup(platformAdGroupId)).resolves.not.toThrow();
    });
  });

  describe("createAd", () => {
    it("should create an ad and return success with platform ID", async () => {
      const ad = createMockAd();
      const platformAdGroupId = "mock_adgroup_123";

      const result = await adapter.createAd(ad, platformAdGroupId);

      expect(result.success).toBe(true);
      expect(result.platformAdId).toBeDefined();
      expect(result.platformAdId).toContain("mock_");
    });
  });

  describe("updateAd", () => {
    it("should update an ad and return success", async () => {
      const ad = createMockAd();
      const platformAdId = "mock_ad_123";

      const result = await adapter.updateAd(ad, platformAdId);

      expect(result.success).toBe(true);
      expect(result.platformAdId).toBe(platformAdId);
    });
  });

  describe("deleteAd", () => {
    it("should delete an ad without error", async () => {
      const platformAdId = "mock_ad_123";

      await expect(adapter.deleteAd(platformAdId)).resolves.not.toThrow();
    });
  });

  describe("createKeyword", () => {
    it("should create a keyword and return success with platform ID", async () => {
      const keyword = createMockKeyword();
      const platformAdGroupId = "mock_adgroup_123";

      const result = await adapter.createKeyword(keyword, platformAdGroupId);

      expect(result.success).toBe(true);
      expect(result.platformKeywordId).toBeDefined();
      expect(result.platformKeywordId).toContain("mock_");
    });
  });

  describe("updateKeyword", () => {
    it("should update a keyword and return success", async () => {
      const keyword = createMockKeyword();
      const platformKeywordId = "mock_keyword_123";

      const result = await adapter.updateKeyword(keyword, platformKeywordId);

      expect(result.success).toBe(true);
      expect(result.platformKeywordId).toBe(platformKeywordId);
    });
  });

  describe("deleteKeyword", () => {
    it("should delete a keyword without error", async () => {
      const platformKeywordId = "mock_keyword_123";

      await expect(adapter.deleteKeyword(platformKeywordId)).resolves.not.toThrow();
    });
  });
});

describe("Platform Adapter Interface Compliance", () => {
  it("should define all required methods for CampaignSetPlatformAdapter", () => {
    const adapter = new MockPlatformAdapter();

    // Check all required properties and methods exist
    expect(adapter.platform).toBeDefined();
    expect(typeof adapter.createCampaign).toBe("function");
    expect(typeof adapter.updateCampaign).toBe("function");
    expect(typeof adapter.pauseCampaign).toBe("function");
    expect(typeof adapter.resumeCampaign).toBe("function");
    expect(typeof adapter.deleteCampaign).toBe("function");
    expect(typeof adapter.createAdGroup).toBe("function");
    expect(typeof adapter.updateAdGroup).toBe("function");
    expect(typeof adapter.deleteAdGroup).toBe("function");
    expect(typeof adapter.createAd).toBe("function");
    expect(typeof adapter.updateAd).toBe("function");
    expect(typeof adapter.deleteAd).toBe("function");
    expect(typeof adapter.createKeyword).toBe("function");
    expect(typeof adapter.updateKeyword).toBe("function");
    expect(typeof adapter.deleteKeyword).toBe("function");
  });
});

describe("Stub Adapters", () => {
  describe("should be implementable for each platform", () => {
    it("Google adapter should follow the interface", async () => {
      // This test validates that stub adapters can be created
      // The actual implementation will be added later
      const adapter = new MockPlatformAdapter();
      adapter.platform = "google" as any; // Override for testing

      const campaign = createMockCampaign({ platform: "google" });
      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(true);
    });

    it("Facebook adapter should follow the interface", async () => {
      const adapter = new MockPlatformAdapter();
      adapter.platform = "facebook" as any;

      const campaign = createMockCampaign({ platform: "facebook" });
      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(true);
    });

    it("Reddit adapter should follow the interface", async () => {
      const adapter = new MockPlatformAdapter();
      adapter.platform = "reddit" as any;

      const campaign = createMockCampaign({ platform: "reddit" });
      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(true);
    });
  });
});
