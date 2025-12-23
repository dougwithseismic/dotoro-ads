"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useId } from "react";
import type { DataSourceColumn } from "../types";
import styles from "./VariableAutocomplete.module.css";

export interface VariableAutocompleteProps {
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Available columns from data source */
  columns: DataSourceColumn[];
  /** Input placeholder text */
  placeholder?: string;
  /** Label for the input */
  label?: string;
  /** Hint text shown below input */
  hint?: string;
  /** Variables that are already used (for highlighting) */
  usedVariables?: string[];
  /** Whether input is in error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** ID for the input element */
  id?: string;
}

export function VariableAutocomplete({
  value,
  onChange,
  columns,
  placeholder = "",
  label,
  hint,
  usedVariables = [],
  error = false,
  errorMessage,
  disabled = false,
  className,
  id,
}: VariableAutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate stable unique IDs for accessibility (SSR-safe)
  const generatedId = useId();
  const inputId = id || `variable-autocomplete${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = errorMessage ? `${inputId}-error` : undefined;

  // Generate option IDs for aria-activedescendant
  const getOptionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId]);

  // Filter columns based on partial variable input
  const filteredColumns = useMemo(() => {
    if (!dropdownFilter) return columns;
    const lowerFilter = dropdownFilter.toLowerCase();
    return columns.filter((col) =>
      col.name.toLowerCase().includes(lowerFilter)
    );
  }, [columns, dropdownFilter]);

  // Close dropdown when clicking outside - only attach listener when dropdown is open
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

  // Handle input changes and autocomplete trigger
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Find if we're typing a variable
      const cursorPosition = e.target.selectionStart ?? newValue.length;
      const textBeforeCursor = newValue.slice(0, cursorPosition);
      const openBraceIndex = textBeforeCursor.lastIndexOf("{");
      const closeBraceIndex = textBeforeCursor.lastIndexOf("}");

      // Check if we're inside an unclosed brace
      if (openBraceIndex > closeBraceIndex) {
        const partialVar = textBeforeCursor.slice(openBraceIndex + 1);
        setDropdownFilter(partialVar);
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
    [onChange]
  );

  // Handle selecting a variable from dropdown
  const selectVariable = useCallback(
    (columnName: string) => {
      const currentValue = value;
      const cursorPosition = inputRef.current?.selectionStart ?? currentValue.length;
      const textBeforeCursor = currentValue.slice(0, cursorPosition);
      const textAfterCursor = currentValue.slice(cursorPosition);

      // Find the opening brace
      const openBraceIndex = textBeforeCursor.lastIndexOf("{");
      const beforeBrace = textBeforeCursor.slice(0, openBraceIndex);

      // Build new value with completed variable
      const newValue = `${beforeBrace}{${columnName}}${textAfterCursor}`;
      onChange(newValue);

      setShowDropdown(false);
      setDropdownFilter("");
      setHighlightedIndex(-1);

      // Restore focus and set cursor position
      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = beforeBrace.length + columnName.length + 2;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  // Handle keyboard navigation in dropdown
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

  // Check if a variable is used
  const isVariableUsed = useCallback(
    (name: string) => usedVariables.includes(name),
    [usedVariables]
  );

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.inputWrapper}>
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
          aria-describedby={hintId || errorId || undefined}
          aria-invalid={error}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={showDropdown && highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined}
          role="combobox"
        />

        {/* Variable autocomplete dropdown */}
        {showDropdown && !disabled && (
          <div
            ref={dropdownRef}
            id={listboxId}
            className={styles.dropdown}
            data-testid="variable-dropdown"
            role="listbox"
            aria-label="Available variables"
          >
            {columns.length === 0 ? (
              <div className={styles.dropdownEmpty}>
                No variables available. Select a data source first.
              </div>
            ) : filteredColumns.length > 0 ? (
              filteredColumns.map((col, index) => {
                const used = isVariableUsed(col.name);
                return (
                  <button
                    key={col.name}
                    id={getOptionId(index)}
                    type="button"
                    className={`${styles.dropdownOption} ${
                      index === highlightedIndex ? styles.dropdownOptionHighlighted : ""
                    } ${used ? styles.dropdownOptionUsed : ""}`}
                    onClick={() => selectVariable(col.name)}
                    data-testid={`variable-option-${col.name}`}
                    data-used={used}
                    role="option"
                    aria-selected={index === highlightedIndex}
                  >
                    <span className={styles.optionName}>{col.name}</span>
                    <span className={styles.optionType}>{col.type}</span>
                    {col.sampleValues && col.sampleValues.length > 0 && (
                      <span className={styles.optionSamples}>
                        {col.sampleValues.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className={styles.dropdownEmpty}>
                No matching variables
              </div>
            )}
          </div>
        )}
      </div>

      {hint && !errorMessage && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}

      {errorMessage && (
        <p id={errorId} className={styles.errorMessage}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
