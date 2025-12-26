"use client";

import { useState, useCallback, useMemo } from "react";
import type { Platform } from "../../types";
import { useAdTypes } from "../../hooks/useAdTypes";
import { PlatformTabs } from "./PlatformTabs";
import { AdTypeGrid } from "./AdTypeGrid";
import { AdTypePreview } from "./AdTypePreview";
import styles from "./AdTypeSelector.module.css";

export interface AdTypeSelectorProps {
  /** Platforms to show ad types for */
  selectedPlatforms: Platform[];
  /** Currently selected ad type IDs per platform */
  selectedAdTypes: Record<Platform, string[]>;
  /** Callback when selection changes */
  onChange: (selectedAdTypes: Record<Platform, string[]>) => void;
  /** Whether to use single-select mode (default: multi) */
  selectionMode?: "single" | "multi";
}

/**
 * AdTypeSelector is the main component for selecting ad types.
 * It shows platform tabs at the top, a grid of ad type cards, and optionally a preview panel.
 *
 * @example
 * <AdTypeSelector
 *   selectedPlatforms={['google', 'reddit']}
 *   selectedAdTypes={{ google: ['responsive-search'], reddit: [], facebook: [] }}
 *   onChange={(selected) => setSelectedAdTypes(selected)}
 * />
 */
export function AdTypeSelector({
  selectedPlatforms,
  selectedAdTypes,
  onChange,
  selectionMode = "multi",
}: AdTypeSelectorProps) {
  // Track the active platform tab
  const [activePlatform, setActivePlatform] = useState<Platform | null>(
    selectedPlatforms[0] ?? null
  );

  // Get ad types for all selected platforms
  const { adTypes, getAdType } = useAdTypes(selectedPlatforms);

  // Handle undefined selectedAdTypes
  const safeSelectedAdTypes: Record<Platform, string[]> = selectedAdTypes ?? {
    google: [],
    reddit: [],
    facebook: [],
  };

  // Calculate count of selected ad types per platform
  const selectedAdTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const platform of selectedPlatforms) {
      counts[platform] = safeSelectedAdTypes[platform]?.length ?? 0;
    }
    return counts;
  }, [selectedPlatforms, safeSelectedAdTypes]);

  // Handle platform tab change
  const handlePlatformChange = useCallback((platform: Platform) => {
    setActivePlatform(platform);
  }, []);

  // Handle ad type selection/deselection
  const handleAdTypeSelect = useCallback(
    (adTypeId: string) => {
      if (!activePlatform) return;

      const currentSelection = safeSelectedAdTypes[activePlatform] ?? [];
      let newSelection: string[];

      if (selectionMode === "single") {
        // In single-select mode, replace the selection
        newSelection = currentSelection.includes(adTypeId) ? [] : [adTypeId];
      } else {
        // In multi-select mode, toggle the selection
        if (currentSelection.includes(adTypeId)) {
          newSelection = currentSelection.filter((id) => id !== adTypeId);
        } else {
          newSelection = [...currentSelection, adTypeId];
        }
      }

      onChange({
        ...safeSelectedAdTypes,
        [activePlatform]: newSelection,
      });
    },
    [activePlatform, safeSelectedAdTypes, selectionMode, onChange]
  );

  // Get currently selected ad type for preview (last selected on active platform)
  const previewAdType = useMemo(() => {
    if (!activePlatform) return null;
    const selected = safeSelectedAdTypes[activePlatform] ?? [];
    const lastSelected = selected[selected.length - 1];
    if (!lastSelected) return null;
    return getAdType(activePlatform, lastSelected);
  }, [activePlatform, safeSelectedAdTypes, getAdType]);

  // Empty state if no platforms
  if (selectedPlatforms.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            Select a platform first to choose ad types.
          </p>
        </div>
      </div>
    );
  }

  // Empty state if no active platform selected
  if (!activePlatform) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            Select a platform first to choose ad types.
          </p>
        </div>
      </div>
    );
  }

  // Get ad types for the active platform (activePlatform is guaranteed non-null here)
  const activeAdTypes = adTypes[activePlatform];
  const activeSelectedAdTypes = safeSelectedAdTypes[activePlatform] ?? [];

  return (
    <div className={styles.container}>
      {/* Platform Tabs */}
      <PlatformTabs
        platforms={selectedPlatforms}
        selectedPlatform={activePlatform}
        selectedAdTypeCounts={selectedAdTypeCounts}
        onChange={handlePlatformChange}
      />

      {/* Main Content */}
      <div className={styles.content}>
        {/* Ad Type Grid */}
        <div className={styles.gridSection}>
          <AdTypeGrid
            adTypes={activeAdTypes}
            selectedAdTypes={activeSelectedAdTypes}
            onSelect={handleAdTypeSelect}
            selectionMode={selectionMode}
          />
        </div>

        {/* Preview Panel (shown when something is selected) */}
        {previewAdType && (
          <div className={styles.previewSection}>
            <AdTypePreview adType={previewAdType} />
          </div>
        )}
      </div>
    </div>
  );
}
