"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { DataSource } from "../types";
import styles from "../GenerateWizard.module.css";

interface DataSourceSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface DataSourcesResponse {
  data: DataSource[];
}

export function DataSourceSelector({ selectedId, onSelect }: DataSourceSelectorProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLButtonElement>(null);

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

  // Focus first card when data sources load and there's no selection
  useEffect(() => {
    if (!loading && dataSources.length > 0 && !selectedId && firstCardRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        firstCardRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, dataSources.length, selectedId]);

  // Keyboard navigation handler for grid
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      const { key } = event;
      let newIndex = currentIndex;

      // Calculate grid columns based on container width
      const gridElement = gridRef.current;
      if (!gridElement) return;

      const cards = gridElement.querySelectorAll("button");
      const cardCount = cards.length;

      // Estimate columns (based on card width + gap)
      const containerWidth = gridElement.clientWidth;
      const columns = Math.max(1, Math.floor(containerWidth / 296)); // 280px min + 16px gap

      switch (key) {
        case "ArrowRight":
          newIndex = Math.min(currentIndex + 1, cardCount - 1);
          event.preventDefault();
          break;
        case "ArrowLeft":
          newIndex = Math.max(currentIndex - 1, 0);
          event.preventDefault();
          break;
        case "ArrowDown":
          newIndex = Math.min(currentIndex + columns, cardCount - 1);
          event.preventDefault();
          break;
        case "ArrowUp":
          newIndex = Math.max(currentIndex - columns, 0);
          event.preventDefault();
          break;
        case "Home":
          newIndex = 0;
          event.preventDefault();
          break;
        case "End":
          newIndex = cardCount - 1;
          event.preventDefault();
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        (cards[newIndex] as HTMLButtonElement)?.focus();
      }
    },
    []
  );

  const getTypeBadgeClass = (type: DataSource["type"]): string => {
    const badgeBase = styles.badge ?? "";
    switch (type) {
      case "csv":
        return `${badgeBase} ${styles.badgeCsv ?? ""}`;
      case "transform":
        return `${badgeBase} ${styles.badgeTransform ?? ""}`;
      case "api":
        return `${badgeBase} ${styles.badgeApi ?? ""}`;
      default:
        return badgeBase;
    }
  };

  const formatRowCount = (count?: number): string => {
    if (count === undefined || count === null) return "Unknown rows";
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k rows`;
    }
    return `${count} row${count !== 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div className={styles.selectionGrid} data-testid="datasource-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState} data-testid="datasource-error">
        <p>{error}</p>
        <button
          type="button"
          onClick={fetchDataSources}
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  if (dataSources.length === 0) {
    return (
      <div className={styles.emptyState} data-testid="datasource-empty">
        <p>No data sources found. Upload one first.</p>
        <Link href="/data-sources">Upload a data source</Link>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className={styles.selectionGrid}
      data-testid="datasource-list"
      role="listbox"
      aria-label="Select a data source"
    >
      {dataSources.map((dataSource, index) => {
        const isSelected = selectedId === dataSource.id;
        const isFirst = index === 0;

        return (
          <button
            key={dataSource.id}
            ref={isFirst ? firstCardRef : undefined}
            type="button"
            role="option"
            className={`${styles.selectionCard} ${isSelected ? styles.selectionCardSelected : ""}`}
            onClick={() => onSelect(dataSource.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            data-testid={`datasource-card-${dataSource.id}`}
            aria-selected={isSelected}
          >
            <div className={styles.cardTitle}>{dataSource.name}</div>
            <div className={styles.cardMeta}>
              <span className={getTypeBadgeClass(dataSource.type)}>
                {dataSource.type}
              </span>
              <span>{formatRowCount(dataSource.rowCount)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
