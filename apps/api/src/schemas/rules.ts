import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.js";
import { validateRegex } from "../lib/safe-regex.js";

/**
 * Rule API Schemas
 *
 * These schemas are designed for the API layer and are compatible
 * with the core rule engine types. Dates are serialized as strings.
 */

/**
 * Helper type for condition groups (used in validation)
 */
interface ConditionLike {
  operator?: string;
  value?: unknown;
}

interface ConditionGroupLike {
  conditions?: (ConditionLike | ConditionGroupLike)[];
}

/**
 * Recursively validate regex patterns in conditions
 */
function validateConditionGroupRegex(
  group: ConditionGroupLike,
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["conditionGroup"]
): void {
  if (!group.conditions) return;

  group.conditions.forEach((item, index) => {
    const itemPath = [...path, "conditions", index];
    if ("operator" in item && item.operator === "regex" && typeof item.value === "string") {
      const result = validateRegex(item.value);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.reason,
          path: [...itemPath, "value"],
        });
      }
    } else if ("conditions" in item) {
      // Nested group
      validateConditionGroupRegex(item as ConditionGroupLike, ctx, itemPath);
    }
  });
}

/**
 * Validate modify_field actions for safe regex patterns
 */
function validateActionsRegex(
  actions: Array<{ type: string; pattern?: string }>,
  ctx: z.RefinementCtx
): void {
  actions.forEach((action, index) => {
    if (action.type === "modify_field" && action.pattern) {
      const result = validateRegex(action.pattern);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.reason,
          path: ["actions", index, "pattern"],
        });
      }
    }
  });
}

/**
 * Operator Enum - all supported operators
 */
export const operatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "regex",
  "in",
  "not_in",
  "is_empty",
  "is_not_empty",
]);

export type Operator = z.infer<typeof operatorSchema>;

/**
 * Condition value - can be various types
 */
export const conditionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
]);

export type ConditionValue = z.infer<typeof conditionValueSchema>;

/**
 * Base condition schema (used in recursive types)
 */
export const conditionBaseSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  operator: operatorSchema,
  value: conditionValueSchema,
});

/**
 * Single condition with regex validation (used for input validation)
 */
export const conditionSchema = conditionBaseSchema.superRefine((data, ctx) => {
  if (data.operator === "regex" && typeof data.value === "string") {
    const result = validateRegex(data.value);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.reason,
        path: ["value"],
      });
    }
  }
});

export type Condition = z.infer<typeof conditionBaseSchema>;

/**
 * Logic operator for combining conditions
 */
export const logicOperatorSchema = z.enum(["AND", "OR"]);

export type LogicOperator = z.infer<typeof logicOperatorSchema>;

/**
 * Condition group (recursive type)
 * OpenAPI doesn't handle z.lazy well, so we define explicit levels of nesting
 */
export interface ConditionGroupInput {
  id: string;
  logic: "AND" | "OR";
  conditions: (Condition | ConditionGroupInput)[];
}

// Level 2 nested group (innermost - contains only conditions)
const nestedConditionGroupLevel2Schema = z.object({
  id: z.string().min(1),
  logic: logicOperatorSchema,
  conditions: z.array(conditionBaseSchema),
});

// Level 1 nested group (can contain conditions or level 2 groups)
const nestedConditionGroupLevel1Schema = z.object({
  id: z.string().min(1),
  logic: logicOperatorSchema,
  conditions: z.array(
    z.union([conditionBaseSchema, nestedConditionGroupLevel2Schema])
  ),
});

// Condition or nested group (for use in top-level group)
const conditionOrNestedGroupSchema = z.union([
  conditionBaseSchema,
  nestedConditionGroupLevel1Schema,
]);

// Top-level condition group schema (supports up to 2 levels of nesting)
export const conditionGroupSchema: z.ZodType<ConditionGroupInput> = z.object({
  id: z.string().min(1),
  logic: logicOperatorSchema,
  conditions: z.array(conditionOrNestedGroupSchema),
}) as z.ZodType<ConditionGroupInput>;

/**
 * Action type enum
 */
export const actionTypeSchema = z.enum([
  "skip",
  "set_field",
  "add_to_group",
  "remove_from_group",
  "set_targeting",
  "modify_field",
  "add_tag",
]);

export type ActionType = z.infer<typeof actionTypeSchema>;

/**
 * Action schemas for each type
 */
export const skipActionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("skip"),
});

export const setFieldActionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("set_field"),
  field: z.string().min(1),
  value: z.string(),
});

// Base modify field schema (used in discriminatedUnion)
export const modifyFieldActionBaseSchema = z.object({
  id: z.string().min(1),
  type: z.literal("modify_field"),
  field: z.string().min(1),
  operation: z.enum(["append", "prepend", "replace"]),
  value: z.string(),
  pattern: z.string().optional(),
});

// Full modify field schema with regex validation (used for input validation)
export const modifyFieldActionSchema = modifyFieldActionBaseSchema.superRefine((data, ctx) => {
  if (data.pattern) {
    const result = validateRegex(data.pattern);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.reason,
        path: ["pattern"],
      });
    }
  }
});

export const addToGroupActionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("add_to_group"),
  groupName: z.string().min(1),
});

export const removeFromGroupActionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("remove_from_group"),
  groupName: z.string().min(1),
});

export const setTargetingActionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("set_targeting"),
  targeting: z.record(z.unknown()),
});

export const addTagActionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("add_tag"),
  tag: z.string().min(1),
});

// Use base schemas for discriminatedUnion (no refinements)
export const actionSchema = z.discriminatedUnion("type", [
  skipActionSchema,
  setFieldActionSchema,
  modifyFieldActionBaseSchema,
  addToGroupActionSchema,
  removeFromGroupActionSchema,
  setTargetingActionSchema,
  addTagActionSchema,
]);

export type Action = z.infer<typeof actionSchema>;

/**
 * Full Rule Schema (returned from API)
 */
export const ruleSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  enabled: z.boolean(),
  priority: z.number().int().min(0),
  conditionGroup: conditionGroupSchema,
  actions: z.array(actionSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Rule = z.infer<typeof ruleSchema>;

/**
 * Create Rule Schema (with regex validation)
 */
export const createRuleSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    enabled: z.boolean().default(true),
    priority: z.number().int().default(0),
    conditionGroup: conditionGroupSchema,
    actions: z.array(actionSchema).min(1),
  })
  .superRefine((data, ctx) => {
    // Validate regex patterns in conditions
    validateConditionGroupRegex(data.conditionGroup, ctx);
    // Validate regex patterns in actions
    validateActionsRegex(data.actions as Array<{ type: string; pattern?: string }>, ctx);
  });

export type CreateRule = z.infer<typeof createRuleSchema>;

/**
 * Update Rule Schema (with regex validation)
 */
export const updateRuleSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    priority: z.number().int().optional(),
    conditionGroup: conditionGroupSchema.optional(),
    actions: z.array(actionSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    // Validate regex patterns in conditions if provided
    if (data.conditionGroup) {
      validateConditionGroupRegex(data.conditionGroup, ctx);
    }
    // Validate regex patterns in actions if provided
    if (data.actions) {
      validateActionsRegex(data.actions as Array<{ type: string; pattern?: string }>, ctx);
    }
  });

export type UpdateRule = z.infer<typeof updateRuleSchema>;

/**
 * Rule Test Request Schema
 */
export const ruleTestRequestSchema = z.object({
  sampleData: z.array(z.record(z.unknown())).min(1).max(100),
});

export type RuleTestRequest = z.infer<typeof ruleTestRequestSchema>;

/**
 * Applied action result
 */
export const appliedActionSchema = z.object({
  actionId: z.string(),
  type: actionTypeSchema,
  success: z.boolean(),
  error: z.string().optional(),
});

export type AppliedAction = z.infer<typeof appliedActionSchema>;

/**
 * Rule Test Result Schema
 */
export const ruleTestResultSchema = z.object({
  matched: z.boolean(),
  originalData: z.record(z.unknown()),
  modifiedData: z.record(z.unknown()).optional(),
  appliedActions: z.array(appliedActionSchema),
  groups: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type RuleTestResult = z.infer<typeof ruleTestResultSchema>;

/**
 * Rule Test Response Schema
 */
export const ruleTestResponseSchema = z.object({
  ruleId: uuidSchema,
  results: z.array(ruleTestResultSchema),
  summary: z.object({
    totalRows: z.number(),
    matchedRows: z.number(),
    skippedRows: z.number(),
  }),
});

export type RuleTestResponse = z.infer<typeof ruleTestResponseSchema>;

/**
 * Test Draft Rule Request Schema
 * Tests a rule configuration without persisting it
 */
export const testDraftRuleRequestSchema = z
  .object({
    conditionGroup: conditionGroupSchema,
    actions: z.array(actionSchema).min(1),
    sampleData: z.array(z.record(z.unknown())).min(1).max(100),
  })
  .superRefine((data, ctx) => {
    // Validate regex patterns in conditions
    validateConditionGroupRegex(data.conditionGroup, ctx);
    // Validate regex patterns in actions
    validateActionsRegex(
      data.actions as Array<{ type: string; pattern?: string }>,
      ctx
    );
  });

export type TestDraftRuleRequest = z.infer<typeof testDraftRuleRequestSchema>;

/**
 * Test Draft Rule Response Schema
 */
export const testDraftRuleResponseSchema = z.object({
  results: z.array(ruleTestResultSchema),
  summary: z.object({
    totalRows: z.number(),
    matchedRows: z.number(),
    skippedRows: z.number(),
  }),
});

export type TestDraftRuleResponse = z.infer<typeof testDraftRuleResponseSchema>;

/**
 * Evaluate Rules Request Schema
 */
export const evaluateRulesRequestSchema = z.object({
  ruleIds: z.array(uuidSchema).optional(),
  data: z.array(z.record(z.unknown())).min(1).max(1000),
});

export type EvaluateRulesRequest = z.infer<typeof evaluateRulesRequestSchema>;

/**
 * Processed Row Result
 */
export const processedRowSchema = z.object({
  originalRow: z.record(z.unknown()),
  modifiedRow: z.record(z.unknown()),
  matchedRuleIds: z.array(uuidSchema),
  appliedActions: z.array(appliedActionSchema),
  shouldSkip: z.boolean(),
  groups: z.array(z.string()),
  tags: z.array(z.string()),
  targeting: z.record(z.unknown()),
});

export type ProcessedRow = z.infer<typeof processedRowSchema>;

/**
 * Evaluate Rules Response Schema
 */
export const evaluateRulesResponseSchema = z.object({
  results: z.array(processedRowSchema),
  summary: z.object({
    totalRows: z.number(),
    processedRows: z.number(),
    skippedRows: z.number(),
    rulesApplied: z.number(),
  }),
});

export type EvaluateRulesResponse = z.infer<typeof evaluateRulesResponseSchema>;

/**
 * Rule List Response
 */
export const ruleListResponseSchema = z.object({
  data: z.array(ruleSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type RuleListResponse = z.infer<typeof ruleListResponseSchema>;

/**
 * Rule Query Parameters
 */
export const ruleQuerySchema = paginationSchema.extend({
  enabled: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type RuleQuery = z.infer<typeof ruleQuerySchema>;

// Legacy exports for backwards compatibility with existing tests
export const ruleTypeSchema = z.enum(["filter", "transform", "conditional"]);
export type RuleType = z.infer<typeof ruleTypeSchema>;

export const ruleConditionSchema = conditionSchema;
export type RuleCondition = z.infer<typeof ruleConditionSchema>;

export const ruleActionSchema = actionSchema;
export type RuleAction = z.infer<typeof ruleActionSchema>;
