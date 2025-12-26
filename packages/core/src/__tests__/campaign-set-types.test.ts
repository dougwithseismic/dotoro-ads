/**
 * Campaign Set Types Tests
 *
 * TDD tests for campaign set type definitions.
 * These tests validate the structure and compatibility of campaign set types
 * with the database schema from Phase 1.
 */

import { describe, it, expect, expectTypeOf } from "vitest";

// Import the types we're going to create
import type {
  // Status types
  CampaignSetStatus,
  CampaignSetSyncStatus,
  EntityStatus,
  CampaignStatus,
  KeywordMatchType,
  // Main entity types
  CampaignSet,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  // Config types
  CampaignSetConfig,
  HierarchyConfigSnapshot,
  // Supporting types
  AdGroupSettings,
  AdAssets,
  BudgetInfo,
  // DTO types
  CreateCampaignSetInput,
  UpdateCampaignSetInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateAdGroupInput,
  CreateAdInput,
  CreateKeywordInput,
} from "../campaign-set/types.js";

// Import existing types for compatibility checks
import type { Platform } from "../ad-types/types.js";
import type { BudgetConfig, BiddingConfig } from "../budget/types.js";
import type { TargetingConfig } from "../targeting/types.js";

describe("Campaign Set Status Types", () => {
  describe("CampaignSetStatus", () => {
    it("should include all expected status values", () => {
      // Type-level test: verify all values are assignable
      const draft: CampaignSetStatus = "draft";
      const pending: CampaignSetStatus = "pending";
      const syncing: CampaignSetStatus = "syncing";
      const active: CampaignSetStatus = "active";
      const paused: CampaignSetStatus = "paused";
      const completed: CampaignSetStatus = "completed";
      const archived: CampaignSetStatus = "archived";
      const error: CampaignSetStatus = "error";

      // Runtime assertions to use variables
      expect(draft).toBe("draft");
      expect(pending).toBe("pending");
      expect(syncing).toBe("syncing");
      expect(active).toBe("active");
      expect(paused).toBe("paused");
      expect(completed).toBe("completed");
      expect(archived).toBe("archived");
      expect(error).toBe("error");
    });

    it("should be a string union type", () => {
      expectTypeOf<CampaignSetStatus>().toBeString();
    });
  });

  describe("CampaignSetSyncStatus", () => {
    it("should include all expected sync status values", () => {
      const pending: CampaignSetSyncStatus = "pending";
      const syncing: CampaignSetSyncStatus = "syncing";
      const synced: CampaignSetSyncStatus = "synced";
      const failed: CampaignSetSyncStatus = "failed";
      const conflict: CampaignSetSyncStatus = "conflict";

      expect(pending).toBe("pending");
      expect(syncing).toBe("syncing");
      expect(synced).toBe("synced");
      expect(failed).toBe("failed");
      expect(conflict).toBe("conflict");
    });
  });

  describe("EntityStatus", () => {
    it("should include active, paused, and removed", () => {
      const active: EntityStatus = "active";
      const paused: EntityStatus = "paused";
      const removed: EntityStatus = "removed";

      expect(active).toBe("active");
      expect(paused).toBe("paused");
      expect(removed).toBe("removed");
    });
  });

  describe("CampaignStatus", () => {
    it("should include all campaign status values", () => {
      const draft: CampaignStatus = "draft";
      const pending: CampaignStatus = "pending";
      const active: CampaignStatus = "active";
      const paused: CampaignStatus = "paused";
      const completed: CampaignStatus = "completed";
      const error: CampaignStatus = "error";

      expect(draft).toBe("draft");
      expect(pending).toBe("pending");
      expect(active).toBe("active");
      expect(paused).toBe("paused");
      expect(completed).toBe("completed");
      expect(error).toBe("error");
    });
  });

  describe("KeywordMatchType", () => {
    it("should include broad, phrase, and exact", () => {
      const broad: KeywordMatchType = "broad";
      const phrase: KeywordMatchType = "phrase";
      const exact: KeywordMatchType = "exact";

      expect(broad).toBe("broad");
      expect(phrase).toBe("phrase");
      expect(exact).toBe("exact");
    });
  });
});

describe("CampaignSet Interface", () => {
  it("should have all required properties", () => {
    const campaignSet: CampaignSet = {
      id: "cs-123",
      userId: "user-456",
      name: "Test Campaign Set",
      config: {
        dataSourceId: "ds-789",
        availableColumns: ["product", "price"],
        selectedPlatforms: ["google"],
        selectedAdTypes: { google: [] },
        campaignConfig: { namePattern: "{product}-campaign" },
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: "{product}-{category}",
              keywords: [],
              ads: [{ headline: "Test Ad", description: "Test description" }],
            },
          ],
        },
        generatedAt: new Date().toISOString(),
        rowCount: 100,
        campaignCount: 10,
      },
      campaigns: [],
      status: "draft",
      syncStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(campaignSet.id).toBe("cs-123");
    expect(campaignSet.userId).toBe("user-456");
    expect(campaignSet.name).toBe("Test Campaign Set");
    expect(campaignSet.status).toBe("draft");
    expect(campaignSet.syncStatus).toBe("pending");
    expect(Array.isArray(campaignSet.campaigns)).toBe(true);
  });

  it("should allow optional properties", () => {
    const minimalCampaignSet: CampaignSet = {
      id: "cs-123",
      userId: "user-456",
      name: "Minimal Set",
      config: {
        dataSourceId: "ds-789",
        availableColumns: [],
        selectedPlatforms: [],
        selectedAdTypes: {},
        campaignConfig: { namePattern: "" },
        hierarchyConfig: {
          adGroups: [],
        },
        generatedAt: new Date().toISOString(),
        rowCount: 0,
        campaignCount: 0,
      },
      campaigns: [],
      status: "draft",
      syncStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Optional properties should be undefined
    expect(minimalCampaignSet.description).toBeUndefined();
    expect(minimalCampaignSet.dataSourceId).toBeUndefined();
    expect(minimalCampaignSet.templateId).toBeUndefined();
    expect(minimalCampaignSet.lastSyncedAt).toBeUndefined();
  });

  it("should use Platform type from ad-types", () => {
    const campaignSet: CampaignSet = {
      id: "cs-123",
      userId: "user-456",
      name: "Platform Test",
      config: {
        dataSourceId: "ds-789",
        availableColumns: [],
        selectedPlatforms: ["google", "reddit", "facebook"] as Platform[],
        selectedAdTypes: {},
        campaignConfig: { namePattern: "" },
        hierarchyConfig: {
          adGroups: [],
        },
        generatedAt: new Date().toISOString(),
        rowCount: 0,
        campaignCount: 0,
      },
      campaigns: [],
      status: "draft",
      syncStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(campaignSet.config.selectedPlatforms).toEqual([
      "google",
      "reddit",
      "facebook",
    ]);
  });
});

describe("CampaignSetConfig Interface", () => {
  it("should contain all wizard configuration fields", () => {
    const config: CampaignSetConfig = {
      dataSourceId: "ds-123",
      availableColumns: ["col1", "col2", "col3"],
      selectedPlatforms: ["google", "reddit"],
      selectedAdTypes: {
        google: [],
        reddit: [],
      },
      campaignConfig: {
        namePattern: "{brand}-{product}",
      },
      hierarchyConfig: {
        adGroups: [
          {
            namePattern: "{brand}-{product}",
            keywords: [],
            ads: [{ headline: "{brand} Ad", description: "Shop {product}" }],
          },
        ],
      },
      generatedAt: new Date().toISOString(),
      rowCount: 50,
      campaignCount: 5,
    };

    expect(config.dataSourceId).toBe("ds-123");
    expect(config.availableColumns).toHaveLength(3);
    expect(config.selectedPlatforms).toContain("google");
    expect(config.campaignConfig.namePattern).toBe("{brand}-{product}");
    expect(config.rowCount).toBe(50);
  });

  it("should allow optional budget configuration", () => {
    const configWithBudget: CampaignSetConfig = {
      dataSourceId: "ds-123",
      availableColumns: [],
      selectedPlatforms: [],
      selectedAdTypes: {},
      campaignConfig: { namePattern: "" },
      budgetConfig: {
        type: "daily",
        amountPattern: "100",
        currency: "USD",
      },
      hierarchyConfig: {
        adGroups: [],
      },
      generatedAt: new Date().toISOString(),
      rowCount: 0,
      campaignCount: 0,
    };

    expect(configWithBudget.budgetConfig?.type).toBe("daily");
  });

  it("should allow optional targeting configuration", () => {
    const configWithTargeting: CampaignSetConfig = {
      dataSourceId: "ds-123",
      availableColumns: [],
      selectedPlatforms: [],
      selectedAdTypes: {},
      campaignConfig: { namePattern: "" },
      targetingConfig: {
        locations: [
          { type: "country", value: "US", name: "United States", include: true },
        ],
      },
      hierarchyConfig: {
        adGroups: [],
      },
      generatedAt: new Date().toISOString(),
      rowCount: 0,
      campaignCount: 0,
    };

    expect(configWithTargeting.targetingConfig?.locations).toHaveLength(1);
  });
});

describe("Campaign Interface", () => {
  it("should have all required properties", () => {
    const campaign: Campaign = {
      id: "camp-123",
      campaignSetId: "cs-456",
      name: "Test Campaign",
      platform: "google",
      orderIndex: 0,
      status: "draft",
      syncStatus: "pending",
      adGroups: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(campaign.id).toBe("camp-123");
    expect(campaign.campaignSetId).toBe("cs-456");
    expect(campaign.platform).toBe("google");
    expect(campaign.orderIndex).toBe(0);
  });

  it("should allow optional platform-specific fields", () => {
    const campaign: Campaign = {
      id: "camp-123",
      campaignSetId: "cs-456",
      name: "Synced Campaign",
      platform: "google",
      orderIndex: 0,
      status: "active",
      syncStatus: "synced",
      platformCampaignId: "google-12345",
      platformData: { googleSpecificField: "value" },
      lastSyncedAt: new Date(),
      adGroups: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(campaign.platformCampaignId).toBe("google-12345");
    expect(campaign.platformData?.googleSpecificField).toBe("value");
    expect(campaign.lastSyncedAt).toBeInstanceOf(Date);
  });

  it("should allow optional budget override", () => {
    const campaign: Campaign = {
      id: "camp-123",
      campaignSetId: "cs-456",
      name: "Campaign with Budget",
      platform: "google",
      orderIndex: 0,
      status: "draft",
      syncStatus: "pending",
      budget: {
        type: "daily",
        amount: 100,
        currency: "USD",
      },
      adGroups: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(campaign.budget?.amount).toBe(100);
    expect(campaign.budget?.type).toBe("daily");
  });

  it("should allow sync error message", () => {
    const campaign: Campaign = {
      id: "camp-123",
      campaignSetId: "cs-456",
      name: "Failed Campaign",
      platform: "google",
      orderIndex: 0,
      status: "error",
      syncStatus: "failed",
      syncError: "API rate limit exceeded",
      adGroups: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(campaign.syncError).toBe("API rate limit exceeded");
  });
});

describe("AdGroup Interface", () => {
  it("should have all required properties", () => {
    const adGroup: AdGroup = {
      id: "ag-123",
      campaignId: "camp-456",
      name: "Test Ad Group",
      orderIndex: 0,
      status: "active",
      ads: [],
      keywords: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(adGroup.id).toBe("ag-123");
    expect(adGroup.campaignId).toBe("camp-456");
    expect(adGroup.name).toBe("Test Ad Group");
  });

  it("should allow optional settings", () => {
    const adGroup: AdGroup = {
      id: "ag-123",
      campaignId: "camp-456",
      name: "Ad Group with Settings",
      orderIndex: 0,
      settings: {
        targeting: { locations: [] },
        bidding: { strategy: "manual_cpc" },
      },
      status: "active",
      ads: [],
      keywords: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(adGroup.settings?.targeting).toBeDefined();
    expect(adGroup.settings?.bidding).toBeDefined();
  });

  it("should contain ads and keywords arrays", () => {
    const ad: Ad = {
      id: "ad-1",
      adGroupId: "ag-123",
      orderIndex: 0,
      headline: "Test Headline",
      description: "Test Description",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const keyword: Keyword = {
      id: "kw-1",
      adGroupId: "ag-123",
      keyword: "test keyword",
      matchType: "broad",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const adGroup: AdGroup = {
      id: "ag-123",
      campaignId: "camp-456",
      name: "Ad Group with Children",
      orderIndex: 0,
      status: "active",
      ads: [ad],
      keywords: [keyword],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(adGroup.ads).toHaveLength(1);
    expect(adGroup.keywords).toHaveLength(1);
  });
});

describe("Ad Interface", () => {
  it("should have all required properties", () => {
    const ad: Ad = {
      id: "ad-123",
      adGroupId: "ag-456",
      orderIndex: 0,
      headline: "Buy Now!",
      description: "Great deals await",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(ad.id).toBe("ad-123");
    expect(ad.headline).toBe("Buy Now!");
    expect(ad.description).toBe("Great deals await");
  });

  it("should allow optional URL fields", () => {
    const ad: Ad = {
      id: "ad-123",
      adGroupId: "ag-456",
      orderIndex: 0,
      headline: "Visit Us",
      description: "Click to learn more",
      displayUrl: "example.com/deals",
      finalUrl: "https://example.com/deals?utm_source=ad",
      callToAction: "Shop Now",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(ad.displayUrl).toBe("example.com/deals");
    expect(ad.finalUrl).toContain("utm_source");
    expect(ad.callToAction).toBe("Shop Now");
  });

  it("should allow optional assets", () => {
    const ad: Ad = {
      id: "ad-123",
      adGroupId: "ag-456",
      orderIndex: 0,
      headline: "Visual Ad",
      description: "With images",
      assets: {
        images: ["img1.jpg", "img2.jpg"],
        videos: ["video1.mp4"],
        logos: ["logo.png"],
      },
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(ad.assets?.images).toHaveLength(2);
    expect(ad.assets?.videos).toHaveLength(1);
  });

  it("should allow platform-specific ID after sync", () => {
    const ad: Ad = {
      id: "ad-123",
      adGroupId: "ag-456",
      orderIndex: 0,
      headline: "Synced Ad",
      description: "Already on platform",
      platformAdId: "google-ad-789",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(ad.platformAdId).toBe("google-ad-789");
  });
});

describe("Keyword Interface", () => {
  it("should have all required properties", () => {
    const keyword: Keyword = {
      id: "kw-123",
      adGroupId: "ag-456",
      keyword: "running shoes",
      matchType: "broad",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(keyword.id).toBe("kw-123");
    expect(keyword.keyword).toBe("running shoes");
    expect(keyword.matchType).toBe("broad");
  });

  it("should allow optional bid amount", () => {
    const keyword: Keyword = {
      id: "kw-123",
      adGroupId: "ag-456",
      keyword: "premium running shoes",
      matchType: "exact",
      bid: 2.5,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(keyword.bid).toBe(2.5);
  });

  it("should allow platform-specific ID after sync", () => {
    const keyword: Keyword = {
      id: "kw-123",
      adGroupId: "ag-456",
      keyword: "test",
      matchType: "phrase",
      platformKeywordId: "google-kw-789",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(keyword.platformKeywordId).toBe("google-kw-789");
  });
});

describe("Supporting Types", () => {
  describe("AdGroupSettings", () => {
    it("should allow flexible key-value pairs", () => {
      const settings: AdGroupSettings = {
        targeting: { locations: ["US"] },
        bidding: { maxCpc: 1.5 },
        customField: "custom value",
      };

      expect(settings.targeting).toBeDefined();
      expect(settings.customField).toBe("custom value");
    });
  });

  describe("AdAssets", () => {
    it("should allow optional arrays of assets", () => {
      const assets: AdAssets = {
        images: ["img1.jpg"],
        videos: ["video.mp4"],
        logos: ["logo.png"],
        customAssets: ["custom.svg"],
      };

      expect(assets.images).toHaveLength(1);
      expect(assets.customAssets).toHaveLength(1);
    });
  });

  describe("BudgetInfo", () => {
    it("should have type, amount, and currency", () => {
      const budget: BudgetInfo = {
        type: "daily",
        amount: 100,
        currency: "USD",
      };

      expect(budget.type).toBe("daily");
      expect(budget.amount).toBe(100);
      expect(budget.currency).toBe("USD");
    });

    it("should allow lifetime and shared budget types", () => {
      const lifetime: BudgetInfo = {
        type: "lifetime",
        amount: 1000,
        currency: "EUR",
      };

      const shared: BudgetInfo = {
        type: "shared",
        amount: 500,
        currency: "GBP",
      };

      expect(lifetime.type).toBe("lifetime");
      expect(shared.type).toBe("shared");
    });
  });
});

describe("HierarchyConfigSnapshot", () => {
  it("should store hierarchy configuration from wizard with ad groups", () => {
    const hierarchyConfig: HierarchyConfigSnapshot = {
      adGroups: [
        {
          namePattern: "{brand}-{product}",
          keywords: ["keyword1", "keyword2"],
          ads: [
            {
              headline: "{brand} Sale",
              description: "Shop {product} today",
              displayUrl: "example.com",
              finalUrl: "https://example.com/{product}",
              callToAction: "Shop Now",
            },
          ],
        },
      ],
    };

    expect(hierarchyConfig.adGroups).toHaveLength(1);
    expect(hierarchyConfig.adGroups[0].namePattern).toBe("{brand}-{product}");
    expect(hierarchyConfig.adGroups[0].keywords).toEqual(["keyword1", "keyword2"]);
    expect(hierarchyConfig.adGroups[0].ads).toHaveLength(1);
  });

  it("should allow empty ad groups array", () => {
    const hierarchyConfig: HierarchyConfigSnapshot = {
      adGroups: [],
    };

    expect(hierarchyConfig.adGroups).toHaveLength(0);
  });

  it("should allow ad groups with optional keywords", () => {
    const hierarchyConfig: HierarchyConfigSnapshot = {
      adGroups: [
        {
          namePattern: "{product}",
          ads: [{ headline: "Ad headline" }],
        },
      ],
    };

    expect(hierarchyConfig.adGroups[0].keywords).toBeUndefined();
    expect(hierarchyConfig.adGroups[0].ads).toHaveLength(1);
  });
});

describe("DTO Types", () => {
  describe("CreateCampaignSetInput", () => {
    it("should exclude id, campaigns, and timestamps", () => {
      const input: CreateCampaignSetInput = {
        userId: "user-123",
        name: "New Campaign Set",
        config: {
          dataSourceId: "ds-123",
          availableColumns: [],
          selectedPlatforms: [],
          selectedAdTypes: {},
          campaignConfig: { namePattern: "" },
          hierarchyConfig: {
            adGroups: [],
          },
          generatedAt: new Date().toISOString(),
          rowCount: 0,
          campaignCount: 0,
        },
        status: "draft",
        syncStatus: "pending",
      };

      expect(input.name).toBe("New Campaign Set");
      // @ts-expect-error id should not exist on CreateCampaignSetInput
      expect(input.id).toBeUndefined();
      // @ts-expect-error campaigns should not exist on CreateCampaignSetInput
      expect(input.campaigns).toBeUndefined();
    });
  });

  describe("UpdateCampaignSetInput", () => {
    it("should make all fields optional except excluded ones", () => {
      // Can update just the name
      const nameUpdate: UpdateCampaignSetInput = {
        name: "Updated Name",
      };

      // Can update just the status
      const statusUpdate: UpdateCampaignSetInput = {
        status: "active",
      };

      // Can update multiple fields
      const multiUpdate: UpdateCampaignSetInput = {
        name: "New Name",
        description: "New Description",
        status: "paused",
      };

      expect(nameUpdate.name).toBe("Updated Name");
      expect(statusUpdate.status).toBe("active");
      expect(multiUpdate.description).toBe("New Description");
    });

    it("should not allow updating id, userId, or timestamps", () => {
      const update: UpdateCampaignSetInput = {
        name: "Test",
      };

      // These should cause type errors if attempted
      // @ts-expect-error id should not be updatable
      expect(update.id).toBeUndefined();
      // @ts-expect-error userId should not be updatable
      expect(update.userId).toBeUndefined();
      // @ts-expect-error campaigns should not be updatable
      expect(update.campaigns).toBeUndefined();
    });
  });

  describe("CreateCampaignInput", () => {
    it("should exclude id, adGroups, and timestamps", () => {
      const input: CreateCampaignInput = {
        campaignSetId: "cs-123",
        name: "New Campaign",
        platform: "google",
        orderIndex: 0,
        status: "draft",
        syncStatus: "pending",
      };

      expect(input.name).toBe("New Campaign");
      // @ts-expect-error id should not exist
      expect(input.id).toBeUndefined();
      // @ts-expect-error adGroups should not exist
      expect(input.adGroups).toBeUndefined();
    });
  });

  describe("CreateAdGroupInput", () => {
    it("should exclude id, ads, keywords, and timestamps", () => {
      const input: CreateAdGroupInput = {
        campaignId: "camp-123",
        name: "New Ad Group",
        orderIndex: 0,
        status: "active",
      };

      expect(input.name).toBe("New Ad Group");
      // @ts-expect-error id should not exist
      expect(input.id).toBeUndefined();
      // @ts-expect-error ads should not exist
      expect(input.ads).toBeUndefined();
      // @ts-expect-error keywords should not exist
      expect(input.keywords).toBeUndefined();
    });
  });

  describe("CreateAdInput", () => {
    it("should exclude id and timestamps", () => {
      const input: CreateAdInput = {
        adGroupId: "ag-123",
        orderIndex: 0,
        headline: "New Ad",
        description: "Description",
        status: "active",
      };

      expect(input.headline).toBe("New Ad");
      // @ts-expect-error id should not exist
      expect(input.id).toBeUndefined();
    });
  });

  describe("CreateKeywordInput", () => {
    it("should exclude id and timestamps", () => {
      const input: CreateKeywordInput = {
        adGroupId: "ag-123",
        keyword: "new keyword",
        matchType: "broad",
        status: "active",
      };

      expect(input.keyword).toBe("new keyword");
      // @ts-expect-error id should not exist
      expect(input.id).toBeUndefined();
    });
  });
});

describe("Type Compatibility with Database Schema", () => {
  it("should have status values matching database enum", () => {
    // These should match the values in packages/database/src/schema/campaign-sets.ts
    const statuses: CampaignSetStatus[] = [
      "draft",
      "pending",
      "syncing",
      "active",
      "paused",
      "completed",
      "archived",
      "error",
    ];

    expect(statuses).toHaveLength(8);
  });

  it("should have sync status values matching database enum", () => {
    // These should match the values in packages/database/src/schema/campaign-sets.ts
    const syncStatuses: CampaignSetSyncStatus[] = [
      "pending",
      "syncing",
      "synced",
      "failed",
      "conflict",
    ];

    expect(syncStatuses).toHaveLength(5);
  });

  it("should have entity status values matching database enum", () => {
    // These should match the values in packages/database/src/schema/ad-groups.ts
    const entityStatuses: EntityStatus[] = ["active", "paused", "removed"];

    expect(entityStatuses).toHaveLength(3);
  });

  it("should have keyword match types matching database enum", () => {
    // These should match the values in packages/database/src/schema/keywords.ts
    const matchTypes: KeywordMatchType[] = ["broad", "phrase", "exact"];

    expect(matchTypes).toHaveLength(3);
  });
});

describe("Type Integration with Existing Core Types", () => {
  it("should use Platform from ad-types", () => {
    const platforms: Platform[] = ["google", "reddit", "facebook"];

    const config: CampaignSetConfig = {
      dataSourceId: "ds-123",
      availableColumns: [],
      selectedPlatforms: platforms,
      selectedAdTypes: {
        google: [],
        reddit: [],
        facebook: [],
      },
      campaignConfig: { namePattern: "" },
      hierarchyConfig: {
        adGroups: [],
      },
      generatedAt: new Date().toISOString(),
      rowCount: 0,
      campaignCount: 0,
    };

    expect(config.selectedPlatforms).toEqual(platforms);
  });

  it("should accept BudgetConfig from budget types", () => {
    const budgetConfig: BudgetConfig = {
      type: "daily",
      amountPattern: "100",
      currency: "USD",
    };

    const config: CampaignSetConfig = {
      dataSourceId: "ds-123",
      availableColumns: [],
      selectedPlatforms: [],
      selectedAdTypes: {},
      campaignConfig: { namePattern: "" },
      budgetConfig,
      hierarchyConfig: {
        adGroups: [],
      },
      generatedAt: new Date().toISOString(),
      rowCount: 0,
      campaignCount: 0,
    };

    expect(config.budgetConfig).toBe(budgetConfig);
  });

  it("should accept TargetingConfig from targeting types", () => {
    const targetingConfig: TargetingConfig = {
      locations: [
        { type: "country", value: "US", name: "United States", include: true },
      ],
    };

    const config: CampaignSetConfig = {
      dataSourceId: "ds-123",
      availableColumns: [],
      selectedPlatforms: [],
      selectedAdTypes: {},
      campaignConfig: { namePattern: "" },
      targetingConfig,
      hierarchyConfig: {
        adGroups: [],
      },
      generatedAt: new Date().toISOString(),
      rowCount: 0,
      campaignCount: 0,
    };

    expect(config.targetingConfig).toBe(targetingConfig);
  });
});
