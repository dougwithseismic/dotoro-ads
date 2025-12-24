"use client";

import { useCallback } from "react";
import type { BiddingStrategy, Platform, BiddingStrategyDefinition } from "../../types";
import { getBiddingStrategies } from "../../types";
import styles from "./BiddingStrategySelector.module.css";

export interface BiddingStrategySelectorProps {
  /** Platform to show strategies for */
  platform: Platform;
  /** Currently selected strategy */
  value: BiddingStrategy;
  /** Callback when strategy changes */
  onChange: (strategy: BiddingStrategy) => void;
  /** Strategy to show as recommended */
  recommendedStrategy?: BiddingStrategy;
  /** Optional label */
  label?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * BiddingStrategySelector - Radio button list for platform-specific bidding strategies
 *
 * Shows available strategies for the selected platform with descriptions,
 * requirements, and recommended options.
 */
export function BiddingStrategySelector({
  platform,
  value,
  onChange,
  recommendedStrategy,
  label = "Bidding Strategy",
  disabled = false,
  className,
}: BiddingStrategySelectorProps) {
  const strategies = getBiddingStrategies(platform);

  const handleSelect = useCallback(
    (strategy: BiddingStrategy) => {
      if (disabled || strategy === value) return;
      onChange(strategy);
    },
    [disabled, value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, strategy: BiddingStrategy) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(strategy);
      }
    },
    [handleSelect]
  );

  const getRequirementText = (strategy: BiddingStrategyDefinition): string | null => {
    if (strategy.minimumData?.conversions) {
      return `Requires ${strategy.minimumData.conversions}+ conversions`;
    }
    if (strategy.minimumBudget) {
      return `Minimum budget: $${strategy.minimumBudget}/day`;
    }
    return null;
  };

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {label && <h4 className={styles.label}>{label}</h4>}

      <div
        className={`${styles.strategyGroup} ${disabled ? styles.disabled : ""}`}
        role="radiogroup"
        aria-label={label}
      >
        {strategies.map((strategy) => {
          const isSelected = value === strategy.id;
          const isRecommended = recommendedStrategy === strategy.id;
          const requirementText = getRequirementText(strategy);

          return (
            <button
              key={strategy.id}
              type="button"
              className={`${styles.strategyOption} ${isSelected ? styles.strategyOptionSelected : ""}`}
              onClick={() => handleSelect(strategy.id)}
              onKeyDown={(e) => handleKeyDown(e, strategy.id)}
              disabled={disabled}
              data-testid={`strategy-${strategy.id}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${strategy.name} - ${strategy.description}`}
            >
              <div className={styles.radioIndicator}>
                {isSelected && <div className={styles.radioInner} />}
              </div>

              <div className={styles.strategyContent}>
                <div className={styles.strategyHeader}>
                  <span className={styles.strategyName}>{strategy.name}</span>
                  {isRecommended && (
                    <span className={styles.recommendedBadge}>Recommended</span>
                  )}
                </div>
                <p className={styles.strategyDescription}>{strategy.description}</p>

                {/* Requirements and recommendations */}
                {(requirementText || strategy.recommendedFor) && (
                  <div className={styles.strategyMeta}>
                    {requirementText && (
                      <span className={styles.requirement}>{requirementText}</span>
                    )}
                    {strategy.recommendedFor && strategy.recommendedFor.length > 0 && (
                      <span className={styles.useCases}>
                        Best for: {strategy.recommendedFor.join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
