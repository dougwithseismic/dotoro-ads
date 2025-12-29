/**
 * Carousel Templates Module
 *
 * Provides types, validation, and utilities for carousel ad templates.
 */

// Types
export type {
  CarouselMode,
  CarouselPlatform,
  CarouselPlatformConstraints,
  CarouselCard,
  CarouselTemplate,
  CarouselValidationError,
  CarouselValidationResult,
  CarouselOutput,
  CarouselOutputCard,
  FacebookCarouselFormat,
  RedditCarouselFormat,
  FabricCanvasJson,
  FabricObjectJson,
  FabricCanvasJSON,
  FabricObjectJSON,
} from "./types.js";

// Constants
export { CAROUSEL_PLATFORM_CONSTRAINTS } from "./types.js";

// Type Guards
export {
  isDataDrivenMode,
  isManualMode,
  isValidCarouselPlatform,
} from "./types.js";

// Factory Functions
export {
  createCarouselTemplate,
  createEmptyCanvasJson,
  createCarouselCard,
  generateCardId,
} from "./types.js";

// Zod Schemas
export {
  fabricObjectJsonSchema,
  fabricCanvasJsonSchema,
  carouselModeSchema,
  carouselPlatformSchema,
  carouselPlatformConstraintsSchema,
  carouselCardSchema,
  carouselTemplateSchema,
} from "./types.js";

// Validation
export {
  validateCarousel,
  validateCardCount,
  validateCard,
  validateCardDimensions,
  validateCardOrder,
  getCarouselConstraints,
  canAddCard,
  canRemoveCard,
  validateDataRowSelection,
} from "./validation.js";
