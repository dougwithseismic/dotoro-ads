/**
 * Storage Abstraction Types
 *
 * Defines interfaces for asset storage providers, supporting
 * multiple backends (memory, local file system, R2, S3).
 */

import type { AssetMetadata } from "../creatives/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Storage Provider Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported storage provider types
 */
export type StorageProviderType = "r2" | "s3" | "local" | "memory";

/**
 * Configuration for storage providers
 */
export interface StorageConfig {
  /** Storage provider type */
  provider: StorageProviderType;

  /** Bucket name (for R2/S3) */
  bucket?: string;

  /** Region (for S3) */
  region?: string;

  /** Base path for local storage */
  basePath?: string;

  /** Public URL prefix for serving assets */
  publicUrl?: string;

  /** Signed URL expiry time in seconds */
  signedUrlExpiry?: number;

  /** Maximum file size allowed in bytes */
  maxFileSize?: number;

  /** Allowed MIME types */
  allowedMimeTypes?: string[];
}

/**
 * Options for upload operations
 */
export interface UploadOptions {
  /** Content type of the file */
  contentType?: string;

  /** Custom metadata to attach to the file */
  metadata?: Record<string, string>;

  /** Whether the file should be publicly accessible */
  public?: boolean;

  /** Custom file name (overrides generated key) */
  fileName?: string;
}

/**
 * Result of an upload operation
 */
export interface StorageUploadResult {
  /** Unique storage key for the uploaded file */
  storageKey: string;

  /** URL to access the file (may be signed or public) */
  url: string;

  /** Public URL if the file is publicly accessible */
  publicUrl?: string;

  /** Metadata extracted or attached to the file */
  metadata?: AssetMetadata;

  /** Size of the uploaded file in bytes */
  size: number;

  /** Content type of the uploaded file */
  contentType: string;

  /** Timestamp when the file was uploaded */
  uploadedAt: Date;
}

/**
 * Information about a stored file
 */
export interface StorageFileInfo {
  /** Storage key */
  key: string;

  /** File size in bytes */
  size: number;

  /** Content type */
  contentType: string;

  /** Last modified timestamp */
  lastModified: Date;

  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Options for listing files
 */
export interface ListOptions {
  /** Prefix to filter files by */
  prefix?: string;

  /** Maximum number of files to return */
  limit?: number;

  /** Cursor for pagination */
  cursor?: string;
}

/**
 * Result of a list operation
 */
export interface ListResult {
  /** List of files */
  files: StorageFileInfo[];

  /** Cursor for next page, if more results exist */
  nextCursor?: string;

  /** Whether there are more results */
  hasMore: boolean;
}

/**
 * Storage provider interface
 *
 * All storage backends must implement this interface to ensure
 * consistent behavior across different storage solutions.
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   *
   * @param file - File or Buffer to upload
   * @param key - Storage key (path) for the file
   * @param options - Upload options
   * @returns Upload result with storage key and URLs
   */
  upload(
    file: File | Buffer,
    key: string,
    options?: UploadOptions
  ): Promise<StorageUploadResult>;

  /**
   * Delete a file from storage
   *
   * @param key - Storage key of the file to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Get a signed URL for temporary access
   *
   * @param key - Storage key of the file
   * @param expiresIn - Expiry time in seconds (default from config)
   * @returns Signed URL for accessing the file
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Check if a file exists in storage
   *
   * @param key - Storage key to check
   * @returns True if the file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get metadata for a stored file
   *
   * @param key - Storage key of the file
   * @returns File metadata or null if not found
   */
  getMetadata(key: string): Promise<AssetMetadata | null>;

  /**
   * Get detailed file information
   *
   * @param key - Storage key of the file
   * @returns File info or null if not found
   */
  getFileInfo(key: string): Promise<StorageFileInfo | null>;

  /**
   * Get file contents
   *
   * @param key - Storage key of the file
   * @returns File contents as Buffer or null if not found
   */
  get(key: string): Promise<Buffer | null>;

  /**
   * List files in storage
   *
   * @param options - List options for filtering and pagination
   * @returns List result with files and pagination info
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Copy a file to a new location
   *
   * @param sourceKey - Source storage key
   * @param destinationKey - Destination storage key
   * @returns Upload result for the copied file
   */
  copy(sourceKey: string, destinationKey: string): Promise<StorageUploadResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Errors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base error for storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly key?: string
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Error thrown when a file is not found
 */
export class FileNotFoundError extends StorageError {
  constructor(key: string) {
    super(`File not found: ${key}`, "FILE_NOT_FOUND", key);
    this.name = "FileNotFoundError";
  }
}

/**
 * Error thrown when a file exceeds size limits
 */
export class FileTooLargeError extends StorageError {
  constructor(key: string, size: number, maxSize: number) {
    super(
      `File too large: ${size} bytes exceeds maximum of ${maxSize} bytes`,
      "FILE_TOO_LARGE",
      key
    );
    this.name = "FileTooLargeError";
  }
}

/**
 * Error thrown when a file type is not allowed
 */
export class InvalidFileTypeError extends StorageError {
  constructor(key: string, mimeType: string, allowedTypes: string[]) {
    super(
      `Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(", ")}`,
      "INVALID_FILE_TYPE",
      key
    );
    this.name = "InvalidFileTypeError";
  }
}

/**
 * Error thrown when storage provider is not configured
 */
export class ProviderNotConfiguredError extends StorageError {
  constructor(provider: string) {
    super(
      `Storage provider '${provider}' is not configured. Install the required package.`,
      "PROVIDER_NOT_CONFIGURED"
    );
    this.name = "ProviderNotConfiguredError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique storage key
 */
export type KeyGenerator = (
  file: File | Buffer,
  options?: UploadOptions
) => string;

/**
 * Default key generator options
 */
export interface KeyGeneratorOptions {
  /** Prefix for all keys */
  prefix?: string;

  /** Include timestamp in key */
  includeTimestamp?: boolean;

  /** Include random suffix for uniqueness */
  includeRandomSuffix?: boolean;
}
