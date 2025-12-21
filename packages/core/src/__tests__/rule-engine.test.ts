import { describe, it, expect } from "vitest";
import { RuleEngine } from "../rules/rule-engine.js";
import type {
  Condition,
  ConditionGroup,
  Rule,
} from "../rules/condition-schema.js";

describe("RuleEngine", () => {
  const engine = new RuleEngine();

  describe("evaluateCondition - equals/not_equals", () => {
    it("matches string values case-insensitively", () => {
      const condition: Condition = {
        id: "c1",
        field: "category",
        operator: "equals",
        value: "electronics",
      };

      expect(engine.evaluateCondition(condition, { category: "Electronics" })).toBe(true);
      expect(engine.evaluateCondition(condition, { category: "ELECTRONICS" })).toBe(true);
      expect(engine.evaluateCondition(condition, { category: "Clothing" })).toBe(false);
    });

    it("matches numeric values", () => {
      const condition: Condition = {
        id: "c1",
        field: "price",
        operator: "equals",
        value: 100,
      };

      expect(engine.evaluateCondition(condition, { price: 100 })).toBe(true);
      expect(engine.evaluateCondition(condition, { price: "100" })).toBe(true);
      expect(engine.evaluateCondition(condition, { price: 99 })).toBe(false);
    });

    it("matches boolean values", () => {
      const condition: Condition = {
        id: "c1",
        field: "active",
        operator: "equals",
        value: true,
      };

      expect(engine.evaluateCondition(condition, { active: true })).toBe(true);
      expect(engine.evaluateCondition(condition, { active: "true" })).toBe(true);
      expect(engine.evaluateCondition(condition, { active: "1" })).toBe(true);
      expect(engine.evaluateCondition(condition, { active: false })).toBe(false);
    });

    it("handles null/undefined field values", () => {
      const condition: Condition = {
        id: "c1",
        field: "missing",
        operator: "equals",
        value: "",
      };

      expect(engine.evaluateCondition(condition, { missing: null })).toBe(true);
      expect(engine.evaluateCondition(condition, { other: "value" })).toBe(true);
    });

    it("not_equals returns opposite of equals", () => {
      const condition: Condition = {
        id: "c1",
        field: "category",
        operator: "not_equals",
        value: "electronics",
      };

      expect(engine.evaluateCondition(condition, { category: "Electronics" })).toBe(false);
      expect(engine.evaluateCondition(condition, { category: "Clothing" })).toBe(true);
    });
  });

  describe("evaluateCondition - contains/not_contains", () => {
    it("matches substring case-insensitively", () => {
      const condition: Condition = {
        id: "c1",
        field: "name",
        operator: "contains",
        value: "phone",
      };

      expect(engine.evaluateCondition(condition, { name: "iPhone 15" })).toBe(true);
      expect(engine.evaluateCondition(condition, { name: "SMARTPHONE" })).toBe(true);
      expect(engine.evaluateCondition(condition, { name: "Laptop" })).toBe(false);
    });

    it("not_contains returns opposite of contains", () => {
      const condition: Condition = {
        id: "c1",
        field: "name",
        operator: "not_contains",
        value: "phone",
      };

      expect(engine.evaluateCondition(condition, { name: "iPhone 15" })).toBe(false);
      expect(engine.evaluateCondition(condition, { name: "Laptop" })).toBe(true);
    });
  });

  describe("evaluateCondition - starts_with/ends_with", () => {
    it("matches prefix case-insensitively", () => {
      const condition: Condition = {
        id: "c1",
        field: "sku",
        operator: "starts_with",
        value: "elec-",
      };

      expect(engine.evaluateCondition(condition, { sku: "ELEC-001" })).toBe(true);
      expect(engine.evaluateCondition(condition, { sku: "elec-002" })).toBe(true);
      expect(engine.evaluateCondition(condition, { sku: "CLOTH-001" })).toBe(false);
    });

    it("matches suffix case-insensitively", () => {
      const condition: Condition = {
        id: "c1",
        field: "email",
        operator: "ends_with",
        value: "@example.com",
      };

      expect(engine.evaluateCondition(condition, { email: "test@example.com" })).toBe(true);
      expect(engine.evaluateCondition(condition, { email: "TEST@EXAMPLE.COM" })).toBe(true);
      expect(engine.evaluateCondition(condition, { email: "test@other.com" })).toBe(false);
    });
  });

  describe("evaluateCondition - numeric comparisons", () => {
    it("greater_than compares numbers correctly", () => {
      const condition: Condition = {
        id: "c1",
        field: "price",
        operator: "greater_than",
        value: 100,
      };

      expect(engine.evaluateCondition(condition, { price: 150 })).toBe(true);
      expect(engine.evaluateCondition(condition, { price: 100 })).toBe(false);
      expect(engine.evaluateCondition(condition, { price: 50 })).toBe(false);
      expect(engine.evaluateCondition(condition, { price: "150" })).toBe(true);
    });

    it("less_than compares numbers correctly", () => {
      const condition: Condition = {
        id: "c1",
        field: "stock",
        operator: "less_than",
        value: 10,
      };

      expect(engine.evaluateCondition(condition, { stock: 5 })).toBe(true);
      expect(engine.evaluateCondition(condition, { stock: 10 })).toBe(false);
      expect(engine.evaluateCondition(condition, { stock: 15 })).toBe(false);
    });

    it("greater_than_or_equal includes boundary", () => {
      const condition: Condition = {
        id: "c1",
        field: "price",
        operator: "greater_than_or_equal",
        value: 100,
      };

      expect(engine.evaluateCondition(condition, { price: 150 })).toBe(true);
      expect(engine.evaluateCondition(condition, { price: 100 })).toBe(true);
      expect(engine.evaluateCondition(condition, { price: 50 })).toBe(false);
    });

    it("less_than_or_equal includes boundary", () => {
      const condition: Condition = {
        id: "c1",
        field: "stock",
        operator: "less_than_or_equal",
        value: 10,
      };

      expect(engine.evaluateCondition(condition, { stock: 5 })).toBe(true);
      expect(engine.evaluateCondition(condition, { stock: 10 })).toBe(true);
      expect(engine.evaluateCondition(condition, { stock: 15 })).toBe(false);
    });

    it("returns false for non-numeric values", () => {
      const condition: Condition = {
        id: "c1",
        field: "price",
        operator: "greater_than",
        value: 100,
      };

      expect(engine.evaluateCondition(condition, { price: "not a number" })).toBe(false);
      expect(engine.evaluateCondition(condition, { price: null })).toBe(false);
      expect(engine.evaluateCondition(condition, {})).toBe(false);
    });
  });

  describe("evaluateCondition - regex", () => {
    it("matches regex pattern", () => {
      const condition: Condition = {
        id: "c1",
        field: "email",
        operator: "regex",
        value: "^[a-z]+@example\\.com$",
      };

      expect(engine.evaluateCondition(condition, { email: "test@example.com" })).toBe(true);
      expect(engine.evaluateCondition(condition, { email: "TEST@EXAMPLE.COM" })).toBe(true); // case-insensitive
      expect(engine.evaluateCondition(condition, { email: "test123@example.com" })).toBe(false);
    });

    it("rejects unsafe regex patterns", () => {
      const condition: Condition = {
        id: "c1",
        field: "text",
        operator: "regex",
        value: "(a+)+", // ReDoS pattern
      };

      expect(engine.evaluateCondition(condition, { text: "aaaaaa" })).toBe(false);
    });

    it("rejects long regex patterns", () => {
      const condition: Condition = {
        id: "c1",
        field: "text",
        operator: "regex",
        value: "a".repeat(101), // Exceeds max length
      };

      expect(engine.evaluateCondition(condition, { text: "aaa" })).toBe(false);
    });
  });

  describe("evaluateCondition - in/not_in", () => {
    it("checks if value is in array", () => {
      const condition: Condition = {
        id: "c1",
        field: "status",
        operator: "in",
        value: ["active", "pending", "review"],
      };

      expect(engine.evaluateCondition(condition, { status: "active" })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: "PENDING" })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: "deleted" })).toBe(false);
    });

    it("checks numeric values in array", () => {
      const condition: Condition = {
        id: "c1",
        field: "tier",
        operator: "in",
        value: [1, 2, 3],
      };

      expect(engine.evaluateCondition(condition, { tier: 2 })).toBe(true);
      expect(engine.evaluateCondition(condition, { tier: "2" })).toBe(true);
      expect(engine.evaluateCondition(condition, { tier: 5 })).toBe(false);
    });

    it("not_in returns opposite of in", () => {
      const condition: Condition = {
        id: "c1",
        field: "status",
        operator: "not_in",
        value: ["deleted", "archived"],
      };

      expect(engine.evaluateCondition(condition, { status: "active" })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: "deleted" })).toBe(false);
    });
  });

  describe("evaluateCondition - is_empty/is_not_empty", () => {
    it("identifies empty values", () => {
      const condition: Condition = {
        id: "c1",
        field: "description",
        operator: "is_empty",
        value: "",
      };

      expect(engine.evaluateCondition(condition, { description: "" })).toBe(true);
      expect(engine.evaluateCondition(condition, { description: "   " })).toBe(true);
      expect(engine.evaluateCondition(condition, { description: null })).toBe(true);
      expect(engine.evaluateCondition(condition, {})).toBe(true);
      expect(engine.evaluateCondition(condition, { description: "text" })).toBe(false);
    });

    it("is_not_empty returns opposite of is_empty", () => {
      const condition: Condition = {
        id: "c1",
        field: "description",
        operator: "is_not_empty",
        value: "",
      };

      expect(engine.evaluateCondition(condition, { description: "text" })).toBe(true);
      expect(engine.evaluateCondition(condition, { description: "" })).toBe(false);
      expect(engine.evaluateCondition(condition, {})).toBe(false);
    });

    it("handles empty arrays", () => {
      const condition: Condition = {
        id: "c1",
        field: "tags",
        operator: "is_empty",
        value: "",
      };

      expect(engine.evaluateCondition(condition, { tags: [] })).toBe(true);
      expect(engine.evaluateCondition(condition, { tags: ["tag1"] })).toBe(false);
    });
  });

  describe("evaluateConditionGroup", () => {
    it("evaluates AND logic - all conditions must match", () => {
      const group: ConditionGroup = {
        id: "g1",
        logic: "AND",
        conditions: [
          { id: "c1", field: "category", operator: "equals", value: "Electronics" },
          { id: "c2", field: "price", operator: "greater_than", value: 100 },
        ],
      };

      expect(engine.evaluateConditionGroup(group, { category: "Electronics", price: 150 })).toBe(true);
      expect(engine.evaluateConditionGroup(group, { category: "Electronics", price: 50 })).toBe(false);
      expect(engine.evaluateConditionGroup(group, { category: "Clothing", price: 150 })).toBe(false);
    });

    it("evaluates OR logic - any condition can match", () => {
      const group: ConditionGroup = {
        id: "g1",
        logic: "OR",
        conditions: [
          { id: "c1", field: "category", operator: "equals", value: "Electronics" },
          { id: "c2", field: "category", operator: "equals", value: "Computers" },
        ],
      };

      expect(engine.evaluateConditionGroup(group, { category: "Electronics" })).toBe(true);
      expect(engine.evaluateConditionGroup(group, { category: "Computers" })).toBe(true);
      expect(engine.evaluateConditionGroup(group, { category: "Clothing" })).toBe(false);
    });

    it("handles nested condition groups", () => {
      const group: ConditionGroup = {
        id: "g1",
        logic: "AND",
        conditions: [
          { id: "c1", field: "price", operator: "greater_than", value: 100 },
          {
            id: "g2",
            logic: "OR",
            conditions: [
              { id: "c2", field: "category", operator: "equals", value: "Electronics" },
              { id: "c3", field: "category", operator: "equals", value: "Computers" },
            ],
          },
        ],
      };

      // Price > 100 AND (category = Electronics OR category = Computers)
      expect(engine.evaluateConditionGroup(group, { category: "Electronics", price: 150 })).toBe(true);
      expect(engine.evaluateConditionGroup(group, { category: "Computers", price: 200 })).toBe(true);
      expect(engine.evaluateConditionGroup(group, { category: "Electronics", price: 50 })).toBe(false);
      expect(engine.evaluateConditionGroup(group, { category: "Clothing", price: 150 })).toBe(false);
    });

    it("empty group matches everything", () => {
      const group: ConditionGroup = {
        id: "g1",
        logic: "AND",
        conditions: [],
      };

      expect(engine.evaluateConditionGroup(group, { any: "data" })).toBe(true);
    });
  });

  describe("evaluateRules", () => {
    const rules: Rule[] = [
      {
        id: "rule-1",
        name: "Premium Electronics",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "category", operator: "equals", value: "Electronics" },
            { id: "c2", field: "price", operator: "greater_than", value: 100 },
          ],
        },
        actions: [{ id: "a1", type: "add_to_group", groupName: "Premium" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-2",
        name: "Low Stock Warning",
        enabled: true,
        priority: 2,
        conditionGroup: {
          id: "g2",
          logic: "AND",
          conditions: [{ id: "c1", field: "stock", operator: "less_than", value: 10 }],
        },
        actions: [{ id: "a1", type: "add_tag", tag: "low-stock" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-3",
        name: "Disabled Rule",
        enabled: false,
        priority: 0,
        conditionGroup: {
          id: "g3",
          logic: "AND",
          conditions: [{ id: "c1", field: "status", operator: "equals", value: "active" }],
        },
        actions: [{ id: "a1", type: "skip" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("returns matching rules sorted by priority", () => {
      const row = { category: "Electronics", price: 150, stock: 5 };
      const matched = engine.evaluateRules(rules, row);

      expect(matched).toHaveLength(2);
      expect(matched[0]?.id).toBe("rule-1"); // priority 1
      expect(matched[1]?.id).toBe("rule-2"); // priority 2
    });

    it("excludes disabled rules", () => {
      const row = { status: "active" };
      const matched = engine.evaluateRules(rules, row);

      expect(matched).toHaveLength(0);
    });

    it("returns empty array when no rules match", () => {
      const row = { category: "Clothing", price: 50, stock: 100 };
      const matched = engine.evaluateRules(rules, row);

      expect(matched).toHaveLength(0);
    });
  });

  describe("processDataset", () => {
    const rules: Rule[] = [
      {
        id: "rule-1",
        name: "Premium Products",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [{ id: "c1", field: "price", operator: "greater_than", value: 100 }],
        },
        actions: [
          { id: "a1", type: "add_to_group", groupName: "Premium Tech" },
          { id: "a2", type: "set_field", field: "headline", value: "Premium {product_name}" },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-2",
        name: "Skip Low Price",
        enabled: true,
        priority: 2,
        conditionGroup: {
          id: "g2",
          logic: "AND",
          conditions: [{ id: "c1", field: "price", operator: "less_than", value: 10 }],
        },
        actions: [{ id: "a1", type: "skip" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("processes multiple rows and returns results", () => {
      const rows = [
        { product_name: "iPhone 15", price: 999, category: "Electronics" },
        { product_name: "T-Shirt", price: 25, category: "Clothing" },
        { product_name: "Sticker", price: 5, category: "Accessories" },
      ];

      const results = engine.processDataset(rules, rows);

      expect(results).toHaveLength(3);

      // First row matches rule-1 (premium)
      expect(results[0]?.matchedRules).toHaveLength(1);
      expect(results[0]?.matchedRules[0]?.id).toBe("rule-1");
      expect(results[0]?.groups).toContain("Premium Tech");
      expect(results[0]?.modifiedRow.headline).toBe("Premium iPhone 15");
      expect(results[0]?.shouldSkip).toBe(false);

      // Second row doesn't match any rules
      expect(results[1]?.matchedRules).toHaveLength(0);
      expect(results[1]?.shouldSkip).toBe(false);

      // Third row matches rule-2 (skip)
      expect(results[2]?.matchedRules).toHaveLength(1);
      expect(results[2]?.matchedRules[0]?.id).toBe("rule-2");
      expect(results[2]?.shouldSkip).toBe(true);
    });
  });

  describe("testRule", () => {
    it("returns detailed test results", () => {
      const rule: Rule = {
        id: "rule-1",
        name: "Premium Electronics",
        enabled: true,
        priority: 1,
        conditionGroup: {
          id: "g1",
          logic: "AND",
          conditions: [
            { id: "c1", field: "price", operator: "greater_than", value: 100 },
            { id: "c2", field: "category", operator: "equals", value: "Electronics" },
          ],
        },
        actions: [
          { id: "a1", type: "add_to_group", groupName: "Premium Tech" },
          { id: "a2", type: "set_field", field: "headline", value: "Premium {product_name}" },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sampleData = [
        { product_name: "iPhone 15", price: 999, category: "Electronics" },
        { product_name: "T-Shirt", price: 25, category: "Clothing" },
      ];

      const result = engine.testRule(rule, sampleData);

      expect(result.totalRows).toBe(2);
      expect(result.matchedRows).toBe(1);
      expect(result.results[0]?.matched).toBe(true);
      expect(result.results[0]?.modifiedRow.headline).toBe("Premium iPhone 15");
      expect(result.results[1]?.matched).toBe(false);
    });
  });

  describe("countMatches", () => {
    it("counts rows matching a condition group", () => {
      const group: ConditionGroup = {
        id: "g1",
        logic: "AND",
        conditions: [{ id: "c1", field: "price", operator: "greater_than", value: 100 }],
      };

      const rows = [
        { price: 150 },
        { price: 50 },
        { price: 200 },
        { price: 75 },
      ];

      expect(engine.countMatches(group, rows)).toBe(2);
    });
  });

  describe("case sensitivity option", () => {
    it("respects caseInsensitive: false option", () => {
      const sensitiveEngine = new RuleEngine({ caseInsensitive: false });
      const condition: Condition = {
        id: "c1",
        field: "category",
        operator: "equals",
        value: "Electronics",
      };

      expect(sensitiveEngine.evaluateCondition(condition, { category: "Electronics" })).toBe(true);
      expect(sensitiveEngine.evaluateCondition(condition, { category: "electronics" })).toBe(false);
      expect(sensitiveEngine.evaluateCondition(condition, { category: "ELECTRONICS" })).toBe(false);
    });
  });

  describe("deeply nested condition groups", () => {
    it("should handle 5 levels of nesting", () => {
      // Level 5 (innermost) - check if stock is low
      const level5: ConditionGroup = {
        id: "g5",
        logic: "AND",
        conditions: [
          { id: "c5", field: "stock", operator: "less_than", value: 10 },
        ],
      };

      // Level 4 - check price is high OR stock is low
      const level4: ConditionGroup = {
        id: "g4",
        logic: "OR",
        conditions: [
          { id: "c4", field: "price", operator: "greater_than", value: 500 },
          level5,
        ],
      };

      // Level 3 - check category AND (high price OR low stock)
      const level3: ConditionGroup = {
        id: "g3",
        logic: "AND",
        conditions: [
          { id: "c3", field: "category", operator: "equals", value: "Electronics" },
          level4,
        ],
      };

      // Level 2 - check brand OR level3 conditions
      const level2: ConditionGroup = {
        id: "g2",
        logic: "OR",
        conditions: [
          { id: "c2", field: "brand", operator: "equals", value: "Premium" },
          level3,
        ],
      };

      // Level 1 (root) - check status AND level2 conditions
      const level1: ConditionGroup = {
        id: "g1",
        logic: "AND",
        conditions: [
          { id: "c1", field: "status", operator: "equals", value: "active" },
          level2,
        ],
      };

      // Test case 1: status=active, brand=Premium (matches via level2 first condition)
      expect(
        engine.evaluateConditionGroup(level1, {
          status: "active",
          brand: "Premium",
          category: "Clothing",
          price: 50,
          stock: 100,
        })
      ).toBe(true);

      // Test case 2: status=active, category=Electronics, price=1000 (matches via deep nesting)
      expect(
        engine.evaluateConditionGroup(level1, {
          status: "active",
          brand: "Generic",
          category: "Electronics",
          price: 1000,
          stock: 100,
        })
      ).toBe(true);

      // Test case 3: status=active, category=Electronics, stock=5 (matches via deepest level)
      expect(
        engine.evaluateConditionGroup(level1, {
          status: "active",
          brand: "Generic",
          category: "Electronics",
          price: 50,
          stock: 5,
        })
      ).toBe(true);

      // Test case 4: status=inactive (fails at root level)
      expect(
        engine.evaluateConditionGroup(level1, {
          status: "inactive",
          brand: "Premium",
          category: "Electronics",
          price: 1000,
          stock: 5,
        })
      ).toBe(false);

      // Test case 5: doesn't match any nested conditions
      expect(
        engine.evaluateConditionGroup(level1, {
          status: "active",
          brand: "Generic",
          category: "Clothing",
          price: 50,
          stock: 100,
        })
      ).toBe(false);
    });

    it("should handle empty nested groups", () => {
      // Create nested structure with empty groups
      const innerEmpty: ConditionGroup = {
        id: "g-inner-empty",
        logic: "AND",
        conditions: [], // Empty - should match everything
      };

      const middleGroup: ConditionGroup = {
        id: "g-middle",
        logic: "AND",
        conditions: [
          innerEmpty,
          { id: "c1", field: "price", operator: "greater_than", value: 100 },
        ],
      };

      const outerEmpty: ConditionGroup = {
        id: "g-outer-empty",
        logic: "OR",
        conditions: [], // Empty - should match everything
      };

      const rootGroup: ConditionGroup = {
        id: "g-root",
        logic: "OR",
        conditions: [outerEmpty, middleGroup],
      };

      // Empty groups match everything, so OR with empty group should match
      expect(engine.evaluateConditionGroup(rootGroup, { price: 50 })).toBe(true);
      expect(engine.evaluateConditionGroup(rootGroup, { price: 150 })).toBe(true);

      // Test middle group alone (requires price > 100)
      expect(engine.evaluateConditionGroup(middleGroup, { price: 50 })).toBe(
        false
      );
      expect(engine.evaluateConditionGroup(middleGroup, { price: 150 })).toBe(
        true
      );
    });

    it("should handle groups with only nested groups (no direct conditions)", () => {
      const leaf1: ConditionGroup = {
        id: "leaf1",
        logic: "AND",
        conditions: [
          { id: "c1", field: "a", operator: "equals", value: "1" },
        ],
      };

      const leaf2: ConditionGroup = {
        id: "leaf2",
        logic: "AND",
        conditions: [
          { id: "c2", field: "b", operator: "equals", value: "2" },
        ],
      };

      const leaf3: ConditionGroup = {
        id: "leaf3",
        logic: "AND",
        conditions: [
          { id: "c3", field: "c", operator: "equals", value: "3" },
        ],
      };

      // Parent with only nested groups, no direct conditions
      const parent: ConditionGroup = {
        id: "parent",
        logic: "OR",
        conditions: [leaf1, leaf2, leaf3],
      };

      expect(engine.evaluateConditionGroup(parent, { a: "1" })).toBe(true);
      expect(engine.evaluateConditionGroup(parent, { b: "2" })).toBe(true);
      expect(engine.evaluateConditionGroup(parent, { c: "3" })).toBe(true);
      expect(engine.evaluateConditionGroup(parent, { d: "4" })).toBe(false);
    });
  });

  describe("ReDoS protection - additional patterns", () => {
    it("rejects overlapping alternation patterns", () => {
      const condition: Condition = {
        id: "c1",
        field: "text",
        operator: "regex",
        value: "(a|aa)+", // Overlapping alternation
      };

      expect(engine.evaluateCondition(condition, { text: "aaa" })).toBe(false);
    });

    it("rejects repetition of optional groups", () => {
      const condition: Condition = {
        id: "c1",
        field: "text",
        operator: "regex",
        value: "(a?)*", // Optional repetition
      };

      expect(engine.evaluateCondition(condition, { text: "aaa" })).toBe(false);
    });

    it("rejects multiple consecutive quantifiers", () => {
      const condition: Condition = {
        id: "c1",
        field: "text",
        operator: "regex",
        value: "a++", // Multiple quantifiers
      };

      expect(engine.evaluateCondition(condition, { text: "aaa" })).toBe(false);
    });

    it("allows safe regex patterns", () => {
      const condition: Condition = {
        id: "c1",
        field: "email",
        operator: "regex",
        value: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      };

      expect(
        engine.evaluateCondition(condition, { email: "test@example.com" })
      ).toBe(true);
      expect(
        engine.evaluateCondition(condition, { email: "invalid-email" })
      ).toBe(false);
    });
  });
});
