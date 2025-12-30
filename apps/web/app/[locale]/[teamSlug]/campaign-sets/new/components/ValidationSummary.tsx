"use client";

import { useState } from "react";
import type { WizardStep } from "../types";
import styles from "./ValidationSummary.module.css";

export interface ValidationItem {
  /** Field name that has the error */
  field: string;
  /** Error/warning message */
  message: string;
  /** Wizard step where the error occurs */
  step: WizardStep;
  /** Ad group index if applicable */
  adGroupIndex?: number;
  /** Ad index if applicable */
  adIndex?: number;
  /** Severity level */
  severity: "error" | "warning";
}

export interface ValidationCategory {
  characterLimits: ValidationItem[];
  urlFormat: ValidationItem[];
  requiredFields: ValidationItem[];
  variableReferences: ValidationItem[];
  warnings?: ValidationItem[];
}

interface CategoryConfig {
  key: keyof Omit<ValidationCategory, "warnings">;
  label: string;
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  { key: "characterLimits", label: "Character Limit Errors" },
  { key: "urlFormat", label: "URL Format Errors" },
  { key: "requiredFields", label: "Required Field Errors" },
  { key: "variableReferences", label: "Variable Reference Errors" },
];

interface ValidationSummaryProps {
  /** Validation errors grouped by category */
  categories: ValidationCategory;
  /** Callback when user clicks an error to navigate to it */
  onNavigate: (step: WizardStep, context: Partial<ValidationItem>) => void;
}

/**
 * ValidationSummary - Consolidated validation error view for the Preview step.
 *
 * Groups errors by category:
 * - Character Limit Errors
 * - URL Format Errors
 * - Required Field Errors
 * - Variable Reference Errors
 *
 * Each error item is clickable and navigates to the relevant wizard step and field.
 * Categories are expandable/collapsible.
 *
 * @example
 * <ValidationSummary
 *   categories={{
 *     characterLimits: [{ field: "headline", message: "Too long", step: "hierarchy", severity: "error" }],
 *     urlFormat: [],
 *     requiredFields: [],
 *     variableReferences: [],
 *   }}
 *   onNavigate={(step, context) => goToStep(step)}
 * />
 */
export function ValidationSummary({
  categories,
  onNavigate,
}: ValidationSummaryProps) {
  // Track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(CATEGORY_CONFIG.map((c) => c.key))
  );

  // Count total errors
  const totalErrors = CATEGORY_CONFIG.reduce(
    (sum, { key }) => sum + (categories[key]?.length || 0),
    0
  );
  const totalWarnings = categories.warnings?.length || 0;

  // If no errors and no warnings, render nothing
  if (totalErrors === 0 && totalWarnings === 0) {
    return null;
  }

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleItemClick = (item: ValidationItem) => {
    onNavigate(item.step, {
      field: item.field,
      adGroupIndex: item.adGroupIndex,
      adIndex: item.adIndex,
    });
  };

  return (
    <div
      className={styles.container}
      data-testid="validation-summary"
      data-has-errors={totalErrors > 0}
      data-has-warnings={totalWarnings > 0}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>Validation Issues</h3>
        <div className={styles.counts}>
          {totalErrors > 0 && (
            <span className={styles.errorCount}>
              {totalErrors} error{totalErrors !== 1 ? "s" : ""}
            </span>
          )}
          {totalWarnings > 0 && (
            <span className={styles.warningCount}>
              {totalWarnings} warning{totalWarnings !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className={styles.categories}>
        {CATEGORY_CONFIG.map(({ key, label }) => {
          const items = categories[key];
          if (!items || items.length === 0) return null;

          const isExpanded = expandedCategories.has(key);

          return (
            <div key={key} className={styles.category}>
              <button
                type="button"
                className={styles.categoryHeader}
                onClick={() => toggleCategory(key)}
                aria-expanded={isExpanded}
                aria-label={label}
              >
                <span
                  className={`${styles.categoryToggle} ${
                    isExpanded ? styles.categoryToggleExpanded : ""
                  }`}
                >
                  &#x25B6;
                </span>
                <span className={styles.categoryLabel}>{label}</span>
                <span className={styles.categoryCount}>{items.length}</span>
              </button>

              {isExpanded && (
                <ul className={styles.itemList}>
                  {items.map((item, index) => (
                    <li key={`${item.field}-${index}`} className={styles.item}>
                      <button
                        type="button"
                        className={styles.itemButton}
                        onClick={() => handleItemClick(item)}
                        aria-label={item.message}
                      >
                        <span className={styles.itemMessage}>{item.message}</span>
                        <span className={styles.itemLocation}>
                          {item.adGroupIndex !== undefined &&
                            `Ad Group ${item.adGroupIndex + 1}`}
                          {item.adIndex !== undefined &&
                            `, Ad ${item.adIndex + 1}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Warnings section */}
        {categories.warnings && categories.warnings.length > 0 && (
          <div className={styles.category} data-type="warning">
            <button
              type="button"
              className={styles.categoryHeader}
              onClick={() => toggleCategory("warnings")}
              aria-expanded={expandedCategories.has("warnings")}
              aria-label="Warnings"
            >
              <span
                className={`${styles.categoryToggle} ${
                  expandedCategories.has("warnings")
                    ? styles.categoryToggleExpanded
                    : ""
                }`}
              >
                &#x25B6;
              </span>
              <span className={styles.categoryLabel}>Warnings</span>
              <span className={styles.categoryCountWarning}>
                {categories.warnings.length}
              </span>
            </button>

            {expandedCategories.has("warnings") && (
              <ul className={styles.itemList}>
                {categories.warnings.map((item, index) => (
                  <li key={`warning-${index}`} className={styles.itemWarning}>
                    <button
                      type="button"
                      className={styles.itemButton}
                      onClick={() => handleItemClick(item)}
                      aria-label={item.message}
                    >
                      <span className={styles.itemMessage}>{item.message}</span>
                      <span className={styles.itemLocation}>
                        {item.adGroupIndex !== undefined &&
                          `Ad Group ${item.adGroupIndex + 1}`}
                        {item.adIndex !== undefined && `, Ad ${item.adIndex + 1}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ValidationSummary;
