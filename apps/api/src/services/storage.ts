/**
 * Storage Service
 *
 * Provides S3-compatible storage operations for creative assets.
 * Supports AWS S3, Cloudflare R2, MinIO, and other S3-compatible services.
 */

import { formatBytes } from "@repo/core";

/**
 * Storage configuration from environment
 */
export interface StorageConfig {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  cdnUrl?: string;
}

/**
 * Presigned URL response
 */
export interface PresignedUrl {
  url: string;
  key: string;
  expiresAt: string;
}

/**
 * Object metadata
 */
export interface ObjectMetadata {
  contentType: string;
  size: number;
  etag: string;
  lastModified: Date;
}

/**
 * File size limits in bytes
 */
const FILE_SIZE_LIMITS = {
  image: 20 * 1024 * 1024, // 20MB
  video: 500 * 1024 * 1024, // 500MB
} as const;

/**
 * Allowed content types
 */
const ALLOWED_CONTENT_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif"],
  video: ["video/mp4", "video/quicktime"],
} as const;

/**
 * Default expiration times in seconds
 */
const DEFAULT_EXPIRATION = {
  upload: 15 * 60, // 15 minutes
  download: 60 * 60, // 1 hour
} as const;

/**
 * Storage service interface
 */
export interface StorageService {
  /**
   * Generate a presigned URL for uploading a file
   */
  generateUploadUrl(
    key: string,
    contentType: string,
    maxSize: number
  ): Promise<PresignedUrl>;

  /**
   * Generate a presigned URL for downloading a file
   */
  generateDownloadUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete an object from storage
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Get object metadata (HEAD request)
   */
  headObject(key: string): Promise<ObjectMetadata | null>;
}

/**
 * Check if a content type is an allowed image type
 */
function isImageContentType(contentType: string): boolean {
  const imageTypes: readonly string[] = ALLOWED_CONTENT_TYPES.image;
  return imageTypes.includes(contentType);
}

/**
 * Check if a content type is an allowed video type
 */
function isVideoContentType(contentType: string): boolean {
  const videoTypes: readonly string[] = ALLOWED_CONTENT_TYPES.video;
  return videoTypes.includes(contentType);
}

/**
 * Validate content type against allowed types
 */
function isAllowedContentType(contentType: string): boolean {
  return isImageContentType(contentType) || isVideoContentType(contentType);
}

/**
 * Get content type category
 */
function getContentTypeCategory(
  contentType: string
): "image" | "video" | null {
  if (isImageContentType(contentType)) {
    return "image";
  }
  if (isVideoContentType(contentType)) {
    return "video";
  }
  return null;
}

/**
 * Get max file size for content type
 */
function getMaxFileSize(contentType: string): number {
  const category = getContentTypeCategory(contentType);
  if (category === "video") {
    return FILE_SIZE_LIMITS.video;
  }
  return FILE_SIZE_LIMITS.image;
}

/**
 * Mock Storage Service for testing
 * Simulates S3 behavior in-memory
 */
export class MockStorageService implements StorageService {
  private objects: Map<string, ObjectMetadata> = new Map();
  private config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      endpoint: config?.endpoint ?? "http://localhost:9000",
      bucket: config?.bucket ?? "test-bucket",
      accessKey: config?.accessKey ?? "test-access",
      secretKey: config?.secretKey ?? "test-secret",
      region: config?.region ?? "auto",
      cdnUrl: config?.cdnUrl,
    };
  }

  async generateUploadUrl(
    key: string,
    contentType: string,
    maxSize: number
  ): Promise<PresignedUrl> {
    // Validate content type
    if (!isAllowedContentType(contentType)) {
      throw new Error(
        `Content type "${contentType}" is not allowed. Allowed types: ${[
          ...ALLOWED_CONTENT_TYPES.image,
          ...ALLOWED_CONTENT_TYPES.video,
        ].join(", ")}`
      );
    }

    // Validate file size
    const limit = getMaxFileSize(contentType);
    if (maxSize > limit) {
      throw new Error(
        `File size ${formatBytes(maxSize)} exceeds maximum ${formatBytes(limit)} for ${getContentTypeCategory(contentType)} files`
      );
    }

    const expiresAt = new Date(
      Date.now() + DEFAULT_EXPIRATION.upload * 1000
    ).toISOString();

    return {
      url: `${this.config.endpoint}/presigned/upload/${this.config.bucket}/${key}?contentType=${encodeURIComponent(contentType)}&maxSize=${maxSize}`,
      key,
      expiresAt,
    };
  }

  async generateDownloadUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRATION.download
  ): Promise<string> {
    // For registered creatives, generate URL even if object might be temporarily unavailable
    // The storage service can still generate a signed URL for a key
    if (this.config.cdnUrl) {
      return `${this.config.cdnUrl}/${key}`;
    }

    return `${this.config.endpoint}/presigned/download/${this.config.bucket}/${key}?expires=${expiresIn}`;
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async headObject(key: string): Promise<ObjectMetadata | null> {
    return this.objects.get(key) ?? null;
  }

  /**
   * Simulate a successful upload (for testing)
   */
  simulateUpload(key: string, metadata: ObjectMetadata): void {
    this.objects.set(key, metadata);
  }

  /**
   * Clear all objects (for testing)
   */
  clear(): void {
    this.objects.clear();
  }
}

/**
 * S3 Storage Service implementation
 * Uses AWS SDK for S3-compatible operations
 */
export class S3StorageService implements StorageService {
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  async generateUploadUrl(
    key: string,
    contentType: string,
    maxSize: number
  ): Promise<PresignedUrl> {
    // Validate content type
    if (!isAllowedContentType(contentType)) {
      throw new Error(
        `Content type "${contentType}" is not allowed. Allowed types: ${[
          ...ALLOWED_CONTENT_TYPES.image,
          ...ALLOWED_CONTENT_TYPES.video,
        ].join(", ")}`
      );
    }

    // Validate file size
    const limit = getMaxFileSize(contentType);
    if (maxSize > limit) {
      throw new Error(
        `File size exceeds maximum ${limit} bytes for ${getContentTypeCategory(contentType)} files`
      );
    }

    // In a real implementation, this would use the AWS SDK:
    // import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
    // import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
    //
    // const client = new S3Client({
    //   endpoint: this.config.endpoint,
    //   region: this.config.region ?? "auto",
    //   credentials: {
    //     accessKeyId: this.config.accessKey,
    //     secretAccessKey: this.config.secretKey,
    //   },
    // });
    //
    // const command = new PutObjectCommand({
    //   Bucket: this.config.bucket,
    //   Key: key,
    //   ContentType: contentType,
    //   ContentLength: maxSize,
    // });
    //
    // const url = await getSignedUrl(client, command, {
    //   expiresIn: DEFAULT_EXPIRATION.upload,
    // });

    const expiresAt = new Date(
      Date.now() + DEFAULT_EXPIRATION.upload * 1000
    ).toISOString();

    // WARNING: This returns a placeholder URL. Install @aws-sdk/client-s3
    // and implement actual S3 presigned URL generation for production use.
    console.warn(
      "S3StorageService.generateUploadUrl: Returning placeholder URL. " +
        "Install @aws-sdk/client-s3 for production use."
    );
    return {
      url: `${this.config.endpoint}/${this.config.bucket}/${key}?presigned=true`,
      key,
      expiresAt,
    };
  }

  async generateDownloadUrl(
    key: string,
    expiresIn: number = DEFAULT_EXPIRATION.download
  ): Promise<string> {
    // If CDN URL is configured, use it for delivery
    if (this.config.cdnUrl) {
      return `${this.config.cdnUrl}/${key}`;
    }

    // WARNING: This returns a placeholder URL. Install @aws-sdk/client-s3
    // and implement actual S3 presigned URL generation for production use.
    console.warn(
      "S3StorageService.generateDownloadUrl: Returning placeholder URL. " +
        "Install @aws-sdk/client-s3 for production use."
    );
    return `${this.config.endpoint}/${this.config.bucket}/${key}?presigned=true&expires=${expiresIn}`;
  }

  async deleteObject(key: string): Promise<void> {
    throw new Error(
      "S3StorageService.deleteObject not implemented. " +
        "Install @aws-sdk/client-s3 and implement S3 operations, " +
        "or use MockStorageService for development."
    );
  }

  async headObject(key: string): Promise<ObjectMetadata | null> {
    throw new Error(
      "S3StorageService.headObject not implemented. " +
        "Install @aws-sdk/client-s3 and implement S3 operations, " +
        "or use MockStorageService for development."
    );
  }
}

/**
 * Get storage configuration from environment
 */
export function getStorageConfigFromEnv(): StorageConfig | null {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  const accessKey = process.env.STORAGE_ACCESS_KEY;
  const secretKey = process.env.STORAGE_SECRET_KEY;

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    return null;
  }

  return {
    endpoint,
    bucket,
    accessKey,
    secretKey,
    region: process.env.STORAGE_REGION ?? "auto",
    cdnUrl: process.env.CDN_URL,
  };
}

/**
 * Create a storage service instance
 */
export function createStorageService(
  config?: StorageConfig,
  useMock: boolean = false
): StorageService {
  // In test environment, always use mock
  if (process.env.NODE_ENV === "test") {
    return new MockStorageService(config);
  }

  // If explicitly requested, use mock
  if (useMock) {
    return new MockStorageService(config);
  }

  // If no config provided, try environment
  const effectiveConfig = config ?? getStorageConfigFromEnv();

  if (!effectiveConfig) {
    // In production, fail fast - no silent fallback
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Storage configuration required in production. " +
          "Set STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY."
      );
    }
    // In development, warn and use mock
    console.warn(
      "No storage configuration found - using mock service (dev only)"
    );
    return new MockStorageService();
  }

  return new S3StorageService(effectiveConfig);
}

/**
 * Singleton storage service instance
 */
let storageInstance: StorageService | null = null;

/**
 * Get the storage service singleton
 */
export function getStorageService(): StorageService {
  if (!storageInstance) {
    const config = getStorageConfigFromEnv();
    // createStorageService handles environment-specific logic
    storageInstance = createStorageService(config ?? undefined, false);
  }
  return storageInstance;
}

/**
 * Reset storage service (for testing)
 */
export function resetStorageService(): void {
  storageInstance = null;
}

/**
 * Get allowed content types
 */
export function getAllowedContentTypes(): {
  image: readonly string[];
  video: readonly string[];
} {
  return ALLOWED_CONTENT_TYPES;
}

/**
 * Get file size limits
 */
export function getFileSizeLimits(): { image: number; video: number } {
  return { ...FILE_SIZE_LIMITS };
}
