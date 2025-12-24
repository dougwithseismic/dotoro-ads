"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type { CampaignConfig as CampaignConfigType, DataSourceColumn, ValidationResult } from "../types";
import styles from "./CampaignConfig.module.css";

// Find all variables in text with their positions
function findVariables(text: string): { start: number; end: number; content: string }[] {
  const variables: { start: number; end: number; content: string }[] = [];
  const matches = text.matchAll(/\{[^}]+\}/g);
  for (const match of matches) {
    variables.push({
      start: match.index!,
      end: match.index! + match[0].length,
      content: match[0],
    });
  }
  return variables;
}

// Check if cursor position is inside a variable (not at boundaries)
function getVariableAtPosition(text: string, pos: number): { start: number; end: number; content: string } | null {
  const variables = findVariables(text);
  for (const v of variables) {
    if (pos > v.start && pos < v.end) {
      return v;
    }
  }
  return null;
}

// Get the variable that the cursor would enter when moving left
function getVariableToLeft(text: string, pos: number): { start: number; end: number; content: string } | null {
  const variables = findVariables(text);
  for (const v of variables) {
    if (pos === v.end) {
      return v;
    }
  }
  return null;
}

// Get the variable that the cursor would enter when moving right
function getVariableToRight(text: string, pos: number): { start: number; end: number; content: string } | null {
  const variables = findVariables(text);
  for (const v of variables) {
    if (pos === v.start) {
      return v;
    }
  }
  return null;
}

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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update dropdown position when shown
  useEffect(() => {
    if (showDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px gap below input
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showDropdown]);

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

  // Handle keyboard navigation - both dropdown and atomic variable behavior
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const value = input.value;
    const pos = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? pos;
    const hasSelection = pos !== selEnd;

    // Handle dropdown navigation when open
    if (showDropdown) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex(prev =>
            Math.min(prev + 1, filteredColumns.length - 1)
          );
          return;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex(prev => Math.max(prev - 1, 0));
          return;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredColumns[highlightedIndex]) {
            selectVariable(filteredColumns[highlightedIndex].name);
          }
          return;
        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          setDropdownFilter("");
          setHighlightedIndex(-1);
          return;
      }
    }

    // Atomic variable handling - make variables behave as single units
    switch (e.key) {
      case "ArrowLeft": {
        if (hasSelection) return;
        const varToLeft = getVariableToLeft(value, pos);
        if (varToLeft) {
          e.preventDefault();
          input.setSelectionRange(varToLeft.start, varToLeft.start);
        }
        const varInside = getVariableAtPosition(value, pos);
        if (varInside) {
          e.preventDefault();
          input.setSelectionRange(varInside.start, varInside.start);
        }
        break;
      }
      case "ArrowRight": {
        if (hasSelection) return;
        const varToRight = getVariableToRight(value, pos);
        if (varToRight) {
          e.preventDefault();
          input.setSelectionRange(varToRight.end, varToRight.end);
        }
        const varInside = getVariableAtPosition(value, pos);
        if (varInside) {
          e.preventDefault();
          input.setSelectionRange(varInside.end, varInside.end);
        }
        break;
      }
      case "Backspace": {
        if (hasSelection) return;
        const varToLeft = getVariableToLeft(value, pos);
        if (varToLeft) {
          e.preventDefault();
          const newValue = value.slice(0, varToLeft.start) + value.slice(varToLeft.end);
          setLocalNamePattern(newValue);
          onChange({ ...config, namePattern: newValue });
          setTimeout(() => {
            input.setSelectionRange(varToLeft.start, varToLeft.start);
          }, 0);
        }
        const varInside = getVariableAtPosition(value, pos);
        if (varInside) {
          e.preventDefault();
          const newValue = value.slice(0, varInside.start) + value.slice(varInside.end);
          setLocalNamePattern(newValue);
          onChange({ ...config, namePattern: newValue });
          setTimeout(() => {
            input.setSelectionRange(varInside.start, varInside.start);
          }, 0);
        }
        break;
      }
      case "Delete": {
        if (hasSelection) return;
        const varToRight = getVariableToRight(value, pos);
        if (varToRight) {
          e.preventDefault();
          const newValue = value.slice(0, varToRight.start) + value.slice(varToRight.end);
          setLocalNamePattern(newValue);
          onChange({ ...config, namePattern: newValue });
        }
        const varInside = getVariableAtPosition(value, pos);
        if (varInside) {
          e.preventDefault();
          const newValue = value.slice(0, varInside.start) + value.slice(varInside.end);
          setLocalNamePattern(newValue);
          onChange({ ...config, namePattern: newValue });
          setTimeout(() => {
            input.setSelectionRange(varInside.start, varInside.start);
          }, 0);
        }
        break;
      }
    }
  }, [showDropdown, filteredColumns, highlightedIndex, selectVariable, config, onChange]);

  // Handle click on input to prevent cursor landing inside variables
  const handleInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    // Use setTimeout to let the browser set cursor position first
    setTimeout(() => {
      const pos = input.selectionStart ?? 0;
      const selEnd = input.selectionEnd ?? pos;

      // If there's a selection, don't interfere
      if (pos !== selEnd) return;

      const value = input.value;
      const varInside = getVariableAtPosition(value, pos);

      if (varInside) {
        // Snap cursor to the end of the variable
        input.setSelectionRange(varInside.end, varInside.end);
      }
    }, 0);
  }, []);

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
            onClick={handleInputClick}
            placeholder="{brand_name}-performance-{region}"
            aria-label="Campaign name pattern"
            aria-describedby="name-pattern-hint"
            aria-invalid={hasNamePatternError}
          />

          {/* Variable autocomplete dropdown - rendered in portal to avoid overflow clipping */}
          {showDropdown && dropdownPosition && typeof document !== 'undefined' && createPortal(
            <div
              ref={dropdownRef}
              className={styles.dropdownPortal}
              style={{
                position: 'fixed',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
              }}
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
            </div>,
            document.body
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
