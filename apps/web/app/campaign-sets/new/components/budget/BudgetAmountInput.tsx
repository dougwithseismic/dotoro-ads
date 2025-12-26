"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useId } from "react";
import type { DataSourceColumn } from "../../types";
import { interpolatePattern } from "../../types";
import { getCurrencySymbol } from "../../utils/currency";
import styles from "./BudgetAmountInput.module.css";

export interface BudgetAmountInputProps {
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Currency code for display */
  currency: string;
  /** Optional label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Hint text */
  hint?: string;
  /** Available columns for variable autocomplete */
  columns?: DataSourceColumn[];
  /** Sample data for preview interpolation */
  sampleData?: Record<string, unknown>[];
  /** Whether to show interpolated preview */
  showPreview?: boolean;
  /** Whether to enable variable autocomplete */
  enableAutocomplete?: boolean;
  /** Whether input is in error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * BudgetAmountInput - Input for budget amount with variable support
 *
 * Supports both fixed values and variable patterns like {budget}.
 * Optionally shows a preview of the interpolated value from sample data.
 */
export function BudgetAmountInput({
  value,
  onChange,
  currency,
  label,
  placeholder = "100 or {budget}",
  hint,
  columns = [],
  sampleData = [],
  showPreview = false,
  enableAutocomplete = false,
  error = false,
  errorMessage,
  disabled = false,
  className,
}: BudgetAmountInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate stable unique IDs
  const generatedId = useId();
  const inputId = `budget-amount${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = errorMessage ? `${inputId}-error` : undefined;
  const listboxId = `${inputId}-listbox`;

  // Get currency symbol
  const currencySymbol = getCurrencySymbol(currency);

  // Filter columns for autocomplete
  const filteredColumns = useMemo(() => {
    if (!dropdownFilter) return columns;
    const lowerFilter = dropdownFilter.toLowerCase();
    return columns.filter((col) =>
      col.name.toLowerCase().includes(lowerFilter)
    );
  }, [columns, dropdownFilter]);

  // Calculate preview value
  const previewValue = useMemo(() => {
    if (!showPreview || !value) return null;

    // Check if value contains a variable pattern
    const hasVariable = /\{[^}]+\}/.test(value);

    if (hasVariable && sampleData.length > 0) {
      const firstRow = sampleData[0];
      if (firstRow) {
        const interpolated = interpolatePattern(value, firstRow);
        return interpolated;
      }
    }

    // Return fixed value for non-variable inputs
    return value;
  }, [value, showPreview, sampleData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current !== e.target
      ) {
        setShowDropdown(false);
        setDropdownFilter("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  // Handle input changes
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (!enableAutocomplete) return;

      // Check if we're typing a variable
      const cursorPosition = e.target.selectionStart ?? newValue.length;
      const textBeforeCursor = newValue.slice(0, cursorPosition);
      const openBraceIndex = textBeforeCursor.lastIndexOf("{");
      const closeBraceIndex = textBeforeCursor.lastIndexOf("}");

      if (openBraceIndex > closeBraceIndex) {
        const contentAfterBrace = textBeforeCursor.slice(openBraceIndex + 1);
        setDropdownFilter(contentAfterBrace);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } else if (newValue.endsWith("{")) {
        setDropdownFilter("");
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } else {
        setShowDropdown(false);
        setDropdownFilter("");
      }
    },
    [onChange, enableAutocomplete]
  );

  // Select variable from dropdown
  const selectVariable = useCallback(
    (columnName: string) => {
      const currentValue = value;
      const cursorPosition = inputRef.current?.selectionStart ?? currentValue.length;
      const textBeforeCursor = currentValue.slice(0, cursorPosition);
      const textAfterCursor = currentValue.slice(cursorPosition);

      const openBraceIndex = textBeforeCursor.lastIndexOf("{");
      const beforeBrace = textBeforeCursor.slice(0, openBraceIndex);

      const newValue = `${beforeBrace}{${columnName}}${textAfterCursor}`;
      onChange(newValue);

      setShowDropdown(false);
      setDropdownFilter("");
      setHighlightedIndex(-1);

      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = beforeBrace.length + columnName.length + 2;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, filteredColumns.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredColumns[highlightedIndex]) {
            selectVariable(filteredColumns[highlightedIndex].name);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          setDropdownFilter("");
          setHighlightedIndex(-1);
          break;
      }
    },
    [showDropdown, filteredColumns, highlightedIndex, selectVariable]
  );

  // Get option ID for accessibility
  const getOptionId = useCallback(
    (index: number) => `${listboxId}-option-${index}`,
    [listboxId]
  );

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.inputWrapper}>
        <span className={styles.currencySymbol}>{currencySymbol}</span>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
          aria-describedby={errorId || hintId || undefined}
          aria-invalid={error}
          aria-autocomplete={enableAutocomplete ? "list" : undefined}
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
          aria-activedescendant={
            showDropdown && highlightedIndex >= 0
              ? getOptionId(highlightedIndex)
              : undefined
          }
          role={enableAutocomplete ? "combobox" : undefined}
        />

        {/* Variable autocomplete dropdown */}
        {showDropdown && enableAutocomplete && !disabled && (
          <div
            ref={dropdownRef}
            id={listboxId}
            className={styles.dropdown}
            data-testid="variable-dropdown"
            role="listbox"
            aria-label="Available variables"
          >
            <div className={styles.dropdownHeader}>VARIABLES</div>
            {columns.length === 0 ? (
              <div className={styles.dropdownEmpty}>
                No variables available. Select a data source first.
              </div>
            ) : filteredColumns.length > 0 ? (
              filteredColumns.map((col, index) => (
                <button
                  key={col.name}
                  id={getOptionId(index)}
                  type="button"
                  className={`${styles.dropdownOption} ${
                    index === highlightedIndex ? styles.dropdownOptionHighlighted : ""
                  }`}
                  onClick={() => selectVariable(col.name)}
                  data-testid={`variable-option-${col.name}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                >
                  <span className={styles.optionName}>{col.name}</span>
                  <span className={styles.optionType}>{col.type}</span>
                </button>
              ))
            ) : (
              <div className={styles.dropdownEmpty}>No matching variables</div>
            )}
          </div>
        )}
      </div>

      {/* Preview section */}
      {showPreview && value && (
        <div className={styles.preview}>
          <span className={styles.previewLabel}>Preview:</span>
          <span className={styles.previewValue}>
            {currencySymbol}
            {previewValue}
          </span>
        </div>
      )}

      {/* Hint or error message */}
      {errorMessage ? (
        <p id={errorId} className={styles.errorMessage}>
          {errorMessage}
        </p>
      ) : hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
