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
          daily_budget_micro: 100_000_000, // $100 * 1,000,000
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
          total_budget_micro: 5_000_000_000, // $5000 * 1,000,000
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
          daily_budget_micro: 50_750_000, // $50.75 * 1,000,000
        })
      );
    });
  });

  describe("Objective Mapping", () => {
    it("maps objective AWARENESS correctly", async () => {
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
          objective: "AWARENESS",
        })
      );
    });

    it("maps objective CONSIDERATION correctly", async () => {
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
          objective: "CONSIDERATION",
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
          objective: "CONVERSIONS",
        })
      );
    });

    it("defaults to AWARENESS when objective is not specified", async () => {
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
          objective: "AWARENESS",
        })
      );
    });
  });

  describe("Bidding Strategy Mapping", () => {
    it("maps bidding strategy AUTOMATIC correctly", async () => {
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
          bid_strategy: "AUTOMATIC",
        })
      );
    });

    it("maps bidding strategy MANUAL_CPC correctly", async () => {
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
          bid_strategy: "MANUAL_CPC",
          bid_micro: 2_500_000, // $2.50 * 1,000,000
        })
      );
    });

    it("maps bidding strategy MANUAL_CPM correctly", async () => {
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
          bid_strategy: "MANUAL_CPM",
          bid_micro: 10_000_000, // $10.00 * 1,000,000
        })
      );
    });

    it("defaults to AUTOMATIC when bidding strategy is not specified", async () => {
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
          bid_strategy: "AUTOMATIC",
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
          targeting: {
            subreddits: ["r/technology", "r/programming"],
            locations: ["US", "CA"],
            devices: ["DESKTOP", "MOBILE"],
            interests: ["technology", "software"],
          },
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
          headline: "Amazing Product Launch",
          body: "Discover the future of technology today.",
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
          click_url: "https://example.com/product",
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
          display_url: "example.com/promo",
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
          call_to_action: "SHOP_NOW",
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
          name: expect.stringContaining("My Awesome Ad Headline"),
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
    it("calls API with correct endpoint and params", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      const result = await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/campaigns",
        expect.objectContaining({
          name: "Test Campaign",
          funding_instrument_id: "funding-instrument-456",
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformCampaignId).toBe("reddit-campaign-123");
    });

    it("includes start_date in ISO format", async () => {
      const campaign = createMockCampaign();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.createCampaign(campaign);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
        })
      );
    });
  });

  describe("updateCampaign", () => {
    it("uses platformId for API call", async () => {
      const campaign = createMockCampaign({
        name: "Updated Campaign Name",
      });

      mockClient.put.mockResolvedValueOnce({
        data: { id: "platform-campaign-456" },
      });

      const result = await adapter.updateCampaign(campaign, "platform-campaign-456");

      expect(mockClient.put).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/campaigns/platform-campaign-456",
        expect.objectContaining({
          name: "Updated Campaign Name",
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformCampaignId).toBe("platform-campaign-456");
    });
  });

  describe("pauseCampaign", () => {
    it("calls service method to pause campaign", async () => {
      mockClient.put.mockResolvedValueOnce({
        data: { id: "platform-campaign-123", status: "PAUSED" },
      });

      await adapter.pauseCampaign("platform-campaign-123");

      expect(mockClient.put).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/campaigns/platform-campaign-123",
        expect.objectContaining({
          status: "PAUSED",
        })
      );
    });
  });

  describe("resumeCampaign", () => {
    it("calls service method to activate campaign", async () => {
      mockClient.put.mockResolvedValueOnce({
        data: { id: "platform-campaign-123", status: "ACTIVE" },
      });

      await adapter.resumeCampaign("platform-campaign-123");

      expect(mockClient.put).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/campaigns/platform-campaign-123",
        expect.objectContaining({
          status: "ACTIVE",
        })
      );
    });
  });

  describe("deleteCampaign", () => {
    it("calls delete endpoint", async () => {
      mockClient.delete.mockResolvedValueOnce({});

      await adapter.deleteCampaign("platform-campaign-123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/campaigns/platform-campaign-123"
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
    it("calls API with correct endpoint and params", async () => {
      const adGroup = createMockAdGroup();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      const result = await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/adgroups",
        expect.objectContaining({
          name: "Test Ad Group",
          campaign_id: "platform-campaign-123",
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformAdGroupId).toBe("reddit-adgroup-123");
    });

    it("includes start_date in ISO format", async () => {
      const adGroup = createMockAdGroup();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-adgroup-123" },
      });

      await adapter.createAdGroup(adGroup, "platform-campaign-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
        })
      );
    });
  });

  describe("updateAdGroup", () => {
    it("uses platformAdGroupId for API call", async () => {
      const adGroup = createMockAdGroup({
        name: "Updated Ad Group",
      });

      mockClient.put.mockResolvedValueOnce({
        data: { id: "platform-adgroup-456" },
      });

      const result = await adapter.updateAdGroup(adGroup, "platform-adgroup-456");

      expect(mockClient.put).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/adgroups/platform-adgroup-456",
        expect.objectContaining({
          name: "Updated Ad Group",
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformAdGroupId).toBe("platform-adgroup-456");
    });
  });

  describe("deleteAdGroup", () => {
    it("calls delete endpoint", async () => {
      mockClient.delete.mockResolvedValueOnce({});

      await adapter.deleteAdGroup("platform-adgroup-123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/adgroups/platform-adgroup-123"
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
    it("calls API with correct endpoint and params", async () => {
      const ad = createMockAd();

      mockClient.post.mockResolvedValueOnce({
        data: { id: "reddit-ad-123" },
      });

      const result = await adapter.createAd(ad, "platform-adgroup-123");

      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/ads",
        expect.objectContaining({
          ad_group_id: "platform-adgroup-123",
          headline: "Check out our new product!",
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformAdId).toBe("reddit-ad-123");
    });
  });

  describe("updateAd", () => {
    it("uses platformAdId for API call", async () => {
      const ad = createMockAd({
        headline: "Updated Headline",
      });

      mockClient.put.mockResolvedValueOnce({
        data: { id: "platform-ad-456" },
      });

      const result = await adapter.updateAd(ad, "platform-ad-456");

      expect(mockClient.put).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/ads/platform-ad-456",
        expect.objectContaining({
          headline: "Updated Headline",
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformAdId).toBe("platform-ad-456");
    });
  });

  describe("deleteAd", () => {
    it("calls delete endpoint", async () => {
      mockClient.delete.mockResolvedValueOnce({});

      await adapter.deleteAd("platform-ad-123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/ad_accounts/test-account-123/ads/platform-ad-123"
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
    it("throws error when pauseCampaign fails", async () => {
      mockClient.put.mockRejectedValueOnce(
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

    it("throws error when resumeCampaign fails", async () => {
      mockClient.put.mockRejectedValueOnce(
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
          daily_budget_micro: 100_000, // Exactly 100,000, not 99999 or 100001
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
          daily_budget_micro: 10_000, // Exactly 10,000
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
          daily_budget_micro: 10_000, // 1 cent = 10,000 micro-units
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
          daily_budget_micro: 1_110_000, // Exactly 1,110,000
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
          daily_budget_micro: 19_990_000, // Exactly 19,990,000
        })
      );
    });

    it("converts bid amount $0.10 to exactly 100000 micro-units", async () => {
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
          bid_micro: 100_000, // Exactly 100,000
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

  describe("invalid bid amounts should not produce NaN", () => {
    it("handles empty string maxCpc gracefully (no bid_micro)", async () => {
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

      const callArgs = mockClient.post.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      // Should NOT have bid_micro set to NaN
      expect(callArgs?.bid_micro).not.toBe(NaN);
      // bid_micro should either be undefined or a valid number
      if (callArgs?.bid_micro !== undefined) {
        expect(Number.isNaN(callArgs.bid_micro)).toBe(false);
      }
    });

    it("handles 'invalid' string maxCpc gracefully (no bid_micro)", async () => {
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

      const callArgs = mockClient.post.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      // Should NOT have bid_micro set to NaN
      if (callArgs?.bid_micro !== undefined) {
        expect(Number.isNaN(callArgs.bid_micro)).toBe(false);
      }
    });

    it("handles 'abc123' string maxCpc gracefully (no bid_micro)", async () => {
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

      const callArgs = mockClient.post.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      if (callArgs?.bid_micro !== undefined) {
        expect(Number.isNaN(callArgs.bid_micro)).toBe(false);
      }
    });

    it("handles negative bid amount (should not set bid_micro)", async () => {
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

      const callArgs = mockClient.post.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      // Negative amounts should not produce a valid bid_micro
      if (callArgs?.bid_micro !== undefined) {
        expect(callArgs.bid_micro).toBeGreaterThan(0);
      }
    });

    it("handles zero bid amount (should not set bid_micro)", async () => {
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

      const callArgs = mockClient.post.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      // Zero amounts should not set bid_micro
      if (callArgs?.bid_micro !== undefined) {
        expect(callArgs.bid_micro).toBeGreaterThan(0);
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

      const callArgs = mockClient.post.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      // Should NOT have budget fields
      expect(callArgs?.daily_budget_micro).toBeUndefined();
      expect(callArgs?.total_budget_micro).toBeUndefined();
    });

    it("updates campaign without budget fields when budget is undefined", async () => {
      const campaign = createMockCampaign({
        budget: undefined,
      });

      mockClient.put.mockResolvedValueOnce({
        data: { id: "reddit-campaign-123" },
      });

      await adapter.updateCampaign(campaign, "platform-campaign-123");

      const callArgs = mockClient.put.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      expect(callArgs?.daily_budget_micro).toBeUndefined();
      expect(callArgs?.total_budget_micro).toBeUndefined();
    });
  });
});
