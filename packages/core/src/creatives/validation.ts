/**
 * Creative Asset Validation
 *
 * Functions for validating asset metadata against platform specifications.
 */

import type {
  AssetMetadata,
  AssetValidation,
  CreativeSpecs,
  ValidationError,
  ValidationWarning,
} from "./types.js";
import { mimeToFormat } from "./analyze.js";

/**
 * Validate asset metadata against creative specifications.
 *
 * @param metadata - Asset metadata to validate
 * @param specs - Creative specifications to validate against
 * @returns Validation result with errors and warnings
 */
export function validateAsset(
  metadata: AssetMetadata,
  specs: CreativeSpecs
): AssetValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // Dimension validation
  // ─────────────────────────────────────────────────────────────────────────

  if (specs.minWidth && metadata.width && metadata.width < specs.minWidth) {
    errors.push({
      code: "MIN_WIDTH",
      message: `Image width (${metadata.width}px) is below minimum (${specs.minWidth}px)`,
      field: "width",
    });
  }

  if (specs.maxWidth && metadata.width && metadata.width > specs.maxWidth) {
    errors.push({
      code: "MAX_WIDTH",
      message: `Image width (${metadata.width}px) exceeds maximum (${specs.maxWidth}px)`,
      field: "width",
    });
  }

  if (specs.minHeight && metadata.height && metadata.height < specs.minHeight) {
    errors.push({
      code: "MIN_HEIGHT",
      message: `Image height (${metadata.height}px) is below minimum (${specs.minHeight}px)`,
      field: "height",
    });
  }

  if (specs.maxHeight && metadata.height && metadata.height > specs.maxHeight) {
    errors.push({
      code: "MAX_HEIGHT",
      message: `Image height (${metadata.height}px) exceeds maximum (${specs.maxHeight}px)`,
      field: "height",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Recommended dimensions warning
  // ─────────────────────────────────────────────────────────────────────────

  if (
    specs.recommendedWidth &&
    specs.recommendedHeight &&
    metadata.width &&
    metadata.height
  ) {
    if (
      metadata.width < specs.recommendedWidth ||
      metadata.height < specs.recommendedHeight
    ) {
      warnings.push({
        code: "BELOW_RECOMMENDED",
        message: `Image (${metadata.width}x${metadata.height}) is below recommended size (${specs.recommendedWidth}x${specs.recommendedHeight})`,
        suggestion: `For best results, use images at least ${specs.recommendedWidth}x${specs.recommendedHeight}px`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Aspect ratio validation
  // ─────────────────────────────────────────────────────────────────────────

  if (
    specs.aspectRatios &&
    specs.aspectRatios.length > 0 &&
    metadata.aspectRatio
  ) {
    const isValidRatio = specs.aspectRatios.some((ratio) =>
      isAspectRatioMatch(metadata.aspectRatio!, ratio)
    );

    if (!isValidRatio) {
      errors.push({
        code: "INVALID_ASPECT_RATIO",
        message: `Aspect ratio (${metadata.aspectRatio}) is not supported. Allowed: ${specs.aspectRatios.join(", ")}`,
        field: "aspectRatio",
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // File size validation
  // ─────────────────────────────────────────────────────────────────────────

  if (
    specs.maxFileSize &&
    metadata.fileSize &&
    metadata.fileSize > specs.maxFileSize
  ) {
    const maxMB = (specs.maxFileSize / 1_000_000).toFixed(1);
    const actualMB = (metadata.fileSize / 1_000_000).toFixed(1);
    errors.push({
      code: "FILE_TOO_LARGE",
      message: `File size (${actualMB}MB) exceeds maximum (${maxMB}MB)`,
      field: "fileSize",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Format validation
  // ─────────────────────────────────────────────────────────────────────────

  if (specs.allowedFormats && metadata.mimeType) {
    const format = mimeToFormat(metadata.mimeType);
    if (!specs.allowedFormats.includes(format)) {
      errors.push({
        code: "INVALID_FORMAT",
        message: `Format (${format}) is not supported. Allowed: ${specs.allowedFormats.join(", ")}`,
        field: "format",
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Video-specific validation
  // ─────────────────────────────────────────────────────────────────────────

  if (metadata.duration !== undefined) {
    if (specs.minDuration && metadata.duration < specs.minDuration) {
      errors.push({
        code: "VIDEO_TOO_SHORT",
        message: `Video duration (${metadata.duration}s) is below minimum (${specs.minDuration}s)`,
        field: "duration",
      });
    }

    if (specs.maxDuration && metadata.duration > specs.maxDuration) {
      errors.push({
        code: "VIDEO_TOO_LONG",
        message: `Video duration (${metadata.duration}s) exceeds maximum (${specs.maxDuration}s)`,
        field: "duration",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if two aspect ratios match within tolerance.
 *
 * @param actual - Actual aspect ratio (e.g., "16:9")
 * @param target - Target aspect ratio to match against
 * @returns True if ratios match within 2% tolerance
 */
export function isAspectRatioMatch(actual: string, target: string): boolean {
  const parseRatio = (r: string): number => {
    const parts = r.split(":");
    if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      const w = parseFloat(parts[0]);
      const h = parseFloat(parts[1]);
      return w / h;
    }
    // Handle decimal ratios like "1.91:1"
    return parseFloat(r);
  };

  const actualRatio = parseRatio(actual);
  const targetRatio = parseRatio(target);

  // Allow 2% tolerance
  return Math.abs(actualRatio - targetRatio) / targetRatio < 0.02;
}
