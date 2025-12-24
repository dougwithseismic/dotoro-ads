/**
 * Creatives Module
 *
 * Exports all creative asset types and utilities.
 */

// Export all types
export type {
  CreativeType,
  AssetSource,
  AssetSourceBlob,
  AssetSourceRemote,
  AssetSourceVariable,
  AssetSourceStored,
  AssetMetadata,
  ValidationError,
  ValidationWarning,
  AssetValidation,
  CreativeAsset,
  CarouselSlide,
  CarouselAsset,
  CarouselConfig,
  CreativeSpecs,
  StorageProvider,
  StorageConfig,
  UploadResult,
  ImageAnalysisResult,
  VideoAnalysisResult,
} from "./types.js";

// Export analysis functions
export {
  analyzeImage,
  analyzeVideo,
  calculateAspectRatio,
  mimeToFormat,
  formatFileSize,
  formatDuration,
  isImageMimeType,
  isVideoMimeType,
} from "./analyze.js";

// Export validation functions
export { validateAsset, isAspectRatioMatch } from "./validation.js";
