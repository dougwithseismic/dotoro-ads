"use client";

import { useCallback, useState } from "react";
import type { Platform, BudgetConfig, DataSourceColumn } from "../types";
import styles from "./PlatformSelector.module.css";

interface PlatformInfo {
  id: Platform;
  name: string;
  hint: string;
  icon: string;
}

const PLATFORMS: PlatformInfo[] = [
  { id: "google", name: "Google", hint: "Google Ads campaigns", icon: "G" },
  { id: "reddit", name: "Reddit", hint: "Reddit Ads campaigns", icon: "R" },
  { id: "facebook", name: "Facebook", hint: "Facebook Ads campaigns", icon: "f" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

export interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  platformBudgets: Record<Platform, BudgetConfig | null>;
  availableColumns?: DataSourceColumn[];
  onToggle: (platform: Platform) => void;
  onBudgetChange: (platform: Platform, budget: BudgetConfig | null) => void;
  showError?: boolean;
}

export function PlatformSelector({
  selectedPlatforms,
  platformBudgets,
  availableColumns = [],
  onToggle,
  onBudgetChange,
  showError = false,
}: PlatformSelectorProps) {
  // Track which platform's budget section is expanded
  const [expandedBudget, setExpandedBudget] = useState<Platform | null>(null);

  // Only count valid platforms
  const validSelectedCount = selectedPlatforms.filter(p =>
    PLATFORMS.some(platform => platform.id === p)
  ).length;

  const hasError = showError && validSelectedCount === 0;

  const handleToggle = useCallback(
    (platform: Platform) => {
      onToggle(platform);
      // If deselecting, close budget and clear budget config
      if (selectedPlatforms.includes(platform)) {
        if (expandedBudget === platform) {
          setExpandedBudget(null);
        }
        // Clear budget when platform is deselected
        if (platformBudgets[platform]) {
          onBudgetChange(platform, null);
        }
      }
    },
    [onToggle, selectedPlatforms, expandedBudget, platformBudgets, onBudgetChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, platform: Platform) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle(platform);
      }
    },
    [handleToggle]
  );

  const toggleBudgetExpanded = useCallback((e: React.MouseEvent, platform: Platform) => {
    e.stopPropagation();
    setExpandedBudget(prev => prev === platform ? null : platform);
  }, []);

  const handleBudgetToggle = useCallback((platform: Platform) => {
    const currentBudget = platformBudgets[platform];
    if (currentBudget) {
      // Disable budget
      onBudgetChange(platform, null);
    } else {
      // Enable budget with defaults
      onBudgetChange(platform, {
        type: "daily",
        amountPattern: "",
        currency: "USD",
      });
    }
  }, [platformBudgets, onBudgetChange]);

  const handleBudgetTypeChange = useCallback((platform: Platform, type: "daily" | "lifetime") => {
    const currentBudget = platformBudgets[platform];
    if (currentBudget) {
      onBudgetChange(platform, { ...currentBudget, type });
    }
  }, [platformBudgets, onBudgetChange]);

  const handleBudgetAmountChange = useCallback((platform: Platform, amountPattern: string) => {
    const currentBudget = platformBudgets[platform];
    if (currentBudget) {
      onBudgetChange(platform, { ...currentBudget, amountPattern });
    }
  }, [platformBudgets, onBudgetChange]);

  const handleBudgetCurrencyChange = useCallback((platform: Platform, currency: string) => {
    const currentBudget = platformBudgets[platform];
    if (currentBudget) {
      onBudgetChange(platform, { ...currentBudget, currency });
    }
  }, [platformBudgets, onBudgetChange]);

  return (
    <div className={styles.container} id="platform-selector" data-field-id="platform-selector" data-section-id="platform">
      <div className={styles.header}>
        <h3 className={styles.title}>Select Platforms</h3>
        <p className={styles.description}>
          Choose one or more platforms for your campaign set. Optionally configure a budget for each platform.
        </p>
      </div>

      <div
        className={styles.platformGroup}
        role="group"
        aria-label="Select platforms"
      >
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          const platformClass = `platformCard${platform.name}` as keyof typeof styles;
          const budget = platformBudgets[platform.id];
          const isExpanded = expandedBudget === platform.id && isSelected;

          return (
            <div key={platform.id} className={styles.platformWrapper}>
              <div className={styles.platformCardRow}>
                <button
                  type="button"
                  className={`${styles.platformCard} ${isSelected ? styles.platformCardSelected : ""} ${isSelected ? styles[platformClass] : ""}`}
                  onClick={() => handleToggle(platform.id)}
                  onKeyDown={(e) => handleKeyDown(e, platform.id)}
                  data-testid={`platform-checkbox-${platform.id}`}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`${platform.name} - ${platform.hint}`}
                >
                  <div className={styles.checkboxIndicator}>
                    {isSelected && (
                      <svg
                        className={styles.checkIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.platformContent}>
                    <div className={styles.platformIcon}>{platform.icon}</div>
                    <div className={styles.platformInfo}>
                      <div className={styles.platformName}>{platform.name}</div>
                      <div className={styles.platformHint}>{platform.hint}</div>
                    </div>
                  </div>
                </button>
                {isSelected && (
                  <button
                    type="button"
                    className={styles.budgetToggleButton}
                    onClick={(e) => toggleBudgetExpanded(e, platform.id)}
                    aria-expanded={isExpanded}
                    aria-label={`Configure budget for ${platform.name}`}
                    data-testid={`budget-toggle-${platform.id}`}
                  >
                    <span className={styles.budgetToggleText}>
                      {budget ? `$${budget.amountPattern || "0"} ${budget.type}` : "Add Budget"}
                    </span>
                    <svg
                      className={`${styles.budgetChevron} ${isExpanded ? styles.budgetChevronExpanded : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Budget Configuration Panel */}
              {isSelected && isExpanded && (
                <div
                  className={styles.budgetPanel}
                  data-testid={`budget-panel-${platform.id}`}
                >
                  <div className={styles.budgetEnableRow}>
                    <button
                      type="button"
                      className={`${styles.budgetSwitch} ${budget ? styles.budgetSwitchChecked : ""}`}
                      onClick={() => handleBudgetToggle(platform.id)}
                      role="switch"
                      aria-checked={!!budget}
                      aria-label={`Enable budget for ${platform.name}`}
                      data-testid={`budget-enable-${platform.id}`}
                    />
                    <span className={styles.budgetEnableLabel}>Enable budget</span>
                  </div>

                  {budget && (
                    <div className={styles.budgetFields}>
                      {/* Budget Type */}
                      <div className={styles.budgetFieldGroup}>
                        <label className={styles.budgetFieldLabel}>Budget Type</label>
                        <div className={styles.budgetTypeToggle}>
                          <button
                            type="button"
                            className={`${styles.budgetTypeButton} ${budget.type === "daily" ? styles.budgetTypeButtonActive : ""}`}
                            onClick={() => handleBudgetTypeChange(platform.id, "daily")}
                            data-testid={`budget-type-daily-${platform.id}`}
                          >
                            Daily
                          </button>
                          <button
                            type="button"
                            className={`${styles.budgetTypeButton} ${budget.type === "lifetime" ? styles.budgetTypeButtonActive : ""}`}
                            onClick={() => handleBudgetTypeChange(platform.id, "lifetime")}
                            data-testid={`budget-type-lifetime-${platform.id}`}
                          >
                            Lifetime
                          </button>
                        </div>
                      </div>

                      {/* Budget Amount */}
                      <div className={styles.budgetFieldGroup}>
                        <label
                          htmlFor={`budget-amount-${platform.id}`}
                          className={styles.budgetFieldLabel}
                        >
                          Amount
                        </label>
                        <input
                          id={`budget-amount-${platform.id}`}
                          type="text"
                          className={styles.budgetInput}
                          value={budget.amountPattern}
                          onChange={(e) => handleBudgetAmountChange(platform.id, e.target.value)}
                          placeholder="100 or {budget}"
                          data-testid={`budget-amount-${platform.id}`}
                        />
                        <p className={styles.budgetHint}>
                          Use a fixed value or {"{variable}"} from your data
                        </p>
                      </div>

                      {/* Currency */}
                      <div className={styles.budgetFieldGroup}>
                        <label
                          htmlFor={`budget-currency-${platform.id}`}
                          className={styles.budgetFieldLabel}
                        >
                          Currency
                        </label>
                        <select
                          id={`budget-currency-${platform.id}`}
                          className={styles.budgetSelect}
                          value={budget.currency}
                          onChange={(e) => handleBudgetCurrencyChange(platform.id, e.target.value)}
                          data-testid={`budget-currency-${platform.id}`}
                        >
                          {CURRENCIES.map(currency => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.selectionStatus}>
        {validSelectedCount === 0 ? (
          hasError ? (
            <p role="alert" className={styles.errorMessage}>
              Select at least one platform to continue
            </p>
          ) : (
            <p className={styles.promptMessage}>
              Select at least one platform
            </p>
          )
        ) : (
          <p className={styles.selectedCount}>
            {validSelectedCount} platform{validSelectedCount !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>
    </div>
  );
}
