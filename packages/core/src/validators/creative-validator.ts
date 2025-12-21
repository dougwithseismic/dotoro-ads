/**
 * Creative Validator
 *
 * Validates creative assets (images, videos) against platform-specific requirements.
 * Supports validation for file types, sizes, dimensions, and video duration.
 */

import { formatBytes } from "../utils/format.js";

/**
 * Supported ad platforms
 */
export enum Platform {
  REDDIT = "reddit",
}

/**
 * Creative asset types
 */
export enum CreativeType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  CAROUSEL = "CAROUSEL",
}

/**
 * Validation error codes
 */
export type ValidationErrorCode =
  | "INVALID_MIME_TYPE"
  | "FILE_TOO_LARGE"
  | "FILE_TOO_SMALL"
  | "DIMENSIONS_TOO_SMALL"
  | "DIMENSIONS_TOO_LARGE"
  | "INVALID_ASPECT_RATIO"
  | "VIDEO_TOO_SHORT"
  | "VIDEO_TOO_LONG"
  | "INVALID_DURATION";

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  code: ValidationErrorCode;
  message: string;
  limit?: number;
  actual?: number;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Image dimension constraints
 */
export interface ImageConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  minAspectRatio: number;
  maxAspectRatio: number;
}

/**
 * Video constraints
 */
export interface VideoConstraints {
  minDurationSeconds: number;
  maxDurationSeconds: number;
  maxFileSize: number;
}

/**
 * Input for full creative validation
 */
export interface CreativeValidationInput {
  type: CreativeType;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  platform: Platform;
}

/**
 * File size limits in bytes
 */
const FILE_SIZE_LIMITS = {
  image: 20 * 1024 * 1024, // 20MB
  video: 500 * 1024 * 1024, // 500MB
} as const;

/**
 * Allowed MIME types per creative type
 */
const ALLOWED_MIME_TYPES: Record<CreativeType, string[]> = {
  [CreativeType.IMAGE]: ["image/jpeg", "image/png", "image/gif"],
  [CreativeType.VIDEO]: ["video/mp4", "video/quicktime"],
  [CreativeType.CAROUSEL]: ["image/jpeg", "image/png", "image/gif"],
};

/**
 * Platform-specific image constraints
 */
const PLATFORM_IMAGE_CONSTRAINTS: Record<Platform, ImageConstraints> = {
  [Platform.REDDIT]: {
    minWidth: 400,
    minHeight: 300,
    maxWidth: 4000,
    maxHeight: 3000,
    minAspectRatio: 1, // 1:1 (square)
    maxAspectRatio: 4 / 3, // 4:3
  },
};

/**
 * Platform-specific video constraints
 */
const PLATFORM_VIDEO_CONSTRAINTS: Record<Platform, VideoConstraints> = {
  [Platform.REDDIT]: {
    minDurationSeconds: 5,
    maxDurationSeconds: 180,
    maxFileSize: 500 * 1024 * 1024,
  },
};

/**
 * Warning threshold (percentage of limit)
 */
const WARNING_THRESHOLD = 0.9; // 90% of limit

/**
 * Creative Validator class
 */
export class CreativeValidator {
  /**
   * Validate MIME type for a creative type
   */
  validateMimeType(mimeType: string, type: CreativeType): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const allowedTypes = ALLOWED_MIME_TYPES[type];
    if (!allowedTypes.includes(mimeType)) {
      errors.push({
        field: "mimeType",
        code: "INVALID_MIME_TYPE",
        message: `Invalid MIME type "${mimeType}" for ${type}. Allowed types: ${allowedTypes.join(", ")}`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate file size
   */
  validateFileSize(bytes: number, type: CreativeType): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (bytes <= 0) {
      errors.push({
        field: "fileSize",
        code: "FILE_TOO_SMALL",
        message: "File size must be greater than 0",
        actual: bytes,
      });
      return { valid: false, errors, warnings };
    }

    const limit =
      type === CreativeType.VIDEO
        ? FILE_SIZE_LIMITS.video
        : FILE_SIZE_LIMITS.image;

    if (bytes > limit) {
      errors.push({
        field: "fileSize",
        code: "FILE_TOO_LARGE",
        message: `File size ${formatBytes(bytes)} exceeds ${formatBytes(limit)} limit`,
        limit,
        actual: bytes,
      });
    } else if (bytes > limit * WARNING_THRESHOLD) {
      warnings.push({
        field: "fileSize",
        message: `File size ${formatBytes(bytes)} is close to the ${formatBytes(limit)} limit`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate image dimensions for a platform
   */
  validateImageDimensions(
    width: number,
    height: number,
    platform: Platform
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const constraints = PLATFORM_IMAGE_CONSTRAINTS[platform];
    if (!constraints) {
      return { valid: true, errors, warnings };
    }

    // Check minimum dimensions
    if (width < constraints.minWidth || height < constraints.minHeight) {
      errors.push({
        field: "dimensions",
        code: "DIMENSIONS_TOO_SMALL",
        message: `Image dimensions ${width}x${height} are below minimum ${constraints.minWidth}x${constraints.minHeight}`,
        limit: constraints.minWidth,
        actual: Math.min(width, height),
      });
    }

    // Check maximum dimensions
    if (width > constraints.maxWidth || height > constraints.maxHeight) {
      errors.push({
        field: "dimensions",
        code: "DIMENSIONS_TOO_LARGE",
        message: `Image dimensions ${width}x${height} exceed maximum ${constraints.maxWidth}x${constraints.maxHeight}`,
        limit: constraints.maxWidth,
        actual: Math.max(width, height),
      });
    }

    // Check aspect ratio (width / height)
    const aspectRatio = width / height;
    if (
      aspectRatio < constraints.minAspectRatio ||
      aspectRatio > constraints.maxAspectRatio
    ) {
      errors.push({
        field: "aspectRatio",
        code: "INVALID_ASPECT_RATIO",
        message: `Aspect ratio ${aspectRatio.toFixed(2)} is outside allowed range (${constraints.minAspectRatio.toFixed(2)} to ${constraints.maxAspectRatio.toFixed(2)})`,
        actual: aspectRatio,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate video duration for a platform
   */
  validateVideoLength(
    durationSeconds: number,
    platform: Platform
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (durationSeconds <= 0) {
      errors.push({
        field: "duration",
        code: "INVALID_DURATION",
        message: "Video duration must be greater than 0",
        actual: durationSeconds,
      });
      return { valid: false, errors, warnings };
    }

    const constraints = PLATFORM_VIDEO_CONSTRAINTS[platform];
    if (!constraints) {
      return { valid: true, errors, warnings };
    }

    if (durationSeconds < constraints.minDurationSeconds) {
      errors.push({
        field: "duration",
        code: "VIDEO_TOO_SHORT",
        message: `Video duration ${durationSeconds}s is below minimum ${constraints.minDurationSeconds}s`,
        limit: constraints.minDurationSeconds,
        actual: durationSeconds,
      });
    }

    if (durationSeconds > constraints.maxDurationSeconds) {
      errors.push({
        field: "duration",
        code: "VIDEO_TOO_LONG",
        message: `Video duration ${durationSeconds}s exceeds maximum ${constraints.maxDurationSeconds}s`,
        limit: constraints.maxDurationSeconds,
        actual: durationSeconds,
      });
    }

    // Warning for videos close to max duration
    if (
      durationSeconds > constraints.maxDurationSeconds * WARNING_THRESHOLD &&
      durationSeconds <= constraints.maxDurationSeconds
    ) {
      warnings.push({
        field: "duration",
        message: `Video duration ${durationSeconds}s is close to the ${constraints.maxDurationSeconds}s limit`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Perform full creative validation
   */
  validateCreative(input: CreativeValidationInput): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    // Validate MIME type
    const mimeResult = this.validateMimeType(input.mimeType, input.type);
    allErrors.push(...mimeResult.errors);
    allWarnings.push(...mimeResult.warnings);

    // Validate file size
    const sizeResult = this.validateFileSize(input.fileSize, input.type);
    allErrors.push(...sizeResult.errors);
    allWarnings.push(...sizeResult.warnings);

    // Validate dimensions for images
    if (
      (input.type === CreativeType.IMAGE ||
        input.type === CreativeType.CAROUSEL) &&
      input.width !== undefined &&
      input.height !== undefined
    ) {
      const dimensionResult = this.validateImageDimensions(
        input.width,
        input.height,
        input.platform
      );
      allErrors.push(...dimensionResult.errors);
      allWarnings.push(...dimensionResult.warnings);
    }

    // Validate duration for videos
    if (
      input.type === CreativeType.VIDEO &&
      input.durationSeconds !== undefined
    ) {
      const durationResult = this.validateVideoLength(
        input.durationSeconds,
        input.platform
      );
      allErrors.push(...durationResult.errors);
      allWarnings.push(...durationResult.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Get file size limits
   */
  getFileSizeLimits(): { image: number; video: number } {
    return { ...FILE_SIZE_LIMITS };
  }

  /**
   * Get allowed MIME types for a creative type
   */
  getAllowedMimeTypes(type: CreativeType): string[] {
    return [...ALLOWED_MIME_TYPES[type]];
  }

  /**
   * Get platform constraints for a creative type
   */
  getPlatformConstraints(
    platform: Platform,
    type: CreativeType
  ): ImageConstraints | VideoConstraints | null {
    if (type === CreativeType.IMAGE || type === CreativeType.CAROUSEL) {
      return PLATFORM_IMAGE_CONSTRAINTS[platform] ?? null;
    }
    if (type === CreativeType.VIDEO) {
      return PLATFORM_VIDEO_CONSTRAINTS[platform] ?? null;
    }
    return null;
  }
}
