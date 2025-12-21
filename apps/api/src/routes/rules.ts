import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { RuleEngine } from "@repo/core";
import type { Rule as CoreRule, ConditionGroup, Action } from "@repo/core";
import {
  ruleSchema,
  createRuleSchema,
  updateRuleSchema,
  ruleListResponseSchema,
  ruleQuerySchema,
  ruleTestRequestSchema,
  ruleTestResponseSchema,
  testDraftRuleRequestSchema,
  testDraftRuleResponseSchema,
  evaluateRulesRequestSchema,
  evaluateRulesResponseSchema,
} from "../schemas/rules.js";
import { idParamSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";

// In-memory mock data store
export const mockRules = new Map<string, z.infer<typeof ruleSchema>>();

// Rule engine instance
const ruleEngine = new RuleEngine();

// Function to reset and seed mock data
export function seedMockRules() {
  mockRules.clear();

  const seedId = "770e8400-e29b-41d4-a716-446655440000";
  mockRules.set(seedId, {
    id: seedId,
    userId: null,
    name: "Premium Products Filter",
    description: "Filters for high-value products",
    enabled: true,
    priority: 1,
    conditionGroup: {
      id: "g1",
      logic: "AND",
      conditions: [
        { id: "c1", field: "price", operator: "greater_than", value: 100 },
      ],
    },
    actions: [
      { id: "a1", type: "add_to_group", groupName: "premium" },
      { id: "a2", type: "set_field", field: "tier", value: "premium" },
    ],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });

  const seedId2 = "770e8400-e29b-41d4-a716-446655440001";
  mockRules.set(seedId2, {
    id: seedId2,
    userId: null,
    name: "Low Stock Skip",
    description: "Skip items with low stock",
    enabled: false,
    priority: 2,
    conditionGroup: {
      id: "g1",
      logic: "AND",
      conditions: [
        { id: "c1", field: "stock", operator: "less_than", value: 10 },
      ],
    },
    actions: [{ id: "a1", type: "skip" }],
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  });
}

// Initial seed
seedMockRules();

/**
 * Convert API rule to core rule engine format
 */
function toEngineRule(apiRule: z.infer<typeof ruleSchema>): CoreRule {
  return {
    id: apiRule.id,
    name: apiRule.name,
    description: apiRule.description,
    enabled: apiRule.enabled,
    priority: apiRule.priority,
    conditionGroup: apiRule.conditionGroup as ConditionGroup,
    actions: apiRule.actions as Action[],
    createdAt: new Date(apiRule.createdAt),
    updatedAt: new Date(apiRule.updatedAt),
  };
}

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
  description: "Creates a new rule for data filtering and transformation",
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
  description: "Tests a rule against provided sample data and returns detailed results",
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

const testDraftRuleRoute = createRoute({
  method: "post",
  path: "/api/v1/rules/test-draft",
  tags: ["Rules"],
  summary: "Test a draft rule without persisting",
  description:
    "Tests a rule configuration against sample data without creating the rule in the database. Useful for previewing rule behavior before saving.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: testDraftRuleRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Draft rule test results",
      content: {
        "application/json": {
          schema: testDraftRuleResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// TODO: Add rate limiting middleware to this endpoint.
// The evaluate endpoint is resource-intensive as it processes potentially large datasets
// through multiple rules. Consider implementing:
// - Request rate limiting (e.g., 10 requests/minute per user)
// - Payload size limits (e.g., max 1000 rows per request)
// - Timeout handling for long-running evaluations
// - Queue-based processing for large datasets
const evaluateRulesRoute = createRoute({
  method: "post",
  path: "/api/v1/rules/evaluate",
  tags: ["Rules"],
  summary: "Evaluate rules against dataset",
  description: "Evaluates all enabled rules (or specified rules) against a dataset",
  request: {
    body: {
      content: {
        "application/json": {
          schema: evaluateRulesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Evaluation results",
      content: {
        "application/json": {
          schema: evaluateRulesResponseSchema,
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

  // Filter by enabled status if provided
  if (query.enabled !== undefined) {
    rules = rules.filter((r) => r.enabled === query.enabled);
  }

  // Filter by search term if provided
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    rules = rules.filter(
      (r) =>
        r.name.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by priority
  rules.sort((a, b) => a.priority - b.priority);

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
    description: body.description,
    enabled: body.enabled ?? true,
    priority: body.priority ?? 0,
    conditionGroup: body.conditionGroup,
    actions: body.actions,
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
    ...(body.description !== undefined && { description: body.description }),
    ...(body.conditionGroup && { conditionGroup: body.conditionGroup }),
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

  // Convert to engine format and test
  const engineRule = toEngineRule(rule);
  const testResult = ruleEngine.testRule(engineRule, body.sampleData);

  // Format results for API response
  const results = testResult.results.map((r) => ({
    matched: r.matched,
    originalData: r.row,
    modifiedData: r.matched ? r.modifiedRow : undefined,
    appliedActions: r.actions.map((a) => ({
      actionId: a.actionId,
      type: a.type,
      success: a.success,
      error: a.error,
    })),
    groups: r.matched ? [] : undefined, // Would be populated from processRow
    tags: r.matched ? [] : undefined,
  }));

  const skippedRows = results.filter(
    (r) => r.matched && r.appliedActions.some((a) => a.type === "skip" && a.success)
  ).length;

  return c.json(
    {
      ruleId: id,
      results,
      summary: {
        totalRows: testResult.totalRows,
        matchedRows: testResult.matchedRows,
        skippedRows,
      },
    },
    200
  );
});

rulesApp.openapi(testDraftRuleRoute, async (c) => {
  const body = c.req.valid("json");

  // Create a temporary rule object for testing (not persisted)
  const draftRule: CoreRule = {
    id: "draft",
    name: "Draft Rule",
    description: undefined,
    enabled: true,
    priority: 0,
    conditionGroup: body.conditionGroup as ConditionGroup,
    actions: body.actions as Action[],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Test the draft rule
  const testResult = ruleEngine.testRule(draftRule, body.sampleData);

  // Format results for API response
  const results = testResult.results.map((r) => ({
    matched: r.matched,
    originalData: r.row,
    modifiedData: r.matched ? r.modifiedRow : undefined,
    appliedActions: r.actions.map((a) => ({
      actionId: a.actionId,
      type: a.type,
      success: a.success,
      error: a.error,
    })),
    groups: r.matched ? [] : undefined,
    tags: r.matched ? [] : undefined,
  }));

  const skippedRows = results.filter(
    (r) =>
      r.matched && r.appliedActions.some((a) => a.type === "skip" && a.success)
  ).length;

  return c.json(
    {
      results,
      summary: {
        totalRows: testResult.totalRows,
        matchedRows: testResult.matchedRows,
        skippedRows,
      },
    },
    200
  );
});

rulesApp.openapi(evaluateRulesRoute, async (c) => {
  const body = c.req.valid("json");

  // Get rules to evaluate
  let rulesToEvaluate: z.infer<typeof ruleSchema>[];

  if (body.ruleIds && body.ruleIds.length > 0) {
    // Use specified rules
    rulesToEvaluate = body.ruleIds
      .map((id) => mockRules.get(id))
      .filter((r): r is z.infer<typeof ruleSchema> => r !== undefined);
  } else {
    // Use all enabled rules
    rulesToEvaluate = Array.from(mockRules.values()).filter((r) => r.enabled);
  }

  // Convert to engine format
  const engineRules = rulesToEvaluate.map(toEngineRule);

  // Process dataset
  const processedRows = ruleEngine.processDataset(engineRules, body.data);

  // Format results
  const results = processedRows.map((row) => ({
    originalRow: row.originalRow,
    modifiedRow: row.modifiedRow,
    matchedRuleIds: row.matchedRules.map((r) => r.id),
    appliedActions: row.actions.map((a) => ({
      actionId: a.actionId,
      type: a.type,
      success: a.success,
      error: a.error,
    })),
    shouldSkip: row.shouldSkip,
    groups: row.groups,
    tags: row.tags,
    targeting: row.targeting,
  }));

  const skippedRows = results.filter((r) => r.shouldSkip).length;
  const rulesApplied = new Set(results.flatMap((r) => r.matchedRuleIds)).size;

  return c.json(
    {
      results,
      summary: {
        totalRows: body.data.length,
        processedRows: results.length,
        skippedRows,
        rulesApplied,
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
