/**
 * Storage Module
 *
 * Exports all storage types, providers, and utilities.
 */

// Export all types
export type {
  StorageProviderType,
  StorageConfig,
  UploadOptions,
  StorageUploadResult,
  StorageFileInfo,
  ListOptions,
  ListResult,
  StorageProvider,
  KeyGenerator,
  KeyGeneratorOptions,
} from "./types.js";

// Export errors
export {
  StorageError,
  FileNotFoundError,
  FileTooLargeError,
  InvalidFileTypeError,
  ProviderNotConfiguredError,
} from "./types.js";

// Export providers
export { MemoryStorageProvider } from "./providers/memory.js";
export { LocalStorageProvider } from "./providers/local.js";

// Export factory
export {
  createStorageProvider,
  isCloudProvider,
  isLocalProvider,
} from "./factory.js";

// Export upload service
export {
  UploadService,
  type UploadAssetOptions,
  type UploadFromUrlOptions,
} from "./upload-service.js";

// Export library types
export type {
  AssetType,
  AssetLibraryItem,
  AssetFolder,
  AssetSortField,
  SortDirection,
  AssetListOptions,
  AssetListResult,
  FolderListOptions,
  AssetLibrary,
  AssetLibraryEvent,
  AssetLibraryEventListener,
  ObservableAssetLibrary,
} from "./library.js";
