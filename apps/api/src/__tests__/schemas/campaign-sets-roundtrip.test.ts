/**
 * Round-trip persistence tests for CampaignSetConfig
 *
 * These tests verify that all enhanced config fields are properly preserved
 * when going through the API schema validation (simulating save and retrieve).
 */
import { describe, it, expect } from "vitest";
import {
  campaignSetConfigSchema,
  createCampaignSetRequestSchema,
  type CampaignSetConfig,
} from "../../schemas/campaign-sets.js";

// ============================================================================
// Test Fixtures - Complete Wizard State
// ============================================================================

/**
 * Complete wizard state config that matches what the frontend would send
 * when saving a fully-configured campaign set.
 */
const completeWizardConfig: CampaignSetConfig = {
  // Core required fields
  dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
  availableColumns: [
    { name: "product_name", type: "string", sampleValues: ["Nike Air Max", "Adidas Ultra"] },
    { name: "price", type: "number", sampleValues: ["99.99", "149.99"] },
    { name: "in_stock", type: "boolean", sampleValues: ["true", "false"] },
    { name: "brand", type: "string", sampleValues: ["Nike", "Adidas"] },
    { name: "category", type: "string", sampleValues: ["Running", "Lifestyle"] },
  ],
  selectedPlatforms: ["google", "reddit"],
  selectedAdTypes: {
    google: ["responsive-search", "responsive-display"],
    reddit: ["text", "image"],
  },
  campaignConfig: {
    namePattern: "{brand}-{category}-campaign",
    objective: "conversions",
  },
  hierarchyConfig: {
    adGroups: [
      {
        id: "adgroup-uuid-1",
        namePattern: "{product_name}-adgroup",
        keywords: ["buy {product_name}", "{product_name} sale", "cheap {product_name}"],
        ads: [
          {
            id: "ad-uuid-1",
            headline: "{product_name} - On Sale Now",
            headlineFallback: "truncate",
            description: "Get the best deals on {product_name}. Shop now for {price}!",
            descriptionFallback: "truncate_word",
            displayUrl: "example.com/{category}",
            finalUrl: "https://example.com/products/{product_name}",
            callToAction: "Shop Now",
          },
          {
            id: "ad-uuid-2",
            headline: "{brand} {product_name}",
            description: "Premium {category} shoes starting at {price}",
            descriptionFallback: "truncate",
          },
        ],
      },
      {
        id: "adgroup-uuid-2",
        namePattern: "{brand}-brand-adgroup",
        ads: [
          {
            id: "ad-uuid-3",
            headline: "Shop {brand} Collection",
            description: "Explore our full range of {brand} products",
          },
        ],
      },
    ],
  },
  generatedAt: "2024-12-27T10:30:00.000Z",
  rowCount: 50,
  campaignCount: 100,

  // Per-platform budgets
  platformBudgets: {
    google: {
      type: "daily",
      amountPattern: "{daily_budget}",
      currency: "USD",
      pacing: "standard",
    },
    reddit: {
      type: "lifetime",
      amountPattern: "5000",
      currency: "USD",
    },
    facebook: null, // Not configured
  },

  // Legacy budget config (should still be preserved for backwards compat)
  budgetConfig: {
    type: "daily",
    amountPattern: "100",
    currency: "USD",
  },

  // Bidding config per platform
  biddingConfig: {
    google: {
      strategy: "maximize_conversions",
      targetCpa: "50",
    },
    reddit: {
      strategy: "reddit_cpc",
      maxCpc: "2.50",
    },
  },

  // Targeting config
  targetingConfig: {
    locations: [
      { type: "country", id: "US", name: "United States" },
      { type: "country", id: "CA", name: "Canada" },
    ],
    demographics: {
      ageMin: 18,
      ageMax: 55,
      genders: ["all"],
    },
    interests: ["technology", "fitness", "fashion"],
  },

  // Rule template IDs
  ruleIds: ["rule-template-1", "rule-template-2"],

  // Enhanced inline rules
  inlineRules: [
    {
      id: "rule-1",
      name: "Skip out of stock",
      enabled: true,
      logic: "AND",
      conditions: [
        { id: "cond-1", field: "in_stock", operator: "equals", value: "false" },
      ],
      actions: [{ id: "action-1", type: "skip" }],
    },
    {
      id: "rule-2",
      name: "Set default brand",
      enabled: true,
      logic: "OR",
      conditions: [
        { id: "cond-2", field: "brand", operator: "is_empty", value: "" },
      ],
      actions: [
        { id: "action-2", type: "set_field", field: "brand", value: "Generic" },
      ],
    },
  ],

  // Thread config for Reddit
  threadConfig: {
    post: {
      title: "Just got my new {product_name} - thoughts?",
      body: "Been eyeing the {product_name} for a while and finally pulled the trigger at {price}. What do you all think of this in the {category} space?",
      type: "text",
      subreddit: "sneakers",
      flair: "Pickup",
      sendReplies: true,
    },
    comments: [
      {
        id: "comment-1",
        parentId: null,
        persona: "op",
        body: "Happy to answer any questions!",
        depth: 0,
        sortOrder: 0,
      },
      {
        id: "comment-2",
        parentId: null,
        persona: "curious",
        body: "How's the comfort compared to other {brand} models?",
        depth: 0,
        sortOrder: 1,
      },
      {
        id: "comment-3",
        parentId: "comment-2",
        persona: "op",
        body: "Super comfortable! Best {category} shoe I've owned.",
        depth: 1,
        sortOrder: 2,
      },
      {
        id: "comment-4",
        parentId: null,
        persona: "enthusiast",
        body: "Great pickup! {brand} never disappoints.",
        depth: 0,
        sortOrder: 3,
      },
    ],
    personas: [
      {
        id: "op",
        name: "Original Poster",
        description: "The person who bought the product",
        role: "op",
        tone: "friendly",
      },
      {
        id: "curious",
        name: "Curious User",
        description: "Asks questions about the product",
        role: "curious",
        tone: "neutral",
      },
      {
        id: "enthusiast",
        name: "Brand Fan",
        description: "Positive supporter of the brand",
        role: "enthusiast",
        tone: "enthusiastic",
      },
    ],
  },
};

// ============================================================================
// Round-Trip Tests
// ============================================================================

describe("Campaign Set Config Round-Trip Persistence", () => {
  describe("Complete Wizard State", () => {
    it("should preserve all fields after parsing through config schema", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const parsed = result.data;

      // Core fields
      expect(parsed.dataSourceId).toBe(completeWizardConfig.dataSourceId);
      expect(parsed.selectedPlatforms).toEqual(completeWizardConfig.selectedPlatforms);
      expect(parsed.selectedAdTypes).toEqual(completeWizardConfig.selectedAdTypes);
      expect(parsed.generatedAt).toBe(completeWizardConfig.generatedAt);
      expect(parsed.rowCount).toBe(completeWizardConfig.rowCount);
      expect(parsed.campaignCount).toBe(completeWizardConfig.campaignCount);
    });

    it("should preserve availableColumns with type information", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const columns = result.data.availableColumns;
      expect(columns).toHaveLength(5);

      // Type should be preserved when using object format
      if (typeof columns[0] === "object" && "type" in columns[0]) {
        expect(columns[0].name).toBe("product_name");
        expect(columns[0].type).toBe("string");
        expect(columns[0].sampleValues).toEqual(["Nike Air Max", "Adidas Ultra"]);
      }
    });

    it("should preserve campaignConfig with objective", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.campaignConfig.namePattern).toBe("{brand}-{category}-campaign");
      expect(result.data.campaignConfig.objective).toBe("conversions");
    });

    it("should preserve hierarchyConfig with IDs and fallback strategies", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const { hierarchyConfig } = result.data;
      expect(hierarchyConfig.adGroups).toHaveLength(2);

      // First ad group
      const adGroup1 = hierarchyConfig.adGroups[0];
      expect(adGroup1?.id).toBe("adgroup-uuid-1");
      expect(adGroup1?.namePattern).toBe("{product_name}-adgroup");
      expect(adGroup1?.keywords).toEqual(["buy {product_name}", "{product_name} sale", "cheap {product_name}"]);

      // First ad in first ad group
      const ad1 = adGroup1?.ads[0];
      expect(ad1?.id).toBe("ad-uuid-1");
      expect(ad1?.headline).toBe("{product_name} - On Sale Now");
      expect(ad1?.headlineFallback).toBe("truncate");
      expect(ad1?.descriptionFallback).toBe("truncate_word");
      expect(ad1?.callToAction).toBe("Shop Now");

      // Second ad group
      const adGroup2 = hierarchyConfig.adGroups[1];
      expect(adGroup2?.id).toBe("adgroup-uuid-2");
    });

    it("should preserve platformBudgets with null values", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const { platformBudgets } = result.data;
      expect(platformBudgets).toBeDefined();

      // Google budget
      expect(platformBudgets?.google).toEqual({
        type: "daily",
        amountPattern: "{daily_budget}",
        currency: "USD",
        pacing: "standard",
      });

      // Reddit budget
      expect(platformBudgets?.reddit).toEqual({
        type: "lifetime",
        amountPattern: "5000",
        currency: "USD",
      });

      // Facebook should be null
      expect(platformBudgets?.facebook).toBeNull();
    });

    it("should preserve legacy budgetConfig for backwards compatibility", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.budgetConfig).toEqual({
        type: "daily",
        amountPattern: "100",
        currency: "USD",
      });
    });

    it("should preserve biddingConfig per platform", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.biddingConfig).toEqual({
        google: {
          strategy: "maximize_conversions",
          targetCpa: "50",
        },
        reddit: {
          strategy: "reddit_cpc",
          maxCpc: "2.50",
        },
      });
    });

    it("should preserve targetingConfig structure", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.targetingConfig).toEqual({
        locations: [
          { type: "country", id: "US", name: "United States" },
          { type: "country", id: "CA", name: "Canada" },
        ],
        demographics: {
          ageMin: 18,
          ageMax: 55,
          genders: ["all"],
        },
        interests: ["technology", "fitness", "fashion"],
      });
    });

    it("should preserve ruleIds array", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.ruleIds).toEqual(["rule-template-1", "rule-template-2"]);
    });

    it("should preserve enhanced inlineRules with conditions and actions", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const { inlineRules } = result.data;
      expect(inlineRules).toHaveLength(2);

      // First rule - skip out of stock
      const rule1 = inlineRules?.[0];
      expect(rule1).toMatchObject({
        id: "rule-1",
        name: "Skip out of stock",
        enabled: true,
        logic: "AND",
      });

      // Check conditions and actions are preserved
      if (rule1 && "conditions" in rule1) {
        expect(rule1.conditions).toHaveLength(1);
        expect(rule1.conditions[0]).toEqual({
          id: "cond-1",
          field: "in_stock",
          operator: "equals",
          value: "false",
        });
        expect(rule1.actions).toHaveLength(1);
        expect(rule1.actions[0]).toEqual({
          id: "action-1",
          type: "skip",
        });
      }

      // Second rule - set default brand
      const rule2 = inlineRules?.[1];
      expect(rule2).toMatchObject({
        id: "rule-2",
        name: "Set default brand",
        logic: "OR",
      });

      if (rule2 && "actions" in rule2) {
        expect(rule2.actions[0]).toMatchObject({
          type: "set_field",
          field: "brand",
          value: "Generic",
        });
      }
    });

    it("should preserve threadConfig for Reddit", () => {
      const result = campaignSetConfigSchema.safeParse(completeWizardConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const { threadConfig } = result.data;
      expect(threadConfig).toBeDefined();

      // Post config
      expect(threadConfig?.post).toMatchObject({
        title: "Just got my new {product_name} - thoughts?",
        type: "text",
        subreddit: "sneakers",
        flair: "Pickup",
        sendReplies: true,
      });

      // Comments
      expect(threadConfig?.comments).toHaveLength(4);
      expect(threadConfig?.comments[0]).toMatchObject({
        id: "comment-1",
        parentId: null,
        persona: "op",
        depth: 0,
      });

      // Nested comment (reply)
      expect(threadConfig?.comments[2]).toMatchObject({
        id: "comment-3",
        parentId: "comment-2",
        depth: 1,
      });

      // Personas
      expect(threadConfig?.personas).toHaveLength(3);
      expect(threadConfig?.personas[0]).toMatchObject({
        id: "op",
        name: "Original Poster",
        role: "op",
        tone: "friendly",
      });
    });
  });

  describe("Create Request Round-Trip", () => {
    it("should accept complete config in create request", () => {
      const createRequest = {
        name: "Test Campaign Set",
        description: "Full wizard configuration test",
        config: completeWizardConfig,
      };

      const result = createCampaignSetRequestSchema.safeParse(createRequest);
      expect(result.success).toBe(true);
      if (!result.success) return;

      // Verify config is preserved in request
      expect(result.data.name).toBe("Test Campaign Set");
      expect(result.data.config.platformBudgets).toBeDefined();
      expect(result.data.config.threadConfig).toBeDefined();
      expect(result.data.config.ruleIds).toBeDefined();
    });
  });

  describe("Backwards Compatibility", () => {
    it("should accept legacy config format without new fields", () => {
      const legacyConfig = {
        dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        availableColumns: ["product", "price"],
        selectedPlatforms: ["google"],
        selectedAdTypes: { google: ["search"] },
        campaignConfig: { namePattern: "{product}-campaign" },
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: "{product}",
              ads: [{ headline: "Test", description: "Test" }],
            },
          ],
        },
        generatedAt: new Date().toISOString(),
        rowCount: 10,
        campaignCount: 5,
      };

      const result = campaignSetConfigSchema.safeParse(legacyConfig);
      expect(result.success).toBe(true);
    });

    it("should accept legacy inline rules format", () => {
      const legacyConfig = {
        dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        availableColumns: ["product", "price"],
        selectedPlatforms: ["google"],
        selectedAdTypes: { google: ["search"] },
        campaignConfig: { namePattern: "{product}-campaign" },
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: "{product}",
              ads: [{ headline: "Test", description: "Test" }],
            },
          ],
        },
        inlineRules: [
          { field: "price", operator: "less_than", value: 50, enabled: true },
        ],
        generatedAt: new Date().toISOString(),
        rowCount: 10,
        campaignCount: 5,
      };

      const result = campaignSetConfigSchema.safeParse(legacyConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      // Legacy format should be preserved
      expect(result.data.inlineRules).toHaveLength(1);
    });

    it("should accept mixed inline rules (legacy and enhanced)", () => {
      const mixedConfig = {
        dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        availableColumns: ["product", "price"],
        selectedPlatforms: ["google"],
        selectedAdTypes: { google: ["search"] },
        campaignConfig: { namePattern: "{product}-campaign" },
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: "{product}",
              ads: [{ headline: "Test", description: "Test" }],
            },
          ],
        },
        inlineRules: [
          // Legacy format
          { field: "price", operator: "less_than", value: 50, enabled: true },
          // Enhanced format
          {
            id: "rule-1",
            name: "Skip expensive",
            enabled: true,
            logic: "AND",
            conditions: [{ id: "c1", field: "price", operator: "greater_than", value: "1000" }],
            actions: [{ id: "a1", type: "skip" }],
          },
        ],
        generatedAt: new Date().toISOString(),
        rowCount: 10,
        campaignCount: 5,
      };

      const result = campaignSetConfigSchema.safeParse(mixedConfig);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.inlineRules).toHaveLength(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty arrays correctly", () => {
      const config = {
        dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        availableColumns: [],
        selectedPlatforms: [],
        selectedAdTypes: {},
        campaignConfig: { namePattern: "" },
        hierarchyConfig: { adGroups: [] },
        generatedAt: new Date().toISOString(),
        rowCount: 0,
        campaignCount: 0,
        platformBudgets: {},
        ruleIds: [],
        inlineRules: [],
      };

      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should handle threadConfig with empty comments and personas", () => {
      const config = {
        dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
        availableColumns: ["product"],
        selectedPlatforms: ["reddit"],
        selectedAdTypes: { reddit: ["text"] },
        campaignConfig: { namePattern: "{product}" },
        hierarchyConfig: {
          adGroups: [
            { namePattern: "test", ads: [{ headline: "test", description: "test" }] },
          ],
        },
        generatedAt: new Date().toISOString(),
        rowCount: 1,
        campaignCount: 1,
        threadConfig: {
          post: {
            title: "Test Post",
            type: "text",
            subreddit: "test",
          },
          comments: [],
          personas: [],
        },
      };

      const result = campaignSetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.threadConfig?.comments).toEqual([]);
      expect(result.data.threadConfig?.personas).toEqual([]);
    });

    it("should handle all persona roles and tones", () => {
      const roles = ["op", "community_member", "skeptic", "enthusiast", "expert", "curious", "moderator"];
      const tones = ["friendly", "skeptical", "enthusiastic", "neutral", "curious"];

      for (const role of roles) {
        for (const tone of tones) {
          const config = {
            dataSourceId: "test",
            availableColumns: ["x"],
            selectedPlatforms: ["reddit"],
            selectedAdTypes: { reddit: ["text"] },
            campaignConfig: { namePattern: "x" },
            hierarchyConfig: { adGroups: [{ namePattern: "x", ads: [{ headline: "x", description: "x" }] }] },
            generatedAt: new Date().toISOString(),
            rowCount: 1,
            campaignCount: 1,
            threadConfig: {
              post: { title: "x", type: "text", subreddit: "x" },
              comments: [],
              personas: [{ id: "p1", name: "Test", description: "Test", role, tone }],
            },
          };

          const result = campaignSetConfigSchema.safeParse(config);
          expect(result.success).toBe(true);
        }
      }
    });
  });
});
