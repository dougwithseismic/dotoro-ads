/**
 * Upload Service
 *
 * High-level service for uploading assets to storage.
 * Handles key generation, content type detection, and metadata.
 */

import type { StorageProvider, StorageUploadResult } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for uploading an asset
 */
export interface UploadAssetOptions {
  /** Content type of the file */
  contentType?: string;

  /** Original file name (used for key generation) */
  fileName?: string;

  /** Custom storage key (overrides key generation) */
  key?: string;

  /** Prefix for generated keys */
  keyPrefix?: string;

  /** Custom metadata to attach */
  metadata?: Record<string, string>;

  /** Whether the file should be publicly accessible */
  public?: boolean;
}

/**
 * Options for uploading from URL
 */
export interface UploadFromUrlOptions extends UploadAssetOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Type Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map of file extensions to MIME types
 */
const EXTENSION_MIME_MAP: Record<string, string> = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",

  // Videos
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  mkv: "video/x-matroska",

  // Documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Text
  txt: "text/plain",
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv",

  // Archives
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  rar: "application/vnd.rar",
};

/**
 * Map of MIME types to file extensions
 */
const MIME_EXTENSION_MAP: Record<string, string> = Object.entries(
  EXTENSION_MIME_MAP
).reduce(
  (acc, [ext, mime]) => {
    if (!acc[mime]) {
      acc[mime] = ext;
    }
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Get MIME type from file extension
 */
function getMimeFromExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return "application/octet-stream";
  return EXTENSION_MIME_MAP[ext] ?? "application/octet-stream";
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string | undefined {
  return MIME_EXTENSION_MAP[mimeType];
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique storage key
 */
function generateStorageKey(options: {
  fileName?: string;
  prefix?: string;
  extension?: string;
}): string {
  const { fileName, prefix, extension } = options;

  // Generate timestamp and random components
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);

  // Extract base name and extension from fileName
  let baseName = "file";
  let ext = extension;

  if (fileName) {
    const parts = fileName.split(".");
    if (parts.length > 1) {
      ext = parts.pop();
      baseName = parts.join(".");
    } else {
      baseName = fileName;
    }
  }

  // Sanitize base name
  baseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);

  // Build key
  const keyParts = [];

  if (prefix) {
    keyParts.push(prefix);
  }

  keyParts.push(`${timestamp}-${random}-${baseName}`);

  let key = keyParts.join("/");

  if (ext) {
    key += `.${ext}`;
  }

  return key;
}

/**
 * Extract filename from URL
 */
function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split("/");
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && lastSegment.includes(".")) {
      return lastSegment;
    }

    return "download";
  } catch {
    return "download";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Service for uploading assets to storage
 *
 * Provides a high-level interface for:
 * - Uploading buffers with automatic key generation
 * - Downloading and uploading from URLs
 * - Content type detection
 * - Metadata management
 *
 * @example
 * ```typescript
 * const provider = new MemoryStorageProvider();
 * const service = new UploadService(provider);
 *
 * // Upload a buffer
 * const result = await service.uploadAsset(buffer, {
 *   contentType: 'image/png',
 *   fileName: 'photo.png',
 * });
 *
 * // Upload from URL
 * const result = await service.uploadFromUrl('https://example.com/image.png');
 * ```
 */
export class UploadService {
  constructor(private readonly storage: StorageProvider) {}

  /**
   * Upload a buffer or File to storage
   *
   * @param file - Buffer or File to upload
   * @param options - Upload options
   * @returns Upload result with storage key and URLs
   */
  async uploadAsset(
    file: File | Buffer,
    options: UploadAssetOptions = {}
  ): Promise<StorageUploadResult> {
    const { key, keyPrefix, fileName, contentType, metadata, public: isPublic } = options;

    // Determine content type
    let resolvedContentType = contentType;
    if (!resolvedContentType && fileName) {
      resolvedContentType = getMimeFromExtension(fileName);
    }
    if (!resolvedContentType && file instanceof File) {
      resolvedContentType = file.type || getMimeFromExtension(file.name);
    }
    resolvedContentType = resolvedContentType ?? "application/octet-stream";

    // Determine storage key
    let storageKey = key;
    if (!storageKey) {
      const extension = getExtensionFromMime(resolvedContentType);
      storageKey = generateStorageKey({
        fileName: fileName ?? (file instanceof File ? file.name : undefined),
        prefix: keyPrefix,
        extension,
      });
    }

    // Upload to storage
    return this.storage.upload(file, storageKey, {
      contentType: resolvedContentType,
      metadata,
      public: isPublic,
      fileName,
    });
  }

  /**
   * Download content from a URL and upload to storage
   *
   * @param url - URL to download from
   * @param options - Upload options
   * @returns Upload result with storage key and URLs
   */
  async uploadFromUrl(
    url: string,
    options: UploadFromUrlOptions = {}
  ): Promise<StorageUploadResult> {
    const { timeout = 30000, key, keyPrefix, contentType, metadata, public: isPublic } = options;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Fetch the URL
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch URL: ${response.status} ${response.statusText}`
        );
      }

      // Get content type from response headers
      const responseContentType =
        response.headers.get("content-type") ?? undefined;
      const resolvedContentType = contentType ?? responseContentType ?? "application/octet-stream";

      // Get content as buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine storage key
      let storageKey = key;
      if (!storageKey) {
        const fileName = options.fileName ?? getFilenameFromUrl(url);
        const extension = getExtensionFromMime(resolvedContentType);
        storageKey = generateStorageKey({
          fileName,
          prefix: keyPrefix,
          extension,
        });
      }

      // Upload to storage
      return this.storage.upload(buffer, storageKey, {
        contentType: resolvedContentType,
        metadata: {
          ...metadata,
          sourceUrl: url,
        },
        public: isPublic,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`URL download timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Delete an asset from storage
   *
   * @param storageKey - Storage key of the asset to delete
   */
  async deleteAsset(storageKey: string): Promise<void> {
    await this.storage.delete(storageKey);
  }

  /**
   * Get a URL for accessing an asset
   *
   * Returns a signed URL with temporary access.
   *
   * @param storageKey - Storage key of the asset
   * @param expiresIn - URL expiry time in seconds
   * @returns Signed URL for the asset
   */
  async getAssetUrl(storageKey: string, expiresIn?: number): Promise<string> {
    return this.storage.getSignedUrl(storageKey, expiresIn);
  }

  /**
   * Check if an asset exists
   *
   * @param storageKey - Storage key to check
   * @returns True if the asset exists
   */
  async assetExists(storageKey: string): Promise<boolean> {
    return this.storage.exists(storageKey);
  }

  /**
   * Copy an asset to a new location
   *
   * @param sourceKey - Source storage key
   * @param destinationKey - Destination storage key (optional, generates if not provided)
   * @returns Upload result for the copied asset
   */
  async copyAsset(
    sourceKey: string,
    destinationKey?: string
  ): Promise<StorageUploadResult> {
    const destKey =
      destinationKey ??
      generateStorageKey({
        fileName: sourceKey.split("/").pop(),
      });

    return this.storage.copy(sourceKey, destKey);
  }
}
