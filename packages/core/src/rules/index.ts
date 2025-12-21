/**
 * Rule Engine Module
 *
 * Exports all rule-related types, schemas, and classes.
 */

// Condition schemas and types
export {
  operators,
  operatorSchema,
  conditionValueSchema,
  conditionSchema,
  logicOperatorSchema,
  conditionGroupSchema,
  actionTypes,
  actionTypeSchema,
  skipActionSchema,
  setFieldActionSchema,
  modifyFieldActionSchema,
  addToGroupActionSchema,
  removeFromGroupActionSchema,
  setTargetingActionSchema,
  addTagActionSchema,
  actionSchema,
  ruleSchema,
  createRuleSchema,
  updateRuleSchema,
  isCondition,
  isConditionGroup,
  generateId,
  createEmptyCondition,
  createEmptyConditionGroup,
  createEmptyRule,
} from "./condition-schema.js";

export type {
  Operator,
  ConditionValue,
  Condition,
  LogicOperator,
  ConditionGroup,
  ActionType,
  BaseAction,
  SkipAction,
  SetFieldAction,
  ModifyFieldAction,
  AddToGroupAction,
  RemoveFromGroupAction,
  SetTargetingAction,
  AddTagAction,
  Action,
  Rule,
  CreateRuleInput,
  UpdateRuleInput,
} from "./condition-schema.js";

// Rule engine
export { RuleEngine } from "./rule-engine.js";
export type {
  ProcessedRow,
  RuleEngineOptions,
} from "./rule-engine.js";

// Actions
export {
  ActionExecutor,
  createSkipAction,
  createSetFieldAction,
  createModifyFieldAction,
  createAddToGroupAction,
  createRemoveFromGroupAction,
  createSetTargetingAction,
  createAddTagAction,
} from "./actions.js";

export type {
  AppliedAction,
  ExecutionResult,
  ActionExecutorOptions,
} from "./actions.js";
