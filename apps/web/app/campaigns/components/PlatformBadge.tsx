"use client";

import type { ReactElement } from "react";
import type { Platform } from "../types";
import styles from "./PlatformBadge.module.css";

interface PlatformBadgeProps {
  platform: Platform;
  compact?: boolean;
}

const PLATFORM_ICONS: Record<Platform, ReactElement> = {
  reddit: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="7" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1" fill="currentColor" />
      <path
        d="M5 10C5.5 11 6.5 11.5 8 11.5C9.5 11.5 10.5 11 11 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  google: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 3C5.24 3 3 5.24 3 8C3 10.76 5.24 13 8 13C10.76 13 13 10.76 13 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 8H13V5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  facebook: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 3H11.5V1H10C8.34 1 7 2.34 7 4V5H5V7.5H7V15H9.5V7.5H11.5L12 5H9.5V4C9.5 3.45 9.95 3 10.5 3H10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const PLATFORM_NAMES: Record<Platform, string> = {
  reddit: "Reddit",
  google: "Google",
  facebook: "Facebook",
};

export function PlatformBadge({ platform, compact = false }: PlatformBadgeProps) {
  return (
    <div
      className={styles.badge}
      data-platform={platform}
      title={PLATFORM_NAMES[platform]}
    >
      <span className={styles.icon}>{PLATFORM_ICONS[platform]}</span>
      {!compact && <span className={styles.name}>{PLATFORM_NAMES[platform]}</span>}
    </div>
  );
}
