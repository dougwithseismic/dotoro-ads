"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CreativeType } from "../types";
import styles from "./FilterDropdown.module.css";

/**
 * Filter type options
 */
export type AssetTypeFilter = CreativeType | "ALL";

interface FilterDropdownProps {
  /** Current selected type filter */
  selectedType: AssetTypeFilter;
  /** Callback when type filter changes */
  onTypeChange: (type: AssetTypeFilter) => void;
  /** Available tags for filtering */
  availableTags?: string[];
  /** Current selected tags */
  selectedTags?: string[];
  /** Callback when tags selection changes */
  onTagsChange?: (tags: string[]) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Type filter options
 */
const TYPE_OPTIONS: { value: AssetTypeFilter; label: string }[] = [
  { value: "ALL", label: "All Types" },
  { value: "IMAGE", label: "Images" },
  { value: "VIDEO", label: "Videos" },
  { value: "CAROUSEL", label: "Carousels" },
];

/**
 * FilterDropdown Component
 *
 * Dropdown for filtering assets by type and tags.
 */
export function FilterDropdown({
  selectedType,
  onTypeChange,
  availableTags = [],
  selectedTags = [],
  onTagsChange,
  className = "",
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Handle escape key to close dropdown
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleTypeSelect = useCallback(
    (type: AssetTypeFilter) => {
      onTypeChange(type);
    },
    [onTypeChange]
  );

  const handleTagToggle = useCallback(
    (tag: string) => {
      if (!onTagsChange) return;

      const newTags = selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag];

      onTagsChange(newTags);
    },
    [selectedTags, onTagsChange]
  );

  const clearFilters = useCallback(() => {
    onTypeChange("ALL");
    onTagsChange?.([]);
  }, [onTypeChange, onTagsChange]);

  // Determine if any filters are active
  const hasActiveFilters =
    selectedType !== "ALL" || selectedTags.length > 0;

  // Get current type label
  const currentTypeLabel =
    TYPE_OPTIONS.find((o) => o.value === selectedType)?.label || "All Types";

  return (
    <div ref={dropdownRef} className={`${styles.container} ${className}`}>
      <button
        type="button"
        className={`${styles.trigger} ${hasActiveFilters ? styles.active : ""}`}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <FilterIcon />
        <span className={styles.triggerLabel}>
          {hasActiveFilters ? (
            <>
              {selectedType !== "ALL" && currentTypeLabel}
              {selectedType !== "ALL" && selectedTags.length > 0 && ", "}
              {selectedTags.length > 0 && `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}`}
            </>
          ) : (
            "Filter"
          )}
        </span>
        <ChevronIcon className={`${styles.chevron} ${isOpen ? styles.open : ""}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {/* Type filter section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Type</div>
            <div className={styles.optionList}>
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.option} ${selectedType === option.value ? styles.selected : ""}`}
                  onClick={() => handleTypeSelect(option.value)}
                  role="option"
                  aria-selected={selectedType === option.value}
                >
                  {selectedType === option.value && <CheckIcon />}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags filter section (if tags available) */}
          {availableTags.length > 0 && onTagsChange && (
            <>
              <div className={styles.divider} />
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Tags</div>
                <div className={styles.tagList}>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.tag} ${selectedTags.includes(tag) ? styles.selected : ""}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <>
              <div className={styles.divider} />
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Icon components
function FilterIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 3H13" />
      <path d="M3 7H11" />
      <path d="M5 11H9" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4.5L6 7.5L9 4.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6L5 9L10 3" />
    </svg>
  );
}
