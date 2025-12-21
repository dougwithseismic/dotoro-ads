import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  ruleSchema,
  createRuleSchema,
  updateRuleSchema,
  ruleListResponseSchema,
  ruleQuerySchema,
  ruleTestRequestSchema,
  ruleTestResponseSchema,
  ruleTestResultSchema,
} from "../schemas/rules.js";
import { idParamSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";

// In-memory mock data store
export const mockRules = new Map<string, z.infer<typeof ruleSchema>>();

// Function to reset and seed mock data
export function seedMockRules() {
  mockRules.clear();

  const seedId = "770e8400-e29b-41d4-a716-446655440000";
  mockRules.set(seedId, {
    id: seedId,
    userId: null,
    name: "Premium Products Filter",
    type: "filter",
    conditions: [
      { field: "price", operator: "greater_than", value: 100 },
    ],
    actions: [{ type: "set", target: "tier", value: "premium" }],
    priority: 1,
    enabled: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });

  const seedId2 = "770e8400-e29b-41d4-a716-446655440001";
  mockRules.set(seedId2, {
    id: seedId2,
    userId: null,
    name: "Low Stock Skip",
    type: "conditional",
    conditions: [
      { field: "stock", operator: "less_than", value: 10 },
    ],
    actions: [{ type: "set", target: "skip", value: true }],
    priority: 2,
    enabled: false,
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  });
}

// Initial seed
seedMockRules();

// Create the OpenAPI Hono app
export const rulesApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const listRulesRoute = createRoute({
  method: "get",
  path: "/api/v1/rules",
  tags: ["Rules"],
  summary: "List all rules",
  description: "Returns a paginated list of rules",
  request: {
    query: ruleQuerySchema,
  },
  responses: {
    200: {
      description: "List of rules",
      content: {
        "application/json": {
          schema: ruleListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const createRuleRoute = createRoute({
  method: "post",
  path: "/api/v1/rules",
  tags: ["Rules"],
  summary: "Create a new rule",
  description: "Creates a new rule for data transformation or filtering",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createRuleSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Rule created successfully",
      content: {
        "application/json": {
          schema: ruleSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getRuleRoute = createRoute({
  method: "get",
  path: "/api/v1/rules/{id}",
  tags: ["Rules"],
  summary: "Get a rule by ID",
  description: "Returns the details of a specific rule",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Rule details",
      content: {
        "application/json": {
          schema: ruleSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const updateRuleRoute = createRoute({
  method: "put",
  path: "/api/v1/rules/{id}",
  tags: ["Rules"],
  summary: "Update a rule",
  description: "Updates an existing rule",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateRuleSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Rule updated successfully",
      content: {
        "application/json": {
          schema: ruleSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const deleteRuleRoute = createRoute({
  method: "delete",
  path: "/api/v1/rules/{id}",
  tags: ["Rules"],
  summary: "Delete a rule",
  description: "Deletes a rule",
  request: {
    params: idParamSchema,
  },
  responses: {
    204: {
      description: "Rule deleted successfully",
    },
    ...commonResponses,
  },
});

const testRuleRoute = createRoute({
  method: "post",
  path: "/api/v1/rules/{id}/test",
  tags: ["Rules"],
  summary: "Test rule against sample data",
  description: "Tests a rule against provided sample data and returns results",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: ruleTestRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Rule test results",
      content: {
        "application/json": {
          schema: ruleTestResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

rulesApp.openapi(listRulesRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  let rules = Array.from(mockRules.values());

  // Filter by type if provided
  if (query.type) {
    rules = rules.filter((r) => r.type === query.type);
  }

  // Filter by enabled status if provided
  if (query.enabled !== undefined) {
    rules = rules.filter((r) => r.enabled === query.enabled);
  }

  const total = rules.length;
  const start = (page - 1) * limit;
  const data = rules.slice(start, start + limit);

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

rulesApp.openapi(createRuleRoute, async (c) => {
  const body = c.req.valid("json");

  const newRule: z.infer<typeof ruleSchema> = {
    id: crypto.randomUUID(),
    userId: null,
    name: body.name,
    type: body.type,
    conditions: body.conditions,
    actions: body.actions,
    priority: body.priority ?? 0,
    enabled: body.enabled ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockRules.set(newRule.id, newRule);

  return c.json(newRule, 201);
});

rulesApp.openapi(getRuleRoute, async (c) => {
  const { id } = c.req.valid("param");

  const rule = mockRules.get(id);
  if (!rule) {
    throw createNotFoundError("Rule", id);
  }

  return c.json(rule, 200);
});

rulesApp.openapi(updateRuleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const rule = mockRules.get(id);
  if (!rule) {
    throw createNotFoundError("Rule", id);
  }

  const updatedRule: z.infer<typeof ruleSchema> = {
    ...rule,
    ...(body.name && { name: body.name }),
    ...(body.type && { type: body.type }),
    ...(body.conditions && { conditions: body.conditions }),
    ...(body.actions && { actions: body.actions }),
    ...(body.priority !== undefined && { priority: body.priority }),
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    updatedAt: new Date().toISOString(),
  };

  mockRules.set(id, updatedRule);

  return c.json(updatedRule, 200);
});

rulesApp.openapi(deleteRuleRoute, async (c) => {
  const { id } = c.req.valid("param");

  const rule = mockRules.get(id);
  if (!rule) {
    throw createNotFoundError("Rule", id);
  }

  mockRules.delete(id);

  return c.body(null, 204);
});

rulesApp.openapi(testRuleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const rule = mockRules.get(id);
  if (!rule) {
    throw createNotFoundError("Rule", id);
  }

  // Mock rule testing - in real implementation, this would evaluate conditions
  const results: z.infer<typeof ruleTestResultSchema>[] = body.sampleData.map(
    (row, index) => {
      // Simple mock evaluation
      const matched = Math.random() > 0.5;
      return {
        matched,
        originalData: row,
        transformedData: matched ? { ...row, _ruleApplied: true } : undefined,
        matchedConditions: matched ? [0] : [],
        appliedActions: matched ? [0] : [],
      };
    }
  );

  const matchedCount = results.filter((r) => r.matched).length;

  return c.json(
    {
      ruleId: id,
      results,
      summary: {
        totalRows: body.sampleData.length,
        matchedRows: matchedCount,
        transformedRows: matchedCount,
      },
    },
    200
  );
});

// Error handler for API exceptions
rulesApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Unexpected error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default rulesApp;
