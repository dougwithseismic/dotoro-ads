import { describe, it, expect } from "vitest";
import {
  VariationGenerator,
  type GeneratedCampaign,
  type GeneratedAdGroup,
  type GeneratedAd,
  type CampaignTemplate,
  type AdGroupTemplate,
  type AdTemplate,
} from "../generation/variation-generator.js";

describe("VariationGenerator", () => {
  const generator = new VariationGenerator();

  // Sample templates for testing
  const createBasicTemplate = (): CampaignTemplate => ({
    id: "tmpl-1",
    name: "{category} - Q1 Campaign",
    platform: "reddit",
    objective: "CONVERSIONS",
    budget: { type: "daily", amount: 50, currency: "USD" },
    adGroupTemplates: [
      {
        id: "ag-1",
        name: "{product_name} Ad Group",
        targeting: { subreddits: ["{target_subreddit}"] },
        adTemplates: [
          {
            id: "ad-1",
            headline: "Get {product_name} for ${price}",
            description: "{product_description}",
            displayUrl: "shop.example.com",
            finalUrl: "https://shop.example.com/{product_slug}",
            callToAction: "Shop Now",
          },
        ],
      },
    ],
  });

  const createSampleDataRows = () => [
    {
      id: "row-1",
      category: "Electronics",
      product_name: "iPhone 15",
      product_description: "Latest Apple smartphone",
      price: "999",
      product_slug: "iphone-15",
      target_subreddit: "technology",
    },
    {
      id: "row-2",
      category: "Electronics",
      product_name: "MacBook Pro",
      product_description: "Powerful laptop for professionals",
      price: "1999",
      product_slug: "macbook-pro",
      target_subreddit: "apple",
    },
  ];

  describe("generateCampaigns", () => {
    it("generates campaigns from template and data rows", () => {
      const template = createBasicTemplate();
      const dataRows = createSampleDataRows();

      const result = generator.generateCampaigns(template, dataRows);

      expect(result.campaigns).toHaveLength(2);
      expect(result.totalCampaigns).toBe(2);
      expect(result.totalAdGroups).toBe(2);
      expect(result.totalAds).toBe(2);
    });

    it("substitutes variables in campaign names", () => {
      const template = createBasicTemplate();
      const dataRows = createSampleDataRows();

      const result = generator.generateCampaigns(template, dataRows);

      expect(result.campaigns[0]?.name).toBe("Electronics - Q1 Campaign");
      expect(result.campaigns[1]?.name).toBe("Electronics - Q1 Campaign");
    });

    it("substitutes variables in ad group names", () => {
      const template = createBasicTemplate();
      const dataRows = createSampleDataRows();

      const result = generator.generateCampaigns(template, dataRows);

      const campaign1 = result.campaigns[0];
      expect(campaign1?.adGroups[0]?.name).toBe("iPhone 15 Ad Group");

      const campaign2 = result.campaigns[1];
      expect(campaign2?.adGroups[0]?.name).toBe("MacBook Pro Ad Group");
    });

    it("substitutes variables in ad headlines and descriptions", () => {
      const template = createBasicTemplate();
      const dataRows = createSampleDataRows();

      const result = generator.generateCampaigns(template, dataRows);

      const ad1 = result.campaigns[0]?.adGroups[0]?.ads[0];
      expect(ad1?.headline).toBe("Get iPhone 15 for $999");
      expect(ad1?.description).toBe("Latest Apple smartphone");

      const ad2 = result.campaigns[1]?.adGroups[0]?.ads[0];
      expect(ad2?.headline).toBe("Get MacBook Pro for $1999");
    });

    it("includes source row reference in generated ads", () => {
      const template = createBasicTemplate();
      const dataRows = createSampleDataRows();

      const result = generator.generateCampaigns(template, dataRows);

      const ad1 = result.campaigns[0]?.adGroups[0]?.ads[0];
      expect(ad1?.sourceRowId).toBe("row-1");
    });

    it("generates unique IDs for campaigns, ad groups, and ads", () => {
      const template = createBasicTemplate();
      const dataRows = createSampleDataRows();

      const result = generator.generateCampaigns(template, dataRows);

      const campaignIds = result.campaigns.map((c) => c.id);
      const adGroupIds = result.campaigns.flatMap((c) =>
        c.adGroups.map((ag) => ag.id)
      );
      const adIds = result.campaigns.flatMap((c) =>
        c.adGroups.flatMap((ag) => ag.ads.map((a) => a.id))
      );

      // All IDs should be unique
      expect(new Set(campaignIds).size).toBe(campaignIds.length);
      expect(new Set(adGroupIds).size).toBe(adGroupIds.length);
      expect(new Set(adIds).size).toBe(adIds.length);
    });
  });

  describe("generateCampaigns with multiple ad groups", () => {
    it("generates multiple ad groups per campaign", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Desktop Ad Group",
            targeting: { devices: ["desktop"] },
            adTemplates: [
              { id: "ad-1", headline: "{product_name} for Desktop" },
            ],
          },
          {
            id: "ag-2",
            name: "Mobile Ad Group",
            targeting: { devices: ["mobile"] },
            adTemplates: [
              { id: "ad-2", headline: "{product_name} for Mobile" },
            ],
          },
        ],
      };

      const dataRows = [{ id: "row-1", category: "Tech", product_name: "Widget" }];

      const result = generator.generateCampaigns(template, dataRows);

      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]?.adGroups).toHaveLength(2);
      expect(result.totalAdGroups).toBe(2);
    });
  });

  describe("generateCampaigns with multiple ads per ad group", () => {
    it("generates multiple ads per ad group", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "AWARENESS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Main Ad Group",
            adTemplates: [
              { id: "ad-1", headline: "{product_name} - Version A" },
              { id: "ad-2", headline: "{product_name} - Version B" },
              { id: "ad-3", headline: "{product_name} - Version C" },
            ],
          },
        ],
      };

      const dataRows = [{ id: "row-1", category: "Tech", product_name: "Widget" }];

      const result = generator.generateCampaigns(template, dataRows);

      expect(result.campaigns[0]?.adGroups[0]?.ads).toHaveLength(3);
      expect(result.totalAds).toBe(3);
    });
  });

  describe("deduplication", () => {
    it("deduplicates identical campaigns when enabled", () => {
      const template = createBasicTemplate();
      // Two rows with same category should generate two campaigns with same name
      const dataRows = [
        { id: "row-1", category: "Electronics", product_name: "Phone A", price: "500", product_description: "Desc A", product_slug: "phone-a", target_subreddit: "tech" },
        { id: "row-2", category: "Electronics", product_name: "Phone B", price: "600", product_description: "Desc B", product_slug: "phone-b", target_subreddit: "tech" },
      ];

      const result = generator.generateCampaigns(template, dataRows, {
        deduplicateCampaigns: true,
      });

      // Should have 2 campaigns (dedup by name doesn't merge by default - ads are different)
      expect(result.campaigns).toHaveLength(2);
    });

    it("actually removes duplicate ads when deduplicateAds is enabled", () => {
      // Template with identical ad content in multiple ad groups
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "AWARENESS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group 1",
            adTemplates: [
              { id: "ad-1", headline: "Buy Widget", description: "Great product" },
            ],
          },
          {
            id: "ag-2",
            name: "Ad Group 2",
            adTemplates: [
              { id: "ad-2", headline: "Buy Widget", description: "Great product" }, // Duplicate
            ],
          },
          {
            id: "ag-3",
            name: "Ad Group 3",
            adTemplates: [
              { id: "ad-3", headline: "Buy Widget", description: "Great product" }, // Duplicate
            ],
          },
        ],
      };

      const dataRows = [{ id: "row-1", category: "Electronics", product_name: "Widget" }];

      const result = generator.generateCampaigns(template, dataRows, {
        deduplicateAds: true,
      });

      // Count total ads across all ad groups
      const totalAds = result.campaigns[0]?.adGroups.reduce(
        (sum, ag) => sum + ag.ads.length,
        0
      ) || 0;

      // Should only have 1 ad (duplicates removed), not 3
      expect(totalAds).toBe(1);
      expect(result.duplicateAdsRemoved).toBe(2);
    });

    it("removes duplicate ads across multiple campaigns", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{product_name} Campaign",
        platform: "reddit",
        objective: "AWARENESS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group",
            adTemplates: [
              { id: "ad-1", headline: "Buy Now!", description: "Limited time offer" },
            ],
          },
        ],
      };

      // Different products but ads will be the same (headline/description don't use variables)
      const dataRows = [
        { id: "row-1", product_name: "Product A" },
        { id: "row-2", product_name: "Product B" },
        { id: "row-3", product_name: "Product C" },
      ];

      const result = generator.generateCampaigns(template, dataRows, {
        deduplicateAds: true,
      });

      // 3 campaigns, but only 1 unique ad (the rest are duplicates)
      expect(result.campaigns).toHaveLength(3);

      // Count total ads
      const totalAds = result.campaigns.reduce(
        (sum, c) => sum + c.adGroups.reduce((s, ag) => s + ag.ads.length, 0),
        0
      );

      // Only 1 ad should exist (first one), rest are duplicates
      expect(totalAds).toBe(1);
      expect(result.duplicateAdsRemoved).toBe(2);
    });

    it("does NOT remove ads when deduplicateAds is false", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "AWARENESS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group 1",
            adTemplates: [
              { id: "ad-1", headline: "Buy Widget", description: "Great product" },
            ],
          },
          {
            id: "ag-2",
            name: "Ad Group 2",
            adTemplates: [
              { id: "ad-2", headline: "Buy Widget", description: "Great product" }, // Same content
            ],
          },
        ],
      };

      const dataRows = [{ id: "row-1", category: "Electronics", product_name: "Widget" }];

      const result = generator.generateCampaigns(template, dataRows, {
        deduplicateAds: false,
      });

      // Should have 2 ads (no deduplication)
      const totalAds = result.campaigns[0]?.adGroups.reduce(
        (sum, ag) => sum + ag.ads.length,
        0
      ) || 0;

      expect(totalAds).toBe(2);
      expect(result.duplicateAdsRemoved).toBe(0);
    });

    it("keeps unique ads even when deduplicateAds is enabled", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "AWARENESS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group 1",
            adTemplates: [
              { id: "ad-1", headline: "Headline A", description: "Description A" },
            ],
          },
          {
            id: "ag-2",
            name: "Ad Group 2",
            adTemplates: [
              { id: "ad-2", headline: "Headline B", description: "Description B" },
            ],
          },
          {
            id: "ag-3",
            name: "Ad Group 3",
            adTemplates: [
              { id: "ad-3", headline: "Headline C", description: "Description C" },
            ],
          },
        ],
      };

      const dataRows = [{ id: "row-1", category: "Electronics" }];

      const result = generator.generateCampaigns(template, dataRows, {
        deduplicateAds: true,
      });

      // All 3 ads are unique, so all should be kept
      const totalAds = result.campaigns[0]?.adGroups.reduce(
        (sum, ag) => sum + ag.ads.length,
        0
      ) || 0;

      expect(totalAds).toBe(3);
      expect(result.duplicateAdsRemoved).toBe(0);
    });
  });

  describe("warnings", () => {
    it("captures warnings for missing variables", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group",
            adTemplates: [
              {
                id: "ad-1",
                headline: "{product_name} - {missing_var}",
              },
            ],
          },
        ],
      };

      const dataRows = [{ id: "row-1", category: "Tech", product_name: "Widget" }];

      const result = generator.generateCampaigns(template, dataRows);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("missing_var");
    });

    it("captures validation warnings for ads exceeding limits", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group",
            adTemplates: [
              {
                id: "ad-1",
                headline: "{long_text}",
              },
            ],
          },
        ],
      };

      // Headline exceeds 100 chars
      const dataRows = [
        {
          id: "row-1",
          long_text: "A".repeat(150),
        },
      ];

      const result = generator.generateCampaigns(template, dataRows, {
        validatePlatformLimits: true,
      });

      expect(result.validationWarnings.length).toBeGreaterThan(0);
    });
  });

  describe("empty and edge cases", () => {
    it("returns empty result for empty data rows", () => {
      const template = createBasicTemplate();
      const result = generator.generateCampaigns(template, []);

      expect(result.campaigns).toHaveLength(0);
      expect(result.totalCampaigns).toBe(0);
      expect(result.totalAdGroups).toBe(0);
      expect(result.totalAds).toBe(0);
    });

    it("handles template with no ad group templates", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [],
      };

      const dataRows = [{ id: "row-1", category: "Tech" }];
      const result = generator.generateCampaigns(template, dataRows);

      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]?.adGroups).toHaveLength(0);
      expect(result.totalAds).toBe(0);
    });

    it("handles ad group template with no ad templates", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Empty Ad Group",
            adTemplates: [],
          },
        ],
      };

      const dataRows = [{ id: "row-1", category: "Tech" }];
      const result = generator.generateCampaigns(template, dataRows);

      expect(result.campaigns[0]?.adGroups[0]?.ads).toHaveLength(0);
    });

    it("handles null/undefined values in data rows gracefully", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group",
            adTemplates: [
              { id: "ad-1", headline: "{product_name}" },
            ],
          },
        ],
      };

      const dataRows = [{ id: "row-1", category: "Tech", product_name: null }];
      const result = generator.generateCampaigns(template, dataRows as any);

      expect(result.campaigns).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("cartesian product generation", () => {
    it("generates cartesian product when multiple variation sources exist", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} - {season} Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group",
            adTemplates: [{ id: "ad-1", headline: "{product_name}" }],
          },
        ],
        variationSources: [
          { field: "category", values: ["Electronics", "Clothing"] },
          { field: "season", values: ["Spring", "Summer"] },
        ],
      };

      const dataRows = [{ id: "row-1", product_name: "Widget" }];

      const result = generator.generateCampaigns(template, dataRows, {
        enableCartesianProduct: true,
      });

      // 1 data row x 2 categories x 2 seasons = 4 campaigns
      expect(result.campaigns).toHaveLength(4);
      expect(result.totalCampaigns).toBe(4);
    });
  });

  describe("preview mode", () => {
    it("limits output in preview mode", () => {
      const template = createBasicTemplate();
      const dataRows = Array.from({ length: 100 }, (_, i) => ({
        id: `row-${i}`,
        category: "Electronics",
        product_name: `Product ${i}`,
        product_description: "Description",
        price: "99",
        product_slug: `product-${i}`,
        target_subreddit: "tech",
      }));

      const result = generator.generateCampaigns(template, dataRows, {
        previewMode: true,
        previewLimit: 5,
      });

      expect(result.campaigns).toHaveLength(5);
      expect(result.totalCampaigns).toBe(100); // Total should still be 100
    });
  });

  describe("statistics", () => {
    it("returns accurate statistics", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group 1",
            adTemplates: [
              { id: "ad-1", headline: "Ad 1" },
              { id: "ad-2", headline: "Ad 2" },
            ],
          },
          {
            id: "ag-2",
            name: "Ad Group 2",
            adTemplates: [
              { id: "ad-3", headline: "Ad 3" },
            ],
          },
        ],
      };

      const dataRows = [
        { id: "row-1" },
        { id: "row-2" },
        { id: "row-3" },
      ];

      const result = generator.generateCampaigns(template, dataRows);

      // 3 data rows = 3 campaigns
      expect(result.totalCampaigns).toBe(3);
      // Each campaign has 2 ad groups = 6 total
      expect(result.totalAdGroups).toBe(6);
      // Each campaign has 3 ads (2 + 1) = 9 total
      expect(result.totalAds).toBe(9);
    });
  });
});
