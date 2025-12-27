"use client";

import { useState, useEffect, useCallback, useRef, useMemo, useId } from "react";
import { api } from "@/lib/api-client";
import type { DataSource } from "../types";
import styles from "./DataSourceCombobox.module.css";

interface DataSourceComboboxProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

interface DataSourcesResponse {
  data: DataSource[];
}

export function DataSourceCombobox({
  selectedId,
  onSelect,
  onCreateNew,
}: DataSourceComboboxProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate stable IDs for accessibility
  const generatedId = useId();
  const inputId = `datasource-combobox${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const getOptionId = useCallback(
    (index: number) => `${listboxId}-option-${index}`,
    [listboxId]
  );

  // Fetch data sources
  const fetchDataSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<DataSourcesResponse>("/api/v1/data-sources");
      setDataSources(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  // Get selected data source details
  const selectedDataSource = useMemo(
    () => dataSources.find((ds) => ds.id === selectedId) ?? null,
    [dataSources, selectedId]
  );

  // Filter data sources based on search query
  const filteredDataSources = useMemo(() => {
    if (!searchQuery.trim()) return dataSources;
    const query = searchQuery.toLowerCase();
    return dataSources.filter(
      (ds) =>
        ds.name.toLowerCase().includes(query) ||
        ds.type.toLowerCase().includes(query)
    );
  }, [dataSources, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle selection
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setIsOpen(false);
      setSearchQuery("");
      setHighlightedIndex(-1);
    },
    [onSelect]
  );

  // Handle create new
  const handleCreateNew = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
    onCreateNew();
  }, [onCreateNew]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen(true);
          return;
        }
        return;
      }

      // Total items = filtered data sources + "Create new" option
      const totalItems = filteredDataSources.length + 1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, totalItems - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex === filteredDataSources.length) {
            // "Create new" option selected
            handleCreateNew();
          } else if (highlightedIndex >= 0 && filteredDataSources[highlightedIndex]) {
            handleSelect(filteredDataSources[highlightedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          setHighlightedIndex(-1);
          break;
        case "Tab":
          setIsOpen(false);
          setSearchQuery("");
          break;
      }
    },
    [isOpen, filteredDataSources, highlightedIndex, handleSelect, handleCreateNew]
  );

  // Format row count
  const formatRowCount = (count?: number): string => {
    if (count === undefined || count === null) return "";
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k rows`;
    }
    return `${count} row${count !== 1 ? "s" : ""}`;
  };

  // Get type badge class
  const getTypeBadgeClass = (type: DataSource["type"]): string => {
    switch (type) {
      case "csv":
        return styles.badgeCsv ?? "";
      case "transform":
        return styles.badgeTransform ?? "";
      case "api":
        return styles.badgeApi ?? "";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button type="button" onClick={fetchDataSources} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.container} id="data-source-combobox" data-field-id="data-source-combobox" data-section-id="data-source">
      <label htmlFor={inputId} className={styles.label}>
        Data Source
      </label>

      <div className={styles.inputWrapper}>
        {/* Selected value display / Search input */}
        <div
          className={`${styles.comboboxTrigger} ${isOpen ? styles.comboboxTriggerOpen : ""}`}
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
        >
          {isOpen ? (
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search data sources..."
              autoFocus
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined
              }
              aria-autocomplete="list"
            />
          ) : selectedDataSource ? (
            <div className={styles.selectedValue}>
              <span className={styles.selectedName}>{selectedDataSource.name}</span>
              <div className={styles.selectedMeta}>
                <span className={`${styles.badge} ${getTypeBadgeClass(selectedDataSource.type)}`}>
                  {selectedDataSource.type}
                </span>
                <span className={styles.selectedRows}>
                  {formatRowCount(selectedDataSource.rowCount)}
                </span>
              </div>
            </div>
          ) : (
            <span className={styles.placeholder}>Select a data source...</span>
          )}

          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            id={listboxId}
            className={styles.dropdown}
            role="listbox"
            aria-label="Data sources"
          >
            {filteredDataSources.length === 0 && searchQuery ? (
              <div className={styles.noResults}>
                No data sources match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredDataSources.map((ds, index) => {
                const isSelected = ds.id === selectedId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={ds.id}
                    id={getOptionId(index)}
                    type="button"
                    role="option"
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ""} ${isHighlighted ? styles.optionHighlighted : ""}`}
                    onClick={() => handleSelect(ds.id)}
                    aria-selected={isSelected}
                    data-testid={`datasource-option-${ds.id}`}
                  >
                    <div className={styles.optionContent}>
                      <span className={styles.optionName}>{ds.name}</span>
                      <div className={styles.optionMeta}>
                        <span className={`${styles.badge} ${getTypeBadgeClass(ds.type)}`}>
                          {ds.type}
                        </span>
                        <span className={styles.optionRows}>
                          {formatRowCount(ds.rowCount)}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className={styles.checkmark}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3 8L6.5 11.5L13 4.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })
            )}

            {/* Create new option */}
            <div className={styles.divider} />
            <button
              id={getOptionId(filteredDataSources.length)}
              type="button"
              role="option"
              className={`${styles.option} ${styles.createOption} ${highlightedIndex === filteredDataSources.length ? styles.optionHighlighted : ""}`}
              onClick={handleCreateNew}
              aria-selected={false}
            >
              <span className={styles.createIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 3V13M3 8H13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>Create new data source</span>
            </button>
          </div>
        )}
      </div>

      {dataSources.length === 0 && !loading && (
        <p className={styles.hint}>
          No data sources available.{" "}
          <button type="button" onClick={onCreateNew} className={styles.hintLink}>
            Create one
          </button>{" "}
          to get started.
        </p>
      )}
    </div>
  );
}
