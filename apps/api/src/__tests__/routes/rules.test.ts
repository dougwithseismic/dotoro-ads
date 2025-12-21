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

    it("should filter rules by type", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$get({
        query: { type: "filter" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should filter rules by enabled status", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$get({
        query: { enabled: "true" },
      });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/v1/rules", () => {
    it("should create a new rule", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "New Filter Rule",
          type: "filter",
          conditions: [
            { field: "price", operator: "greater_than", value: 100 },
          ],
          actions: [{ type: "set", target: "category", value: "premium" }],
          priority: 1,
          enabled: true,
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toHaveProperty("id");
      expect(json.name).toBe("New Filter Rule");
      expect(json.type).toBe("filter");
    });

    it("should create a rule with safe regex pattern", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "Regex Rule",
          type: "filter",
          conditions: [
            { field: "email", operator: "regex", value: "^[a-z]+@example\\.com$" },
          ],
          actions: [{ type: "set", target: "valid", value: true }],
        },
      });

      expect(res.status).toBe(201);
    });

    it("should return 400 for unsafe regex pattern (ReDoS)", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "ReDoS Rule",
          type: "filter",
          conditions: [
            { field: "text", operator: "regex", value: "(a+)+" },
          ],
          actions: [{ type: "set", target: "matched", value: true }],
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for regex pattern exceeding max length", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "Long Regex Rule",
          type: "filter",
          conditions: [
            { field: "text", operator: "regex", value: "a".repeat(101) },
          ],
          actions: [{ type: "set", target: "matched", value: true }],
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing conditions", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "Invalid Rule",
          type: "filter",
          conditions: [],
          actions: [{ type: "set", target: "x", value: "y" }],
        },
      });

      expect(res.status).toBe(400);
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

    it("should handle empty update body gracefully", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$put({
        param: { id: mockRuleId },
        json: {},
      });

      // Empty body should succeed but only update the timestamp
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
    it("should test a rule against sample data", async () => {
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
});
