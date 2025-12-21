import { describe, it, expect, beforeEach } from "vitest";
import {
  GenerationOrchestrator,
  type GenerationInput,
  type GenerationOutput,
  type CampaignTemplate,
} from "../generation/orchestrator.js";
import type { Rule } from "../rules/condition-schema.js";

describe("GenerationOrchestrator", () => {
  let orchestrator: GenerationOrchestrator;

  beforeEach(() => {
    orchestrator = new GenerationOrchestrator();
  });

  // Helper to create a basic template
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
        adTemplates: [
          {
            id: "ad-1",
            headline: "Get {product_name} for ${price}",
            description: "{description}",
          },
        ],
      },
    ],
  });

  // Helper to create sample data rows
  const createSampleDataRows = () => [
    {
      id: "row-1",
      category: "Electronics",
      product_name: "iPhone 15",
      description: "Latest smartphone",
      price: "999",
      stock: 50,
    },
    {
      id: "row-2",
      category: "Electronics",
      product_name: "MacBook Pro",
      description: "Powerful laptop",
      price: "1999",
      stock: 25,
    },
    {
      id: "row-3",
      category: "Accessories",
      product_name: "USB Cable",
      description: "Charging cable",
      price: "15",
      stock: 5,
    },
  ];

  describe("generate", () => {
    it("generates campaigns from template and data without rules", () => {
      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [],
      };

      const result = orchestrator.generate(input);

      expect(result.campaigns).toHaveLength(3);
      expect(result.statistics.totalCampaigns).toBe(3);
      expect(result.statistics.totalAdGroups).toBe(3);
      expect(result.statistics.totalAds).toBe(3);
    });

    it("applies skip rules to filter out rows", () => {
      const skipRule: Rule = {
        id: "rule-1",
        name: "Skip Low Stock",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "stock", operator: "less_than", value: 10 },
          ],
        },
        actions: [{ id: "a1", type: "skip" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [skipRule],
      };

      const result = orchestrator.generate(input);

      // Row 3 (USB Cable) has stock=5 < 10, should be skipped
      expect(result.campaigns).toHaveLength(2);
      expect(result.statistics.rowsSkipped).toBe(1);
    });

    it("applies set_field rules to modify data", () => {
      const modifyRule: Rule = {
        id: "rule-1",
        name: "Premium Label",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "price", operator: "greater_than", value: 1000 },
          ],
        },
        actions: [
          {
            id: "a1",
            type: "set_field",
            field: "headline_prefix",
            value: "Premium: ",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const template: CampaignTemplate = {
        ...createBasicTemplate(),
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group",
            adTemplates: [
              {
                id: "ad-1",
                headline: "{headline_prefix}{product_name}",
              },
            ],
          },
        ],
      };

      const input: GenerationInput = {
        template,
        dataRows: createSampleDataRows(),
        rules: [modifyRule],
      };

      const result = orchestrator.generate(input);

      // MacBook Pro (price=1999) should have "Premium: " prefix
      const macbookCampaign = result.campaigns.find((c) =>
        c.adGroups[0]?.ads[0]?.headline.includes("MacBook")
      );
      expect(macbookCampaign?.adGroups[0]?.ads[0]?.headline).toBe(
        "Premium: MacBook Pro"
      );

      // iPhone (price=999) should NOT have prefix
      const iphoneCampaign = result.campaigns.find((c) =>
        c.adGroups[0]?.ads[0]?.headline.includes("iPhone")
      );
      expect(iphoneCampaign?.adGroups[0]?.ads[0]?.headline).toBe("iPhone 15");
    });

    it("applies multiple rules in priority order", () => {
      // Rules are applied in priority order (lower number = higher priority = runs first)
      // When both rules match, both actions run in order, so the last one wins
      const rules: Rule[] = [
        {
          id: "rule-1",
          name: "Set Base Label",
          enabled: true,
          priority: 1, // Runs first
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              { id: "c1", field: "category", operator: "equals", value: "Electronics" },
            ],
          },
          actions: [{ id: "a1", type: "set_field", field: "label", value: "Tech" }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-2",
          name: "Override Premium Label",
          enabled: true,
          priority: 2, // Runs second, overwrites if matches
          conditionGroup: {
            id: "g2",
            logic: "AND",
            conditions: [
              { id: "c1", field: "price", operator: "greater_than", value: 1500 },
            ],
          },
          actions: [{ id: "a1", type: "set_field", field: "label", value: "Premium Tech" }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const template: CampaignTemplate = {
        ...createBasicTemplate(),
        adGroupTemplates: [
          {
            id: "ag-1",
            name: "Ad Group",
            adTemplates: [
              { id: "ad-1", headline: "{label}: {product_name}" },
            ],
          },
        ],
      };

      const input: GenerationInput = {
        template,
        dataRows: createSampleDataRows(),
        rules,
      };

      const result = orchestrator.generate(input);

      // MacBook (price=1999) matches both rules: first gets "Tech", then overwritten to "Premium Tech"
      const macbookCampaign = result.campaigns.find((c) =>
        c.adGroups[0]?.ads[0]?.headline.includes("MacBook")
      );
      expect(macbookCampaign?.adGroups[0]?.ads[0]?.headline).toBe(
        "Premium Tech: MacBook Pro"
      );

      // iPhone (price=999) only matches first rule, gets "Tech"
      const iphoneCampaign = result.campaigns.find((c) =>
        c.adGroups[0]?.ads[0]?.headline.includes("iPhone")
      );
      expect(iphoneCampaign?.adGroups[0]?.ads[0]?.headline).toBe(
        "Tech: iPhone 15"
      );
    });
  });

  describe("preview", () => {
    it("returns limited preview with statistics", () => {
      const dataRows = Array.from({ length: 100 }, (_, i) => ({
        id: `row-${i}`,
        category: "Electronics",
        product_name: `Product ${i}`,
        description: "Description",
        price: "99",
      }));

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows,
        rules: [],
      };

      const result = orchestrator.preview(input, { limit: 5 });

      expect(result.preview).toHaveLength(5);
      expect(result.statistics.totalCampaigns).toBe(100);
      expect(result.statistics.totalAdGroups).toBe(100);
      expect(result.statistics.totalAds).toBe(100);
    });

    it("returns full statistics even in preview mode", () => {
      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [],
      };

      const result = orchestrator.preview(input, { limit: 1 });

      expect(result.preview).toHaveLength(1);
      expect(result.statistics.totalCampaigns).toBe(3);
    });
  });

  describe("estimateCounts", () => {
    it("returns estimated counts without generating campaigns", () => {
      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [],
      };

      const result = orchestrator.estimateCounts(input);

      expect(result.estimatedCampaigns).toBe(3);
      expect(result.estimatedAdGroups).toBe(3);
      expect(result.estimatedAds).toBe(3);
    });

    it("accounts for skip rules in estimates", () => {
      const skipRule: Rule = {
        id: "rule-1",
        name: "Skip Accessories",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "category", operator: "equals", value: "Accessories" },
          ],
        },
        actions: [{ id: "a1", type: "skip" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [skipRule],
      };

      const result = orchestrator.estimateCounts(input);

      expect(result.estimatedCampaigns).toBe(2);
      expect(result.rowsToBeSkipped).toBe(1);
    });

    it("handles multiple ad groups and ads in estimates", () => {
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

      const input: GenerationInput = {
        template,
        dataRows: createSampleDataRows(),
        rules: [],
      };

      const result = orchestrator.estimateCounts(input);

      // 3 rows * 1 campaign each = 3 campaigns
      expect(result.estimatedCampaigns).toBe(3);
      // 3 campaigns * 2 ad groups each = 6 ad groups
      expect(result.estimatedAdGroups).toBe(6);
      // 3 campaigns * (2 + 1) ads = 9 ads
      expect(result.estimatedAds).toBe(9);
    });
  });

  describe("validation warnings", () => {
    it("captures validation warnings for platform limits", () => {
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
              { id: "ad-1", headline: "{long_text}" },
            ],
          },
        ],
      };

      const dataRows = [
        { id: "row-1", long_text: "A".repeat(150) },
      ];

      const input: GenerationInput = {
        template,
        dataRows,
        rules: [],
      };

      const result = orchestrator.generate(input, { validatePlatformLimits: true });

      expect(result.validationWarnings.length).toBeGreaterThan(0);
      expect(result.validationWarnings[0]?.field).toBe("headline");
    });

    it("captures warnings for missing variables", () => {
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
              { id: "ad-1", headline: "{missing_variable}" },
            ],
          },
        ],
      };

      const dataRows = [{ id: "row-1" }];

      const input: GenerationInput = {
        template,
        dataRows,
        rules: [],
      };

      const result = orchestrator.generate(input);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("missing_variable");
    });
  });

  describe("add_to_group actions", () => {
    it("groups campaigns by ad group action", () => {
      const groupRule: Rule = {
        id: "rule-1",
        name: "Group Electronics",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "category", operator: "equals", value: "Electronics" },
          ],
        },
        actions: [{ id: "a1", type: "add_to_group", groupName: "Tech Products" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [groupRule],
      };

      const result = orchestrator.generate(input);

      // Check that campaigns have groups assigned
      const electronicsRows = result.campaigns.filter((c) =>
        c.groups?.includes("Tech Products")
      );
      expect(electronicsRows.length).toBe(2);
    });
  });

  describe("add_tag actions", () => {
    it("adds tags to matching rows", () => {
      const tagRule: Rule = {
        id: "rule-1",
        name: "Tag Premium",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "price", operator: "greater_than", value: 500 },
          ],
        },
        actions: [{ id: "a1", type: "add_tag", tag: "premium" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [tagRule],
      };

      const result = orchestrator.generate(input);

      const premiumCampaigns = result.campaigns.filter((c) =>
        c.tags?.includes("premium")
      );
      expect(premiumCampaigns.length).toBe(2); // iPhone and MacBook
    });
  });

  describe("empty cases", () => {
    it("handles empty data rows", () => {
      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: [],
        rules: [],
      };

      const result = orchestrator.generate(input);

      expect(result.campaigns).toHaveLength(0);
      expect(result.statistics.totalCampaigns).toBe(0);
    });

    it("handles template with no ad groups", () => {
      const template: CampaignTemplate = {
        id: "tmpl-1",
        name: "{category} Campaign",
        platform: "reddit",
        objective: "CONVERSIONS",
        adGroupTemplates: [],
      };

      const input: GenerationInput = {
        template,
        dataRows: createSampleDataRows(),
        rules: [],
      };

      const result = orchestrator.generate(input);

      expect(result.campaigns).toHaveLength(3);
      expect(result.statistics.totalAds).toBe(0);
    });

    it("handles all rows being skipped", () => {
      const skipAllRule: Rule = {
        id: "rule-1",
        name: "Skip All",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [], // Empty conditions match everything
        },
        actions: [{ id: "a1", type: "skip" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [skipAllRule],
      };

      const result = orchestrator.generate(input);

      expect(result.campaigns).toHaveLength(0);
      expect(result.statistics.rowsSkipped).toBe(3);
    });
  });

  describe("disabled rules", () => {
    it("ignores disabled rules", () => {
      const disabledRule: Rule = {
        id: "rule-1",
        name: "Skip All (Disabled)",
        enabled: false,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [],
        },
        actions: [{ id: "a1", type: "skip" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows: createSampleDataRows(),
        rules: [disabledRule],
      };

      const result = orchestrator.generate(input);

      // All rows should be processed since rule is disabled
      expect(result.campaigns).toHaveLength(3);
    });
  });

  describe("metadata mapping with deduplication", () => {
    it("correctly maps metadata to campaigns using sourceRowId (not index)", () => {
      // This test verifies that when deduplication reduces the number of campaigns,
      // metadata (groups, tags, targeting) is still correctly mapped using sourceRowId
      const tagRule: Rule = {
        id: "rule-1",
        name: "Tag High Price",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "price", operator: "greater_than", value: 1000 },
          ],
        },
        actions: [{ id: "a1", type: "add_tag", tag: "expensive" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const groupRule: Rule = {
        id: "rule-2",
        name: "Group by Category",
        enabled: true,
        priority: 2,
        conditionGroup: {
          id: "g2",
          logic: "AND",
          conditions: [
            { id: "c1", field: "category", operator: "equals", value: "Electronics" },
          ],
        },
        actions: [{ id: "a1", type: "add_to_group", groupName: "Tech Products" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dataRows = [
        {
          id: "row-1",
          category: "Electronics",
          product_name: "iPhone 15",
          description: "Latest smartphone",
          price: "999",
        },
        {
          id: "row-2",
          category: "Electronics",
          product_name: "MacBook Pro",
          description: "Powerful laptop",
          price: "1999",
        },
        {
          id: "row-3",
          category: "Accessories",
          product_name: "USB Cable",
          description: "Charging cable",
          price: "15",
        },
      ];

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows,
        rules: [tagRule, groupRule],
      };

      const result = orchestrator.generate(input);

      // Find campaigns by sourceRowId
      const iphoneCampaign = result.campaigns.find((c) => c.sourceRowId === "row-1");
      const macbookCampaign = result.campaigns.find((c) => c.sourceRowId === "row-2");
      const usbCampaign = result.campaigns.find((c) => c.sourceRowId === "row-3");

      // iPhone (row-1): Electronics, price 999 -> should have "Tech Products" group but NOT "expensive" tag
      expect(iphoneCampaign).toBeDefined();
      expect(iphoneCampaign?.groups).toContain("Tech Products");
      expect(iphoneCampaign?.tags).not.toContain("expensive");

      // MacBook (row-2): Electronics, price 1999 -> should have "Tech Products" group AND "expensive" tag
      expect(macbookCampaign).toBeDefined();
      expect(macbookCampaign?.groups).toContain("Tech Products");
      expect(macbookCampaign?.tags).toContain("expensive");

      // USB Cable (row-3): Accessories, price 15 -> should have neither
      expect(usbCampaign).toBeDefined();
      expect(usbCampaign?.groups).toHaveLength(0);
      expect(usbCampaign?.tags).toHaveLength(0);
    });

    it("correctly maps metadata when some rows are skipped", () => {
      const skipRule: Rule = {
        id: "rule-1",
        name: "Skip Low Stock",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "stock", operator: "less_than", value: 10 },
          ],
        },
        actions: [{ id: "a1", type: "skip" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tagRule: Rule = {
        id: "rule-2",
        name: "Tag High Price",
        enabled: true,
        priority: 2,
        conditionGroup: {
          id: "g2",
          logic: "AND",
          conditions: [
            { id: "c1", field: "price", operator: "greater_than", value: 500 },
          ],
        },
        actions: [{ id: "a1", type: "add_tag", tag: "premium" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dataRows = [
        { id: "row-1", product_name: "iPhone", price: "999", stock: 50, description: "Phone" },
        { id: "row-2", product_name: "Case", price: "15", stock: 5, description: "Case" }, // Will be skipped
        { id: "row-3", product_name: "MacBook", price: "1999", stock: 25, description: "Laptop" },
      ];

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows,
        rules: [skipRule, tagRule],
      };

      const result = orchestrator.generate(input);

      // Should have 2 campaigns (row-2 skipped due to low stock)
      expect(result.campaigns).toHaveLength(2);
      expect(result.statistics.rowsSkipped).toBe(1);

      // iPhone should have "premium" tag (price > 500)
      const iphoneCampaign = result.campaigns.find((c) => c.sourceRowId === "row-1");
      expect(iphoneCampaign).toBeDefined();
      expect(iphoneCampaign?.tags).toContain("premium");

      // MacBook should have "premium" tag (price > 500)
      const macbookCampaign = result.campaigns.find((c) => c.sourceRowId === "row-3");
      expect(macbookCampaign).toBeDefined();
      expect(macbookCampaign?.tags).toContain("premium");
    });
  });

  describe("preview metadata mapping", () => {
    it("correctly maps metadata in preview mode using sourceRowId", () => {
      const tagRule: Rule = {
        id: "rule-1",
        name: "Tag Premium",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "price", operator: "greater_than", value: 500 },
          ],
        },
        actions: [{ id: "a1", type: "add_tag", tag: "premium" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dataRows = Array.from({ length: 10 }, (_, i) => ({
        id: `row-${i}`,
        category: "Electronics",
        product_name: `Product ${i}`,
        description: `Description ${i}`,
        price: String((i + 1) * 100), // 100, 200, 300, ..., 1000
      }));

      const input: GenerationInput = {
        template: createBasicTemplate(),
        dataRows,
        rules: [tagRule],
      };

      const result = orchestrator.preview(input, { limit: 3 });

      // Preview should have 3 campaigns
      expect(result.preview).toHaveLength(3);

      // Each campaign should have correct metadata based on its sourceRowId
      for (const campaign of result.preview) {
        const rowIndex = parseInt(campaign.sourceRowId.replace("row-", ""));
        const expectedPrice = (rowIndex + 1) * 100;

        if (expectedPrice > 500) {
          expect(campaign.tags).toContain("premium");
        } else {
          expect(campaign.tags).not.toContain("premium");
        }
      }
    });
  });
});
