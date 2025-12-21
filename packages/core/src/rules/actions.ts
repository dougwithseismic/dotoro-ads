/**
 * Action Executor System
 *
 * Executes actions when rules match, modifying data rows accordingly.
 */

import type {
  Action,
  SkipAction,
  SetFieldAction,
  ModifyFieldAction,
  AddToGroupAction,
  RemoveFromGroupAction,
  SetTargetingAction,
  AddTagAction,
} from "./condition-schema.js";

/**
 * Result of executing a single action
 */
export interface AppliedAction {
  actionId: string;
  type: Action["type"];
  success: boolean;
  error?: string;
  modifiedRow?: Record<string, unknown>;
  shouldSkip?: boolean;
  group?: string;
  removeGroup?: string;
  tag?: string;
  targeting?: Record<string, unknown>;
}

/**
 * Result of executing multiple actions
 */
export interface ExecutionResult {
  success: boolean;
  actions: AppliedAction[];
  finalRow: Record<string, unknown>;
  shouldSkip: boolean;
  groups: string[];
  tags: string[];
  targeting: Record<string, unknown>;
}

/**
 * Options for the action executor
 */
export interface ActionExecutorOptions {
  /** Enable variable substitution in values (default: true) */
  enableVariableSubstitution?: boolean;
}

const DEFAULT_OPTIONS: Required<ActionExecutorOptions> = {
  enableVariableSubstitution: true,
};

/**
 * Action Executor for running rule actions
 */
export class ActionExecutor {
  private options: Required<ActionExecutorOptions>;

  constructor(options?: ActionExecutorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a single action against a data row
   */
  execute(action: Action, row: Record<string, unknown>): AppliedAction {
    try {
      switch (action.type) {
        case "skip":
          return this.executeSkip(action);

        case "set_field":
          return this.executeSetField(action, row);

        case "modify_field":
          return this.executeModifyField(action, row);

        case "add_to_group":
          return this.executeAddToGroup(action);

        case "remove_from_group":
          return this.executeRemoveFromGroup(action);

        case "set_targeting":
          return this.executeSetTargeting(action);

        case "add_tag":
          return this.executeAddTag(action);

        default:
          return {
            actionId: (action as Action).id,
            type: (action as Action).type,
            success: false,
            error: `Unknown action type: ${(action as Action).type}`,
          };
      }
    } catch (error) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute multiple actions in order
   */
  executeAll(
    actions: Action[],
    row: Record<string, unknown>
  ): ExecutionResult {
    let currentRow = { ...row };
    const appliedActions: AppliedAction[] = [];
    let shouldSkip = false;
    const groups: string[] = [];
    const tags: string[] = [];
    let targeting: Record<string, unknown> = {};

    for (const action of actions) {
      const result = this.execute(action, currentRow);
      appliedActions.push(result);

      if (result.success) {
        if (result.modifiedRow) {
          currentRow = result.modifiedRow;
        }
        if (result.shouldSkip) {
          shouldSkip = true;
        }
        if (result.group && !groups.includes(result.group)) {
          groups.push(result.group);
        }
        if (result.removeGroup) {
          const idx = groups.indexOf(result.removeGroup);
          if (idx !== -1) {
            groups.splice(idx, 1);
          }
        }
        if (result.tag && !tags.includes(result.tag)) {
          tags.push(result.tag);
        }
        if (result.targeting) {
          targeting = { ...targeting, ...result.targeting };
        }
      }
    }

    return {
      success: appliedActions.every((a) => a.success),
      actions: appliedActions,
      finalRow: currentRow,
      shouldSkip,
      groups,
      tags,
      targeting,
    };
  }

  /**
   * Execute skip action
   */
  private executeSkip(action: SkipAction): AppliedAction {
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      shouldSkip: true,
    };
  }

  /**
   * Execute set_field action with variable substitution
   */
  private executeSetField(
    action: SetFieldAction,
    row: Record<string, unknown>
  ): AppliedAction {
    const value = this.options.enableVariableSubstitution
      ? this.substituteVariables(action.value, row)
      : action.value;

    const modifiedRow = {
      ...row,
      [action.field]: value,
    };

    return {
      actionId: action.id,
      type: action.type,
      success: true,
      modifiedRow,
    };
  }

  /**
   * Execute modify_field action
   */
  private executeModifyField(
    action: ModifyFieldAction,
    row: Record<string, unknown>
  ): AppliedAction {
    const currentValue = String(row[action.field] ?? "");
    const newValue = this.options.enableVariableSubstitution
      ? this.substituteVariables(action.value, row)
      : action.value;

    let modifiedValue: string;

    switch (action.operation) {
      case "append":
        modifiedValue = currentValue + newValue;
        break;

      case "prepend":
        modifiedValue = newValue + currentValue;
        break;

      case "replace":
        if (action.pattern) {
          // Validate regex pattern
          if (!this.isRegexSafe(action.pattern)) {
            return {
              actionId: action.id,
              type: action.type,
              success: false,
              error: "Invalid or unsafe regex pattern",
            };
          }
          try {
            const regex = new RegExp(action.pattern, "g");
            modifiedValue = currentValue.replace(regex, newValue);
          } catch {
            return {
              actionId: action.id,
              type: action.type,
              success: false,
              error: "Invalid regex pattern",
            };
          }
        } else {
          // Simple string replacement
          modifiedValue = newValue;
        }
        break;

      default:
        return {
          actionId: action.id,
          type: action.type,
          success: false,
          error: `Unknown operation: ${action.operation}`,
        };
    }

    const modifiedRow = {
      ...row,
      [action.field]: modifiedValue,
    };

    return {
      actionId: action.id,
      type: action.type,
      success: true,
      modifiedRow,
    };
  }

  /**
   * Execute add_to_group action
   */
  private executeAddToGroup(action: AddToGroupAction): AppliedAction {
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      group: action.groupName,
    };
  }

  /**
   * Execute remove_from_group action
   */
  private executeRemoveFromGroup(action: RemoveFromGroupAction): AppliedAction {
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      removeGroup: action.groupName,
    };
  }

  /**
   * Execute set_targeting action
   */
  private executeSetTargeting(action: SetTargetingAction): AppliedAction {
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      targeting: action.targeting,
    };
  }

  /**
   * Execute add_tag action
   */
  private executeAddTag(action: AddTagAction): AppliedAction {
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      tag: action.tag,
    };
  }

  /**
   * Simple variable substitution for action values
   * Supports {variable_name} syntax
   */
  private substituteVariables(
    template: string,
    row: Record<string, unknown>
  ): string {
    return template.replace(/\{([^{}]+)\}/g, (match, varName) => {
      const value = row[varName.trim()];
      if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    });
  }

  /**
   * Validate regex pattern for safety (ReDoS prevention)
   */
  private isRegexSafe(pattern: string): boolean {
    const NESTED_QUANTIFIERS = /\([^)]*[+*][^)]*\)[+*?]/;
    const MAX_PATTERN_LENGTH = 100;

    if (pattern.length > MAX_PATTERN_LENGTH) {
      return false;
    }

    if (NESTED_QUANTIFIERS.test(pattern)) {
      return false;
    }

    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a skip action
 */
export function createSkipAction(id?: string): SkipAction {
  return {
    id: id ?? generateId(),
    type: "skip",
  };
}

/**
 * Create a set_field action
 */
export function createSetFieldAction(
  field: string,
  value: string,
  id?: string
): SetFieldAction {
  return {
    id: id ?? generateId(),
    type: "set_field",
    field,
    value,
  };
}

/**
 * Create a modify_field action
 */
export function createModifyFieldAction(
  field: string,
  operation: "append" | "prepend" | "replace",
  value: string,
  pattern?: string,
  id?: string
): ModifyFieldAction {
  return {
    id: id ?? generateId(),
    type: "modify_field",
    field,
    operation,
    value,
    pattern,
  };
}

/**
 * Create an add_to_group action
 */
export function createAddToGroupAction(
  groupName: string,
  id?: string
): AddToGroupAction {
  return {
    id: id ?? generateId(),
    type: "add_to_group",
    groupName,
  };
}

/**
 * Create a remove_from_group action
 */
export function createRemoveFromGroupAction(
  groupName: string,
  id?: string
): RemoveFromGroupAction {
  return {
    id: id ?? generateId(),
    type: "remove_from_group",
    groupName,
  };
}

/**
 * Create a set_targeting action
 */
export function createSetTargetingAction(
  targeting: Record<string, unknown>,
  id?: string
): SetTargetingAction {
  return {
    id: id ?? generateId(),
    type: "set_targeting",
    targeting,
  };
}

/**
 * Create an add_tag action
 */
export function createAddTagAction(tag: string, id?: string): AddTagAction {
  return {
    id: id ?? generateId(),
    type: "add_tag",
    tag,
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
