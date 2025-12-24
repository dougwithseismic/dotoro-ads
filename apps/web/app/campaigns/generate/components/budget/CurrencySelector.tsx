"use client";

import { useCallback, useId } from "react";
import { CURRENCIES } from "../../utils/currency";
import styles from "./CurrencySelector.module.css";

export interface CurrencySelectorProps {
  /** Selected currency code */
  value: string;
  /** Callback when currency changes */
  onChange: (currency: string) => void;
  /** Optional label */
  label?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * CurrencySelector - Dropdown for selecting currency
 *
 * Simple select component for choosing from common currencies.
 */
export function CurrencySelector({
  value,
  onChange,
  label,
  disabled = false,
  className,
}: CurrencySelectorProps) {
  const generatedId = useId();
  const selectId = `currency-select${generatedId}`;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={styles.select}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        data-testid="currency-selector"
      >
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code} - {currency.name}
          </option>
        ))}
      </select>
    </div>
  );
}
