import { describe, it, expect, beforeEach } from "vitest";
import {
  CreativeLinker,
  CreativeSelectionRule,
  CreativeMapping,
} from "../services/creative-linker.js";

describe("CreativeLinker", () => {
  let linker: CreativeLinker;

  beforeEach(() => {
    linker = new CreativeLinker();
  });

  describe("linkCreative", () => {
    it("links a creative to a template slot", async () => {
      await linker.linkCreative("template-1", "hero_image", "creative-1");

      const mappings = await linker.getTemplateMappings("template-1");
      expect(mappings.length).toBe(1);
      expect(mappings[0]?.slotName).toBe("hero_image");
      expect(mappings[0]?.creativeId).toBe("creative-1");
    });

    it("allows multiple creatives in same slot", async () => {
      await linker.linkCreative("template-1", "hero_image", "creative-1");
      await linker.linkCreative("template-1", "hero_image", "creative-2");

      const mappings = await linker.getTemplateMappings("template-1");
      expect(mappings.length).toBe(2);
    });

    it("allows same creative in multiple slots", async () => {
      await linker.linkCreative("template-1", "hero_image", "creative-1");
      await linker.linkCreative("template-1", "thumbnail", "creative-1");

      const mappings = await linker.getTemplateMappings("template-1");
      expect(mappings.length).toBe(2);
      expect(mappings.map((m) => m.slotName)).toContain("hero_image");
      expect(mappings.map((m) => m.slotName)).toContain("thumbnail");
    });
  });

  describe("unlinkCreative", () => {
    it("removes a specific creative mapping", async () => {
      await linker.linkCreative("template-1", "hero_image", "creative-1");
      await linker.linkCreative("template-1", "hero_image", "creative-2");

      await linker.unlinkCreative("template-1", "hero_image", "creative-1");

      const mappings = await linker.getTemplateMappings("template-1");
      expect(mappings.length).toBe(1);
      expect(mappings[0]?.creativeId).toBe("creative-2");
    });
  });

  describe("setCreativeRule", () => {
    it("sets a rule-based creative selection for a slot", async () => {
      const rule: CreativeSelectionRule = {
        conditions: [
          {
            id: "cond-1",
            field: "category",
            operator: "equals",
            value: "Electronics",
          },
        ],
        creativeId: "electronics-hero",
        priority: 1,
      };

      await linker.setCreativeRule("template-1", "hero_image", rule);

      // Should be able to resolve based on rule
      const creative = await linker.resolveCreative(
        "template-1",
        "hero_image",
        { category: "Electronics" }
      );
      expect(creative).toBe("electronics-hero");
    });

    it("supports multiple rules with different priorities", async () => {
      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [
          {
            id: "cond-1",
            field: "category",
            operator: "equals",
            value: "Electronics",
          },
        ],
        creativeId: "electronics-hero",
        priority: 2,
      });

      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [
          {
            id: "cond-2",
            field: "brand",
            operator: "equals",
            value: "Apple",
          },
        ],
        creativeId: "apple-hero",
        priority: 1, // Higher priority (lower number)
      });

      // Apple rule should match first due to higher priority
      const creative = await linker.resolveCreative(
        "template-1",
        "hero_image",
        { category: "Electronics", brand: "Apple" }
      );
      expect(creative).toBe("apple-hero");
    });
  });

  describe("resolveCreative", () => {
    beforeEach(async () => {
      // Set up default creative
      await linker.linkCreative("template-1", "hero_image", "default-hero");

      // Set up conditional rules
      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [
          {
            id: "c1",
            field: "category",
            operator: "equals",
            value: "Electronics",
          },
        ],
        creativeId: "electronics-hero",
        priority: 1,
      });

      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [
          {
            id: "c2",
            field: "category",
            operator: "equals",
            value: "Fashion",
          },
        ],
        creativeId: "fashion-hero",
        priority: 2,
      });
    });

    it("returns matching rule creative when conditions match", async () => {
      const creative = await linker.resolveCreative(
        "template-1",
        "hero_image",
        { category: "Electronics" }
      );
      expect(creative).toBe("electronics-hero");
    });

    it("returns default creative when no rules match", async () => {
      const creative = await linker.resolveCreative(
        "template-1",
        "hero_image",
        { category: "Food" }
      );
      expect(creative).toBe("default-hero");
    });

    it("returns null when no creative is linked and no rules match", async () => {
      const creative = await linker.resolveCreative(
        "template-1",
        "footer_banner",
        { category: "Food" }
      );
      expect(creative).toBeNull();
    });

    it("uses highest priority rule when multiple match", async () => {
      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [
          {
            id: "c3",
            field: "price",
            operator: "greater_than",
            value: 100,
          },
        ],
        creativeId: "premium-hero",
        priority: 0, // Highest priority
      });

      // Both Electronics and price > 100 match, but priority 0 wins
      const creative = await linker.resolveCreative(
        "template-1",
        "hero_image",
        { category: "Electronics", price: 999 }
      );
      expect(creative).toBe("premium-hero");
    });
  });

  describe("getTemplateMappings", () => {
    it("returns all mappings for a template", async () => {
      await linker.linkCreative("template-1", "hero", "creative-1");
      await linker.linkCreative("template-1", "thumbnail", "creative-2");
      await linker.linkCreative("template-2", "hero", "creative-3");

      const mappings = await linker.getTemplateMappings("template-1");
      expect(mappings.length).toBe(2);
      expect(mappings.every((m) => m.templateId === "template-1")).toBe(true);
    });

    it("returns empty array for template with no mappings", async () => {
      const mappings = await linker.getTemplateMappings("non-existent");
      expect(mappings).toEqual([]);
    });
  });

  describe("getSlotCreatives", () => {
    it("returns all creatives for a specific slot", async () => {
      await linker.linkCreative("template-1", "hero_image", "creative-1");
      await linker.linkCreative("template-1", "hero_image", "creative-2");
      await linker.linkCreative("template-1", "footer", "creative-3");

      const creatives = await linker.getSlotCreatives("template-1", "hero_image");
      expect(creatives.length).toBe(2);
      expect(creatives).toContain("creative-1");
      expect(creatives).toContain("creative-2");
    });
  });

  describe("clearSlotMappings", () => {
    it("removes all mappings for a specific slot", async () => {
      await linker.linkCreative("template-1", "hero_image", "creative-1");
      await linker.linkCreative("template-1", "hero_image", "creative-2");
      await linker.linkCreative("template-1", "footer", "creative-3");

      await linker.clearSlotMappings("template-1", "hero_image");

      const mappings = await linker.getTemplateMappings("template-1");
      expect(mappings.length).toBe(1);
      expect(mappings[0]?.slotName).toBe("footer");
    });
  });

  describe("clearSlotRules", () => {
    it("removes all rules for a specific slot", async () => {
      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [{ id: "c1", field: "category", operator: "equals", value: "Electronics" }],
        creativeId: "electronics-hero",
        priority: 1,
      });
      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [{ id: "c2", field: "category", operator: "equals", value: "Fashion" }],
        creativeId: "fashion-hero",
        priority: 2,
      });
      await linker.setCreativeRule("template-1", "footer", {
        conditions: [{ id: "c3", field: "category", operator: "equals", value: "Electronics" }],
        creativeId: "electronics-footer",
        priority: 1,
      });

      await linker.clearSlotRules("template-1", "hero_image");

      // hero_image rules should be cleared
      const heroRules = await linker.getSlotRules("template-1", "hero_image");
      expect(heroRules.length).toBe(0);

      // footer rules should still exist
      const footerRules = await linker.getSlotRules("template-1", "footer");
      expect(footerRules.length).toBe(1);
    });

    it("does nothing when slot has no rules", async () => {
      await linker.clearSlotRules("template-1", "non-existent-slot");
      // Should not throw
      const rules = await linker.getSlotRules("template-1", "non-existent-slot");
      expect(rules).toEqual([]);
    });
  });

  describe("getSlotRules", () => {
    it("returns all rules for a specific slot sorted by priority", async () => {
      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [{ id: "c1", field: "category", operator: "equals", value: "Electronics" }],
        creativeId: "electronics-hero",
        priority: 2,
      });
      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [{ id: "c2", field: "brand", operator: "equals", value: "Apple" }],
        creativeId: "apple-hero",
        priority: 1,
      });

      const rules = await linker.getSlotRules("template-1", "hero_image");
      expect(rules.length).toBe(2);
      // Should be sorted by priority (1 before 2)
      expect(rules[0]?.creativeId).toBe("apple-hero");
      expect(rules[1]?.creativeId).toBe("electronics-hero");
    });

    it("returns empty array for slot with no rules", async () => {
      const rules = await linker.getSlotRules("template-1", "non-existent-slot");
      expect(rules).toEqual([]);
    });

    it("only returns rules for the specified template and slot", async () => {
      await linker.setCreativeRule("template-1", "hero_image", {
        conditions: [{ id: "c1", field: "a", operator: "equals", value: "1" }],
        creativeId: "creative-1",
        priority: 1,
      });
      await linker.setCreativeRule("template-2", "hero_image", {
        conditions: [{ id: "c2", field: "b", operator: "equals", value: "2" }],
        creativeId: "creative-2",
        priority: 1,
      });
      await linker.setCreativeRule("template-1", "footer", {
        conditions: [{ id: "c3", field: "c", operator: "equals", value: "3" }],
        creativeId: "creative-3",
        priority: 1,
      });

      const rules = await linker.getSlotRules("template-1", "hero_image");
      expect(rules.length).toBe(1);
      expect(rules[0]?.creativeId).toBe("creative-1");
    });
  });

  describe("complex rule conditions", () => {
    it("supports contains operator", async () => {
      await linker.setCreativeRule("template-1", "banner", {
        conditions: [
          {
            id: "c1",
            field: "title",
            operator: "contains",
            value: "Sale",
          },
        ],
        creativeId: "sale-banner",
        priority: 1,
      });

      const creative = await linker.resolveCreative("template-1", "banner", {
        title: "Big Summer Sale!",
      });
      expect(creative).toBe("sale-banner");
    });

    it("supports in operator", async () => {
      await linker.setCreativeRule("template-1", "banner", {
        conditions: [
          {
            id: "c1",
            field: "region",
            operator: "in",
            value: ["US", "CA", "UK"],
          },
        ],
        creativeId: "english-banner",
        priority: 1,
      });

      const creative = await linker.resolveCreative("template-1", "banner", {
        region: "US",
      });
      expect(creative).toBe("english-banner");
    });

    it("supports less_than operator for numeric comparison", async () => {
      await linker.linkCreative("template-1", "price_tag", "default-price");

      await linker.setCreativeRule("template-1", "price_tag", {
        conditions: [
          {
            id: "c1",
            field: "price",
            operator: "less_than",
            value: 50,
          },
        ],
        creativeId: "budget-price",
        priority: 1,
      });

      const budgetCreative = await linker.resolveCreative(
        "template-1",
        "price_tag",
        { price: 25 }
      );
      expect(budgetCreative).toBe("budget-price");

      const normalCreative = await linker.resolveCreative(
        "template-1",
        "price_tag",
        { price: 100 }
      );
      expect(normalCreative).toBe("default-price");
    });
  });
});
