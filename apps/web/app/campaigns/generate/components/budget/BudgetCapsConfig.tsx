"use client";

import { useState, useCallback, useId } from "react";
import type { BudgetCaps } from "../../types";
import { getCurrencySymbol } from "../../utils/currency";
import styles from "./BudgetCapsConfig.module.css";

interface CapField {
  key: keyof BudgetCaps;
  label: string;
  description: string;
}

const CAP_FIELDS: CapField[] = [
  { key: "dailyCap", label: "Daily Cap", description: "Maximum spend per day" },
  { key: "weeklyCap", label: "Weekly Cap", description: "Maximum spend per week" },
  { key: "monthlyCap", label: "Monthly Cap", description: "Maximum spend per month" },
  { key: "totalCap", label: "Total Cap", description: "Maximum lifetime spend" },
];

export interface BudgetCapsConfigProps {
  /** Current budget caps configuration */
  value: BudgetCaps;
  /** Callback when caps change */
  onChange: (caps: BudgetCaps) => void;
  /** Currency code for display */
  currency: string;
  /** Whether section starts expanded */
  defaultExpanded?: boolean;
  /** Whether the inputs are disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * BudgetCapsConfig - Collapsible section for optional budget caps
 *
 * Allows setting daily, weekly, monthly, and total spending caps
 * with progressive disclosure (collapsed by default).
 */
export function BudgetCapsConfig({
  value,
  onChange,
  currency,
  defaultExpanded = false,
  disabled = false,
  className,
}: BudgetCapsConfigProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const generatedId = useId();

  const currencySymbol = getCurrencySymbol(currency);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleCapChange = useCallback(
    (key: keyof BudgetCaps, newValue: string) => {
      onChange({
        ...value,
        [key]: newValue,
      });
    },
    [value, onChange]
  );

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <button
        type="button"
        className={styles.header}
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={`caps-content${generatedId}`}
      >
        <div className={styles.headerContent}>
          <svg className={styles.headerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className={styles.headerTitle}>Budget Caps</span>
          <span className={styles.headerHint}>Optional spending limits</span>
        </div>
        <svg
          className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div id={`caps-content${generatedId}`} className={styles.content}>
          <div className={styles.capsGrid}>
            {CAP_FIELDS.map((field) => (
              <div key={field.key} className={styles.capField}>
                <label htmlFor={`cap-${field.key}${generatedId}`} className={styles.capLabel}>
                  {field.label}
                </label>
                <div className={styles.capInputWrapper}>
                  <span className={styles.currencySymbol}>{currencySymbol}</span>
                  <input
                    id={`cap-${field.key}${generatedId}`}
                    type="text"
                    className={styles.capInput}
                    value={value[field.key] || ""}
                    onChange={(e) => handleCapChange(field.key, e.target.value)}
                    placeholder="No limit"
                    disabled={disabled}
                    data-testid={`cap-${field.key.replace("Cap", "")}`}
                  />
                </div>
                <p className={styles.capDescription}>{field.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
