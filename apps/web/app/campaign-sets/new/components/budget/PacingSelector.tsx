"use client";

import { useCallback } from "react";
import styles from "./PacingSelector.module.css";

type PacingType = "standard" | "accelerated";

interface PacingOption {
  id: PacingType;
  name: string;
  description: string;
  icon: string;
  recommended?: boolean;
}

const PACING_OPTIONS: PacingOption[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Spend evenly throughout the day to maximize exposure",
    icon: "clock",
    recommended: true,
  },
  {
    id: "accelerated",
    name: "Accelerated",
    description: "Spend as quickly as possible. May exhaust budget early.",
    icon: "bolt",
  },
];

export interface PacingSelectorProps {
  /** Currently selected pacing type */
  value: PacingType;
  /** Callback when pacing type changes */
  onChange: (type: PacingType) => void;
  /** Optional label */
  label?: string;
  /** Whether to show warning for accelerated pacing */
  showWarning?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * PacingSelector - Toggle between standard and accelerated pacing
 *
 * Visual cards with descriptions for budget pacing strategies.
 */
export function PacingSelector({
  value,
  onChange,
  label,
  showWarning = false,
  disabled = false,
  className,
}: PacingSelectorProps) {
  const handleSelect = useCallback(
    (type: PacingType) => {
      if (disabled || type === value) return;
      onChange(type);
    },
    [disabled, value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, type: PacingType) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(type);
      }
    },
    [handleSelect]
  );

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "clock":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case "bolt":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {label && <h4 className={styles.label}>{label}</h4>}

      <div
        className={`${styles.optionGroup} ${disabled ? styles.disabled : ""}`}
        role="radiogroup"
        aria-label={label || "Pacing strategy"}
      >
        {PACING_OPTIONS.map((option) => {
          const isSelected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
              onClick={() => handleSelect(option.id)}
              onKeyDown={(e) => handleKeyDown(e, option.id)}
              disabled={disabled}
              data-testid={`pacing-${option.id}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${option.name} - ${option.description}`}
            >
              <div className={styles.optionIcon}>{renderIcon(option.icon)}</div>
              <div className={styles.optionContent}>
                <div className={styles.optionHeader}>
                  <span className={styles.optionName}>{option.name}</span>
                  {option.recommended && (
                    <span className={styles.recommendedBadge}>Recommended</span>
                  )}
                </div>
                <p className={styles.optionDescription}>{option.description}</p>
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

      {showWarning && value === "accelerated" && (
        <div className={styles.warning}>
          <svg className={styles.warningIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Accelerated pacing may exhaust your budget early in the day</span>
        </div>
      )}
    </div>
  );
}
