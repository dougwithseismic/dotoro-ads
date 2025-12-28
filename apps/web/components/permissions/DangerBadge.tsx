"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import styles from "./DangerBadge.module.css";
import type { DangerLevel } from "@/lib/permissions";

export interface DangerBadgeProps {
  /** The danger level to display */
  level: DangerLevel;
  /** Whether to show the label text */
  showLabel?: boolean;
}

const LABELS: Record<Exclude<DangerLevel, "safe">, string> = {
  dangerous: "Critical",
  moderate: "Caution",
};

/**
 * DangerBadge Component
 *
 * Displays a warning indicator for dangerous or moderate risk permissions.
 * Uses red for dangerous, amber for moderate.
 */
export function DangerBadge({ level, showLabel = true }: DangerBadgeProps) {
  if (level === "safe") {
    return null;
  }

  const Icon = level === "dangerous" ? AlertTriangle : AlertCircle;

  return (
    <span
      className={`${styles.badge} ${styles[level]}`}
      data-testid="danger-badge"
      data-level={level}
      role="status"
      aria-label={`${LABELS[level]} - This action has ${level === "dangerous" ? "critical" : "moderate"} risk`}
    >
      <Icon className={styles.icon} aria-hidden="true" />
      {showLabel && LABELS[level]}
    </span>
  );
}
