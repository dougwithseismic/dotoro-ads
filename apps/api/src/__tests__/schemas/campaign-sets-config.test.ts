/**
 * Tests for CampaignSetConfig schema validation
 *
 * These tests ensure that the CampaignSetConfig schema supports all fields
 * necessary for round-trip editing of campaign sets via the wizard.
 *
 * TDD: These tests are written BEFORE implementation to define expected behavior.
 */
import { describe, it, expect } from "vitest";
import {
  campaignSetConfigSchema,
  type CampaignSetConfig,
} from "../../schemas/campaign-sets.js";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Minimal valid config that should pass validation
 */
const minimalValidConfig: CampaignSetConfig = {
  dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
  availableColumns: ["product", "price"],
  selectedPlatforms: ["google"],
  selectedAdTypes: { google: ["search"] },
  campaignConfig: { namePattern: "{product}-campaign" },
  hierarchyConfig: {
    adGroups: [
      {
        namePattern: "{product}-adgroup",
        ads: [{ headline: "{product}", description: "Buy {product}" }],
      },
    ],
  },
  generatedAt: new Date().toISOString(),
  rowCount: 10,
  campaignCount: 5,
};

/**
 * Complete config with all optional fields for round-trip editing
 */
const completeConfig: CampaignSetConfig = {
  ...minimalValidConfig,
  // Platform-specific budgets (new field)
  platformBudgets: {
    google: {
      type: "daily",
      amountPattern: "{budget}",
      currency: "USD",
      pacing: "standard",
    },
    reddit: {
      type: "lifetime",
      amountPattern: "1000",
      currency: "USD",
    },
    facebook: null, // No budget configured for this platform
  },
  // Thread configuration for Reddit (new field)
  threadConfig: {
    post: {
      title: "{headline}",
      body: "{description}",
      type: "text",
      subreddit: "{target_subreddit}",
      sendReplies: true,
    },
    comments: [
      {
        id: "comment-1",
        parentId: null,
        persona: "op",
        body: "Thanks for checking this out!",
        depth: 0,
        sortOrder: 0,
      },
    ],
    personas: [
      {
        id: "op",
        name: "Original Poster",
        description: "The person who created the thread",
        role: "op",
        tone: "friendly",
      },
    ],
  },
  // Rule template IDs (new field)
  ruleIds: ["rule-template-1", "rule-template-2"],
  // Full inline rules with conditions and actions (enhanced field)
  inlineRules: [
    {
      id: "rule-1",
      name: "Skip low budget",
      enabled: true,
      logic: "AND",
      conditions: [
        { id: "cond-1", field: "budget", operator: "less_than", value: "50" },
      ],
      actions: [{ id: "action-1", type: "skip" }],
    },
  ],
  // Campaign config with objective (enhanced field)
  campaignConfig: {
    namePattern: "{product}-campaign",
    objective: "conversions",
  },
  // Available columns with type information (enhanced field)
  availableColumns: [
    { name: "product", type: "string", sampleValues: ["Nike", "Adidas"] },
    { name: "price", type: "number", sampleValues: ["99.99", "149.99"] },
  ] as unknown as string[], // Type assertion to match current schema expectation
  // Hierarchy config with IDs and fallback strategies (enhanced field)
  hierarchyConfig: {
    adGroups: [
      {
        id: "adgroup-1",
        namePattern: "{product}-adgroup",
        keywords: ["buy {product}", "cheap {product}"],
        ads: [
          {
            id: "ad-1",
            headline: "{product}",
            headlineFallback: "truncate",
            description: "Buy {product} now!",
            descriptionFallback: "truncate_word",
            displayUrl: "example.com/{product}",
            finalUrl: "https://example.com/{product}",
            callToAction: "Shop Now",
          },
        ],
      },
    ],
  },
  // Targeting config (already exists but verify structure)
  targetingConfig: {
    locations: [{ type: "country", id: "US", name: "United States" }],
    demographics: { ageMin: 18, ageMax: 65 },
    interests: ["technology", "gaming"],
  },
  // Bidding config per platform (already exists)
  biddingConfig: {
    google: { strategy: "maximize_conversions" },
    reddit: { strategy: "reddit_cpc", maxCpc: "2.50" },
  },
};

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("CampaignSetConfig Schema Validation", () => {
  describe("Minimal Config", () => {
    it("should accept minimal valid config with required fields only", () => {
      const result = campaignSetConfigSchema.safeParse(minimalValidConfig);
      expect(result.success).toBe(true);
    });

    it("should reject config missing dataSourceId", () => {
      const { dataSourceId, ...configWithoutDataSourceId } = minimalValidConfig;
      const result = campaignSetConfigSchema.safeParse(configWithoutDataSourceId);
      expect(result.success).toBe(false);
    });

    it("should reject config missing campaignConfig", () => {
      const { campaignConfig, ...configWithoutCampaignConfig } = minimalValidConfig;
      const result = campaignSetConfigSchema.safeParse(configWithoutCampaignConfig);
      expect(result.success).toBe(false);
    });

    it("should reject config missing hierarchyConfig", () => {
      const { hierarchyConfig, ...configWithoutHierarchy } = minimalValidConfig;
      const result = campaignSetConfigSchema.safeParse(configWithoutHierarchy);
      expect(result.success).toBe(false);
    });
  });

  describe("Platform Budgets (New Field)", () => {
    it("should accept config with platformBudgets as Record<Platform, BudgetConfig | null>", () => {
      const config = {
        ...minimalValidConfig,
        platformBudgets: {
          google: {
            type: "daily",
            amountPattern: "{budget}",
            currency: "USD",
          },
          reddit: null,
          facebook: null,
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platformBudgets).toBeDefined();
        expect(result.data.platformBudgets?.google).toEqual({
          type: "daily",
          amountPattern: "{budget}",
          currency: "USD",
        });
        expect(result.data.platformBudgets?.reddit).toBeNull();
      }
    });

    it("should accept platformBudgets with pacing option", () => {
      const config = {
        ...minimalValidConfig,
        platformBudgets: {
          google: {
            type: "daily",
            amountPattern: "100",
            currency: "USD",
            pacing: "accelerated",
          },
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platformBudgets?.google?.pacing).toBe("accelerated");
      }
    });

    it("should reject invalid budget type in platformBudgets", () => {
      const config = {
        ...minimalValidConfig,
        platformBudgets: {
          google: {
            type: "invalid_type",
            amountPattern: "100",
            currency: "USD",
          },
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Thread Config (New Field)", () => {
    it("should accept config with threadConfig for Reddit threads", () => {
      const config = {
        ...minimalValidConfig,
        threadConfig: {
          post: {
            title: "{headline}",
            body: "{description}",
            type: "text",
            subreddit: "technology",
            sendReplies: true,
          },
          comments: [],
          personas: [],
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.threadConfig).toBeDefined();
        expect(result.data.threadConfig?.post.title).toBe("{headline}");
      }
    });

    it("should accept threadConfig with comments and personas", () => {
      const config = {
        ...minimalValidConfig,
        threadConfig: {
          post: {
            title: "Check out this product",
            type: "text",
            subreddit: "deals",
          },
          comments: [
            {
              id: "c1",
              parentId: null,
              persona: "enthusiast",
              body: "This is amazing!",
              depth: 0,
              sortOrder: 0,
            },
          ],
          personas: [
            {
              id: "enthusiast",
              name: "Product Fan",
              description: "Loves the product",
              role: "enthusiast",
              tone: "enthusiastic",
            },
          ],
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.threadConfig?.comments).toHaveLength(1);
        expect(result.data.threadConfig?.personas).toHaveLength(1);
      }
    });

    it("should accept all post types in threadConfig", () => {
      const postTypes = ["text", "link", "image", "video"];
      for (const postType of postTypes) {
        const config = {
          ...minimalValidConfig,
          threadConfig: {
            post: {
              title: "Test",
              type: postType,
              subreddit: "test",
            },
            comments: [],
            personas: [],
          },
        };
        const result = campaignSetConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Rule IDs (New Field)", () => {
    it("should accept config with ruleIds array", () => {
      const config = {
        ...minimalValidConfig,
        ruleIds: ["rule-1", "rule-2", "rule-3"],
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ruleIds).toEqual(["rule-1", "rule-2", "rule-3"]);
      }
    });

    it("should accept empty ruleIds array", () => {
      const config = {
        ...minimalValidConfig,
        ruleIds: [],
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Enhanced Inline Rules", () => {
    it("should accept full inline rule structure with conditions and actions", () => {
      const config = {
        ...minimalValidConfig,
        inlineRules: [
          {
            id: "rule-1",
            name: "Skip expensive items",
            enabled: true,
            logic: "AND",
            conditions: [
              { id: "c1", field: "price", operator: "greater_than", value: "1000" },
            ],
            actions: [{ id: "a1", type: "skip" }],
          },
        ],
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inlineRules?.[0]?.id).toBe("rule-1");
        expect(result.data.inlineRules?.[0]?.conditions).toHaveLength(1);
        expect(result.data.inlineRules?.[0]?.actions).toHaveLength(1);
      }
    });

    it("should accept inline rules with OR logic", () => {
      const config = {
        ...minimalValidConfig,
        inlineRules: [
          {
            id: "rule-1",
            name: "Multiple conditions",
            enabled: true,
            logic: "OR",
            conditions: [
              { id: "c1", field: "price", operator: "less_than", value: "10" },
              { id: "c2", field: "stock", operator: "equals", value: "0" },
            ],
            actions: [{ id: "a1", type: "skip" }],
          },
        ],
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept inline rules with set_field action", () => {
      const config = {
        ...minimalValidConfig,
        inlineRules: [
          {
            id: "rule-1",
            name: "Set default brand",
            enabled: true,
            logic: "AND",
            conditions: [
              { id: "c1", field: "brand", operator: "is_empty", value: "" },
            ],
            actions: [
              { id: "a1", type: "set_field", field: "brand", value: "Generic" },
            ],
          },
        ],
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Enhanced Campaign Config", () => {
    it("should accept campaignConfig with objective field", () => {
      const config = {
        ...minimalValidConfig,
        campaignConfig: {
          namePattern: "{product}-campaign",
          objective: "conversions",
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.campaignConfig.objective).toBe("conversions");
      }
    });

    it("should accept campaignConfig without objective (optional)", () => {
      const config = {
        ...minimalValidConfig,
        campaignConfig: {
          namePattern: "{product}-campaign",
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Enhanced Available Columns", () => {
    it("should accept availableColumns as array of column objects with type info", () => {
      const config = {
        ...minimalValidConfig,
        availableColumns: [
          { name: "product", type: "string", sampleValues: ["Nike", "Adidas"] },
          { name: "price", type: "number" },
          { name: "in_stock", type: "boolean" },
          { name: "created_at", type: "date" },
        ],
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        // After parsing, the structure should be preserved
        expect(result.data.availableColumns).toHaveLength(4);
      }
    });

    it("should still accept availableColumns as simple string array for backwards compatibility", () => {
      const config = {
        ...minimalValidConfig,
        availableColumns: ["product", "price", "description"],
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Enhanced Hierarchy Config", () => {
    it("should accept hierarchyConfig with ad group IDs", () => {
      const config = {
        ...minimalValidConfig,
        hierarchyConfig: {
          adGroups: [
            {
              id: "adgroup-uuid-1",
              namePattern: "{product}-adgroup",
              ads: [{ headline: "Test", description: "Test" }],
            },
          ],
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hierarchyConfig.adGroups[0]?.id).toBe("adgroup-uuid-1");
      }
    });

    it("should accept hierarchyConfig with ad IDs", () => {
      const config = {
        ...minimalValidConfig,
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: "{product}-adgroup",
              ads: [
                {
                  id: "ad-uuid-1",
                  headline: "Test",
                  description: "Test",
                },
              ],
            },
          ],
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hierarchyConfig.adGroups[0]?.ads[0]?.id).toBe("ad-uuid-1");
      }
    });

    it("should accept ads with fallback strategies", () => {
      const config = {
        ...minimalValidConfig,
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: "{product}",
              ads: [
                {
                  headline: "{very_long_headline}",
                  headlineFallback: "truncate",
                  description: "{very_long_description}",
                  descriptionFallback: "truncate_word",
                },
              ],
            },
          ],
        },
      };
      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        const ad = result.data.hierarchyConfig.adGroups[0]?.ads[0];
        expect(ad?.headlineFallback).toBe("truncate");
        expect(ad?.descriptionFallback).toBe("truncate_word");
      }
    });

    it("should accept all valid fallback strategies", () => {
      const strategies = ["truncate", "truncate_word", "error"];
      for (const strategy of strategies) {
        const config = {
          ...minimalValidConfig,
          hierarchyConfig: {
            adGroups: [
              {
                namePattern: "test",
                ads: [
                  {
                    headline: "test",
                    headlineFallback: strategy,
                    description: "test",
                  },
                ],
              },
            ],
          },
        };
        const result = campaignSetConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Complete Config (Round-Trip)", () => {
    it("should accept complete config with all fields for editing", () => {
      const result = campaignSetConfigSchema.safeParse(completeConfig);
      expect(result.success).toBe(true);
    });

    it("should preserve all fields after parsing", () => {
      const result = campaignSetConfigSchema.safeParse(completeConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify all new/enhanced fields are preserved
        expect(result.data.platformBudgets).toBeDefined();
        expect(result.data.threadConfig).toBeDefined();
        expect(result.data.ruleIds).toBeDefined();
        expect(result.data.inlineRules).toBeDefined();
        expect(result.data.campaignConfig.objective).toBeDefined();
        expect(result.data.targetingConfig).toBeDefined();
        expect(result.data.biddingConfig).toBeDefined();
      }
    });
  });

  describe("Backwards Compatibility", () => {
    it("should accept legacy config format without new fields", () => {
      // This is the format that might exist in existing database records
      const legacyConfig = {
        dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        availableColumns: ["product", "price"],
        selectedPlatforms: ["google"],
        selectedAdTypes: { google: ["search"] },
        campaignConfig: { namePattern: "{product}-campaign" },
        // Legacy single budgetConfig instead of platformBudgets
        budgetConfig: {
          type: "daily",
          amountPattern: "100",
          currency: "USD",
        },
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: "{product}",
              ads: [{ headline: "Test", description: "Test" }],
            },
          ],
        },
        // Legacy simple inlineRules format
        inlineRules: [
          { field: "price", operator: "less_than", value: 50, enabled: true },
        ],
        generatedAt: new Date().toISOString(),
        rowCount: 10,
        campaignCount: 5,
      };
      const result = campaignSetConfigSchema.safeParse(legacyConfig);
      expect(result.success).toBe(true);
    });
  });
});
