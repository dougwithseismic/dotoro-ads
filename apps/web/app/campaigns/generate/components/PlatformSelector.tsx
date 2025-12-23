"use client";

import { useCallback } from "react";
import type { Platform } from "../types";
import styles from "./PlatformSelector.module.css";

interface PlatformInfo {
  id: Platform;
  name: string;
  hint: string;
  icon: string;
}

const PLATFORMS: PlatformInfo[] = [
  { id: "google", name: "Google", hint: "Google Ads campaigns", icon: "G" },
  { id: "reddit", name: "Reddit", hint: "Reddit Ads campaigns", icon: "R" },
  { id: "facebook", name: "Facebook", hint: "Facebook Ads campaigns", icon: "f" },
];

export interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  onToggle: (platform: Platform) => void;
  showError?: boolean;
}

export function PlatformSelector({
  selectedPlatforms,
  onToggle,
  showError = false,
}: PlatformSelectorProps) {
  // Only count valid platforms
  const validSelectedCount = selectedPlatforms.filter(p =>
    PLATFORMS.some(platform => platform.id === p)
  ).length;

  const hasError = showError && validSelectedCount === 0;

  const handleToggle = useCallback(
    (platform: Platform) => {
      onToggle(platform);
    },
    [onToggle]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, platform: Platform) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle(platform);
      }
    },
    [handleToggle]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Select Platforms</h3>
        <p className={styles.description}>
          Choose one or more platforms to generate campaigns for. The same campaign structure
          will be created for each selected platform.
        </p>
      </div>

      <div
        className={styles.platformGroup}
        role="group"
        aria-label="Select platforms"
      >
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          const platformClass = `platformCard${platform.name}` as keyof typeof styles;

          return (
            <button
              key={platform.id}
              type="button"
              className={`${styles.platformCard} ${isSelected ? styles.platformCardSelected : ""} ${isSelected ? styles[platformClass] : ""}`}
              onClick={() => handleToggle(platform.id)}
              onKeyDown={(e) => handleKeyDown(e, platform.id)}
              data-testid={`platform-checkbox-${platform.id}`}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${platform.name} - ${platform.hint}`}
            >
              <div className={styles.checkboxIndicator}>
                {isSelected && (
                  <svg
                    className={styles.checkIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className={styles.platformContent}>
                <div className={styles.platformIcon}>{platform.icon}</div>
                <div className={styles.platformInfo}>
                  <div className={styles.platformName}>{platform.name}</div>
                  <div className={styles.platformHint}>{platform.hint}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className={styles.selectionStatus}>
        {validSelectedCount === 0 ? (
          hasError ? (
            <p role="alert" className={styles.errorMessage}>
              Select at least one platform to continue
            </p>
          ) : (
            <p className={styles.promptMessage}>
              Select at least one platform
            </p>
          )
        ) : (
          <p className={styles.selectedCount}>
            {validSelectedCount} platform{validSelectedCount !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>
    </div>
  );
}
