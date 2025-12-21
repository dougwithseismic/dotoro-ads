/**
 * Creative Linker Service
 *
 * Maps creatives to template slots with support for rule-based selection.
 * Integrates with the rule engine for dynamic creative selection based on
 * row data context.
 */

import { RuleEngine } from "../rules/rule-engine.js";
import type { Condition, ConditionGroup } from "../rules/condition-schema.js";

/**
 * Condition for creative selection rule
 * Uses the same operators as the main rule engine
 */
export interface CreativeCondition {
  id: string;
  field: string;
  operator:
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
    | "in"
    | "not_in"
    | "is_empty"
    | "is_not_empty";
  value: string | number | boolean | string[] | number[];
}

/**
 * Rule for selecting a creative based on conditions
 */
export interface CreativeSelectionRule {
  conditions: CreativeCondition[];
  creativeId: string;
  priority: number;
}

/**
 * Mapping between a template slot and a creative
 */
export interface CreativeMapping {
  id: string;
  templateId: string;
  slotName: string;
  creativeId: string;
  isDefault: boolean;
  createdAt: Date;
}

/**
 * Internal storage for creative rules
 */
interface StoredRule {
  templateId: string;
  slotName: string;
  rule: CreativeSelectionRule;
}

/**
 * Creative Linker Service
 */
export class CreativeLinker {
  private mappings: Map<string, CreativeMapping> = new Map();
  private rules: StoredRule[] = [];
  private ruleEngine: RuleEngine;

  constructor() {
    this.ruleEngine = new RuleEngine();
  }

  /**
   * Link a specific creative to a template slot
   */
  async linkCreative(
    templateId: string,
    slotName: string,
    creativeId: string
  ): Promise<void> {
    const id = `${templateId}:${slotName}:${creativeId}`;
    const mapping: CreativeMapping = {
      id,
      templateId,
      slotName,
      creativeId,
      isDefault: true,
      createdAt: new Date(),
    };
    this.mappings.set(id, mapping);
  }

  /**
   * Unlink a specific creative from a template slot
   */
  async unlinkCreative(
    templateId: string,
    slotName: string,
    creativeId: string
  ): Promise<void> {
    const id = `${templateId}:${slotName}:${creativeId}`;
    this.mappings.delete(id);
  }

  /**
   * Set a rule-based creative selection for a slot
   */
  async setCreativeRule(
    templateId: string,
    slotName: string,
    rule: CreativeSelectionRule
  ): Promise<void> {
    this.rules.push({
      templateId,
      slotName,
      rule,
    });
  }

  /**
   * Remove all rules for a template slot
   */
  async clearSlotRules(templateId: string, slotName: string): Promise<void> {
    this.rules = this.rules.filter(
      (r) => !(r.templateId === templateId && r.slotName === slotName)
    );
  }

  /**
   * Resolve which creative to use for a slot based on context
   */
  async resolveCreative(
    templateId: string,
    slotName: string,
    context: Record<string, unknown>
  ): Promise<string | null> {
    // Get all rules for this template slot, sorted by priority
    const slotRules = this.rules
      .filter((r) => r.templateId === templateId && r.slotName === slotName)
      .sort((a, b) => a.rule.priority - b.rule.priority);

    // Try each rule in priority order
    for (const storedRule of slotRules) {
      const matches = this.evaluateConditions(
        storedRule.rule.conditions,
        context
      );
      if (matches) {
        return storedRule.rule.creativeId;
      }
    }

    // Fall back to default creative (first linked creative for the slot)
    const defaultMapping = this.getDefaultMapping(templateId, slotName);
    return defaultMapping?.creativeId ?? null;
  }

  /**
   * Evaluate conditions against a context
   */
  private evaluateConditions(
    conditions: CreativeCondition[],
    context: Record<string, unknown>
  ): boolean {
    // All conditions must match (AND logic)
    for (const condition of conditions) {
      const conditionForEngine: Condition = {
        id: condition.id,
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
      };

      if (!this.ruleEngine.evaluateCondition(conditionForEngine, context)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get the default mapping for a slot
   */
  private getDefaultMapping(
    templateId: string,
    slotName: string
  ): CreativeMapping | null {
    const slotMappings = Array.from(this.mappings.values()).filter(
      (m) => m.templateId === templateId && m.slotName === slotName
    );

    return slotMappings.length > 0 ? slotMappings[0]! : null;
  }

  /**
   * Get all creative mappings for a template
   */
  async getTemplateMappings(templateId: string): Promise<CreativeMapping[]> {
    return Array.from(this.mappings.values()).filter(
      (m) => m.templateId === templateId
    );
  }

  /**
   * Get all creative IDs for a specific slot
   */
  async getSlotCreatives(
    templateId: string,
    slotName: string
  ): Promise<string[]> {
    return Array.from(this.mappings.values())
      .filter(
        (m) => m.templateId === templateId && m.slotName === slotName
      )
      .map((m) => m.creativeId);
  }

  /**
   * Clear all mappings for a specific slot
   */
  async clearSlotMappings(
    templateId: string,
    slotName: string
  ): Promise<void> {
    const keysToDelete: string[] = [];
    for (const [key, mapping] of this.mappings) {
      if (mapping.templateId === templateId && mapping.slotName === slotName) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.mappings.delete(key);
    }
  }

  /**
   * Get all rules for a template slot
   */
  async getSlotRules(
    templateId: string,
    slotName: string
  ): Promise<CreativeSelectionRule[]> {
    return this.rules
      .filter((r) => r.templateId === templateId && r.slotName === slotName)
      .map((r) => r.rule)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Clear all mappings and rules (for testing)
   */
  clear(): void {
    this.mappings.clear();
    this.rules = [];
  }
}

/**
 * Singleton instance
 */
let linkerInstance: CreativeLinker | null = null;

/**
 * Get the creative linker singleton
 */
export function getCreativeLinker(): CreativeLinker {
  if (!linkerInstance) {
    linkerInstance = new CreativeLinker();
  }
  return linkerInstance;
}

/**
 * Reset the linker (for testing)
 */
export function resetCreativeLinker(): void {
  linkerInstance = null;
}
