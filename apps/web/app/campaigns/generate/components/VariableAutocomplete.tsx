"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useId } from "react";
import type { DataSourceColumn } from "../types";
import styles from "./VariableAutocomplete.module.css";

// Available filters - same as VariableInput in templates
const AVAILABLE_FILTERS = [
  { name: "uppercase", description: "Convert to UPPERCASE" },
  { name: "lowercase", description: "Convert to lowercase" },
  { name: "capitalize", description: "Capitalize first letter" },
  { name: "titlecase", description: "Capitalize Each Word" },
  { name: "trim", description: "Remove leading/trailing spaces" },
  { name: "truncate", description: "Truncate to length" },
  { name: "currency", description: "Format as currency" },
  { name: "number", description: "Format as number" },
  { name: "percent", description: "Format as percentage" },
  { name: "format", description: "Custom format" },
  { name: "slug", description: "Convert to URL slug" },
  { name: "replace", description: "Replace text" },
  { name: "default", description: "Default value if empty" },
];

type DropdownMode = "variable" | "filter";

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
  const [dropdownMode, setDropdownMode] = useState<DropdownMode>("variable");

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

  // Filter available filters based on partial input
  const filteredFilters = useMemo(() => {
    if (!dropdownFilter) return AVAILABLE_FILTERS;
    const lowerFilter = dropdownFilter.toLowerCase();
    return AVAILABLE_FILTERS.filter((f) =>
      f.name.toLowerCase().includes(lowerFilter)
    );
  }, [dropdownFilter]);

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

      // Find if we're typing a variable or filter
      const cursorPosition = e.target.selectionStart ?? newValue.length;
      const textBeforeCursor = newValue.slice(0, cursorPosition);
      const openBraceIndex = textBeforeCursor.lastIndexOf("{");
      const closeBraceIndex = textBeforeCursor.lastIndexOf("}");

      // Check if we're inside an unclosed brace
      if (openBraceIndex > closeBraceIndex) {
        const contentAfterBrace = textBeforeCursor.slice(openBraceIndex + 1);
        const pipeIndex = contentAfterBrace.lastIndexOf("|");

        if (pipeIndex >= 0) {
          // We're in filter mode (after a pipe)
          const partialFilter = contentAfterBrace.slice(pipeIndex + 1);
          setDropdownFilter(partialFilter);
          setDropdownMode("filter");
          setShowDropdown(true);
          setHighlightedIndex(-1);
        } else {
          // We're in variable mode
          setDropdownFilter(contentAfterBrace);
          setDropdownMode("variable");
          setShowDropdown(true);
          setHighlightedIndex(-1);
        }
      } else if (newValue.endsWith("{")) {
        setDropdownFilter("");
        setDropdownMode("variable");
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

  // Handle selecting a filter from dropdown
  const selectFilter = useCallback(
    (filterName: string) => {
      const currentValue = value;
      const cursorPosition = inputRef.current?.selectionStart ?? currentValue.length;
      const textBeforeCursor = currentValue.slice(0, cursorPosition);
      const textAfterCursor = currentValue.slice(cursorPosition);

      // Find the opening brace and pipe
      const openBraceIndex = textBeforeCursor.lastIndexOf("{");
      const contentAfterBrace = textBeforeCursor.slice(openBraceIndex + 1);
      const pipeIndex = contentAfterBrace.lastIndexOf("|");

      // Build new value: keep everything up to and including the pipe, add filter name
      const beforePipe = textBeforeCursor.slice(0, openBraceIndex + 1 + pipeIndex + 1);
      const newValue = `${beforePipe}${filterName}}${textAfterCursor}`;
      onChange(newValue);

      setShowDropdown(false);
      setDropdownFilter("");
      setHighlightedIndex(-1);

      // Restore focus and set cursor position after the closing brace
      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = beforePipe.length + filterName.length + 1;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  // Get current items based on mode
  const currentItems = dropdownMode === "variable" ? filteredColumns : filteredFilters;

  // Handle keyboard navigation in dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, currentItems.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && currentItems[highlightedIndex]) {
            if (dropdownMode === "variable") {
              selectVariable((currentItems[highlightedIndex] as DataSourceColumn).name);
            } else {
              selectFilter((currentItems[highlightedIndex] as { name: string }).name);
            }
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
    [showDropdown, currentItems, highlightedIndex, selectVariable, selectFilter, dropdownMode]
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

        {/* Variable/Filter autocomplete dropdown */}
        {showDropdown && !disabled && (
          <div
            ref={dropdownRef}
            id={listboxId}
            className={styles.dropdown}
            data-testid="variable-dropdown"
            role="listbox"
            aria-label={dropdownMode === "variable" ? "Available variables" : "Available filters"}
          >
            {/* Mode header */}
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownHeaderTitle}>
                {dropdownMode === "variable" ? "VARIABLES" : "FILTERS"}
              </span>
              {dropdownMode === "variable" && (
                <span className={styles.dropdownHeaderHint}>Type | for filters</span>
              )}
            </div>

            {dropdownMode === "variable" ? (
              // Variable mode
              columns.length === 0 ? (
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
              )
            ) : (
              // Filter mode
              filteredFilters.length > 0 ? (
                filteredFilters.map((filter, index) => (
                  <button
                    key={filter.name}
                    id={getOptionId(index)}
                    type="button"
                    className={`${styles.dropdownOption} ${styles.dropdownOptionFilter} ${
                      index === highlightedIndex ? styles.dropdownOptionHighlighted : ""
                    }`}
                    onClick={() => selectFilter(filter.name)}
                    data-testid={`filter-option-${filter.name}`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                  >
                    <span className={styles.optionName}>|{filter.name}</span>
                    <span className={styles.optionDescription}>{filter.description}</span>
                  </button>
                ))
              ) : (
                <div className={styles.dropdownEmpty}>
                  No matching filters
                </div>
              )
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
