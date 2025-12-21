import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.js";
import { validateRegex } from "../lib/safe-regex.js";

/**
 * Rule Type Enum
 */
export const ruleTypeSchema = z.enum(["filter", "transform", "conditional"]);
export type RuleType = z.infer<typeof ruleTypeSchema>;

/**
 * Rule Condition Operator Enum
 */
export const conditionOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "in",
  "not_in",
  "regex",
]);

export type ConditionOperator = z.infer<typeof conditionOperatorSchema>;

/**
 * Rule Condition Schema
 * Includes validation for regex patterns to prevent ReDoS attacks
 */
export const ruleConditionSchema = z
  .object({
    field: z.string().min(1),
    operator: conditionOperatorSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    logicalOperator: z.enum(["AND", "OR"]).optional(),
  })
  .superRefine((data, ctx) => {
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

export type RuleCondition = z.infer<typeof ruleConditionSchema>;

/**
 * Rule Action Type Enum
 */
export const actionTypeSchema = z.enum([
  "set",
  "append",
  "prepend",
  "replace",
  "calculate",
  "lookup",
]);

export type ActionType = z.infer<typeof actionTypeSchema>;

/**
 * Rule Action Schema
 */
export const ruleActionSchema = z.object({
  type: actionTypeSchema,
  target: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  expression: z.string().optional(),
  lookupTable: z.record(z.union([z.string(), z.number()])).optional(),
});

export type RuleAction = z.infer<typeof ruleActionSchema>;

/**
 * Rule Schema - full representation
 */
export const ruleSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  name: z.string().min(1).max(255),
  type: ruleTypeSchema,
  conditions: z.array(ruleConditionSchema),
  actions: z.array(ruleActionSchema),
  priority: z.number().int(),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Rule = z.infer<typeof ruleSchema>;

/**
 * Create Rule Schema
 */
export const createRuleSchema = z.object({
  name: z.string().min(1).max(255),
  type: ruleTypeSchema,
  conditions: z.array(ruleConditionSchema).min(1),
  actions: z.array(ruleActionSchema).min(1),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

export type CreateRule = z.infer<typeof createRuleSchema>;

/**
 * Update Rule Schema
 */
export const updateRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: ruleTypeSchema.optional(),
  conditions: z.array(ruleConditionSchema).min(1).optional(),
  actions: z.array(ruleActionSchema).min(1).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
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
 * Rule Test Result Schema
 */
export const ruleTestResultSchema = z.object({
  matched: z.boolean(),
  originalData: z.record(z.unknown()),
  transformedData: z.record(z.unknown()).optional(),
  matchedConditions: z.array(z.number()),
  appliedActions: z.array(z.number()),
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
    transformedRows: z.number(),
  }),
});

export type RuleTestResponse = z.infer<typeof ruleTestResponseSchema>;

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
  type: ruleTypeSchema.optional(),
  enabled: z.coerce.boolean().optional(),
});

export type RuleQuery = z.infer<typeof ruleQuerySchema>;
