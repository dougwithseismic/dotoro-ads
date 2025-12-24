"use client";

import { useState, useCallback, useMemo } from "react";
import type { LocationTarget, LocationOption } from "@repo/core";
import { searchLocations, COUNTRIES } from "@repo/core";
import styles from "./LocationTargeting.module.css";

export interface LocationTargetingProps {
  locations: LocationTarget[];
  onChange: (locations: LocationTarget[]) => void;
}

export function LocationTargeting({
  locations,
  onChange,
}: LocationTargetingProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return searchLocations(searchQuery).slice(0, 10);
  }, [searchQuery]);

  const handleAddLocation = useCallback(
    (option: LocationOption) => {
      // Check if already added
      if (locations.some((l) => l.value === option.code)) {
        return;
      }

      const newLocation: LocationTarget = {
        type: option.type || "country",
        value: option.code,
        name: option.name,
        include: true,
      };

      onChange([...locations, newLocation]);
      setSearchQuery("");
      setShowSuggestions(false);
    },
    [locations, onChange]
  );

  const handleRemoveLocation = useCallback(
    (value: string) => {
      onChange(locations.filter((l) => l.value !== value));
    },
    [locations, onChange]
  );

  const handleToggleInclude = useCallback(
    (value: string) => {
      onChange(
        locations.map((l) =>
          l.value === value ? { ...l, include: !l.include } : l
        )
      );
    },
    [locations, onChange]
  );

  const handleQuickAdd = useCallback(
    (option: LocationOption) => {
      handleAddLocation(option);
    },
    [handleAddLocation]
  );

  // Quick add suggestions (popular countries not already added)
  const quickAddSuggestions = useMemo(() => {
    const popularCodes = ["US", "GB", "CA", "AU", "DE", "FR"];
    return COUNTRIES.filter(
      (c) =>
        popularCodes.includes(c.code) &&
        !locations.some((l) => l.value === c.code)
    ).slice(0, 4);
  }, [locations]);

  return (
    <div className={styles.container}>
      {/* Search input */}
      <div className={styles.searchWrapper}>
        <input
          type="text"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search countries, states, or cities..."
          data-testid="location-search"
        />
        <svg
          className={styles.searchIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>

        {/* Search results dropdown */}
        {showSuggestions && searchResults.length > 0 && (
          <div className={styles.suggestions} data-testid="location-suggestions">
            {searchResults.map((result) => (
              <button
                key={result.code}
                type="button"
                className={styles.suggestionItem}
                onClick={() => handleAddLocation(result)}
              >
                <span className={styles.suggestionName}>{result.name}</span>
                <span className={styles.suggestionType}>
                  {result.type || "country"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick add buttons */}
      {locations.length === 0 && quickAddSuggestions.length > 0 && (
        <div className={styles.quickAdd}>
          <span className={styles.quickAddLabel}>Quick add:</span>
          {quickAddSuggestions.map((option) => (
            <button
              key={option.code}
              type="button"
              className={styles.quickAddButton}
              onClick={() => handleQuickAdd(option)}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}

      {/* Selected locations */}
      {locations.length > 0 && (
        <div className={styles.selectedLocations}>
          <div className={styles.selectedHeader}>
            <span className={styles.selectedLabel}>
              {locations.length} location{locations.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className={styles.locationList}>
            {locations.map((location) => (
              <div
                key={location.value}
                className={`${styles.locationTag} ${
                  location.include ? styles.locationIncluded : styles.locationExcluded
                }`}
              >
                <button
                  type="button"
                  className={styles.includeToggle}
                  onClick={() => handleToggleInclude(location.value)}
                  title={location.include ? "Click to exclude" : "Click to include"}
                >
                  {location.include ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </button>
                <span className={styles.locationName}>{location.name}</span>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveLocation(location.value)}
                  aria-label={`Remove ${location.name}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <p className={styles.helpText}>
        Add locations to target. Toggle to include or exclude specific areas.
      </p>
    </div>
  );
}
