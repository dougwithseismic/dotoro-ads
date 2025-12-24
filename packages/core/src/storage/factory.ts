/**
 * Storage Factory
 *
 * Creates storage providers based on configuration.
 * Supports memory and local providers out of the box.
 * Cloud providers (R2, S3) require separate packages.
 */

import {
  type StorageConfig,
  type StorageProvider,
  ProviderNotConfiguredError,
} from "./types.js";
import { MemoryStorageProvider } from "./providers/memory.js";
import { LocalStorageProvider } from "./providers/local.js";

/**
 * Create a storage provider based on the provided configuration
 *
 * @param config - Storage configuration specifying provider type and options
 * @returns A configured StorageProvider instance
 * @throws ProviderNotConfiguredError for cloud providers (r2, s3)
 *
 * @example Memory provider (for testing)
 * ```typescript
 * const provider = createStorageProvider({ provider: 'memory' });
 * ```
 *
 * @example Local file system provider
 * ```typescript
 * const provider = createStorageProvider({
 *   provider: 'local',
 *   basePath: './uploads',
 *   publicUrl: 'http://localhost:3000/uploads',
 * });
 * ```
 *
 * @example Cloud provider (requires separate package)
 * ```typescript
 * // This will throw - use @dotoro/storage-cloud for cloud providers
 * const provider = createStorageProvider({
 *   provider: 'r2',
 *   bucket: 'my-bucket',
 * });
 * ```
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case "memory":
      return new MemoryStorageProvider({
        maxFileSize: config.maxFileSize,
        allowedMimeTypes: config.allowedMimeTypes,
        publicUrl: config.publicUrl,
        signedUrlExpiry: config.signedUrlExpiry,
      });

    case "local":
      return new LocalStorageProvider({
        basePath: config.basePath,
        publicUrl: config.publicUrl,
        maxFileSize: config.maxFileSize,
        allowedMimeTypes: config.allowedMimeTypes,
        signedUrlExpiry: config.signedUrlExpiry,
      });

    case "r2":
      throw new ProviderNotConfiguredError("r2");

    case "s3":
      throw new ProviderNotConfiguredError("s3");

    default: {
      // Exhaustive check - TypeScript will error if we miss a case
      const exhaustiveCheck: never = config.provider;
      throw new Error(`Unknown storage provider: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Type guard to check if a provider supports cloud features
 *
 * Useful for determining if signed URLs with real signatures
 * are available vs simulated ones.
 */
export function isCloudProvider(
  config: StorageConfig
): config is StorageConfig & { provider: "r2" | "s3" } {
  return config.provider === "r2" || config.provider === "s3";
}

/**
 * Type guard to check if a provider is a local provider
 */
export function isLocalProvider(
  config: StorageConfig
): config is StorageConfig & { provider: "local" | "memory" } {
  return config.provider === "local" || config.provider === "memory";
}
