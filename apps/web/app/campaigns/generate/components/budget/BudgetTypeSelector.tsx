"use client";

import { useCallback } from "react";
import type { BudgetType } from "../../types";
import styles from "./BudgetTypeSelector.module.css";

interface BudgetTypeOption {
  id: BudgetType;
  name: string;
  description: string;
  icon: string;
}

const BUDGET_TYPES: BudgetTypeOption[] = [
  {
    id: "daily",
    name: "Daily",
    description: "Resets each day",
    icon: "calendar",
  },
  {
    id: "lifetime",
    name: "Lifetime",
    description: "Total for campaign duration",
    icon: "target",
  },
  {
    id: "shared",
    name: "Shared",
    description: "Share across campaigns",
    icon: "link",
  },
];

export interface BudgetTypeSelectorProps {
  /** Currently selected budget type */
  value: BudgetType;
  /** Callback when budget type changes */
  onChange: (type: BudgetType) => void;
  /** Optional label for the selector */
  label?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether to show shared budget configuration */
  showSharedConfig?: boolean;
  /** Shared budget ID value */
  sharedBudgetId?: string;
  /** Callback when shared budget ID changes */
  onSharedBudgetIdChange?: (id: string) => void;
  /** Additional class name */
  className?: string;
}

/**
 * BudgetTypeSelector - Visual card selector for budget types
 *
 * Allows users to choose between daily, lifetime, or shared budget types
 * with visual cards and descriptions for each option.
 */
export function BudgetTypeSelector({
  value,
  onChange,
  label,
  disabled = false,
  showSharedConfig = false,
  sharedBudgetId = "",
  onSharedBudgetIdChange,
  className,
}: BudgetTypeSelectorProps) {
  const handleSelect = useCallback(
    (type: BudgetType) => {
      if (disabled || type === value) return;
      onChange(type);
    },
    [disabled, value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, type: BudgetType) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(type);
      }
    },
    [handleSelect]
  );

  const handleSharedIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSharedBudgetIdChange?.(e.target.value);
    },
    [onSharedBudgetIdChange]
  );

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "calendar":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        );
      case "target":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        );
      case "link":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {label && (
        <h3 id="budget-type-label" className={styles.label}>
          {label}
        </h3>
      )}

      <div
        className={`${styles.typeGroup} ${disabled ? styles.disabled : ""}`}
        role="radiogroup"
        aria-labelledby={label ? "budget-type-label" : undefined}
        aria-label={label ? undefined : "Budget type"}
      >
        {BUDGET_TYPES.map((type) => {
          const isSelected = value === type.id;

          return (
            <button
              key={type.id}
              type="button"
              className={`${styles.typeCard} ${isSelected ? styles.typeCardSelected : ""}`}
              onClick={() => handleSelect(type.id)}
              onKeyDown={(e) => handleKeyDown(e, type.id)}
              disabled={disabled}
              data-testid={`budget-type-${type.id}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${type.name} - ${type.description}`}
            >
              <div className={styles.typeIcon}>{renderIcon(type.icon)}</div>
              <div className={styles.typeInfo}>
                <div className={styles.typeName}>{type.name}</div>
                <div className={styles.typeDescription}>{type.description}</div>
              </div>
              {isSelected && (
                <div className={styles.checkIndicator}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Shared budget configuration */}
      {value === "shared" && showSharedConfig && (
        <div className={styles.sharedConfig}>
          <label htmlFor="shared-budget-id" className={styles.sharedLabel}>
            Shared Budget ID
          </label>
          <input
            id="shared-budget-id"
            type="text"
            className={styles.sharedInput}
            value={sharedBudgetId}
            onChange={handleSharedIdChange}
            placeholder="Enter shared budget ID or leave empty to create new"
            disabled={disabled}
          />
          <p className={styles.sharedHint}>
            Enter an existing shared budget ID or leave empty to create a new shared budget.
          </p>
        </div>
      )}
    </div>
  );
}
