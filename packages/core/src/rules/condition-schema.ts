/**
 * Rule Condition Schema
 *
 * Defines types and Zod schemas for rule conditions that can be
 * used to filter and transform data rows before ad generation.
 */

import { z } from "zod";

/**
 * Available operators for condition evaluation
 */
export const operators = [
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
] as const;

export type Operator = (typeof operators)[number];

export const operatorSchema = z.enum(operators);

/**
 * Condition value can be various types depending on the operator
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
 * Single condition that evaluates a field against a value using an operator
 */
export interface Condition {
  id: string;
  field: string;
  operator: Operator;
  value: ConditionValue;
}

export const conditionSchema: z.ZodType<Condition> = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  operator: operatorSchema,
  value: conditionValueSchema,
});

/**
 * Logic operators for combining conditions
 */
export type LogicOperator = "AND" | "OR";

export const logicOperatorSchema = z.enum(["AND", "OR"]);

/**
 * Condition group that can contain conditions and nested groups
 * with AND/OR logic
 */
export interface ConditionGroup {
  id: string;
  logic: LogicOperator;
  conditions: (Condition | ConditionGroup)[];
}

/**
 * Type guard to check if an item is a Condition (not a ConditionGroup)
 */
export function isCondition(
  item: Condition | ConditionGroup
): item is Condition {
  return "field" in item && "operator" in item;
}

/**
 * Type guard to check if an item is a ConditionGroup
 */
export function isConditionGroup(
  item: Condition | ConditionGroup
): item is ConditionGroup {
  return "logic" in item && "conditions" in item;
}

// Create recursive schema for condition groups
const conditionOrGroupSchema: z.ZodType<Condition | ConditionGroup> = z.lazy(
  () =>
    z.union([
      conditionSchema,
      z.object({
        id: z.string().min(1),
        logic: logicOperatorSchema,
        conditions: z.array(conditionOrGroupSchema),
      }),
    ])
);

export const conditionGroupSchema: z.ZodType<ConditionGroup> = z.object({
  id: z.string().min(1),
  logic: logicOperatorSchema,
  conditions: z.array(conditionOrGroupSchema),
});

/**
 * Action types that can be performed when a rule matches
 */
export const actionTypes = [
  "skip",
  "set_field",
  "add_to_group",
  "remove_from_group",
  "set_targeting",
  "modify_field",
  "add_tag",
] as const;

export type ActionType = (typeof actionTypes)[number];

export const actionTypeSchema = z.enum(actionTypes);

/**
 * Base interface for all actions
 */
export interface BaseAction {
  id: string;
  type: ActionType;
}

/**
 * Skip action - marks the row to be skipped in output
 */
export interface SkipAction extends BaseAction {
  type: "skip";
}

/**
 * Set field action - sets a field to a specific value
 * Value can contain variables like {product_name}
 */
export interface SetFieldAction extends BaseAction {
  type: "set_field";
  field: string;
  value: string;
}

/**
 * Modify field action - modifies an existing field value
 */
export interface ModifyFieldAction extends BaseAction {
  type: "modify_field";
  field: string;
  operation: "append" | "prepend" | "replace";
  value: string;
  pattern?: string; // For replace operation
}

/**
 * Add to group action - adds the row to a named group
 */
export interface AddToGroupAction extends BaseAction {
  type: "add_to_group";
  groupName: string;
}

/**
 * Remove from group action - removes the row from a named group
 */
export interface RemoveFromGroupAction extends BaseAction {
  type: "remove_from_group";
  groupName: string;
}

/**
 * Set targeting action - sets targeting parameters
 */
export interface SetTargetingAction extends BaseAction {
  type: "set_targeting";
  targeting: Record<string, unknown>;
}

/**
 * Add tag action - adds a tag to the row
 */
export interface AddTagAction extends BaseAction {
  type: "add_tag";
  tag: string;
}

export type Action =
  | SkipAction
  | SetFieldAction
  | ModifyFieldAction
  | AddToGroupAction
  | RemoveFromGroupAction
  | SetTargetingAction
  | AddTagAction;

// Zod schemas for each action type
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

export const modifyFieldActionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("modify_field"),
  field: z.string().min(1),
  operation: z.enum(["append", "prepend", "replace"]),
  value: z.string(),
  pattern: z.string().optional(),
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

export const actionSchema: z.ZodType<Action> = z.discriminatedUnion("type", [
  skipActionSchema,
  setFieldActionSchema,
  modifyFieldActionSchema,
  addToGroupActionSchema,
  removeFromGroupActionSchema,
  setTargetingActionSchema,
  addTagActionSchema,
]);

/**
 * Complete rule definition
 */
export interface Rule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditionGroup: ConditionGroup;
  actions: Action[];
  createdAt: Date;
  updatedAt: Date;
}

export const ruleSchema: z.ZodType<Rule> = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  enabled: z.boolean(),
  priority: z.number().int(),
  conditionGroup: conditionGroupSchema,
  actions: z.array(actionSchema).min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Schema for creating a new rule (without id and timestamps)
 */
export const createRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(0),
  conditionGroup: conditionGroupSchema,
  actions: z.array(actionSchema).min(1),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;

/**
 * Schema for updating a rule
 */
export const updateRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  conditionGroup: conditionGroupSchema.optional(),
  actions: z.array(actionSchema).min(1).optional(),
});

export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

/**
 * Helper to generate unique IDs for conditions, groups, and actions
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an empty condition
 */
export function createEmptyCondition(): Condition {
  return {
    id: generateId(),
    field: "",
    operator: "equals",
    value: "",
  };
}

/**
 * Create an empty condition group
 */
export function createEmptyConditionGroup(): ConditionGroup {
  return {
    id: generateId(),
    logic: "AND",
    conditions: [createEmptyCondition()],
  };
}

/**
 * Create an empty rule
 */
export function createEmptyRule(): Omit<Rule, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    enabled: true,
    priority: 0,
    conditionGroup: createEmptyConditionGroup(),
    actions: [],
  };
}
