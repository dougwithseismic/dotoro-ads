'use client';

import type { SafeZone } from './types';
import styles from './SafeZoneOverlay.module.css';

/**
 * Platform-specific safe zone presets (percentages from edges)
 *
 * These define the areas where UI elements typically appear on different platforms,
 * helping designers keep important content in the "safe" area.
 */
export const SAFE_ZONE_PRESETS = {
  /** Default safe zone - 5% from all edges */
  default: { top: 5, right: 5, bottom: 5, left: 5 },
  /** Reddit - extra bottom space for UI controls */
  reddit: { top: 5, right: 5, bottom: 10, left: 5 },
  /** Meta Stories - extra top/bottom for story UI */
  meta_story: { top: 10, right: 5, bottom: 15, left: 5 },
  /** Meta Feed - standard margins */
  meta_feed: { top: 5, right: 5, bottom: 5, left: 5 },
  /** TikTok - significant bottom margin for UI */
  tiktok: { top: 5, right: 5, bottom: 20, left: 5 },
  /** YouTube - extra bottom for progress bar */
  youtube: { top: 5, right: 5, bottom: 12, left: 5 },
} as const;

/** Keys for safe zone presets */
export type SafeZonePresetKey = keyof typeof SAFE_ZONE_PRESETS;

/**
 * SafeZoneOverlay Props
 */
export interface SafeZoneOverlayProps {
  /** Safe zone margins as percentages */
  safeZone: SafeZone;
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
  /** Whether the overlay is visible */
  visible: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * SafeZoneOverlay - Visual overlay showing content-safe areas
 *
 * Displays a dashed border around the "safe" area where important content
 * should be placed, with semi-transparent danger zones indicating areas
 * that may be obscured by platform UI elements.
 *
 * Features:
 * - Dashed border showing content-safe area
 * - Semi-transparent danger zones outside safe area
 * - Platform-specific presets available via SAFE_ZONE_PRESETS
 * - Percentage-based positioning for accurate representation at any zoom
 *
 * @example
 * ```tsx
 * <SafeZoneOverlay
 *   safeZone={{ top: 5, right: 5, bottom: 10, left: 5 }}
 *   canvasWidth={1080}
 *   canvasHeight={1920}
 *   visible={true}
 * />
 * ```
 */
export function SafeZoneOverlay({
  safeZone,
  canvasWidth,
  canvasHeight,
  visible,
  className,
}: SafeZoneOverlayProps) {
  if (!visible) return null;

  // Calculate pixel values from percentages
  const topPx = (safeZone.top / 100) * canvasHeight;
  const rightPx = (safeZone.right / 100) * canvasWidth;
  const bottomPx = (safeZone.bottom / 100) * canvasHeight;
  const leftPx = (safeZone.left / 100) * canvasWidth;

  // Calculate safe area dimensions
  const safeWidth = canvasWidth - leftPx - rightPx;
  const safeHeight = canvasHeight - topPx - bottomPx;

  return (
    <div
      className={`${styles.overlay} ${className ?? ''}`}
      style={{ width: canvasWidth, height: canvasHeight }}
      role="presentation"
      aria-hidden="true"
    >
      {/* Top danger zone */}
      <div
        className={styles.dangerZone}
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: topPx,
        }}
        data-position="top"
      />

      {/* Bottom danger zone */}
      <div
        className={styles.dangerZone}
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          height: bottomPx,
        }}
        data-position="bottom"
      />

      {/* Left danger zone (between top and bottom) */}
      <div
        className={styles.dangerZone}
        style={{
          top: topPx,
          left: 0,
          width: leftPx,
          height: safeHeight,
        }}
        data-position="left"
      />

      {/* Right danger zone (between top and bottom) */}
      <div
        className={styles.dangerZone}
        style={{
          top: topPx,
          right: 0,
          width: rightPx,
          height: safeHeight,
        }}
        data-position="right"
      />

      {/* Safe zone border (dashed) */}
      <div
        className={styles.safeZoneBorder}
        style={{
          top: topPx,
          left: leftPx,
          width: safeWidth,
          height: safeHeight,
        }}
      />

      {/* Corner labels for clarity */}
      <div
        className={`${styles.cornerLabel} ${styles.topLeft}`}
        style={{ top: topPx + 4, left: leftPx + 4 }}
      >
        Safe Zone
      </div>
    </div>
  );
}

/**
 * Helper function to get a preset safe zone by name
 */
export function getSafeZonePreset(preset: SafeZonePresetKey): SafeZone {
  return { ...SAFE_ZONE_PRESETS[preset] };
}

/**
 * Helper function to validate safe zone values
 */
export function isValidSafeZone(safeZone: SafeZone): boolean {
  const { top, right, bottom, left } = safeZone;

  // All values should be between 0 and 50%
  return (
    top >= 0 && top <= 50 &&
    right >= 0 && right <= 50 &&
    bottom >= 0 && bottom <= 50 &&
    left >= 0 && left <= 50 &&
    // Combined should not exceed 100%
    top + bottom <= 100 &&
    left + right <= 100
  );
}

export default SafeZoneOverlay;
