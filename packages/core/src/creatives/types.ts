/**
 * Creative Asset Types
 *
 * Type definitions for handling images, videos, GIFs, and carousels
 * for ad campaigns. Supports both preview mode (client-side only)
 * and storage mode (persistent storage).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Creative Type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type of creative asset
 */
export type CreativeType = "image" | "video" | "gif" | "carousel";

// ─────────────────────────────────────────────────────────────────────────────
// Asset Source Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Source of a creative asset - can be from blob, remote URL, variable, or storage
 */
export type AssetSource =
  | AssetSourceBlob
  | AssetSourceRemote
  | AssetSourceVariable
  | AssetSourceStored;

/**
 * Asset source from a local blob (client-side upload)
 */
export interface AssetSourceBlob {
  type: "blob";
  /** Object URL for the blob */
  blobUrl: string;
  /** Original file object */
  file: File;
}

/**
 * Asset source from a remote URL
 */
export interface AssetSourceRemote {
  type: "remote";
  /** URL of the remote asset */
  url: string;
}

/**
 * Asset source from a variable pattern (e.g., {image_url})
 */
export interface AssetSourceVariable {
  type: "variable";
  /** Variable pattern like {image_url} */
  pattern: string;
}

/**
 * Asset source from persistent storage (R2/S3)
 */
export interface AssetSourceStored {
  type: "stored";
  /** Storage key for the asset */
  storageKey: string;
  /** Public URL for the asset */
  url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset Metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata about a creative asset
 */
export interface AssetMetadata {
  /** Original file name */
  fileName?: string;

  /** MIME type of the file */
  mimeType?: string;

  /** File size in bytes */
  fileSize?: number;

  /** Width in pixels */
  width?: number;

  /** Height in pixels */
  height?: number;

  /** Aspect ratio (e.g., "16:9", "1:1") */
  aspectRatio?: string;

  /** Duration in seconds (for video) */
  duration?: number;

  /** Bitrate in kbps (for video) */
  bitrate?: number;

  /** Codec information (for video) */
  codec?: string;

  /** Timestamp when the asset was analyzed */
  analyzedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validation error for an asset
 */
export interface ValidationError {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Field that caused the error */
  field?: string;
}

/**
 * Validation warning for an asset
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;

  /** Human-readable warning message */
  message: string;

  /** Suggestion for how to fix the issue */
  suggestion?: string;
}

/**
 * Validation result for an asset
 */
export interface AssetValidation {
  /** Whether the asset passes validation */
  isValid: boolean;

  /** Validation errors (if any) */
  errors: ValidationError[];

  /** Validation warnings (if any) */
  warnings: ValidationWarning[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Creative Asset
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A creative asset (image, video, or GIF)
 */
export interface CreativeAsset {
  /** Unique identifier for the asset */
  id: string;

  /** Type of creative */
  type: CreativeType;

  /** Source of the asset */
  source: AssetSource;

  /** Metadata about the asset */
  metadata: AssetMetadata;

  /** Validation results */
  validation: AssetValidation;

  /** Thumbnail URL (for video) */
  thumbnailUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Carousel Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single slide in a carousel
 */
export interface CarouselSlide {
  /** Unique identifier for the slide */
  id: string;

  /** Image for this slide */
  image: CreativeAsset;

  /** Slide-specific headline (optional, can use templates) */
  headline?: string;

  /** Slide-specific description (optional) */
  description?: string;

  /** Slide-specific URL (optional) */
  url?: string;

  /** Order of the slide in the carousel */
  order: number;
}

/**
 * A carousel creative asset
 */
export interface CarouselAsset {
  /** Unique identifier for the carousel */
  id: string;

  /** Slides in the carousel */
  slides: CarouselSlide[];
}

/**
 * Configuration for carousel requirements
 */
export interface CarouselConfig {
  /** Minimum number of slides */
  minSlides: number;

  /** Maximum number of slides */
  maxSlides: number;

  /** Whether slides can have individual URLs */
  supportsIndividualUrls: boolean;

  /** Whether slides can have individual headlines */
  supportsIndividualHeadlines: boolean;

  /** Image specs for all slides */
  imageSpecs: CreativeSpecs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Creative Specs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Specifications for creative assets
 */
export interface CreativeSpecs {
  /** Supported aspect ratios */
  aspectRatios?: string[];

  /** Minimum width in pixels */
  minWidth?: number;

  /** Maximum width in pixels */
  maxWidth?: number;

  /** Minimum height in pixels */
  minHeight?: number;

  /** Maximum height in pixels */
  maxHeight?: number;

  /** Recommended width in pixels */
  recommendedWidth?: number;

  /** Recommended height in pixels */
  recommendedHeight?: number;

  /** Maximum file size in bytes */
  maxFileSize?: number;

  /** Allowed file formats */
  allowedFormats?: string[];

  /** Minimum duration in seconds (for video) */
  minDuration?: number;

  /** Maximum duration in seconds (for video) */
  maxDuration?: number;

  /** Minimum bitrate in kbps (for video) */
  minBitrate?: number;

  /** Maximum bitrate in kbps (for video) */
  maxBitrate?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Storage provider type
 */
export type StorageProvider = "r2" | "s3" | "local";

/**
 * Configuration for asset storage
 */
export interface StorageConfig {
  /** Storage provider */
  provider: StorageProvider;

  /** Bucket name (for R2/S3) */
  bucket?: string;

  /** Region (for S3) */
  region?: string;

  /** Public URL prefix */
  publicUrl?: string;

  /** Maximum file size allowed */
  maxFileSize?: number;

  /** Allowed MIME types */
  allowedTypes?: string[];

  /** Signed URL expiry in seconds */
  signedUrlExpiry?: number;
}

/**
 * Result from uploading an asset
 */
export interface UploadResult {
  /** Storage key for the uploaded asset */
  storageKey: string;

  /** URL for accessing the asset */
  url: string;

  /** Public URL (if available) */
  publicUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Result Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result from analyzing an image
 */
export interface ImageAnalysisResult {
  /** Width in pixels */
  width: number;

  /** Height in pixels */
  height: number;

  /** Calculated aspect ratio */
  aspectRatio: string;

  /** File size in bytes */
  fileSize: number;

  /** MIME type */
  mimeType: string;

  /** Whether the image is animated (for GIFs) */
  isAnimated: boolean;
}

/**
 * Result from analyzing a video
 */
export interface VideoAnalysisResult {
  /** Width in pixels */
  width: number;

  /** Height in pixels */
  height: number;

  /** Calculated aspect ratio */
  aspectRatio: string;

  /** Duration in seconds */
  duration: number;

  /** File size in bytes */
  fileSize: number;

  /** MIME type */
  mimeType: string;

  /** Generated thumbnail URL (data URL) */
  thumbnailUrl: string;
}
