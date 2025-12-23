"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { CampaignConfig as CampaignConfigType, DataSourceColumn, ValidationResult } from "../types";
import styles from "./CampaignConfig.module.css";

interface CampaignConfigProps {
  config: CampaignConfigType;
  availableColumns: DataSourceColumn[];
  onChange: (config: CampaignConfigType) => void;
  validation?: ValidationResult;
}

export function CampaignConfig({
  config,
  availableColumns,
  onChange,
  validation,
}: CampaignConfigProps) {
  // Local state for input values to support uncontrolled typing behavior
  const [localNamePattern, setLocalNamePattern] = useState(config.namePattern);

  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync local state with props when config changes from parent
  useEffect(() => {
    setLocalNamePattern(config.namePattern);
  }, [config.namePattern]);

  // Filter columns based on partial variable input
  const filteredColumns = useMemo(() => {
    if (!dropdownFilter) return availableColumns;
    const lowerFilter = dropdownFilter.toLowerCase();
    return availableColumns.filter(col =>
      col.name.toLowerCase().includes(lowerFilter)
    );
  }, [availableColumns, dropdownFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
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
  }, []);

  // Handle variable autocomplete trigger
  const handleInputChange = useCallback((value: string) => {
    // Update local state immediately for responsive UI
    setLocalNamePattern(value);

    // Find if we're typing a variable
    const cursorPosition = inputRef.current?.selectionStart ?? value.length;

    const textBeforeCursor = value.slice(0, cursorPosition);
    const openBraceIndex = textBeforeCursor.lastIndexOf("{");
    const closeBraceIndex = textBeforeCursor.lastIndexOf("}");

    // Check if we're inside an unclosed brace
    if (openBraceIndex > closeBraceIndex) {
      const partialVar = textBeforeCursor.slice(openBraceIndex + 1);
      setDropdownFilter(partialVar);
      setShowDropdown(true);
      setHighlightedIndex(-1);
    } else if (value.endsWith("{")) {
      setDropdownFilter("");
      setShowDropdown(true);
      setHighlightedIndex(-1);
    } else {
      setShowDropdown(false);
      setDropdownFilter("");
    }

    // Update config (notify parent)
    onChange({ ...config, namePattern: value });
  }, [config, onChange]);

  // Handle selecting a variable from dropdown
  const selectVariable = useCallback((columnName: string) => {
    const currentValue = localNamePattern;

    const cursorPosition = inputRef.current?.selectionStart ?? currentValue.length;
    const textBeforeCursor = currentValue.slice(0, cursorPosition);
    const textAfterCursor = currentValue.slice(cursorPosition);

    // Find the opening brace
    const openBraceIndex = textBeforeCursor.lastIndexOf("{");
    const beforeBrace = textBeforeCursor.slice(0, openBraceIndex);

    // Build new value with completed variable
    const newValue = `${beforeBrace}{${columnName}}${textAfterCursor}`;

    // Update local state
    setLocalNamePattern(newValue);
    onChange({ ...config, namePattern: newValue });

    setShowDropdown(false);
    setDropdownFilter("");
    setHighlightedIndex(-1);

    // Restore focus and set cursor position
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = beforeBrace.length + columnName.length + 2;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [config, localNamePattern, onChange]);

  // Handle keyboard navigation in dropdown
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev =>
          Math.min(prev + 1, filteredColumns.length - 1)
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
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
  }, [showDropdown, filteredColumns, highlightedIndex, selectVariable]);

  // Check if name pattern has validation errors
  const hasNamePatternError = validation?.errors.some(
    e => e.includes("Pattern") || e.includes("pattern") || e.includes("Variable")
  ) ?? false;

  const hasErrors = validation && validation.errors.length > 0;
  const hasWarnings = validation && validation.warnings.length > 0;

  return (
    <div className={styles.container}>
      {/* Campaign Name Pattern Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Campaign Name Pattern</h3>
        <p className={styles.sectionDescription}>
          Use {"{variable}"} syntax to create dynamic campaign names from your data source columns.
        </p>

        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            id="campaign-name-pattern"
            type="text"
            className={`${styles.input} ${hasNamePatternError ? styles.inputInvalid : ""}`}
            value={localNamePattern}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="{brand_name}-performance-{region}"
            aria-label="Campaign name pattern"
            aria-describedby="name-pattern-hint"
            aria-invalid={hasNamePatternError}
          />

          {/* Variable autocomplete dropdown */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className={styles.dropdown}
              data-testid="variable-dropdown"
              role="listbox"
              aria-label="Available variables"
            >
              {filteredColumns.length > 0 ? (
                filteredColumns.map((col, index) => (
                  <button
                    key={col.name}
                    type="button"
                    className={`${styles.dropdownOption} ${index === highlightedIndex ? styles.dropdownOptionHighlighted : ""}`}
                    onClick={() => selectVariable(col.name)}
                    data-testid={`variable-option-${col.name}`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                  >
                    <span className={styles.dropdownOptionName}>{col.name}</span>
                    <span className={styles.dropdownOptionType}>{col.type}</span>
                    {col.sampleValues && col.sampleValues.length > 0 && (
                      <span className={styles.dropdownOptionSamples}>
                        {col.sampleValues.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className={styles.dropdownEmpty}>No matching variables</div>
              )}
            </div>
          )}
        </div>

        <p id="name-pattern-hint" className={styles.inputHint}>
          Example: {"{brand_name}-{region}"} creates "Nike-US", "Adidas-EU", etc.
        </p>

        {availableColumns.length === 0 && (
          <p className={styles.noVariablesHint}>
            No variables available. Select a data source first.
          </p>
        )}
      </div>

      {/* Validation Messages */}
      {(hasErrors || hasWarnings) && (
        <div className={styles.validationSection}>
          {hasErrors && (
            <div className={styles.validationErrors} data-testid="validation-errors">
              <h4 className={styles.validationTitle}>Errors</h4>
              <ul className={styles.validationList}>
                {validation!.errors.map((error, index) => (
                  <li key={index} className={styles.validationItem}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasWarnings && (
            <div className={styles.validationWarnings} data-testid="validation-warnings">
              <h4 className={styles.validationTitle}>Warnings</h4>
              <ul className={styles.validationList}>
                {validation!.warnings.map((warning, index) => (
                  <li key={index} className={styles.validationItem}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
