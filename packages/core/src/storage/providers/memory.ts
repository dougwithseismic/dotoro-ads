/**
 * Memory Storage Provider
 *
 * An in-memory implementation of the StorageProvider interface.
 * Useful for testing and development without external dependencies.
 */

import type { AssetMetadata } from "../../creatives/types.js";
import {
  type StorageProvider,
  type StorageConfig,
  type UploadOptions,
  type StorageUploadResult,
  type StorageFileInfo,
  type ListOptions,
  type ListResult,
  FileNotFoundError,
  FileTooLargeError,
  InvalidFileTypeError,
} from "../types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types
// ─────────────────────────────────────────────────────────────────────────────

interface StoredFile {
  data: Buffer;
  contentType: string;
  metadata: Record<string, string>;
  uploadedAt: Date;
  isPublic: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Storage Provider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory storage provider for testing and development
 *
 * Features:
 * - Full StorageProvider interface implementation
 * - No external dependencies
 * - Simulated signed URLs
 * - File size and type constraints
 * - Clear method for test cleanup
 *
 * @example
 * ```typescript
 * const provider = new MemoryStorageProvider();
 *
 * // Upload a file
 * const result = await provider.upload(
 *   Buffer.from('hello'),
 *   'test/hello.txt',
 *   { contentType: 'text/plain' }
 * );
 *
 * // Retrieve the file
 * const content = await provider.get(result.storageKey);
 * console.log(content.toString()); // 'hello'
 *
 * // Clean up
 * provider.clear();
 * ```
 */
export class MemoryStorageProvider implements StorageProvider {
  private storage: Map<string, StoredFile>;
  private readonly config: Partial<StorageConfig>;
  private readonly baseUrl: string;

  constructor(config: Partial<StorageConfig> = {}) {
    this.storage = new Map();
    this.config = config;
    this.baseUrl = config.publicUrl ?? "memory://storage";
  }

  /**
   * Number of files currently stored
   */
  get size(): number {
    return this.storage.size;
  }

  /**
   * Upload a file to memory storage
   */
  async upload(
    file: File | Buffer,
    key: string,
    options: UploadOptions = {}
  ): Promise<StorageUploadResult> {
    // Convert File to Buffer if needed
    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else {
      // File type - use arrayBuffer method
      const arrayBuffer = await (file as File).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Validate file size
    if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
      throw new FileTooLargeError(key, buffer.length, this.config.maxFileSize);
    }

    // Determine content type
    const contentType =
      options.contentType ??
      (!Buffer.isBuffer(file) ? (file as File).type : undefined) ??
      "application/octet-stream";

    // Validate MIME type
    if (
      this.config.allowedMimeTypes &&
      !this.config.allowedMimeTypes.includes(contentType)
    ) {
      throw new InvalidFileTypeError(
        key,
        contentType,
        this.config.allowedMimeTypes
      );
    }

    const uploadedAt = new Date();

    // Store the file
    this.storage.set(key, {
      data: buffer,
      contentType,
      metadata: options.metadata ?? {},
      uploadedAt,
      isPublic: options.public ?? false,
    });

    // Build result
    const url = `${this.baseUrl}/${key}`;
    const result: StorageUploadResult = {
      storageKey: key,
      url,
      size: buffer.length,
      contentType,
      uploadedAt,
      metadata: {
        fileSize: buffer.length,
        mimeType: contentType,
        fileName: options.fileName ?? key.split("/").pop(),
      },
    };

    if (options.public) {
      result.publicUrl = url;
    }

    return result;
  }

  /**
   * Delete a file from memory storage
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * Get a signed URL for a file
   *
   * In memory provider, this simulates signed URLs with query parameters.
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    if (!this.storage.has(key)) {
      throw new FileNotFoundError(key);
    }

    const expiry = expiresIn ?? this.config.signedUrlExpiry ?? 3600;
    const expiresAt = Date.now() + expiry * 1000;
    const signature = this.generateSignature(key, expiresAt);

    return `${this.baseUrl}/${key}?expires=${expiresAt}&signature=${signature}`;
  }

  /**
   * Check if a file exists in storage
   */
  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  /**
   * Get metadata for a stored file
   */
  async getMetadata(key: string): Promise<AssetMetadata | null> {
    const stored = this.storage.get(key);
    if (!stored) {
      return null;
    }

    return {
      fileSize: stored.data.length,
      mimeType: stored.contentType,
      fileName: key.split("/").pop(),
    };
  }

  /**
   * Get detailed file information
   */
  async getFileInfo(key: string): Promise<StorageFileInfo | null> {
    const stored = this.storage.get(key);
    if (!stored) {
      return null;
    }

    return {
      key,
      size: stored.data.length,
      contentType: stored.contentType,
      lastModified: stored.uploadedAt,
      metadata: stored.metadata,
    };
  }

  /**
   * Get file contents as Buffer
   */
  async get(key: string): Promise<Buffer | null> {
    const stored = this.storage.get(key);
    if (!stored) {
      return null;
    }

    return stored.data;
  }

  /**
   * List files in storage
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    const { prefix, limit, cursor } = options;

    // Get all keys and sort them for consistent ordering
    let keys = Array.from(this.storage.keys()).sort();

    // Filter by prefix
    if (prefix) {
      keys = keys.filter((key) => key.startsWith(prefix));
    }

    // Handle cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = keys.findIndex((key) => key === cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    // Apply limit
    const endIndex = limit ? startIndex + limit : keys.length;
    const pageKeys = keys.slice(startIndex, endIndex);

    // Build file info list
    const files: StorageFileInfo[] = pageKeys.map((key) => {
      const stored = this.storage.get(key)!;
      return {
        key,
        size: stored.data.length,
        contentType: stored.contentType,
        lastModified: stored.uploadedAt,
        metadata: stored.metadata,
      };
    });

    // Determine if there are more results
    const hasMore = endIndex < keys.length;
    const nextCursor = hasMore ? pageKeys[pageKeys.length - 1] : undefined;

    return {
      files,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Copy a file to a new location
   */
  async copy(
    sourceKey: string,
    destinationKey: string
  ): Promise<StorageUploadResult> {
    const stored = this.storage.get(sourceKey);
    if (!stored) {
      throw new FileNotFoundError(sourceKey);
    }

    // Upload to new location with same content and metadata
    return this.upload(stored.data, destinationKey, {
      contentType: stored.contentType,
      metadata: { ...stored.metadata },
      public: stored.isPublic,
    });
  }

  /**
   * Clear all files from storage
   *
   * Useful for test cleanup.
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Generate a simulated signature for signed URLs
   */
  private generateSignature(key: string, expiresAt: number): string {
    // Simple hash simulation for testing
    const data = `${key}:${expiresAt}:memory-secret`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
