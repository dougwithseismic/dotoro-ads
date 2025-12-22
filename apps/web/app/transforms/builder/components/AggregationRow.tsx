"use client";

import { useMemo, useCallback } from "react";
import styles from "./AggregationRow.module.css";
import type {
  AggregationConfig,
  AggregationFunction,
  ConditionConfig,
} from "../../types";
import {
  AGGREGATION_FUNCTIONS,
  CONDITION_OPERATORS,
  getAggregationFunctionMeta,
} from "../../types";

interface AggregationRowProps {
  aggregation: AggregationConfig;
  columns: string[];
  index: number;
  onChange: (aggregation: AggregationConfig) => void;
  onRemove: () => void;
}

export function AggregationRow({
  aggregation,
  columns,
  index,
  onChange,
  onRemove,
}: AggregationRowProps) {
  const functionMeta = useMemo(() => {
    return getAggregationFunctionMeta(aggregation.function);
  }, [aggregation.function]);

  const handleFunctionChange = useCallback(
    (fn: AggregationFunction) => {
      const meta = getAggregationFunctionMeta(fn);
      const updated: AggregationConfig = {
        ...aggregation,
        function: fn,
        // Clear sourceField if function doesn't require it
        sourceField: meta?.requiresSourceField ? aggregation.sourceField : undefined,
        // Reset options based on new function
        options: undefined,
      };

      // Set default options for specific functions
      if (fn === "CONCAT") {
        updated.options = { separator: ", " };
      } else if (fn === "COUNT_IF") {
        updated.options = {
          condition: { field: "", operator: "equals", value: "" },
        };
      }

      onChange(updated);
    },
    [aggregation, onChange]
  );

  const handleSourceFieldChange = useCallback(
    (field: string) => {
      onChange({ ...aggregation, sourceField: field || undefined });
    },
    [aggregation, onChange]
  );

  const handleOutputFieldChange = useCallback(
    (field: string) => {
      onChange({ ...aggregation, outputField: field });
    },
    [aggregation, onChange]
  );

  const handleSeparatorChange = useCallback(
    (separator: string) => {
      onChange({
        ...aggregation,
        options: { ...aggregation.options, separator },
      });
    },
    [aggregation, onChange]
  );

  const handleLimitChange = useCallback(
    (limit: number | undefined) => {
      onChange({
        ...aggregation,
        options: { ...aggregation.options, limit },
      });
    },
    [aggregation, onChange]
  );

  const handleConditionChange = useCallback(
    (condition: ConditionConfig) => {
      onChange({
        ...aggregation,
        options: { ...aggregation.options, condition },
      });
    },
    [aggregation, onChange]
  );

  const handleDistinctChange = useCallback(
    (distinct: boolean) => {
      onChange({
        ...aggregation,
        options: { ...aggregation.options, distinct },
      });
    },
    [aggregation, onChange]
  );

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.index}>#{index + 1}</span>
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          title="Remove aggregation"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 4L12 12M4 12L12 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>Function *</label>
          <select
            className={styles.select}
            value={aggregation.function}
            onChange={(e) =>
              handleFunctionChange(e.target.value as AggregationFunction)
            }
          >
            {AGGREGATION_FUNCTIONS.map((fn) => (
              <option key={fn.value} value={fn.value}>
                {fn.label}
              </option>
            ))}
          </select>
          {functionMeta && (
            <span className={styles.hint}>{functionMeta.description}</span>
          )}
        </div>

        {functionMeta?.requiresSourceField && (
          <div className={styles.field}>
            <label className={styles.label}>Source Field *</label>
            <select
              className={styles.select}
              value={aggregation.sourceField || ""}
              onChange={(e) => handleSourceFieldChange(e.target.value)}
            >
              <option value="">Select a field...</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Output Field Name *</label>
          <input
            type="text"
            className={styles.input}
            value={aggregation.outputField}
            onChange={(e) => handleOutputFieldChange(e.target.value)}
            placeholder="e.g., total_count"
          />
        </div>

        {/* Options for specific functions */}
        {aggregation.function === "CONCAT" && (
          <div className={styles.field}>
            <label className={styles.label}>Separator</label>
            <input
              type="text"
              className={styles.input}
              value={aggregation.options?.separator || ", "}
              onChange={(e) => handleSeparatorChange(e.target.value)}
              placeholder=", "
            />
          </div>
        )}

        {aggregation.function === "COLLECT" && (
          <div className={styles.field}>
            <label className={styles.label}>Max Items (optional)</label>
            <input
              type="number"
              className={styles.input}
              value={aggregation.options?.limit || ""}
              onChange={(e) =>
                handleLimitChange(
                  e.target.value ? parseInt(e.target.value, 10) : undefined
                )
              }
              placeholder="No limit"
              min={1}
            />
          </div>
        )}

        {aggregation.function === "COUNT" && (
          <div className={styles.checkboxField}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={aggregation.options?.distinct || false}
                onChange={(e) => handleDistinctChange(e.target.checked)}
              />
              <span>Count distinct values only</span>
            </label>
          </div>
        )}

        {aggregation.function === "COUNT_IF" && (
          <div className={styles.conditionSection}>
            <label className={styles.label}>Condition</label>
            <div className={styles.conditionFields}>
              <select
                className={styles.selectSmall}
                value={aggregation.options?.condition?.field || ""}
                onChange={(e) =>
                  handleConditionChange({
                    ...(aggregation.options?.condition || {
                      field: "",
                      operator: "equals",
                      value: "",
                    }),
                    field: e.target.value,
                  })
                }
              >
                <option value="">Field...</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <select
                className={styles.selectSmall}
                value={aggregation.options?.condition?.operator || "equals"}
                onChange={(e) =>
                  handleConditionChange({
                    ...(aggregation.options?.condition || {
                      field: "",
                      operator: "equals",
                      value: "",
                    }),
                    operator: e.target.value,
                  })
                }
              >
                {CONDITION_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className={styles.inputSmall}
                value={String(aggregation.options?.condition?.value || "")}
                onChange={(e) =>
                  handleConditionChange({
                    ...(aggregation.options?.condition || {
                      field: "",
                      operator: "equals",
                      value: "",
                    }),
                    value: e.target.value,
                  })
                }
                placeholder="Value"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
