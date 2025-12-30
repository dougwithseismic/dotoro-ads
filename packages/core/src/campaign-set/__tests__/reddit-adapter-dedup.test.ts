/**
 * Reddit Platform Adapter Deduplication Tests
 *
 * Tests for the deduplication query methods in RedditAdsAdapter that prevent
 * duplicate entity creation during crash recovery scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RedditAdsAdapter } from "../adapters/reddit-adapter.js";

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
// Tests: findExistingCampaign
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - findExistingCampaign", () => {
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

  it("returns platform ID when campaign with matching name exists", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "camp_123", name: "My Campaign" },
        { id: "camp_456", name: "Other Campaign" },
      ],
    });

    const result = await adapter.findExistingCampaign("test-account-123", "My Campaign");

    expect(result).toBe("camp_123");
    expect(mockClient.get).toHaveBeenCalledWith(
      "/ad_accounts/test-account-123/campaigns"
    );
  });

  it("returns null when no campaign matches", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "camp_123", name: "Existing Campaign" },
        { id: "camp_456", name: "Another Campaign" },
      ],
    });

    const result = await adapter.findExistingCampaign("test-account-123", "NonExistent");

    expect(result).toBeNull();
  });

  it("returns null when campaign list is empty", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });

    const result = await adapter.findExistingCampaign("test-account-123", "Any Campaign");

    expect(result).toBeNull();
  });

  it("returns null on API error without throwing", async () => {
    mockClient.get.mockRejectedValueOnce(new Error("API Error"));

    const result = await adapter.findExistingCampaign("test-account-123", "Campaign");

    expect(result).toBeNull();
  });

  it("returns first match when multiple campaigns have same name", async () => {
    // Edge case: shouldn't happen in practice, but handle gracefully
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "camp_first", name: "Duplicate Name" },
        { id: "camp_second", name: "Duplicate Name" },
      ],
    });

    const result = await adapter.findExistingCampaign("test-account-123", "Duplicate Name");

    expect(result).toBe("camp_first");
  });

  it("performs exact case-sensitive matching", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "camp_123", name: "my campaign" }, // lowercase
      ],
    });

    const result = await adapter.findExistingCampaign("test-account-123", "My Campaign");

    expect(result).toBeNull(); // Should NOT match due to case difference
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: findExistingAdGroup
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - findExistingAdGroup", () => {
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

  it("returns platform ID when ad group with matching name exists in campaign", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ag_123", name: "My Ad Group", campaign_id: "camp_456" },
        { id: "ag_789", name: "Other Ad Group", campaign_id: "camp_456" },
      ],
    });

    const result = await adapter.findExistingAdGroup("camp_456", "My Ad Group");

    expect(result).toBe("ag_123");
    expect(mockClient.get).toHaveBeenCalledWith(
      "/ad_accounts/test-account-123/ad_groups",
      { params: { campaign_id: "camp_456" } }
    );
  });

  it("returns null when no ad group matches", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ag_123", name: "Existing Ad Group", campaign_id: "camp_456" },
      ],
    });

    const result = await adapter.findExistingAdGroup("camp_456", "NonExistent");

    expect(result).toBeNull();
  });

  it("returns null when ad group list is empty", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });

    const result = await adapter.findExistingAdGroup("camp_456", "Any Ad Group");

    expect(result).toBeNull();
  });

  it("returns null on API error without throwing", async () => {
    mockClient.get.mockRejectedValueOnce(new Error("API Error"));

    const result = await adapter.findExistingAdGroup("camp_456", "Ad Group");

    expect(result).toBeNull();
  });

  it("filters by campaign_id in API request", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });

    await adapter.findExistingAdGroup("camp_specific", "Ad Group");

    expect(mockClient.get).toHaveBeenCalledWith(
      "/ad_accounts/test-account-123/ad_groups",
      { params: { campaign_id: "camp_specific" } }
    );
  });

  it("performs exact case-sensitive matching", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ag_123", name: "my ad group", campaign_id: "camp_456" },
      ],
    });

    const result = await adapter.findExistingAdGroup("camp_456", "My Ad Group");

    expect(result).toBeNull(); // Should NOT match due to case difference
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: findExistingAd
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - findExistingAd", () => {
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

  it("returns platform ID when ad with matching headline exists in ad group", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ad_123", name: "Ad Name", headline: "My Headline", ad_group_id: "ag_456" },
        { id: "ad_789", name: "Other Ad", headline: "Other Headline", ad_group_id: "ag_456" },
      ],
    });

    const result = await adapter.findExistingAd("ag_456", "My Headline");

    expect(result).toBe("ad_123");
    expect(mockClient.get).toHaveBeenCalledWith(
      "/ad_accounts/test-account-123/ads",
      { params: { ad_group_id: "ag_456" } }
    );
  });

  it("returns platform ID when ad with matching name exists", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ad_123", name: "My Ad Name", headline: "Different Headline", ad_group_id: "ag_456" },
      ],
    });

    const result = await adapter.findExistingAd("ag_456", "My Ad Name");

    expect(result).toBe("ad_123");
  });

  it("prioritizes headline match over name match", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ad_headline", name: "Name A", headline: "Search Term", ad_group_id: "ag_456" },
        { id: "ad_name", name: "Search Term", headline: "Headline B", ad_group_id: "ag_456" },
      ],
    });

    // The first match is by headline
    const result = await adapter.findExistingAd("ag_456", "Search Term");

    expect(result).toBe("ad_headline");
  });

  it("returns null when no ad matches", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ad_123", name: "Existing Ad", headline: "Existing Headline", ad_group_id: "ag_456" },
      ],
    });

    const result = await adapter.findExistingAd("ag_456", "NonExistent");

    expect(result).toBeNull();
  });

  it("returns null when ad list is empty", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });

    const result = await adapter.findExistingAd("ag_456", "Any Ad");

    expect(result).toBeNull();
  });

  it("returns null on API error without throwing", async () => {
    mockClient.get.mockRejectedValueOnce(new Error("API Error"));

    const result = await adapter.findExistingAd("ag_456", "Ad");

    expect(result).toBeNull();
  });

  it("filters by ad_group_id in API request", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });

    await adapter.findExistingAd("ag_specific", "Ad");

    expect(mockClient.get).toHaveBeenCalledWith(
      "/ad_accounts/test-account-123/ads",
      { params: { ad_group_id: "ag_specific" } }
    );
  });

  it("performs exact case-sensitive matching on headline", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ad_123", name: "Ad", headline: "my headline", ad_group_id: "ag_456" },
      ],
    });

    const result = await adapter.findExistingAd("ag_456", "My Headline");

    expect(result).toBeNull(); // Should NOT match due to case difference
  });

  it("performs exact case-sensitive matching on name", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        { id: "ad_123", name: "my ad name", headline: "Headline", ad_group_id: "ag_456" },
      ],
    });

    const result = await adapter.findExistingAd("ag_456", "My Ad Name");

    expect(result).toBeNull(); // Should NOT match due to case difference
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Error Handling Consistency
// ─────────────────────────────────────────────────────────────────────────────

describe("RedditAdsAdapter - Deduplication Error Handling", () => {
  let adapter: RedditAdsAdapter;
  let mockClient: ReturnType<typeof createMockClient>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockClient = createMockClient();
    adapter = new RedditAdsAdapter({
      client: mockClient as any,
      accountId: "test-account-123",
      fundingInstrumentId: "funding-instrument-456",
    });
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockRestore();
  });

  it("logs warning when findExistingCampaign fails", async () => {
    mockClient.get.mockRejectedValueOnce(new Error("Network error"));

    await adapter.findExistingCampaign("acc", "Campaign");

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[RedditAdapter] Failed to query existing campaigns")
    );
  });

  it("logs warning when findExistingAdGroup fails", async () => {
    mockClient.get.mockRejectedValueOnce(new Error("Network error"));

    await adapter.findExistingAdGroup("camp", "Ad Group");

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[RedditAdapter] Failed to query existing ad groups")
    );
  });

  it("logs warning when findExistingAd fails", async () => {
    mockClient.get.mockRejectedValueOnce(new Error("Network error"));

    await adapter.findExistingAd("ag", "Ad");

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[RedditAdapter] Failed to query existing ads")
    );
  });

  it("does not throw on rate limit error - returns null gracefully", async () => {
    const rateLimitError = new Error("Rate limit exceeded");
    (rateLimitError as any).statusCode = 429;
    mockClient.get.mockRejectedValueOnce(rateLimitError);

    const result = await adapter.findExistingCampaign("acc", "Campaign");

    expect(result).toBeNull();
  });

  it("does not throw on auth error - returns null gracefully", async () => {
    const authError = new Error("Unauthorized");
    (authError as any).statusCode = 401;
    mockClient.get.mockRejectedValueOnce(authError);

    const result = await adapter.findExistingAdGroup("camp", "Ad Group");

    expect(result).toBeNull();
  });

  it("does not throw on server error - returns null gracefully", async () => {
    const serverError = new Error("Internal server error");
    (serverError as any).statusCode = 500;
    mockClient.get.mockRejectedValueOnce(serverError);

    const result = await adapter.findExistingAd("ag", "Ad");

    expect(result).toBeNull();
  });
});
