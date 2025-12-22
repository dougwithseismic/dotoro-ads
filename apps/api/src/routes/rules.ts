import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and, count, asc, ilike, or } from "drizzle-orm";
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
import { db, rules } from "../services/db.js";

// Rule engine instance
const ruleEngine = new RuleEngine();

/**
 * Helper to check if a condition input is a simple condition (not a group)
 */
function isSimpleCondition(cond: unknown): cond is { field: string; operator: string; value: unknown } {
  return typeof cond === "object" && cond !== null && "field" in cond && "operator" in cond;
}

/**
 * Flatten nested conditions into a flat array for database storage
 */
function flattenConditions(conditions: unknown[]): Array<{
  field: string;
  operator: string;
  value: unknown;
  logicalOperator?: string;
}> {
  const result: Array<{ field: string; operator: string; value: unknown; logicalOperator?: string }> = [];
  for (const cond of conditions) {
    if (isSimpleCondition(cond)) {
      result.push({
        field: cond.field,
        operator: cond.operator,
        value: cond.value,
      });
    } else if (typeof cond === "object" && cond !== null && "conditions" in cond) {
      // Nested group - flatten recursively
      const nested = cond as { conditions: unknown[]; logic?: string };
      const flattened = flattenConditions(nested.conditions);
      if (flattened.length > 0 && nested.logic && flattened[0]) {
        flattened[0].logicalOperator = nested.logic;
      }
      result.push(...flattened);
    }
  }
  return result;
}

/**
 * Convert database rule to API schema format
 */
function toApiRule(dbRule: typeof rules.$inferSelect): z.infer<typeof ruleSchema> {
  // Convert database actions to API format
  const apiActions = dbRule.actions.map((action, i) => {
    const baseAction = { id: `a${i}` };

    switch (action.type) {
      case "set":
        return { ...baseAction, type: "set_field" as const, field: action.target, value: String(action.value ?? "") };
      case "append":
      case "prepend":
      case "replace":
        return { ...baseAction, type: "modify_field" as const, field: action.target, value: String(action.value ?? ""), operation: action.type as "append" | "prepend" | "replace" };
      default:
        return { ...baseAction, type: "skip" as const };
    }
  });

  return {
    id: dbRule.id,
    userId: dbRule.userId,
    name: dbRule.name,
    description: undefined, // Database doesn't have description field
    enabled: dbRule.enabled,
    priority: dbRule.priority,
    conditionGroup: {
      id: "root",
      logic: "AND" as const,
      conditions: dbRule.conditions.map((cond, i) => ({
        id: `c${i}`,
        field: cond.field,
        operator: cond.operator,
        value: cond.value,
      })),
    },
    actions: apiActions,
    createdAt: dbRule.createdAt.toISOString(),
    updatedAt: dbRule.updatedAt.toISOString(),
  };
}

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
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  if (query.enabled !== undefined) {
    conditions.push(eq(rules.enabled, query.enabled));
  }

  if (query.search) {
    conditions.push(ilike(rules.name, `%${query.search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countQuery = db.select({ count: count() }).from(rules);
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count ?? 0;

  // Get paginated data, sorted by priority
  const selectQuery = db.select().from(rules);
  if (whereClause) {
    selectQuery.where(whereClause);
  }
  const dbRules = await selectQuery
    .orderBy(asc(rules.priority))
    .limit(limit)
    .offset(offset);

  // Convert to API format
  const data = dbRules.map(toApiRule);

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

rulesApp.openapi(createRuleRoute, async (c) => {
  const body = c.req.valid("json");

  // Convert condition group to database format (flat array of conditions)
  const flattened = flattenConditions(body.conditionGroup.conditions);
  const dbConditions = flattened.map((cond) => ({
    field: cond.field,
    operator: cond.operator as "equals" | "not_equals" | "contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "in" | "not_in" | "regex",
    value: (cond.value ?? "") as string | number | boolean | string[],
    logicalOperator: (cond.logicalOperator ?? body.conditionGroup.logic) as "AND" | "OR" | undefined,
  }));

  // Convert actions to database format
  const dbActions = body.actions.map((action) => {
    const actionAny = action as { field?: string; value?: string; expression?: string };
    let dbType: "set" | "append" | "prepend" | "replace" | "calculate" | "lookup" = "set";

    if (action.type === "set_field") dbType = "set";
    else if (action.type === "modify_field") {
      const modifyAction = action as { operation?: string };
      dbType = (modifyAction.operation as "append" | "prepend" | "replace") ?? "replace";
    }

    return {
      type: dbType,
      target: actionAny.field ?? "",
      value: actionAny.value as string | number | boolean | undefined,
      expression: actionAny.expression,
    };
  });

  const [newRule] = await db
    .insert(rules)
    .values({
      name: body.name,
      type: "filter", // Default type
      conditions: dbConditions,
      actions: dbActions,
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
    })
    .returning();

  if (!newRule) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create rule");
  }

  return c.json(toApiRule(newRule), 201);
});

rulesApp.openapi(getRuleRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [rule] = await db
    .select()
    .from(rules)
    .where(eq(rules.id, id))
    .limit(1);

  if (!rule) {
    throw createNotFoundError("Rule", id);
  }

  return c.json(toApiRule(rule), 200);
});

rulesApp.openapi(updateRuleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Check if rule exists
  const [existing] = await db
    .select()
    .from(rules)
    .where(eq(rules.id, id))
    .limit(1);

  if (!existing) {
    throw createNotFoundError("Rule", id);
  }

  // Build update object
  const updates: Partial<{
    name: string;
    conditions: typeof existing.conditions;
    actions: typeof existing.actions;
    priority: number;
    enabled: boolean;
  }> = {};

  if (body.name !== undefined) {
    updates.name = body.name;
  }
  if (body.priority !== undefined) {
    updates.priority = body.priority;
  }
  if (body.enabled !== undefined) {
    updates.enabled = body.enabled;
  }
  if (body.conditionGroup) {
    const flattened = flattenConditions(body.conditionGroup.conditions);
    updates.conditions = flattened.map((cond) => ({
      field: cond.field,
      operator: cond.operator as "equals" | "not_equals" | "contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "in" | "not_in" | "regex",
      value: (cond.value ?? "") as string | number | boolean | string[],
      logicalOperator: (cond.logicalOperator ?? body.conditionGroup!.logic) as "AND" | "OR" | undefined,
    }));
  }
  if (body.actions) {
    updates.actions = body.actions.map((action) => {
      const actionAny = action as { field?: string; value?: string; expression?: string };
      let dbType: "set" | "append" | "prepend" | "replace" | "calculate" | "lookup" = "set";

      if (action.type === "set_field") dbType = "set";
      else if (action.type === "modify_field") {
        const modifyAction = action as { operation?: string };
        dbType = (modifyAction.operation as "append" | "prepend" | "replace") ?? "replace";
      }

      return {
        type: dbType,
        target: actionAny.field ?? "",
        value: actionAny.value as string | number | boolean | undefined,
        expression: actionAny.expression,
      };
    });
  }

  const [updatedRule] = await db
    .update(rules)
    .set(updates)
    .where(eq(rules.id, id))
    .returning();

  if (!updatedRule) {
    throw createNotFoundError("Rule", id);
  }

  return c.json(toApiRule(updatedRule), 200);
});

rulesApp.openapi(deleteRuleRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Check if rule exists
  const [rule] = await db
    .select()
    .from(rules)
    .where(eq(rules.id, id))
    .limit(1);

  if (!rule) {
    throw createNotFoundError("Rule", id);
  }

  // Delete from database
  await db.delete(rules).where(eq(rules.id, id));

  return c.body(null, 204);
});

rulesApp.openapi(testRuleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const [rule] = await db
    .select()
    .from(rules)
    .where(eq(rules.id, id))
    .limit(1);

  if (!rule) {
    throw createNotFoundError("Rule", id);
  }

  // Convert to API format then to engine format
  const apiRule = toApiRule(rule);
  const engineRule = toEngineRule(apiRule);
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
    groups: r.matched ? [] : undefined,
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
  let dbRules: (typeof rules.$inferSelect)[];

  if (body.ruleIds && body.ruleIds.length > 0) {
    // Get specified rules
    dbRules = await db
      .select()
      .from(rules)
      .where(
        and(
          eq(rules.enabled, true),
          or(...body.ruleIds.map((id) => eq(rules.id, id)))
        )
      )
      .orderBy(asc(rules.priority));
  } else {
    // Get all enabled rules
    dbRules = await db
      .select()
      .from(rules)
      .where(eq(rules.enabled, true))
      .orderBy(asc(rules.priority));
  }

  // Convert to engine format
  const engineRules = dbRules.map((r) => toEngineRule(toApiRule(r)));

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
