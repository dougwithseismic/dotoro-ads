"use client";

import styles from "./PlatformFilter.module.css";
import type { Platform } from "@/types/platform";

export type { Platform };

export interface PlatformCounts {
  reddit: number;
  google: number;
  facebook: number;
}

interface PlatformOption {
  value: Platform | null;
  label: string;
  color?: string;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  { value: null, label: "All" },
  { value: "reddit", label: "Reddit", color: "#ff4500" },
  { value: "google", label: "Google", color: "#4285f4" },
  { value: "facebook", label: "Facebook", color: "#1877f2" },
];

export interface PlatformFilterProps {
  selected: Platform | null;
  onChange: (platform: Platform | null) => void;
  counts?: PlatformCounts;
}

export function PlatformFilter({
  selected,
  onChange,
  counts,
}: PlatformFilterProps) {
  const getCount = (platform: Platform | null): number | undefined => {
    if (!counts) return undefined;
    if (platform === null) {
      return counts.reddit + counts.google + counts.facebook;
    }
    return counts[platform];
  };

  return (
    <div
      className={styles.filterGroup}
      role="group"
      aria-label="Filter by platform"
    >
      {PLATFORM_OPTIONS.map((option) => {
        const isSelected = selected === option.value;
        const count = getCount(option.value);
        return (
          <button
            key={option.value ?? "all"}
            type="button"
            className={`${styles.filterButton} ${isSelected ? styles.active : ""}`}
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            style={
              option.color && isSelected
                ? ({ "--platform-color": option.color } as React.CSSProperties)
                : undefined
            }
          >
            {option.label}
            {count !== undefined && (
              <span className={styles.count}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
