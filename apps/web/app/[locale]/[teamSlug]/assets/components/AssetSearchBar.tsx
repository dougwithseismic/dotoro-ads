"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./AssetSearchBar.module.css";

interface AssetSearchBarProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes (debounced) */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Whether the search is loading/processing */
  isLoading?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * AssetSearchBar Component
 *
 * Text search input with debounce and clear functionality.
 * Designed for filtering assets in the library.
 */
export function AssetSearchBar({
  value,
  onChange,
  placeholder = "Search assets...",
  debounceMs = 300,
  isLoading = false,
  className = "",
}: AssetSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /**
   * Handle input change with debounce
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  /**
   * Clear search immediately
   */
  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    inputRef.current?.focus();
  }, [onChange]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && localValue) {
        handleClear();
      }
    },
    [localValue, handleClear]
  );

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.inputWrapper}>
        <SearchIcon className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search assets"
        />
        {isLoading && <LoadingSpinner className={styles.loadingIcon} />}
        {!isLoading && localValue && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Clear search"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// Icon components
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="5" />
      <path d="M14 14L11 11" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M2 2L10 10M10 2L2 10" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.2"
      />
      <path
        d="M7 1.5A5.5 5.5 0 0 1 12.5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
