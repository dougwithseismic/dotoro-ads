"use client";

import { useState, useCallback } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import type { DataSourceColumn } from "../types";
import styles from "./InlineRuleBuilder.module.css";

// Simplified inline rule types
export interface InlineCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface InlineAction {
  id: string;
  type: "skip" | "set_field" | "modify_field" | "add_tag";
  field?: string;
  value?: string;
  operation?: "append" | "prepend" | "replace";
  tag?: string;
}

export interface InlineRule {
  id: string;
  name: string;
  enabled: boolean;
  logic: "AND" | "OR";
  conditions: InlineCondition[];
  actions: InlineAction[];
}

interface InlineRuleBuilderProps {
  rules: InlineRule[];
  onChange: (rules: InlineRule[]) => void;
  availableColumns: DataSourceColumn[];
}

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "doesn't contain" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
];

const ACTION_TYPES = [
  { value: "skip", label: "Skip row", description: "Exclude matching rows from output" },
  { value: "set_field", label: "Set field", description: "Set a field to a specific value" },
  { value: "modify_field", label: "Modify field", description: "Append, prepend, or replace text" },
  { value: "add_tag", label: "Add tag", description: "Tag rows for grouping" },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createEmptyCondition(): InlineCondition {
  return { id: generateId(), field: "", operator: "equals", value: "" };
}

function createEmptyAction(): InlineAction {
  return { id: generateId(), type: "skip" };
}

function createEmptyRule(): InlineRule {
  return {
    id: generateId(),
    name: "",
    enabled: true,
    logic: "AND",
    conditions: [createEmptyCondition()],
    actions: [createEmptyAction()],
  };
}

export function InlineRuleBuilder({ rules, onChange, availableColumns }: InlineRuleBuilderProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleRuleExpanded = useCallback((ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

  const addRule = useCallback(() => {
    const newRule = createEmptyRule();
    onChange([...rules, newRule]);
    setExpandedRules(prev => new Set(prev).add(newRule.id));
  }, [rules, onChange]);

  const removeRule = useCallback((ruleId: string) => {
    onChange(rules.filter(r => r.id !== ruleId));
  }, [rules, onChange]);

  const updateRule = useCallback((ruleId: string, updates: Partial<InlineRule>) => {
    onChange(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  }, [rules, onChange]);

  const addCondition = useCallback((ruleId: string) => {
    onChange(rules.map(r => {
      if (r.id === ruleId) {
        return { ...r, conditions: [...r.conditions, createEmptyCondition()] };
      }
      return r;
    }));
  }, [rules, onChange]);

  const updateCondition = useCallback((ruleId: string, conditionId: string, updates: Partial<InlineCondition>) => {
    onChange(rules.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          conditions: r.conditions.map(c => c.id === conditionId ? { ...c, ...updates } : c),
        };
      }
      return r;
    }));
  }, [rules, onChange]);

  const removeCondition = useCallback((ruleId: string, conditionId: string) => {
    onChange(rules.map(r => {
      if (r.id === ruleId && r.conditions.length > 1) {
        return { ...r, conditions: r.conditions.filter(c => c.id !== conditionId) };
      }
      return r;
    }));
  }, [rules, onChange]);

  const updateAction = useCallback((ruleId: string, actionId: string, updates: Partial<InlineAction>) => {
    onChange(rules.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          actions: r.actions.map(a => a.id === actionId ? { ...a, ...updates } : a),
        };
      }
      return r;
    }));
  }, [rules, onChange]);

  const needsValue = (operator: string) => !["is_empty", "is_not_empty"].includes(operator);

  return (
    <div className={styles.container}>
      {rules.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No rules defined. Rules let you filter or modify data before creating your campaign set.</p>
          <button type="button" className={styles.addRuleButton} onClick={addRule}>
            <Plus size={14} />
            Add Rule
          </button>
        </div>
      ) : (
        <>
          <div className={styles.rulesList}>
            {rules.map((rule, index) => {
              const isExpanded = expandedRules.has(rule.id);
              return (
                <div key={rule.id} className={styles.ruleCard}>
                  <div className={styles.ruleHeader} onClick={() => toggleRuleExpanded(rule.id)}>
                    <button
                      type="button"
                      className={`${styles.expandButton} ${isExpanded ? styles.expanded : ""}`}
                      aria-label={isExpanded ? "Collapse rule" : "Expand rule"}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <input
                      type="text"
                      className={styles.ruleNameInput}
                      placeholder={`Rule ${index + 1}`}
                      value={rule.name}
                      onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={styles.ruleSummary}>
                      {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""} → {rule.actions[0]?.type || "skip"}
                    </span>
                    <button
                      type="button"
                      className={styles.removeRuleButton}
                      onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                      aria-label="Remove rule"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className={styles.ruleBody}>
                      {/* Conditions */}
                      <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                          <span className={styles.sectionLabel}>When</span>
                          <select
                            className={styles.logicSelect}
                            value={rule.logic}
                            onChange={(e) => updateRule(rule.id, { logic: e.target.value as "AND" | "OR" })}
                          >
                            <option value="AND">ALL</option>
                            <option value="OR">ANY</option>
                          </select>
                          <span className={styles.sectionLabelSuffix}>of these conditions match:</span>
                        </div>
                        <div className={styles.conditionsList}>
                          {rule.conditions.map((condition, condIndex) => (
                            <div key={condition.id} className={styles.conditionRow}>
                              <select
                                className={styles.fieldSelect}
                                value={condition.field}
                                onChange={(e) => updateCondition(rule.id, condition.id, { field: e.target.value })}
                              >
                                <option value="">Select field</option>
                                {availableColumns.map(col => (
                                  <option key={col.name} value={col.name}>{col.name}</option>
                                ))}
                              </select>
                              <select
                                className={styles.operatorSelect}
                                value={condition.operator}
                                onChange={(e) => updateCondition(rule.id, condition.id, { operator: e.target.value })}
                              >
                                {OPERATORS.map(op => (
                                  <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                              </select>
                              {needsValue(condition.operator) && (
                                <input
                                  type="text"
                                  className={styles.valueInput}
                                  placeholder="Value"
                                  value={condition.value}
                                  onChange={(e) => updateCondition(rule.id, condition.id, { value: e.target.value })}
                                />
                              )}
                              {rule.conditions.length > 1 && (
                                <button
                                  type="button"
                                  className={styles.removeConditionButton}
                                  onClick={() => removeCondition(rule.id, condition.id)}
                                  aria-label="Remove condition"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={styles.addConditionButton}
                          onClick={() => addCondition(rule.id)}
                        >
                          <Plus size={12} />
                          Add condition
                        </button>
                      </div>

                      {/* Actions */}
                      <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                          <span className={styles.sectionLabel}>Then</span>
                        </div>
                        {rule.actions.map(action => (
                          <div key={action.id} className={styles.actionRow}>
                            <select
                              className={styles.actionTypeSelect}
                              value={action.type}
                              onChange={(e) => updateAction(rule.id, action.id, {
                                type: e.target.value as InlineAction["type"],
                                field: undefined,
                                value: undefined,
                                operation: undefined,
                                tag: undefined,
                              })}
                            >
                              {ACTION_TYPES.map(at => (
                                <option key={at.value} value={at.value}>{at.label}</option>
                              ))}
                            </select>

                            {action.type === "set_field" && (
                              <>
                                <select
                                  className={styles.fieldSelect}
                                  value={action.field || ""}
                                  onChange={(e) => updateAction(rule.id, action.id, { field: e.target.value })}
                                >
                                  <option value="">Select field</option>
                                  {availableColumns.map(col => (
                                    <option key={col.name} value={col.name}>{col.name}</option>
                                  ))}
                                </select>
                                <span className={styles.actionSeparator}>to</span>
                                <input
                                  type="text"
                                  className={styles.valueInput}
                                  placeholder="Value or {variable}"
                                  value={action.value || ""}
                                  onChange={(e) => updateAction(rule.id, action.id, { value: e.target.value })}
                                />
                              </>
                            )}

                            {action.type === "modify_field" && (
                              <>
                                <select
                                  className={styles.operationSelect}
                                  value={action.operation || "append"}
                                  onChange={(e) => updateAction(rule.id, action.id, { operation: e.target.value as "append" | "prepend" | "replace" })}
                                >
                                  <option value="append">Append</option>
                                  <option value="prepend">Prepend</option>
                                  <option value="replace">Replace</option>
                                </select>
                                <input
                                  type="text"
                                  className={styles.valueInput}
                                  placeholder="Text"
                                  value={action.value || ""}
                                  onChange={(e) => updateAction(rule.id, action.id, { value: e.target.value })}
                                />
                                <span className={styles.actionSeparator}>in</span>
                                <select
                                  className={styles.fieldSelect}
                                  value={action.field || ""}
                                  onChange={(e) => updateAction(rule.id, action.id, { field: e.target.value })}
                                >
                                  <option value="">Select field</option>
                                  {availableColumns.map(col => (
                                    <option key={col.name} value={col.name}>{col.name}</option>
                                  ))}
                                </select>
                              </>
                            )}

                            {action.type === "add_tag" && (
                              <input
                                type="text"
                                className={styles.valueInput}
                                placeholder="Tag name"
                                value={action.tag || ""}
                                onChange={(e) => updateAction(rule.id, action.id, { tag: e.target.value })}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" className={styles.addRuleButton} onClick={addRule}>
            <Plus size={14} />
            Add Rule
          </button>
        </>
      )}
    </div>
  );
}
