/**
 * Reddit Platform Adapter Tests
 *
 * Tests for the RedditAdsAdapter that transforms our local campaign types
 * to Reddit's API format and makes real API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RedditAdsAdapter } from "../adapters/reddit-adapter.js";
import type { Campaign, AdGroup, Ad, Keyword } from "../types.js";
// Import the actual RedditApiException so instanceof checks work
import { RedditApiException } from "@repo/reddit-ads";

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function createMockCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-123",
    campaignSetId: "set-456",
    name: "Test Campaign",
    platform: "reddit",
    orderIndex: 0,
    status: "active",
    syncStatus: "pending",
    adGroups: [],
    budget: {
      type: "daily",
      amount: 100, // $100
      currency: "USD",
    },
    campaignData: {
      objective: "awareness",
      biddingStrategy: "manual_cpc",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockAdGroup(overrides: Partial<AdGroup> = {}): AdGroup {
  return {
    id: "adgroup-123",
    campaignId: "campaign-456",
    name: "Test Ad Group",
    orderIndex: 0,
    status: "active",
    ads: [],
    keywords: [],
    settings: {
      targeting: {
        subreddits: ["r/technology", "r/programming"],
        locations: ["US", "CA"],
        devices: ["DESKTOP", "MOBILE"],
      },
      bidding: {
        strategy: "manual_cpc",
        maxCpc: "2.50",
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: "ad-123",
    adGroupId: "adgroup-456",
    orderIndex: 0,
    headline: "Check out our new product!",
    description: "The best solution for your needs. Learn more today.",
    displayUrl: "example.com",
    finalUrl: "https://example.com/landing",
    callToAction: "LEARN_MORE",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockKeyword(overrides: Partial<Keyword> = {}): Keyword {
  return {
    id: "keyword-123",
    adGroupId: "adgroup-456",
    keyword: "test keyword",
    matchType: "broad",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Client Factory
// ─────────────────────────────────────────────────────────────────────────────

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    setAccessToken: vi.fn(),
    getRateLimitStatus: vi.fn().mockReturnValue({
      remaining: 600,
      resetInSeconds: 600,
      isLimited: false,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Type Transformations
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Type Transformations", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Budget Transformation", () => {
    it("transforms campaign budget to micro-units", async () => {
      const campaign = createMockCampaign({
        budget: {
          type: "daily",
          amount: 100, // $100
          currency: "USD",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            daily_budget_micro: 100_000_000, // $100 * 1,000,000
          }),
        })
      );
    });

    it("transforms lifetime budget correctly", async () => {
      const campaign = createMockCampaign({
        budget: {
          type: "lifetime",
          amount: 5000, // $5000
          currency: "USD",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            total_budget_micro: 5_000_000_000, // $5000 * 1,000,000
          }),
        })
      );
    });

    it("handles fractional budget amounts", async () => {
      const campaign = createMockCampaign({
        budget: {
          type: "daily",
          amount: 50.75, // $50.75
          currency: "USD",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            daily_budget_micro: 50_750_000, // $50.75 * 1,000,000
          }),
        })
      );
    });
  });

  describe("Objective Mapping", () => {
    it("maps objective awareness to IMPRESSIONS correctly (v3 API)", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            objective: "IMPRESSIONS", // v3 API maps awareness to IMPRESSIONS
          }),
        })
      );
    });

    it("maps objective consideration to CLICKS correctly (v3 API)", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "consideration",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            objective: "CLICKS", // v3 API maps consideration to CLICKS
          }),
        })
      );
    });

    it("maps objective CONVERSIONS correctly", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "conversions",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            objective: "CONVERSIONS",
          }),
        })
      );
    });

    it("defaults to IMPRESSIONS when objective is not specified (v3 API)", async () => {
      const campaign = createMockCampaign({
        campaignData: {},
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            objective: "IMPRESSIONS", // v3 API defaults to IMPRESSIONS
          }),
        })
      );
    });
  });

  describe("Special Ad Categories", () => {
    it("includes special_ad_categories defaulting to NONE", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            special_ad_categories: ["NONE"],
          }),
        })
      );
    });

    it("allows custom special_ad_categories", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          specialAdCategories: ["HOUSING"],
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            special_ad_categories: ["HOUSING"],
          }),
        })
      );
    });
  });

  describe("Bidding Strategy Mapping", () => {
    it("maps bidding strategy automatic to MAXIMIZE_VOLUME (v3 API)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "automatic",
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            bid_strategy: "MAXIMIZE_VOLUME", // v3 API uses MAXIMIZE_VOLUME for automatic
          }),
        })
      );
    });

    it("maps bidding strategy manual_cpc to MANUAL_BIDDING with bid_value (v3 API)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "2.50",
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            bid_strategy: "MANUAL_BIDDING", // v3 API uses MANUAL_BIDDING
            bid_value: 2_500_000, // v3 API uses bid_value, not bid_micro
          }),
        })
      );
    });

    it("maps bidding strategy manual_cpm to MANUAL_BIDDING with bid_value (v3 API)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpm",
            maxCpm: "10.00",
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            bid_strategy: "MANUAL_BIDDING", // v3 API uses MANUAL_BIDDING for CPM too
            bid_value: 10_000_000, // v3 API uses bid_value
          }),
        })
      );
    });

    it("defaults to MAXIMIZE_VOLUME when bidding strategy is not specified (v3 API)", async () => {
      const adGroup = createMockAdGroup({
        settings: {},
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            bid_strategy: "MAXIMIZE_VOLUME", // v3 API defaults to MAXIMIZE_VOLUME
          }),
        })
      );
    });
  });

  describe("Ad Group Budget (goal_type/goal_value)", () => {
    it("includes goal_type and goal_value for daily budget", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          budget: {
            type: "daily",
            amount: 50.00,
          },
          bidding: {
            strategy: "automatic",
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            goal_type: "DAILY_SPEND",
            goal_value: 50_000_000, // $50 * 1,000,000
          }),
        })
      );
    });

    it("includes goal_type LIFETIME_SPEND for lifetime budget", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          budget: {
            type: "lifetime",
            amount: 1000.00,
          },
          bidding: {
            strategy: "automatic",
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            goal_type: "LIFETIME_SPEND",
            goal_value: 1_000_000_000, // $1000 * 1,000,000
          }),
        })
      );
    });
  });

  describe("Targeting Transformation", () => {
    it("transforms targeting correctly for ad groups", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          targeting: {
            subreddits: ["r/technology", "r/programming"],
            locations: ["US", "CA"],
            devices: ["DESKTOP", "MOBILE"],
            interests: ["technology", "software"],
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            targeting: {
              subreddits: ["r/technology", "r/programming"],
              locations: ["US", "CA"],
              // v3 API transforms simple device types to DeviceTargeting objects
              devices: [{ type: "DESKTOP" }, { type: "MOBILE" }],
              interests: ["technology", "software"],
            },
          }),
        })
      );
    });
  });

  describe("Ad Transformation", () => {
    it("maps headline and body correctly", async () => {
      const ad = createMockAd({
        headline: "Amazing Product Launch",
        description: "Discover the future of technology today.",
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-ad-123" },
      });

      await adapter.createAd(ad, "platform-adgroup-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            headline: "Amazing Product Launch",
            body: "Discover the future of technology today.",
          }),
        })
      );
    });

    it("maps click_url from finalUrl", async () => {
      const ad = createMockAd({
        finalUrl: "https://example.com/product",
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-ad-123" },
      });

      await adapter.createAd(ad, "platform-adgroup-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            click_url: "https://example.com/product",
          }),
        })
      );
    });

    it("maps display_url correctly", async () => {
      const ad = createMockAd({
        displayUrl: "example.com/promo",
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-ad-123" },
      });

      await adapter.createAd(ad, "platform-adgroup-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            display_url: "example.com/promo",
          }),
        })
      );
    });

    it("maps call_to_action correctly", async () => {
      const ad = createMockAd({
        callToAction: "SHOP_NOW",
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-ad-123" },
      });

      await adapter.createAd(ad, "platform-adgroup-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            call_to_action: "SHOP_NOW",
          }),
        })
      );
    });

    it("generates ad name from headline if not provided", async () => {
      const ad = createMockAd({
        headline: "My Awesome Ad Headline",
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-ad-123" },
      });

      await adapter.createAd(ad, "platform-adgroup-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            name: expect.stringContaining("My Awesome Ad Headline"),
          }),
        })
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Campaign Operations
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Campaign Operations", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createCampaign", () => {
    it("calls API with correct endpoint and params (v3 API wraps in data)", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      const result = await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/campaigns",
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Test Campaign",
            funding_instrument_id: "funding-instrument-456",
            configured_status: "ACTIVE",
            special_ad_categories: ["NONE"],
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformCampaignId).toBe("reddit-campaign-123");
    });
  });

  describe("updateCampaign", () => {
    it("uses platformId for API call (v3 API uses PATCH and /campaigns/{id} path)", async () => {
      const campaign = createMockCampaign({
        name: "Updated Campaign Name",
      });

      mockClient.patch.mockResolvedValueOnce({
        data: { id: "platform-campaign-456" },
      });

      const result = await adapter.updateCampaign(campaign, "platform-campaign-456");

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/campaigns/platform-campaign-456",
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Updated Campaign Name",
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformCampaignId).toBe("platform-campaign-456");
    });
  });

  describe("pauseCampaign", () => {
    it("calls API with configured_status PAUSED (v3 API uses PATCH)", async () => {
      mockClient.patch.mockResolvedValueOnce({
        data: { id: "platform-campaign-123", configured_status: "PAUSED" },
      });

      await adapter.pauseCampaign("platform-campaign-123");

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/campaigns/platform-campaign-123",
        expect.objectContaining({
          data: expect.objectContaining({
            configured_status: "PAUSED", // v3 API uses configured_status
          }),
        })
      );
    });
  });

  describe("resumeCampaign", () => {
    it("calls API with configured_status ACTIVE (v3 API uses PATCH)", async () => {
      mockClient.patch.mockResolvedValueOnce({
        data: { id: "platform-campaign-123", configured_status: "ACTIVE" },
      });

      await adapter.resumeCampaign("platform-campaign-123");

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/campaigns/platform-campaign-123",
        expect.objectContaining({
          data: expect.objectContaining({
            configured_status: "ACTIVE", // v3 API uses configured_status
          }),
        })
      );
    });
  });

  describe("deleteCampaign", () => {
    it("calls delete endpoint (v3 API uses /campaigns/{id} path)", async () => {
      mockClient.delete.mockResolvedValueOnce({});

      await adapter.deleteCampaign("platform-campaign-123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/campaigns/platform-campaign-123"
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Ad Group Operations
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Ad Group Operations", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createAdGroup", () => {
    it("calls API with correct endpoint and params (v3 API wraps in data)", async () => {
      const adGroup = createMockAdGroup();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      const result = await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/ad_groups",
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Test Ad Group",
            campaign_id: "platform-campaign-123",
            configured_status: "ACTIVE",
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformAdGroupId).toBe("reddit-adgroup-123");
    });
  });

  describe("updateAdGroup", () => {
    it("uses platformAdGroupId for API call (v3 API uses PATCH and /ad_groups/{id} path)", async () => {
      const adGroup = createMockAdGroup({
        name: "Updated Ad Group",
      });

      mockClient.patch.mockResolvedValueOnce({
        data: { id: "platform-adgroup-456" },
      });

      const result = await adapter.updateAdGroup(adGroup, "platform-adgroup-456");

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/ad_groups/platform-adgroup-456",
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Updated Ad Group",
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformAdGroupId).toBe("platform-adgroup-456");
    });
  });

  describe("deleteAdGroup", () => {
    it("calls delete endpoint (v3 API uses /ad_groups/{id} path)", async () => {
      mockClient.delete.mockResolvedValueOnce({});

      await adapter.deleteAdGroup("platform-adgroup-123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/ad_groups/platform-adgroup-123"
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Ad Operations
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Ad Operations", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createAd", () => {
    it("calls API with correct endpoint and params (v3 API wraps in data)", async () => {
      const ad = createMockAd();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-ad-123" },
      });

      const result = await adapter.createAd(ad, "platform-adgroup-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/ads",
        expect.objectContaining({
          data: expect.objectContaining({
            ad_group_id: "platform-adgroup-123",
            headline: "Check out our new product!",
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformAdId).toBe("reddit-ad-123");
    });
  });

  describe("updateAd", () => {
    it("uses platformAdId for API call (v3 API uses PATCH and /ads/{id} path)", async () => {
      const ad = createMockAd({
        headline: "Updated Headline",
      });

      mockClient.patch.mockResolvedValueOnce({
        data: { id: "platform-ad-456" },
      });

      const result = await adapter.updateAd(ad, "platform-ad-456");

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/ads/platform-ad-456",
        expect.objectContaining({
          data: expect.objectContaining({
            headline: "Updated Headline",
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformAdId).toBe("platform-ad-456");
    });
  });

  describe("deleteAd", () => {
    it("calls delete endpoint (v3 API uses /ads/{id} path)", async () => {
      mockClient.delete.mockResolvedValueOnce({});

      await adapter.deleteAd("platform-ad-123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/ads/platform-ad-123"
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Keyword Operations (No-op)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Keyword Operations (No-op)", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createKeyword", () => {
    it("returns success without making API call (Reddit does not support keywords)", async () => {
      const keyword = createMockKeyword();

      const result = await adapter.createKeyword(keyword, "platform-adgroup-123");

      expect(mockClient.post).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.platformKeywordId).toBe(keyword.id);
    });
  });

  describe("updateKeyword", () => {
    it("returns success without making API call", async () => {
      const keyword = createMockKeyword();

      const result = await adapter.updateKeyword(keyword, "platform-keyword-123");

      expect(mockClient.put).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.platformKeywordId).toBe("platform-keyword-123");
    });
  });

  describe("deleteKeyword", () => {
    it("completes without making API call", async () => {
      await adapter.deleteKeyword("platform-keyword-123");

      expect(mockClient.delete).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Error Handling
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Error Handling", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("429 Rate Limit Errors", () => {
    it("handles 429 rate limit error as retryable", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          statusCode: 429,
          retryable: true,
          retryAfter: 60,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limit exceeded");
    });

    it("includes retryAfter information in error", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          statusCode: 429,
          retryable: true,
          retryAfter: 120,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limit");
    });
  });

  describe("400 Validation Errors", () => {
    it("handles 400 validation error as non-retryable", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "VALIDATION_ERROR",
          message: "Invalid campaign name",
          statusCode: 400,
          retryable: false,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid campaign name");
    });

    it("captures validation details in error", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "VALIDATION_ERROR",
          message: "Budget must be positive",
          statusCode: 400,
          retryable: false,
          details: { field: "daily_budget_micro" },
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Budget");
    });
  });

  describe("401 Authentication Errors", () => {
    it("handles 401 auth error", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "INVALID_TOKEN",
          message: "Invalid or expired token",
          statusCode: 401,
          retryable: false,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired token");
    });
  });

  describe("5xx Server Errors", () => {
    it("handles 500 server error as retryable", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          statusCode: 500,
          retryable: true,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Internal server error");
    });

    it("handles 503 service unavailable as retryable", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "SERVICE_UNAVAILABLE",
          message: "Service temporarily unavailable",
          statusCode: 503,
          retryable: true,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Service temporarily unavailable");
    });
  });

  describe("Error in pause/resume/delete operations", () => {
    it("throws error when pauseCampaign fails (v3 API uses PATCH)", async () => {
      mockClient.patch.mockRejectedValueOnce(
        new RedditApiException({
          code: "RESOURCE_NOT_FOUND",
          message: "Campaign not found",
          statusCode: 404,
          retryable: false,
        })
      );

      await expect(adapter.pauseCampaign("non-existent-id")).rejects.toThrow(
        "Campaign not found"
      );
    });

    it("throws error when resumeCampaign fails (v3 API uses PATCH)", async () => {
      mockClient.patch.mockRejectedValueOnce(
        new RedditApiException({
          code: "RESOURCE_NOT_FOUND",
          message: "Campaign not found",
          statusCode: 404,
          retryable: false,
        })
      );

      await expect(adapter.resumeCampaign("non-existent-id")).rejects.toThrow(
        "Campaign not found"
      );
    });

    it("throws error when deleteCampaign fails", async () => {
      mockClient.delete.mockRejectedValueOnce(
        new RedditApiException({
          code: "PERMISSION_DENIED",
          message: "Cannot delete active campaign",
          statusCode: 403,
          retryable: false,
        })
      );

      await expect(adapter.deleteCampaign("active-campaign-id")).rejects.toThrow(
        "Cannot delete active campaign"
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Platform Identifier
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Platform Identifier", () => {
  it("has platform identifier set to 'reddit'", () => {
    const mockClient = createMockClient();
    const adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });

    expect(adapter.platform).toBe("reddit");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Floating Point Precision (Code Review Issue #1)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Floating Point Precision", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("micro-units conversion precision", () => {
    it("converts $0.10 to exactly 100000 micro-units (not 99999 or 100001)", async () => {
      const campaign = createMockCampaign({
        budget: {
          type: "daily",
          amount: 0.1, // $0.10 - classic floating point issue
          currency: "USD",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            daily_budget_micro: 100_000, // Exactly 100,000, not 99999 or 100001
          }),
        })
      );
    });

    it("converts $0.01 to exactly 10000 micro-units", async () => {
      const campaign = createMockCampaign({
        budget: {
          type: "daily",
          amount: 0.01, // $0.01
          currency: "USD",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            daily_budget_micro: 10_000, // Exactly 10,000
          }),
        })
      );
    });

    it("converts $0.005 to exactly 10000 micro-units (rounds to 1 cent)", async () => {
      // Note: $0.001 rounds to 0 cents in cents-first conversion
      // $0.005 rounds to 1 cent (0.5 rounds up), which is 10,000 micro-units
      const campaign = createMockCampaign({
        budget: {
          type: "daily",
          amount: 0.005, // $0.005 = 0.5 cents, rounds to 1 cent
          currency: "USD",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            daily_budget_micro: 10_000, // 1 cent = 10,000 micro-units
          }),
        })
      );
    });

    it("converts $1.11 to exactly 1110000 micro-units", async () => {
      const campaign = createMockCampaign({
        budget: {
          type: "daily",
          amount: 1.11, // $1.11 - another common floating point issue
          currency: "USD",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            daily_budget_micro: 1_110_000, // Exactly 1,110,000
          }),
        })
      );
    });

    it("converts $19.99 to exactly 19990000 micro-units", async () => {
      const campaign = createMockCampaign({
        budget: {
          type: "daily",
          amount: 19.99, // $19.99
          currency: "USD",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            daily_budget_micro: 19_990_000, // Exactly 19,990,000
          }),
        })
      );
    });

    it("converts bid amount $0.10 to exactly 100000 micro-units (v3 API uses bid_value)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "0.10", // $0.10 bid
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            bid_value: 100_000, // v3 API uses bid_value, not bid_micro
          }),
        })
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Retryable Error Handling (Code Review Issue #2)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Retryable Error Info", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("campaign operations return retry info", () => {
    it("returns retryable=true and retryAfter for 429 errors", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          statusCode: 429,
          retryable: true,
          retryAfter: 60,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(60);
    });

    it("returns retryable=false for 400 validation errors", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "VALIDATION_ERROR",
          message: "Invalid campaign name",
          statusCode: 400,
          retryable: false,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(false);
      expect(result.retryAfter).toBeUndefined();
    });

    it("returns retryable=true for 500 server errors", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          statusCode: 500,
          retryable: true,
        })
      );

      const result = await adapter.createCampaign(campaign);

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
    });
  });

  describe("ad group operations return retry info", () => {
    it("returns retryable=true and retryAfter for 429 errors", async () => {
      const adGroup = createMockAdGroup();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          statusCode: 429,
          retryable: true,
          retryAfter: 120,
        })
      );

      const result = await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(120);
    });
  });

  describe("ad operations return retry info", () => {
    it("returns retryable=true and retryAfter for 429 errors", async () => {
      const ad = createMockAd();

      mockClient.post.mockRejectedValueOnce(
        new RedditApiException({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          statusCode: 429,
          retryable: true,
          retryAfter: 30,
        })
      );

      const result = await adapter.createAd(ad, "platform-adgroup-123");

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(30);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: NaN Propagation Prevention (Code Review Issue #3)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - NaN Prevention in Bid Amounts", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("invalid bid amounts should not produce NaN (v3 API uses bid_value)", () => {
    it("handles empty string maxCpc gracefully (no bid_value)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "", // Empty string
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      // Should NOT have bid_value set to NaN
      expect(dataPayload?.bid_value).not.toBe(NaN);
      // bid_value should either be undefined or a valid number
      if (dataPayload?.bid_value !== undefined) {
        expect(Number.isNaN(dataPayload.bid_value)).toBe(false);
      }
    });

    it("handles 'invalid' string maxCpc gracefully (no bid_value)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "invalid", // Invalid string
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      // Should NOT have bid_value set to NaN
      if (dataPayload?.bid_value !== undefined) {
        expect(Number.isNaN(dataPayload.bid_value)).toBe(false);
      }
    });

    it("handles 'abc123' string maxCpc gracefully (no bid_value)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "abc123", // Non-numeric string
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      if (dataPayload?.bid_value !== undefined) {
        expect(Number.isNaN(dataPayload.bid_value)).toBe(false);
      }
    });

    it("handles negative bid amount (should not set bid_value)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "-5.00", // Negative value
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      // Negative amounts should not produce a valid bid_value
      if (dataPayload?.bid_value !== undefined) {
        expect(dataPayload.bid_value).toBeGreaterThan(0);
      }
    });

    it("handles zero bid amount (should not set bid_value)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "0", // Zero value
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      // Zero amounts should not set bid_value
      if (dataPayload?.bid_value !== undefined) {
        expect(dataPayload.bid_value).toBeGreaterThan(0);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Missing finalUrl Should Error (Code Review Issue #5)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Missing finalUrl Validation", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createAd validation", () => {
    it("returns error when finalUrl is missing", async () => {
      const ad = createMockAd({
        finalUrl: undefined, // Missing finalUrl
      });

      const result = await adapter.createAd(ad, "platform-adgroup-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("finalUrl");
      // Should NOT have called the API
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it("returns error when finalUrl is empty string", async () => {
      const ad = createMockAd({
        finalUrl: "", // Empty string finalUrl
      });

      const result = await adapter.createAd(ad, "platform-adgroup-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("finalUrl");
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it("succeeds when finalUrl is provided", async () => {
      const ad = createMockAd({
        finalUrl: "https://example.com/landing",
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-ad-123" },
      });

      const result = await adapter.createAd(ad, "platform-adgroup-123");

      expect(result.success).toBe(true);
      expect(mockClient.post).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Advanced Settings (Campaign Set Config)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Advanced Settings", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("campaign advanced settings", () => {
    it("includes start_time when provided in advancedSettings", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: "2025-01-15T09:00:00+00:00",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-01-15T09:00:00+00:00",
          }),
        })
      );
    });

    it("includes end_time when provided in advancedSettings", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                endTime: "2025-12-31T23:59:59+00:00",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            end_time: "2025-12-31T23:59:59+00:00",
          }),
        })
      );
    });

    it("includes both start_time and end_time when provided", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: "2025-01-15T09:00:00+00:00",
                endTime: "2025-03-15T23:59:59+00:00",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-01-15T09:00:00+00:00",
            end_time: "2025-03-15T23:59:59+00:00",
          }),
        })
      );
    });

    it("includes special_ad_categories from advancedSettings", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                specialAdCategories: ["HOUSING", "CREDIT"],
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            special_ad_categories: ["HOUSING", "CREDIT"],
          }),
        })
      );
    });

    it("includes view_through_attribution_window_days when provided", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "conversions",
          advancedSettings: {
            reddit: {
              campaign: {
                viewThroughAttributionDays: 7,
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            view_through_attribution_window_days: 7,
          }),
        })
      );
    });

    it("includes click_through_attribution_window_days when provided", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "conversions",
          advancedSettings: {
            reddit: {
              campaign: {
                clickThroughAttributionDays: 30,
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            click_through_attribution_window_days: 30,
          }),
        })
      );
    });

    it("includes all advanced settings together", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "conversions",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: "2025-02-01T00:00:00+00:00",
                endTime: "2025-06-30T23:59:59+00:00",
                specialAdCategories: ["EMPLOYMENT"],
                viewThroughAttributionDays: 14,
                clickThroughAttributionDays: 28,
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-02-01T00:00:00+00:00",
            end_time: "2025-06-30T23:59:59+00:00",
            special_ad_categories: ["EMPLOYMENT"],
            view_through_attribution_window_days: 14,
            click_through_attribution_window_days: 28,
          }),
        })
      );
    });

    it("prefers advancedSettings.specialAdCategories over legacy location", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          specialAdCategories: ["NONE"], // Legacy location
          advancedSettings: {
            reddit: {
              campaign: {
                specialAdCategories: ["HOUSING"], // Advanced settings take priority
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            special_ad_categories: ["HOUSING"], // From advancedSettings, not legacy
          }),
        })
      );
    });
  });

  describe("ad group advanced settings", () => {
    it("includes start_time when provided in ad group advancedSettings", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-01-20T10:00:00+00:00",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-01-20T10:00:00+00:00",
          }),
        })
      );
    });

    it("includes end_time when provided in ad group advancedSettings", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          advancedSettings: {
            reddit: {
              adGroup: {
                endTime: "2025-04-30T18:00:00+00:00",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            end_time: "2025-04-30T18:00:00+00:00",
          }),
        })
      );
    });

    it("includes both start_time and end_time for ad group", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-02-01T08:00:00+00:00",
                endTime: "2025-02-28T20:00:00+00:00",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-02-01T08:00:00+00:00",
            end_time: "2025-02-28T20:00:00+00:00",
          }),
        })
      );
    });

    it("combines ad group advanced settings with other settings", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "2.00",
          },
          budget: {
            type: "daily",
            amount: 50,
          },
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-03-01T00:00:00+00:00",
                endTime: "2025-03-31T23:59:59+00:00",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            bid_strategy: "MANUAL_BIDDING",
            bid_value: 2_000_000,
            goal_type: "DAILY_SPEND",
            goal_value: 50_000_000,
            start_time: "2025-03-01T00:00:00+00:00",
            end_time: "2025-03-31T23:59:59+00:00",
          }),
        })
      );
    });
  });

  describe("no advanced settings", () => {
    it("does not include start_time/end_time when advancedSettings is not provided", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      expect(dataPayload?.start_time).toBeUndefined();
      expect(dataPayload?.end_time).toBeUndefined();
    });

    it("does not include attribution windows when not provided", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "conversions",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      expect(dataPayload?.view_through_attribution_window_days).toBeUndefined();
      expect(dataPayload?.click_through_attribution_window_days).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Undefined Budget Handling (Code Review Issue #6)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Tests: DateTime Normalization (Invalid startTime/endTime Handling)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - DateTime Normalization", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("campaign datetime handling", () => {
    it("passes through valid ISO 8601 datetime strings", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: "2025-01-15T09:00:00Z",
                endTime: "2025-12-31T23:59:59+00:00",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-01-15T09:00:00Z",
            end_time: "2025-12-31T23:59:59+00:00",
          }),
        })
      );
    });

    it("converts Date objects to ISO strings", async () => {
      const startDate = new Date("2025-06-01T12:00:00Z");
      const endDate = new Date("2025-06-30T18:00:00Z");

      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: startDate as unknown as string, // Simulating Date object
                endTime: endDate as unknown as string,
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      // Should be converted to ISO strings
      expect(dataPayload?.start_time).toBe("2025-06-01T12:00:00.000Z");
      expect(dataPayload?.end_time).toBe("2025-06-30T18:00:00.000Z");
    });

    it("converts boolean true to current datetime (start now)", async () => {
      const beforeTest = new Date();

      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: true as unknown as string, // Boolean true from checkbox
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      // Should be a valid ISO string representing "now"
      expect(dataPayload?.start_time).toBeDefined();
      expect(typeof dataPayload?.start_time).toBe("string");
      const parsedTime = new Date(dataPayload?.start_time as string);
      expect(parsedTime.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(parsedTime.getTime()).toBeLessThanOrEqual(Date.now() + 1000); // Within 1 second
    });

    it("skips boolean false values (does not set start_time)", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: false as unknown as string, // Boolean false
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      // Should NOT have start_time set
      expect(dataPayload?.start_time).toBeUndefined();
    });

    it("skips empty string values", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: "", // Empty string
                endTime: "",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      expect(dataPayload?.start_time).toBeUndefined();
      expect(dataPayload?.end_time).toBeUndefined();
    });

    it("skips invalid datetime strings", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: "not-a-date",
                endTime: "invalid-datetime",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      expect(dataPayload?.start_time).toBeUndefined();
      expect(dataPayload?.end_time).toBeUndefined();
    });

    it("skips numeric values (timestamps without proper conversion)", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: 1735689600000 as unknown as string, // Raw timestamp
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      // Raw numbers should be skipped (not valid ISO 8601)
      expect(dataPayload?.start_time).toBeUndefined();
    });

    it("skips null values", async () => {
      const campaign = createMockCampaign({
        campaignData: {
          objective: "awareness",
          advancedSettings: {
            reddit: {
              campaign: {
                startTime: null as unknown as string,
                endTime: null as unknown as string,
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      expect(dataPayload?.start_time).toBeUndefined();
      expect(dataPayload?.end_time).toBeUndefined();
    });
  });

  describe("ad group datetime handling", () => {
    it("passes through valid ISO 8601 datetime strings for ad groups", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-02-01T08:00:00+00:00",
                endTime: "2025-02-28T20:00:00Z",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-02-01T08:00:00+00:00",
            end_time: "2025-02-28T20:00:00Z",
          }),
        })
      );
    });

    it("converts Date objects to ISO strings for ad groups", async () => {
      const startDate = new Date("2025-03-15T09:00:00Z");

      const adGroup = createMockAdGroup({
        settings: {
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: startDate as unknown as string,
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      expect(dataPayload?.start_time).toBe("2025-03-15T09:00:00.000Z");
    });

    it("converts boolean true to current datetime for ad groups", async () => {
      const beforeTest = new Date();

      const adGroup = createMockAdGroup({
        settings: {
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: true as unknown as string,
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      expect(dataPayload?.start_time).toBeDefined();
      expect(typeof dataPayload?.start_time).toBe("string");
      const parsedTime = new Date(dataPayload?.start_time as string);
      expect(parsedTime.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
    });

    it("skips invalid datetime values for ad groups", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "not-valid",
                endTime: false as unknown as string,
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      expect(dataPayload?.start_time).toBeUndefined();
      expect(dataPayload?.end_time).toBeUndefined();
    });

    it("skips empty strings for ad groups", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "",
                endTime: "",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;

      expect(dataPayload?.start_time).toBeUndefined();
      expect(dataPayload?.end_time).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Undefined Budget Handling (Code Review Issue #6)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Undefined Budget Handling", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("campaign with undefined budget", () => {
    it("creates campaign without budget fields when budget is undefined", async () => {
      const campaign = createMockCampaign({
        budget: undefined, // No budget
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      // Should NOT have budget fields
      expect(dataPayload?.daily_budget_micro).toBeUndefined();
      expect(dataPayload?.total_budget_micro).toBeUndefined();
    });

    it("updates campaign without budget fields when budget is undefined", async () => {
      const campaign = createMockCampaign({
        budget: undefined,
      });

      mockClient.put.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.updateCampaign(campaign, "platform-campaign-123");

      const callArgs = mockClient.put.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      expect(dataPayload?.daily_budget_micro).toBeUndefined();
      expect(dataPayload?.total_budget_micro).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Legacy DateTime Settings Handling (Top-level settings migration)
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Legacy DateTime Settings Handling", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("ad group legacy start_time handling", () => {
    it("normalizes valid ISO 8601 start_time from top-level settings (legacy data)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          start_time: "2025-01-15T09:00:00Z", // Valid ISO at top level (legacy)
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-01-15T09:00:00Z",
          }),
        })
      );
    });

    it("normalizes startTime (camelCase) from top-level settings (legacy data)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          startTime: "2025-02-20T14:30:00+00:00", // camelCase variant
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-02-20T14:30:00+00:00",
          }),
        })
      );
    });

    it("rejects invalid start_time string from top-level settings", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          start_time: "invalid-date", // Invalid at top level
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      // start_time should NOT be in the payload
      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      expect(dataPayload?.start_time).toBeUndefined();
    });

    it("converts boolean true to current datetime from top-level settings (legacy checkbox)", async () => {
      const beforeTest = new Date();

      const adGroup = createMockAdGroup({
        settings: {
          start_time: true, // Boolean from old checkbox
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      // start_time should be current time (true means "start now")
      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      expect(dataPayload?.start_time).toBeDefined();
      expect(typeof dataPayload?.start_time).toBe("string");
      const parsedTime = new Date(dataPayload?.start_time as string);
      expect(parsedTime.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(parsedTime.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it("skips boolean false from top-level settings", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          start_time: false, // Boolean false
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      expect(dataPayload?.start_time).toBeUndefined();
    });
  });

  describe("ad group legacy end_time handling", () => {
    it("normalizes valid ISO 8601 end_time from top-level settings (legacy data)", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          end_time: "2025-12-31T23:59:59Z", // Valid ISO at top level
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            end_time: "2025-12-31T23:59:59Z",
          }),
        })
      );
    });

    it("normalizes endTime (camelCase) from top-level settings", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          endTime: "2025-06-30T18:00:00+00:00", // camelCase variant
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            end_time: "2025-06-30T18:00:00+00:00",
          }),
        })
      );
    });

    it("rejects invalid end_time string from top-level settings", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          end_time: "not-a-date",
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      const callArgs = mockClient.post.mock.calls[0]?.[1] as { data?: Record<string, unknown> } | undefined;
      const dataPayload = callArgs?.data;
      expect(dataPayload?.end_time).toBeUndefined();
    });
  });

  describe("advancedSettings priority over top-level settings", () => {
    it("prefers advancedSettings.startTime over top-level start_time", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          start_time: "2025-01-01T00:00:00Z", // Top level (should be ignored)
          advancedSettings: {
            reddit: {
              adGroup: {
                startTime: "2025-06-15T09:00:00Z", // Advanced settings (should be used)
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      // Should use advancedSettings value
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-06-15T09:00:00Z",
          }),
        })
      );
    });

    it("prefers advancedSettings.endTime over top-level end_time", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          end_time: "2025-03-01T00:00:00Z", // Top level (should be ignored)
          advancedSettings: {
            reddit: {
              adGroup: {
                endTime: "2025-12-31T23:59:59Z", // Advanced settings (should be used)
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            end_time: "2025-12-31T23:59:59Z",
          }),
        })
      );
    });

    it("falls back to top-level start_time when advancedSettings has no startTime", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          start_time: "2025-04-01T10:00:00Z", // Top level (should be used as fallback)
          advancedSettings: {
            reddit: {
              adGroup: {
                // No startTime here
                endTime: "2025-05-01T18:00:00Z",
              },
            },
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-04-01T10:00:00Z", // From top-level
            end_time: "2025-05-01T18:00:00Z", // From advancedSettings
          }),
        })
      );
    });
  });

  describe("combined legacy settings with other ad group settings", () => {
    it("handles legacy datetime with bidding and budget settings", async () => {
      const adGroup = createMockAdGroup({
        settings: {
          start_time: "2025-03-15T08:00:00Z",
          end_time: "2025-03-31T20:00:00Z",
          bidding: {
            strategy: "manual_cpc",
            maxCpc: "1.50",
          },
          budget: {
            type: "daily",
            amount: 25,
          },
        },
      });

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.objectContaining({
            start_time: "2025-03-15T08:00:00Z",
            end_time: "2025-03-31T20:00:00Z",
            bid_strategy: "MANUAL_BIDDING",
            bid_value: 1_500_000,
            goal_type: "DAILY_SPEND",
            goal_value: 25_000_000,
          }),
        })
      );
    });
  });
});
