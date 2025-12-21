"use client";

import styles from "./ConditionRow.module.css";
import type { Condition } from "../types";

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "greater_than_or_equal", label: "greater than or equal" },
  { value: "less_than_or_equal", label: "less than or equal" },
  { value: "regex", label: "matches regex" },
  { value: "in", label: "is one of" },
  { value: "not_in", label: "is not one of" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

interface ConditionRowProps {
  condition: Condition;
  fields: string[];
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export default function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
  canRemove,
}: ConditionRowProps) {
  const isValueless = ["is_empty", "is_not_empty"].includes(condition.operator);
  const isArrayValue = ["in", "not_in"].includes(condition.operator);

  const handleFieldChange = (field: string) => {
    onChange({ ...condition, field });
  };

  const handleOperatorChange = (operator: string) => {
    let value = condition.value;
    if (["is_empty", "is_not_empty"].includes(operator)) {
      value = "";
    } else if (["in", "not_in"].includes(operator) && !Array.isArray(value)) {
      value = [];
    } else if (!["in", "not_in"].includes(operator) && Array.isArray(value)) {
      value = "";
    }
    onChange({ ...condition, operator, value });
  };

  const handleValueChange = (value: string) => {
    if (isArrayValue) {
      const arrayValue = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v !== "");
      onChange({ ...condition, value: arrayValue });
    } else {
      onChange({ ...condition, value });
    }
  };

  const displayValue = isArrayValue && Array.isArray(condition.value)
    ? condition.value.join(", ")
    : String(condition.value ?? "");

  return (
    <div className={styles.row}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Field</label>
        {fields.length > 0 ? (
          <select
            className={styles.select}
            value={condition.field}
            onChange={(e) => handleFieldChange(e.target.value)}
          >
            <option value="">Select field...</option>
            {fields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className={styles.input}
            value={condition.field}
            onChange={(e) => handleFieldChange(e.target.value)}
            placeholder="Enter field name"
          />
        )}
      </div>

      <div className={styles.operatorGroup}>
        <label className={styles.label}>Operator</label>
        <select
          className={styles.select}
          value={condition.operator}
          onChange={(e) => handleOperatorChange(e.target.value)}
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {!isValueless && (
        <div className={styles.valueGroup}>
          <label className={styles.label}>
            Value{isArrayValue && " (comma-separated)"}
          </label>
          <input
            type="text"
            className={styles.input}
            value={displayValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={isArrayValue ? "value1, value2, value3" : "Enter value"}
          />
        </div>
      )}

      {canRemove && (
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          title="Remove condition"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
