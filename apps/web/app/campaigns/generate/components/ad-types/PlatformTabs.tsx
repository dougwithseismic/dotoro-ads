"use client";

import { useCallback, useRef } from "react";
import type { Platform } from "../../types";
import styles from "./PlatformTabs.module.css";

export interface PlatformTabsProps {
  /** List of platforms to show tabs for */
  platforms: Platform[];
  /** Currently selected platform */
  selectedPlatform: Platform;
  /** Count of selected ad types per platform */
  selectedAdTypeCounts: Record<string, number>;
  /** Callback when a platform tab is selected */
  onChange: (platform: Platform) => void;
}

/**
 * Platform configuration with icons and names
 */
const PLATFORM_CONFIG: Record<Platform, { name: string; icon: string }> = {
  google: { name: "Google", icon: "G" },
  reddit: { name: "Reddit", icon: "R" },
  facebook: { name: "Facebook", icon: "f" },
};

/**
 * PlatformTabs displays a tab bar for switching between platforms.
 * Each tab shows the platform icon, name, and a count of selected ad types.
 * Supports keyboard navigation with arrow keys.
 *
 * @example
 * <PlatformTabs
 *   platforms={['google', 'reddit']}
 *   selectedPlatform="google"
 *   selectedAdTypeCounts={{ google: 2, reddit: 0 }}
 *   onChange={(platform) => setSelectedPlatform(platform)}
 * />
 */
export function PlatformTabs({
  platforms,
  selectedPlatform,
  selectedAdTypeCounts,
  onChange,
}: PlatformTabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleTabClick = useCallback(
    (platform: Platform) => {
      if (platform !== selectedPlatform) {
        onChange(platform);
      }
    },
    [selectedPlatform, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let newIndex: number | null = null;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          newIndex = (currentIndex + 1) % platforms.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          newIndex = (currentIndex - 1 + platforms.length) % platforms.length;
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = platforms.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onChange(platforms[currentIndex]);
          return;
      }

      if (newIndex !== null) {
        const newPlatform = platforms[newIndex];
        onChange(newPlatform);

        // Focus the new tab
        const tabList = tabListRef.current;
        if (tabList) {
          const tabs = tabList.querySelectorAll('[role="tab"]');
          (tabs[newIndex] as HTMLElement)?.focus();
        }
      }
    },
    [platforms, onChange]
  );

  if (platforms.length === 0) {
    return null;
  }

  return (
    <div
      ref={tabListRef}
      className={styles.tabList}
      role="tablist"
      aria-label="Select platform"
    >
      {platforms.map((platform, index) => {
        const config = PLATFORM_CONFIG[platform];
        const isSelected = platform === selectedPlatform;
        const count = selectedAdTypeCounts[platform] ?? 0;
        const platformClass = `tab${config.name}` as keyof typeof styles;

        return (
          <button
            key={platform}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={`${config.name}${count > 0 ? `, ${count} ad types selected` : ""}`}
            tabIndex={isSelected ? 0 : -1}
            className={`${styles.tab} ${isSelected ? styles.tabSelected : ""} ${isSelected ? styles[platformClass] || "" : ""}`}
            onClick={() => handleTabClick(platform)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            data-testid={`platform-tab-${platform}`}
          >
            <span className={styles.icon}>{config.icon}</span>
            <span className={styles.name}>{config.name}</span>
            {count > 0 && (
              <span
                className={styles.countBadge}
                data-testid={`count-badge-${platform}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
