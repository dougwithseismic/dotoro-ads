import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";

const mockRuleId = "770e8400-e29b-41d4-a716-446655440000";

// Mock the database module - routes are tightly coupled to db
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    rules: {
      id: "id",
      name: "name",
      enabled: "enabled",
      priority: "priority",
    },
  };
});

// Import after mocking
import { rulesApp } from "../../routes/rules.js";

describe("Rules API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: Tests that require database interaction are skipped.
  // These should be implemented as integration tests with a test database.

  describe("POST /api/v1/rules - validation", () => {
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

    it("should return 400 for missing condition group", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "Invalid Rule",
          actions: [
            { id: "a1", type: "add_to_group", groupName: "premium" },
          ],
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing name", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"].$post({
        json: {
          name: "",
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
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/v1/rules/:id - validation", () => {
    it("should return 400 for invalid UUID", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"][":id"].$put({
        param: { id: "not-a-uuid" },
        json: { name: "Test" },
      });

      expect(res.status).toBe(400);
    });
  });

  // Database-dependent tests are skipped - these require integration testing
  describe.skip("GET /api/v1/rules (requires database)", () => {
    it("should return a paginated list of rules", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/rules (requires database)", () => {
    it("should create a new rule", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/rules/:id (requires database)", () => {
    it("should return a rule by id", async () => {
      // Integration test required
    });
  });

  describe.skip("PUT /api/v1/rules/:id (requires database)", () => {
    it("should update an existing rule", async () => {
      // Integration test required
    });
  });

  describe.skip("DELETE /api/v1/rules/:id (requires database)", () => {
    it("should delete an existing rule", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/rules/:id/test (requires database)", () => {
    it("should test a rule against sample data", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/rules/evaluate (requires database)", () => {
    it("should evaluate rules against dataset", async () => {
      // Integration test required
    });
  });

  describe("POST /api/v1/rules/test-draft - ReDoS protection", () => {
    it("should return 400 for unsafe regex pattern (ReDoS)", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"]["test-draft"].$post({
        json: {
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              {
                id: "c1",
                field: "name",
                operator: "regex",
                value: "(a+)+", // ReDoS pattern - catastrophic backtracking
              },
            ],
          },
          actions: [{ id: "a1", type: "skip" }],
          sampleData: [{ name: "test" }],
        },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      // Zod OpenAPI returns validation errors with success: false and error object
      // The error message should mention unsafe pattern detection
      const errorMessage = JSON.stringify(body);
      expect(errorMessage.toLowerCase()).toContain("unsafe pattern");
    });

    it("should return 400 for nested quantifier ReDoS pattern", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"]["test-draft"].$post({
        json: {
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              {
                id: "c1",
                field: "email",
                operator: "regex",
                value: "([a-z]+)*@", // Another ReDoS pattern
              },
            ],
          },
          actions: [{ id: "a1", type: "skip" }],
          sampleData: [{ email: "test@example.com" }],
        },
      });

      expect(res.status).toBe(400);
    });

    it("should accept safe regex patterns", async () => {
      const client = testClient(rulesApp);
      const res = await client["api"]["v1"]["rules"]["test-draft"].$post({
        json: {
          conditionGroup: {
            id: "g1",
            logic: "AND",
            conditions: [
              {
                id: "c1",
                field: "email",
                operator: "regex",
                value: "^[a-z]+@[a-z]+\\.[a-z]+$", // Safe pattern
              },
            ],
          },
          actions: [{ id: "a1", type: "skip" }],
          sampleData: [{ email: "test@example.com" }],
        },
      });

      // Should succeed (200) since the regex is safe
      expect(res.status).toBe(200);
    });
  });
});
