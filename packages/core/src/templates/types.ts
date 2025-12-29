/**
 * Carousel Template Types
 *
 * Type definitions for carousel ad templates supporting both data-driven
 * and manual per-card design modes.
 */

import { z } from "zod";

// ============================================================================
// Fabric.js Canvas JSON Types (shared with design-templates schema)
// ============================================================================

/**
 * Serialized Fabric.js canvas state
 */
export interface FabricCanvasJson {
  version: string;
  objects: FabricObjectJson[];
  background?: string;
  backgroundImage?: FabricObjectJson;
  width?: number;
  height?: number;
}

/**
 * Serialized Fabric.js object
 */
export interface FabricObjectJson {
  type: string;
  version?: string;
  originX?: string;
  originY?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number;
  visible?: boolean;
  selectable?: boolean;
  locked?: boolean;
  name?: string;
  variableBinding?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  src?: string;
  [key: string]: unknown;
}

// ============================================================================
// Carousel Types
// ============================================================================

/**
 * Carousel editing mode
 */
export type CarouselMode = "data-driven" | "manual";

/**
 * Supported carousel platforms
 */
export type CarouselPlatform = "facebook" | "reddit";

/**
 * Platform-specific carousel constraints
 */
export interface CarouselPlatformConstraints {
  /** Minimum number of cards allowed */
  minCards: number;
  /** Maximum number of cards allowed */
  maxCards: number;
  /** Required aspect ratio for all cards */
  aspectRatio: "1:1";
  /** Card dimensions in pixels */
  dimensions: {
    width: number;
    height: number;
  };
  /** Maximum file size per card in bytes */
  maxFileSize: number;
}

/**
 * Platform constraints lookup
 */
export const CAROUSEL_PLATFORM_CONSTRAINTS: Record<
  CarouselPlatform,
  CarouselPlatformConstraints
> = {
  facebook: {
    minCards: 2,
    maxCards: 10,
    aspectRatio: "1:1",
    dimensions: { width: 1080, height: 1080 },
    maxFileSize: 30_000_000, // 30MB
  },
  reddit: {
    minCards: 2,
    maxCards: 6,
    aspectRatio: "1:1",
    dimensions: { width: 1080, height: 1080 },
    maxFileSize: 3_000_000, // 3MB
  },
};

/**
 * Individual carousel card with canvas and metadata
 */
export interface CarouselCard {
  /** Unique identifier for this card */
  id: string;
  /** Serialized Fabric.js canvas state for this card */
  canvasJson: FabricCanvasJson;
  /** Card headline (for platforms that support per-card text) */
  headline?: string;
  /** Card description (for platforms that support per-card text) */
  description?: string;
  /** Card destination URL (for platforms that support per-card links) */
  url?: string;
  /** Order index for sorting (0-based) */
  order: number;
  /** Data source row ID if generated from data-driven mode */
  dataRowId?: string;
}

/**
 * Carousel template configuration
 */
export interface CarouselTemplate {
  /** Carousel editing mode */
  mode: CarouselMode;
  /** Target platform for this carousel */
  platform: CarouselPlatform;
  /** Single template for data-driven mode (each row generates a card) */
  cardTemplate?: FabricCanvasJson;
  /** Array of cards for manual mode */
  cards?: CarouselCard[];
  /** Fixed card count for manual mode */
  cardCount?: number;
  /** Consistent aspect ratio across all cards */
  aspectRatio: "1:1";
  /** Platform-specific constraints */
  platformConstraints: CarouselPlatformConstraints;
}

/**
 * Carousel validation error
 */
export interface CarouselValidationError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Card index if error is card-specific */
  cardIndex?: number;
  /** Field name if error is field-specific */
  field?: string;
}

/**
 * Carousel validation result
 */
export interface CarouselValidationResult {
  /** Whether the carousel is valid */
  valid: boolean;
  /** List of validation errors */
  errors: CarouselValidationError[];
  /** List of validation warnings (non-blocking) */
  warnings: CarouselValidationError[];
}

/**
 * Generated carousel output for platform API
 */
export interface CarouselOutput {
  /** Platform identifier */
  platform: CarouselPlatform;
  /** Array of generated card data */
  cards: CarouselOutputCard[];
}

/**
 * Individual card in carousel output
 */
export interface CarouselOutputCard {
  /** Generated image URL or base64 data */
  imageData: string;
  /** Card headline */
  headline?: string;
  /** Card description */
  description?: string;
  /** Destination URL */
  url?: string;
  /** Original card ID */
  cardId: string;
}

/**
 * Facebook carousel API format
 */
export interface FacebookCarouselFormat {
  cards: Array<{
    image_hash: string;
    headline: string;
    description?: string;
    link: string;
  }>;
}

/**
 * Reddit carousel API format
 */
export interface RedditCarouselFormat {
  slides: Array<{
    media_id: string;
    headline: string;
    destination_url: string;
  }>;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const fabricObjectJsonSchema = z.object({
  type: z.string(),
  version: z.string().optional(),
  originX: z.string().optional(),
  originY: z.string().optional(),
  left: z.number().optional(),
  top: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  angle: z.number().optional(),
  opacity: z.number().optional(),
  fill: z.union([z.string(), z.null()]).optional(),
  stroke: z.union([z.string(), z.null()]).optional(),
  strokeWidth: z.number().optional(),
  visible: z.boolean().optional(),
  selectable: z.boolean().optional(),
  locked: z.boolean().optional(),
  name: z.string().optional(),
  variableBinding: z.string().optional(),
  text: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  fontStyle: z.string().optional(),
  textAlign: z.string().optional(),
  src: z.string().optional(),
}).passthrough();

export const fabricCanvasJsonSchema = z.object({
  version: z.string(),
  objects: z.array(fabricObjectJsonSchema),
  background: z.string().optional(),
  backgroundImage: fabricObjectJsonSchema.optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const carouselModeSchema = z.enum(["data-driven", "manual"]);

export const carouselPlatformSchema = z.enum(["facebook", "reddit"]);

export const carouselPlatformConstraintsSchema = z.object({
  minCards: z.number().min(1),
  maxCards: z.number().max(10),
  aspectRatio: z.literal("1:1"),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  maxFileSize: z.number().positive(),
});

export const carouselCardSchema = z.object({
  id: z.string().min(1),
  canvasJson: fabricCanvasJsonSchema,
  headline: z.string().max(100).optional(),
  description: z.string().max(200).optional(),
  url: z.string().url().optional(),
  order: z.number().min(0),
  dataRowId: z.string().optional(),
});

export const carouselTemplateSchema = z.object({
  mode: carouselModeSchema,
  platform: carouselPlatformSchema,
  cardTemplate: fabricCanvasJsonSchema.optional(),
  cards: z.array(carouselCardSchema).optional(),
  cardCount: z.number().min(2).max(10).optional(),
  aspectRatio: z.literal("1:1"),
  platformConstraints: carouselPlatformConstraintsSchema,
}).refine(
  (data) => {
    // In data-driven mode, cardTemplate is required
    if (data.mode === "data-driven" && !data.cardTemplate) {
      return false;
    }
    // In manual mode, cards array is required
    if (data.mode === "manual" && (!data.cards || data.cards.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Data-driven mode requires cardTemplate, manual mode requires cards array",
  }
);

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a template is in data-driven mode
 */
export function isDataDrivenMode(
  template: CarouselTemplate
): template is CarouselTemplate & { mode: "data-driven"; cardTemplate: FabricCanvasJson } {
  return template.mode === "data-driven" && !!template.cardTemplate;
}

/**
 * Check if a template is in manual mode
 */
export function isManualMode(
  template: CarouselTemplate
): template is CarouselTemplate & { mode: "manual"; cards: CarouselCard[] } {
  return template.mode === "manual" && !!template.cards;
}

/**
 * Check if platform is valid
 */
export function isValidCarouselPlatform(platform: string): platform is CarouselPlatform {
  return platform === "facebook" || platform === "reddit";
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new carousel template with default values
 */
export function createCarouselTemplate(
  platform: CarouselPlatform,
  mode: CarouselMode = "manual"
): CarouselTemplate {
  const constraints = CAROUSEL_PLATFORM_CONSTRAINTS[platform];

  const baseTemplate: CarouselTemplate = {
    mode,
    platform,
    aspectRatio: "1:1",
    platformConstraints: constraints,
  };

  if (mode === "data-driven") {
    return {
      ...baseTemplate,
      cardTemplate: createEmptyCanvasJson(constraints.dimensions),
    };
  }

  // Manual mode - create initial two cards (minimum)
  return {
    ...baseTemplate,
    cards: [
      createCarouselCard(0, constraints.dimensions),
      createCarouselCard(1, constraints.dimensions),
    ],
    cardCount: 2,
  };
}

/**
 * Create an empty canvas JSON with given dimensions
 */
export function createEmptyCanvasJson(dimensions: {
  width: number;
  height: number;
}): FabricCanvasJson {
  return {
    version: "6.0.0",
    objects: [],
    background: "#ffffff",
    width: dimensions.width,
    height: dimensions.height,
  };
}

/**
 * Create a new carousel card
 */
export function createCarouselCard(
  order: number,
  dimensions: { width: number; height: number }
): CarouselCard {
  return {
    id: generateCardId(),
    canvasJson: createEmptyCanvasJson(dimensions),
    order,
  };
}

/**
 * Generate a unique card ID
 */
export function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Exports
// ============================================================================

export type {
  FabricCanvasJson as FabricCanvasJSON,
  FabricObjectJson as FabricObjectJSON,
};
