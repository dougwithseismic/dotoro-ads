import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { rulesApp, seedMockRules } from "../../routes/rules.js";

describe("Rules API", () => {
  // Reset mock data before each test
  beforeEach(() => {
    seedMockRules();
  });

  const mockRuleId = "770e8400-e29b-41d4-a716-446655440000";

  describe("GET /api/v1/rules", () => {
    it("should return a paginated list of rules", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$get({
        query: { page: "1", limit: "10" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should filter rules by enabled status", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$get({
        query: { enabled: "true" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      // All returned rules should be enabled
      for (const rule of json.data) {
        expect(rule.enabled).toBe(true);
      }
    });

    it("should sort rules by priority", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$get({
        query: {},
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Verify sorted by priority
      for (let i = 1; i < json.data.length; i++) {
        expect(json.data[i].priority).toBeGreaterThanOrEqual(json.data[i - 1].priority);
      }
    });
  });

  describe("POST /api/v1/rules", () => {
    it("should create a new rule with condition groups", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "New Filter Rule",
          description: "A test rule",
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              { id: "c1", field: "price", operator: "greater_than", value: 100 },
            ],
          },
          actions: [
            { id: "a1", type: "add_to_group", groupName: "premium" },
          ],
          priority: 1,
          enabled: true,
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toHaveProperty("id");
      expect(json.name).toBe("New Filter Rule");
      expect(json.conditionGroup.logic).toBe("AND");
      expect(json.actions).toHaveLength(1);
    });

    it("should create a rule with nested condition groups", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "Complex Rule",
          conditionGroup: {
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
          },
          actions: [{ id: "a1", type: "set_field", field: "tier", value: "premium" }],
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.conditionGroup.conditions).toHaveLength(2);
    });

    it("should create a rule with safe regex pattern", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "Regex Rule",
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              { id: "c1", field: "email", operator: "regex", value: "^[a-z]+@example\\.com$" },
            ],
          },
          actions: [{ id: "a1", type: "add_tag", tag: "valid-email" }],
        },
      });

      expect(res.status).toBe(201);
    });

    it("should return 400 for unsafe regex pattern (ReDoS)", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "ReDoS Rule",
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              { id: "c1", field: "text", operator: "regex", value: "(a+)+" },
            ],
          },
          actions: [{ id: "a1", type: "skip" }],
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for regex pattern exceeding max length", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "Long Regex Rule",
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              { id: "c1", field: "text", operator: "regex", value: "a".repeat(101) },
            ],
          },
          actions: [{ id: "a1", type: "skip" }],
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing actions", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "Invalid Rule",
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              { id: "c1", field: "price", operator: "greater_than", value: 100 },
            ],
          },
          actions: [],
        },
      });

      expect(res.status).toBe(400);
    });

    it("should support all action types", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "All Actions Rule",
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              { id: "c1", field: "test", operator: "is_not_empty", value: "" },
            ],
          },
          actions: [
            { id: "a1", type: "skip" },
            { id: "a2", type: "set_field", field: "headline", value: "Test {name}" },
            { id: "a3", type: "modify_field", field: "text", operation: "append", value: " suffix" },
            { id: "a4", type: "add_to_group", groupName: "test-group" },
            { id: "a5", type: "remove_from_group", groupName: "old-group" },
            { id: "a6", type: "set_targeting", targeting: { locations: ["US"] } },
            { id: "a7", type: "add_tag", tag: "featured" },
          ],
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.actions).toHaveLength(7);
    });
  });

  describe("GET /api/v1/rules/:id", () => {
    it("should return a rule by id", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$get({
        param: { id: mockRuleId },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(mockRuleId);
      expect(json).toHaveProperty("conditionGroup");
      expect(json).toHaveProperty("actions");
    });

    it("should return 404 for non-existent rule", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$get({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/v1/rules/:id", () => {
    it("should update an existing rule", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$put({
        param: { id: mockRuleId },
        json: { name: "Updated Rule Name", priority: 5 },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Updated Rule Name");
      expect(json.priority).toBe(5);
    });

    it("should update rule conditions", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$put({
        param: { id: mockRuleId },
        json: {
          conditionGroup: {
            id: "g1",
            logic: "OR",
            conditions: [
              { id: "c1", field: "stock", operator: "less_than", value: 5 },
            ],
          },
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.conditionGroup.logic).toBe("OR");
    });

    it("should handle empty update body gracefully", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$put({
        param: { id: mockRuleId },
        json: {},
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Premium Products Filter");
    });

    it("should return 404 when updating non-existent rule", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$put({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: { name: "Test" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/rules/:id", () => {
    it("should delete an existing rule and return 204", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$delete({
        param: { id: mockRuleId },
      });

      expect(res.status).toBe(204);
    });

    it("should return 404 when deleting non-existent rule", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$delete({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/rules/:id/test", () => {
    it("should test a rule against sample data with real evaluation", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"]["test"].$post({
        param: { id: mockRuleId },
        json: {
          sampleData: [
            { price: 150, name: "Product A" },
            { price: 50, name: "Product B" },
          ],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("ruleId");
      expect(json).toHaveProperty("results");
      expect(json).toHaveProperty("summary");
      expect(json.results).toHaveLength(2);

      // First product (price > 100) should match
      expect(json.results[0].matched).toBe(true);
      expect(json.results[0].appliedActions.length).toBeGreaterThan(0);

      // Second product (price < 100) should not match
      expect(json.results[1].matched).toBe(false);

      expect(json.summary.totalRows).toBe(2);
      expect(json.summary.matchedRows).toBe(1);
    });

    it("should apply actions and return modified data", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"]["test"].$post({
        param: { id: mockRuleId },
        json: {
          sampleData: [{ price: 200, name: "Expensive Product" }],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.results[0].matched).toBe(true);
      // The set_field action should have set the tier field
      expect(json.results[0].modifiedData?.tier).toBe("premium");
    });

    it("should return 404 for non-existent rule", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"]["test"].$post({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: {
          sampleData: [{ price: 100 }],
        },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/rules/evaluate", () => {
    it("should evaluate enabled rules against dataset", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"]["evaluate"].$post({
        json: {
          data: [
            { price: 150, name: "Premium Item" },
            { price: 50, name: "Budget Item" },
            { price: 200, name: "Luxury Item" },
          ],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("results");
      expect(json).toHaveProperty("summary");
      expect(json.results).toHaveLength(3);

      // Check that premium items were modified
      const premiumResults = json.results.filter((r: { matchedRuleIds: string[] }) =>
        r.matchedRuleIds.includes(mockRuleId)
      );
      expect(premiumResults.length).toBe(2); // 150 and 200 > 100

      // Check summary
      expect(json.summary.totalRows).toBe(3);
      expect(json.summary.processedRows).toBe(3);
    });

    it("should evaluate specific rules when ruleIds provided", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"]["evaluate"].$post({
        json: {
          ruleIds: [mockRuleId],
          data: [{ price: 150, name: "Test" }],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.results[0].matchedRuleIds).toContain(mockRuleId);
    });

    it("should return groups, tags, and targeting in results", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"]["evaluate"].$post({
        json: {
          data: [{ price: 150, name: "Test Product" }],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      const result = json.results[0];
      expect(result).toHaveProperty("groups");
      expect(result).toHaveProperty("tags");
      expect(result).toHaveProperty("targeting");
      expect(result.groups).toContain("premium");
    });
  });
});
