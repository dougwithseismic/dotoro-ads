"use client";

import { useMemo } from "react";
import type { AdTypeDefinition, ContentCategory } from "@repo/core/ad-types";
import { AdTypeCard, type SelectionMode } from "./AdTypeCard";
import styles from "./AdTypeGrid.module.css";

export interface AdTypeGridProps {
  /** Ad types to display in the grid */
  adTypes: AdTypeDefinition[];
  /** Currently selected ad type IDs */
  selectedAdTypes: string[];
  /** Callback when an ad type is selected/deselected */
  onSelect: (adTypeId: string) => void;
  /** Selection mode - single (radio) or multi (checkbox) */
  selectionMode?: SelectionMode;
  /** Whether to group ad types by category */
  groupByCategory?: boolean;
  /** Whether cards show details on hover */
  showDetailsOnHover?: boolean;
}

/**
 * Formats the category name for display
 */
function formatCategoryHeader(category: ContentCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Category display order
 */
const CATEGORY_ORDER: ContentCategory[] = ["paid", "promoted", "organic"];

/**
 * AdTypeGrid displays a grid of ad type cards with optional grouping by category.
 * Supports both single-select (radio) and multi-select (checkbox) modes.
 *
 * @example
 * <AdTypeGrid
 *   adTypes={googleAdTypes}
 *   selectedAdTypes={['responsive-search']}
 *   onSelect={(id) => toggleAdType(id)}
 * />
 */
export function AdTypeGrid({
  adTypes,
  selectedAdTypes,
  onSelect,
  selectionMode = "multi",
  groupByCategory = false,
  showDetailsOnHover = false,
}: AdTypeGridProps) {
  // Handle empty selectedAdTypes
  const selected = selectedAdTypes ?? [];

  // Group ad types by category if needed
  const groupedAdTypes = useMemo(() => {
    if (!groupByCategory) {
      return null;
    }

    const groups: Record<ContentCategory, AdTypeDefinition[]> = {
      paid: [],
      promoted: [],
      organic: [],
    };

    for (const adType of adTypes) {
      const category = adType.category as ContentCategory;
      if (groups[category]) {
        groups[category].push(adType);
      }
    }

    // Filter out empty categories and sort by order
    return CATEGORY_ORDER.filter((cat) => groups[cat].length > 0).map((cat) => ({
      category: cat,
      adTypes: groups[cat],
    }));
  }, [adTypes, groupByCategory]);

  // Empty state
  if (adTypes.length === 0) {
    return (
      <div className={styles.emptyState} data-testid="ad-type-grid">
        <p className={styles.emptyText}>No ad types available for this platform.</p>
      </div>
    );
  }

  // Render grouped grid
  if (groupByCategory && groupedAdTypes) {
    return (
      <div
        className={styles.container}
        role="group"
        aria-label="Select ad types"
        data-testid="ad-type-grid"
      >
        {groupedAdTypes.map(({ category, adTypes: categoryAdTypes }) => (
          <div
            key={category}
            className={styles.categoryGroup}
            data-testid={`category-group-${category}`}
          >
            <h3 className={styles.categoryHeader}>
              {formatCategoryHeader(category)}
            </h3>
            <div className={styles.grid}>
              {categoryAdTypes.map((adType) => (
                <AdTypeCard
                  key={adType.id}
                  adType={adType}
                  isSelected={selected.includes(adType.id)}
                  onSelect={onSelect}
                  selectionMode={selectionMode}
                  showDetailsOnHover={showDetailsOnHover}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render flat grid
  return (
    <div
      className={`${styles.container} ${styles.grid}`}
      role="group"
      aria-label="Select ad types"
      data-testid="ad-type-grid"
    >
      {adTypes.map((adType) => (
        <AdTypeCard
          key={adType.id}
          adType={adType}
          isSelected={selected.includes(adType.id)}
          onSelect={onSelect}
          selectionMode={selectionMode}
          showDetailsOnHover={showDetailsOnHover}
        />
      ))}
    </div>
  );
}
