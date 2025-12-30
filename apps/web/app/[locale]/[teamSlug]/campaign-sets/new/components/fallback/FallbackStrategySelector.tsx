"use client";

import { useCallback } from "react";
import styles from "./FallbackStrategySelector.module.css";

/**
 * Strategy for handling ads that fail validation due to field length limits.
 */
export type CampaignSetFallbackStrategy = "skip" | "truncate" | "use_fallback";

export interface FallbackStrategySelectorProps {
  /** Currently selected strategy */
  value: CampaignSetFallbackStrategy;
  /** Callback when strategy changes */
  onChange: (strategy: CampaignSetFallbackStrategy) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

interface StrategyOption {
  value: CampaignSetFallbackStrategy;
  label: string;
  description: string;
  recommended?: boolean;
}

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    value: "skip",
    label: "Skip",
    description:
      "Skip ads that exceed character limits. Safest option - no invalid data is sent to the platform.",
    recommended: true,
  },
  {
    value: "truncate",
    label: "Truncate",
    description:
      "Automatically shorten text fields to fit within limits. May cut off important content.",
  },
  {
    value: "use_fallback",
    label: "Use Fallback",
    description:
      "Replace problematic ads with a pre-defined fallback ad. Requires fallback ad configuration.",
  },
];

/**
 * FallbackStrategySelector - Radio button selector for fallback strategies
 *
 * Allows users to choose how ads that exceed platform character limits
 * should be handled during sync.
 */
export function FallbackStrategySelector({
  value,
  onChange,
  disabled = false,
  className,
}: FallbackStrategySelectorProps) {
  const handleChange = useCallback(
    (strategy: CampaignSetFallbackStrategy) => {
      if (!disabled) {
        onChange(strategy);
      }
    },
    [disabled, onChange]
  );

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.header}>
        <h4 className={styles.title}>Fallback Strategy</h4>
        <p className={styles.subtitle}>
          Choose how to handle ads that exceed platform character limits
        </p>
      </div>

      <div className={styles.options} role="radiogroup" aria-label="Fallback strategy">
        {STRATEGY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`${styles.option} ${value === option.value ? styles.selected : ""} ${
              disabled ? styles.disabled : ""
            }`}
          >
            <input
              type="radio"
              name="fallback-strategy"
              value={option.value}
              checked={value === option.value}
              onChange={() => handleChange(option.value)}
              disabled={disabled}
              className={styles.radio}
            />
            <div className={styles.content}>
              <div className={styles.labelRow}>
                <span className={styles.label}>{option.label}</span>
                {option.recommended && (
                  <span className={styles.recommended}>Recommended</span>
                )}
              </div>
              <span className={styles.description}>{option.description}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
