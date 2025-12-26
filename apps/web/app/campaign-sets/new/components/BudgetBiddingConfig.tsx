"use client";

import { useState, useCallback } from "react";
import type {
  BudgetType,
  BudgetConfig,
  BudgetCaps,
  BiddingStrategy,
  BiddingConfig,
  ScheduleConfig,
  Platform,
} from "../types";
import type { DataSourceColumn } from "../types";

// Budget components
import { BudgetTypeSelector } from "./budget/BudgetTypeSelector";
import { BudgetAmountInput } from "./budget/BudgetAmountInput";
import { CurrencySelector } from "./budget/CurrencySelector";
import { PacingSelector } from "./budget/PacingSelector";
import { BudgetCapsConfig } from "./budget/BudgetCapsConfig";

// Bidding components
import { BiddingStrategySelector } from "./bidding/BiddingStrategySelector";
import { TargetInputs } from "./bidding/TargetInputs";

// Schedule components
import { DateRangePicker } from "./schedule/DateRangePicker";

import styles from "./BudgetBiddingConfig.module.css";

/** Combined budget and bidding configuration */
export interface BudgetBiddingConfigValue {
  budget: Partial<BudgetConfig>;
  bidding: Partial<BiddingConfig>;
  schedule: Partial<ScheduleConfig>;
}

export interface BudgetBiddingConfigProps {
  /** Current configuration value */
  value: BudgetBiddingConfigValue;
  /** Callback when configuration changes */
  onChange: (value: BudgetBiddingConfigValue) => void;
  /** Platform to show strategies for */
  platform: Platform;
  /** Available columns for variable autocomplete */
  columns?: DataSourceColumn[];
  /** Sample data for preview */
  sampleData?: Record<string, unknown>[];
  /** Whether the config is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * BudgetBiddingConfig - Combined budget, bidding, and schedule configuration
 *
 * Combines all budget/bidding/schedule components into a single panel
 * with collapsible sections for advanced options.
 */
export function BudgetBiddingConfig({
  value,
  onChange,
  platform,
  columns = [],
  sampleData = [],
  disabled = false,
  className,
}: BudgetBiddingConfigProps) {
  const [showAdvancedBudget, setShowAdvancedBudget] = useState(false);
  const [showBidding, setShowBidding] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Handlers for budget changes
  const handleBudgetTypeChange = useCallback(
    (type: BudgetType) => {
      onChange({
        ...value,
        budget: { ...value.budget, type },
      });
    },
    [value, onChange]
  );

  const handleBudgetAmountChange = useCallback(
    (amountPattern: string) => {
      onChange({
        ...value,
        budget: { ...value.budget, amountPattern },
      });
    },
    [value, onChange]
  );

  const handleCurrencyChange = useCallback(
    (currency: string) => {
      onChange({
        ...value,
        budget: { ...value.budget, currency },
      });
    },
    [value, onChange]
  );

  const handlePacingChange = useCallback(
    (pacing: "standard" | "accelerated") => {
      onChange({
        ...value,
        budget: { ...value.budget, pacing },
      });
    },
    [value, onChange]
  );

  const handleCapsChange = useCallback(
    (caps: BudgetCaps) => {
      onChange({
        ...value,
        budget: { ...value.budget, caps },
      });
    },
    [value, onChange]
  );

  const handleSharedBudgetIdChange = useCallback(
    (sharedBudgetId: string) => {
      onChange({
        ...value,
        budget: { ...value.budget, sharedBudgetId },
      });
    },
    [value, onChange]
  );

  // Handlers for bidding changes
  const handleStrategyChange = useCallback(
    (strategy: BiddingStrategy) => {
      onChange({
        ...value,
        bidding: { ...value.bidding, strategy },
      });
    },
    [value, onChange]
  );

  const handleBiddingValuesChange = useCallback(
    (biddingValues: Partial<BiddingConfig>) => {
      onChange({
        ...value,
        bidding: { ...value.bidding, ...biddingValues },
      });
    },
    [value, onChange]
  );

  // Handler for schedule changes
  const handleScheduleChange = useCallback(
    (schedule: Partial<ScheduleConfig>) => {
      onChange({
        ...value,
        schedule,
      });
    },
    [value, onChange]
  );

  const currency = value.budget.currency || "USD";

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {/* Budget Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Budget</h3>

        <div className={styles.sectionContent}>
          {/* Budget Type */}
          <BudgetTypeSelector
            value={value.budget.type || "daily"}
            onChange={handleBudgetTypeChange}
            showSharedConfig={value.budget.type === "shared"}
            sharedBudgetId={value.budget.sharedBudgetId}
            onSharedBudgetIdChange={handleSharedBudgetIdChange}
            disabled={disabled}
          />

          {/* Budget Amount and Currency */}
          <div className={styles.budgetAmountRow}>
            <div className={styles.budgetAmountInputWrapper}>
              <BudgetAmountInput
                value={value.budget.amountPattern || ""}
                onChange={handleBudgetAmountChange}
                currency={currency}
                label="Budget Amount"
                placeholder="100 or {budget}"
                hint="Enter a fixed amount or use {variable} from your data"
                columns={columns}
                sampleData={sampleData}
                showPreview
                enableAutocomplete
                disabled={disabled}
              />
            </div>
            <div className={styles.currencyWrapper}>
              <CurrencySelector
                value={currency}
                onChange={handleCurrencyChange}
                label="Currency"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Advanced Budget Options Toggle */}
          <button
            type="button"
            className={styles.advancedToggle}
            onClick={() => setShowAdvancedBudget(!showAdvancedBudget)}
            aria-expanded={showAdvancedBudget}
          >
            <span>Advanced Budget Options</span>
            <svg
              className={`${styles.chevron} ${showAdvancedBudget ? styles.chevronExpanded : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showAdvancedBudget && (
            <div className={styles.advancedContent}>
              <PacingSelector
                value={value.budget.pacing || "standard"}
                onChange={handlePacingChange}
                label="Pacing Strategy"
                showWarning
                disabled={disabled}
              />

              <BudgetCapsConfig
                value={value.budget.caps || {}}
                onChange={handleCapsChange}
                currency={currency}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </section>

      {/* Bidding Section */}
      <section className={styles.section}>
        <button
          type="button"
          className={styles.sectionHeader}
          onClick={() => setShowBidding(!showBidding)}
          aria-expanded={showBidding}
        >
          <h3 className={styles.sectionTitle}>Bidding Strategy</h3>
          <span className={styles.sectionStatus}>
            {value.bidding.strategy ? "Configured" : "Default"}
          </span>
          <svg
            className={`${styles.chevron} ${showBidding ? styles.chevronExpanded : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showBidding && (
          <div className={styles.sectionContent}>
            <BiddingStrategySelector
              platform={platform}
              value={value.bidding.strategy || "maximize_clicks"}
              onChange={handleStrategyChange}
              disabled={disabled}
            />

            {value.bidding.strategy && (
              <TargetInputs
                strategy={value.bidding.strategy}
                value={{
                  targetCpa: value.bidding.targetCpa,
                  targetRoas: value.bidding.targetRoas,
                  maxCpc: value.bidding.maxCpc,
                  maxCpm: value.bidding.maxCpm,
                  maxCpv: value.bidding.maxCpv,
                }}
                onChange={handleBiddingValuesChange}
                currency={currency}
                disabled={disabled}
              />
            )}
          </div>
        )}
      </section>

      {/* Schedule Section */}
      <section className={styles.section}>
        <button
          type="button"
          className={styles.sectionHeader}
          onClick={() => setShowSchedule(!showSchedule)}
          aria-expanded={showSchedule}
        >
          <h3 className={styles.sectionTitle}>Schedule</h3>
          <span className={styles.sectionStatus}>
            {value.schedule.startDate ? "Configured" : "Starts Immediately"}
          </span>
          <svg
            className={`${styles.chevron} ${showSchedule ? styles.chevronExpanded : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showSchedule && (
          <div className={styles.sectionContent}>
            <DateRangePicker
              value={value.schedule}
              onChange={handleScheduleChange}
              disabled={disabled}
            />
          </div>
        )}
      </section>
    </div>
  );
}
