/**
 * Shared types for the rules UI components
 */

export type ActionType =
  | "skip"
  | "set_field"
  | "modify_field"
  | "add_to_group"
  | "remove_from_group"
  | "set_targeting"
  | "add_tag";

export interface BaseAction {
  id: string;
  type: ActionType;
}

export interface SkipAction extends BaseAction {
  type: "skip";
}

export interface SetFieldAction extends BaseAction {
  type: "set_field";
  field: string;
  value: string;
}

export interface ModifyFieldAction extends BaseAction {
  type: "modify_field";
  field: string;
  operation: "append" | "prepend" | "replace";
  value: string;
  pattern?: string;
}

export interface AddToGroupAction extends BaseAction {
  type: "add_to_group";
  groupName: string;
}

export interface RemoveFromGroupAction extends BaseAction {
  type: "remove_from_group";
  groupName: string;
}

export interface SetTargetingAction extends BaseAction {
  type: "set_targeting";
  targeting: Record<string, unknown>;
}

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

export type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "regex"
  | "in"
  | "not_in"
  | "is_empty"
  | "is_not_empty";

export interface Condition {
  id: string;
  field: string;
  operator: Operator;
  value: string | number | boolean | string[];
}

export interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: (Condition | ConditionGroup)[];
}

export interface Rule {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditionGroup: ConditionGroup;
  actions: Action[];
}
