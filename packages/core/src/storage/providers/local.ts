/**
 * Local Storage Provider
 *
 * A file system-based implementation of the StorageProvider interface.
 * Stores files on the local file system with metadata in sidecar JSON files.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
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

interface FileMetadata {
  contentType: string;
  metadata: Record<string, string>;
  uploadedAt: string;
  isPublic: boolean;
  size: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Storage Provider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * File system storage provider for local development
 *
 * Features:
 * - Full StorageProvider interface implementation
 * - Metadata stored in sidecar .meta.json files
 * - Automatic directory creation
 * - File size and type constraints
 * - Public URL support when configured
 *
 * @example
 * ```typescript
 * const provider = new LocalStorageProvider({
 *   basePath: './uploads',
 *   publicUrl: 'http://localhost:3000/uploads',
 * });
 *
 * // Upload a file
 * const result = await provider.upload(
 *   Buffer.from('hello'),
 *   'docs/hello.txt',
 *   { contentType: 'text/plain' }
 * );
 *
 * // File is stored at ./uploads/docs/hello.txt
 * // Metadata at ./uploads/docs/hello.txt.meta.json
 * ```
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;
  private readonly config: Partial<StorageConfig>;

  constructor(config: Partial<StorageConfig> = {}) {
    this.basePath = config.basePath ?? "./storage";
    this.config = config;
  }

  /**
   * Get the full file path for a storage key
   */
  private getFilePath(key: string): string {
    return path.join(this.basePath, key);
  }

  /**
   * Get the metadata file path for a storage key
   */
  private getMetaPath(key: string): string {
    return this.getFilePath(key) + ".meta.json";
  }

  /**
   * Ensure directory exists for a file path
   */
  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Read metadata from sidecar file
   */
  private async readMetaFile(key: string): Promise<FileMetadata | null> {
    try {
      const metaPath = this.getMetaPath(key);
      const content = await fs.readFile(metaPath, "utf-8");
      return JSON.parse(content) as FileMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Write metadata to sidecar file
   */
  private async writeMetaFile(
    key: string,
    metadata: FileMetadata
  ): Promise<void> {
    const metaPath = this.getMetaPath(key);
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Upload a file to local storage
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

    const filePath = this.getFilePath(key);
    await this.ensureDir(filePath);

    // Write file content
    await fs.writeFile(filePath, buffer);

    const uploadedAt = new Date();

    // Write metadata
    const metadata: FileMetadata = {
      contentType,
      metadata: options.metadata ?? {},
      uploadedAt: uploadedAt.toISOString(),
      isPublic: options.public ?? false,
      size: buffer.length,
    };
    await this.writeMetaFile(key, metadata);

    // Build result
    const url = `file://${filePath}`;
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

    if (options.public && this.config.publicUrl) {
      result.publicUrl = `${this.config.publicUrl}/${key}`;
    }

    return result;
  }

  /**
   * Delete a file from local storage
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      await fs.unlink(filePath).catch(() => {
        // Ignore error if file doesn't exist
      });
      await fs.unlink(metaPath).catch(() => {
        // Ignore error if meta doesn't exist
      });
    } catch {
      // Ignore errors when deleting non-existent files
    }
  }

  /**
   * Get a signed URL for a file
   *
   * For local storage, this returns a file:// URL since there's no
   * actual signing mechanism needed.
   */
  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    if (!(await this.exists(key))) {
      throw new FileNotFoundError(key);
    }

    const filePath = this.getFilePath(key);
    return `file://${filePath}`;
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get metadata for a stored file
   */
  async getMetadata(key: string): Promise<AssetMetadata | null> {
    const meta = await this.readMetaFile(key);
    if (!meta) {
      return null;
    }

    return {
      fileSize: meta.size,
      mimeType: meta.contentType,
      fileName: key.split("/").pop(),
    };
  }

  /**
   * Get detailed file information
   */
  async getFileInfo(key: string): Promise<StorageFileInfo | null> {
    const meta = await this.readMetaFile(key);
    if (!meta) {
      return null;
    }

    return {
      key,
      size: meta.size,
      contentType: meta.contentType,
      lastModified: new Date(meta.uploadedAt),
      metadata: meta.metadata,
    };
  }

  /**
   * Get file contents as Buffer
   */
  async get(key: string): Promise<Buffer | null> {
    try {
      const filePath = this.getFilePath(key);
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  /**
   * List files in storage
   *
   * Note: This implementation loads all files into memory before pagination.
   * Not suitable for directories with >10,000 files in production.
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    const { prefix, limit, cursor } = options;

    const allFiles: StorageFileInfo[] = [];

    // Recursively find all files
    const findFiles = async (dir: string, relativePath = ""): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          const relPath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name;

          if (entry.isDirectory()) {
            await findFiles(entryPath, relPath);
          } else if (!entry.name.endsWith(".meta.json")) {
            // Only include non-metadata files
            const meta = await this.readMetaFile(relPath);
            if (meta) {
              allFiles.push({
                key: relPath,
                size: meta.size,
                contentType: meta.contentType,
                lastModified: new Date(meta.uploadedAt),
                metadata: meta.metadata,
              });
            }
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    };

    await findFiles(this.basePath);

    // Sort by key for consistent ordering
    allFiles.sort((a, b) => a.key.localeCompare(b.key));

    // Filter by prefix
    let filteredFiles = allFiles;
    if (prefix) {
      filteredFiles = allFiles.filter((f) => f.key.startsWith(prefix));
    }

    // Handle cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = filteredFiles.findIndex((f) => f.key === cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    // Apply limit
    const endIndex = limit ? startIndex + limit : filteredFiles.length;
    const pageFiles = filteredFiles.slice(startIndex, endIndex);

    // Determine if there are more results
    const hasMore = endIndex < filteredFiles.length;
    const nextCursor = hasMore
      ? pageFiles[pageFiles.length - 1]?.key
      : undefined;

    return {
      files: pageFiles,
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
    const content = await this.get(sourceKey);
    if (!content) {
      throw new FileNotFoundError(sourceKey);
    }

    const meta = await this.readMetaFile(sourceKey);
    if (!meta) {
      throw new FileNotFoundError(sourceKey);
    }

    return this.upload(content, destinationKey, {
      contentType: meta.contentType,
      metadata: { ...meta.metadata },
      public: meta.isPublic,
    });
  }
}
