"use client";

import { useCallback, useId, useMemo } from "react";
import type { BiddingStrategy, BiddingConfig } from "../../types";
import { getCurrencySymbol } from "../../utils/currency";
import styles from "./TargetInputs.module.css";

/** Strategies that require target CPA */
const TARGET_CPA_STRATEGIES: BiddingStrategy[] = ["target_cpa", "cost_cap"];

/** Strategies that require target ROAS */
const TARGET_ROAS_STRATEGIES: BiddingStrategy[] = ["target_roas", "minimum_roas"];

/** Strategies that require max CPC */
const MAX_CPC_STRATEGIES: BiddingStrategy[] = [
  "manual_cpc",
  "enhanced_cpc",
  "bid_cap",
  "reddit_cpc",
];

/** Strategies that require max CPM */
const MAX_CPM_STRATEGIES: BiddingStrategy[] = ["reddit_cpm"];

/** Strategies that require max CPV */
const MAX_CPV_STRATEGIES: BiddingStrategy[] = ["reddit_cpv"];

/** Automatic strategies that require no additional input */
const AUTOMATIC_STRATEGIES: BiddingStrategy[] = [
  "maximize_clicks",
  "maximize_conversions",
  "maximize_conversion_value",
  "target_impression_share",
  "lowest_cost",
  "highest_value",
];

export interface TargetInputsProps {
  /** Current bidding strategy */
  strategy: BiddingStrategy;
  /** Current bidding config values */
  value: Partial<Pick<BiddingConfig, "targetCpa" | "targetRoas" | "maxCpc" | "maxCpm" | "maxCpv">>;
  /** Callback when values change */
  onChange: (value: Partial<BiddingConfig>) => void;
  /** Currency code for display */
  currency: string;
  /** Whether inputs are disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * TargetInputs - Conditional inputs based on bidding strategy
 *
 * Shows appropriate input fields based on the selected strategy:
 * - Target CPA for target_cpa, cost_cap
 * - Target ROAS for target_roas, minimum_roas
 * - Max CPC for manual_cpc, enhanced_cpc, bid_cap
 * - Max CPM/CPV for Reddit strategies
 */
export function TargetInputs({
  strategy,
  value,
  onChange,
  currency,
  disabled = false,
  className,
}: TargetInputsProps) {
  const generatedId = useId();
  const currencySymbol = getCurrencySymbol(currency);

  // Determine which inputs to show
  const showTargetCpa = TARGET_CPA_STRATEGIES.includes(strategy);
  const showTargetRoas = TARGET_ROAS_STRATEGIES.includes(strategy);
  const showMaxCpc = MAX_CPC_STRATEGIES.includes(strategy);
  const showMaxCpm = MAX_CPM_STRATEGIES.includes(strategy);
  const showMaxCpv = MAX_CPV_STRATEGIES.includes(strategy);
  const isAutomatic = AUTOMATIC_STRATEGIES.includes(strategy);

  // Calculate ROAS percentage for display
  const roasPercentage = useMemo(() => {
    if (!value.targetRoas) return null;
    const roasValue = parseFloat(value.targetRoas);
    if (isNaN(roasValue)) return null;
    return Math.round(roasValue * 100);
  }, [value.targetRoas]);

  const handleInputChange = useCallback(
    (field: keyof typeof value, newValue: string) => {
      onChange({
        ...value,
        [field]: newValue,
      });
    },
    [value, onChange]
  );

  // Show message for automatic strategies
  if (isAutomatic) {
    return (
      <div className={`${styles.container} ${className || ""}`}>
        <div className={styles.automaticMessage}>
          <svg className={styles.automaticIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>Automatic bidding - bids will be optimized based on your goals</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {/* Target CPA Input */}
      {showTargetCpa && (
        <div className={styles.inputGroup}>
          <label htmlFor={`target-cpa${generatedId}`} className={styles.label}>
            Target CPA
            <span className={styles.labelHint}>Cost per acquisition</span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.currencySymbol}>{currencySymbol}</span>
            <input
              id={`target-cpa${generatedId}`}
              type="text"
              className={styles.input}
              value={value.targetCpa || ""}
              onChange={(e) => handleInputChange("targetCpa", e.target.value)}
              placeholder="25.00"
              disabled={disabled}
            />
          </div>
          <p className={styles.hint}>
            The average amount you want to pay for a conversion
          </p>
        </div>
      )}

      {/* Target ROAS Input */}
      {showTargetRoas && (
        <div className={styles.inputGroup}>
          <label htmlFor={`target-roas${generatedId}`} className={styles.label}>
            Target ROAS
            <span className={styles.labelHint}>Return on ad spend</span>
          </label>
          <div className={styles.inputWrapper}>
            <input
              id={`target-roas${generatedId}`}
              type="text"
              className={styles.input}
              value={value.targetRoas || ""}
              onChange={(e) => handleInputChange("targetRoas", e.target.value)}
              placeholder="4.0"
              disabled={disabled}
            />
            <span className={styles.inputSuffix}>x</span>
          </div>
          {roasPercentage !== null && (
            <p className={styles.roasPreview}>= {roasPercentage}% return</p>
          )}
          <p className={styles.hint}>
            Target return multiplier (e.g., 4.0 = 400% return)
          </p>
        </div>
      )}

      {/* Max CPC Input */}
      {showMaxCpc && (
        <div className={styles.inputGroup}>
          <label htmlFor={`max-cpc${generatedId}`} className={styles.label}>
            {strategy === "bid_cap" ? "Max Bid" : "Max CPC"}
            <span className={styles.labelHint}>Maximum cost per click</span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.currencySymbol}>{currencySymbol}</span>
            <input
              id={`max-cpc${generatedId}`}
              type="text"
              className={styles.input}
              value={value.maxCpc || ""}
              onChange={(e) => handleInputChange("maxCpc", e.target.value)}
              placeholder="2.50"
              disabled={disabled}
            />
          </div>
          <p className={styles.hint}>
            Maximum amount you are willing to pay per click
          </p>
        </div>
      )}

      {/* Max CPM Input */}
      {showMaxCpm && (
        <div className={styles.inputGroup}>
          <label htmlFor={`max-cpm${generatedId}`} className={styles.label}>
            Max CPM
            <span className={styles.labelHint}>Cost per 1,000 impressions</span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.currencySymbol}>{currencySymbol}</span>
            <input
              id={`max-cpm${generatedId}`}
              type="text"
              className={styles.input}
              value={value.maxCpm || ""}
              onChange={(e) => handleInputChange("maxCpm", e.target.value)}
              placeholder="10.00"
              disabled={disabled}
            />
          </div>
          <p className={styles.hint}>
            Maximum amount you are willing to pay per 1,000 impressions
          </p>
        </div>
      )}

      {/* Max CPV Input */}
      {showMaxCpv && (
        <div className={styles.inputGroup}>
          <label htmlFor={`max-cpv${generatedId}`} className={styles.label}>
            Max CPV
            <span className={styles.labelHint}>Cost per video view</span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.currencySymbol}>{currencySymbol}</span>
            <input
              id={`max-cpv${generatedId}`}
              type="text"
              className={styles.input}
              value={value.maxCpv || ""}
              onChange={(e) => handleInputChange("maxCpv", e.target.value)}
              placeholder="0.10"
              disabled={disabled}
            />
          </div>
          <p className={styles.hint}>
            Maximum amount you are willing to pay per video view (3+ seconds)
          </p>
        </div>
      )}
    </div>
  );
}
