/**
 * Ad Type System Types
 *
 * Core type definitions for the ad type system that provides a flexible,
 * extensible way to define different advertisement formats across platforms.
 */

// Import shared types
import type { ValidationResult } from "../shared/validation-types.js";
import type {
  CreativeType,
  CreativeSpecs,
} from "../creatives/types.js";

// Re-export imported types for convenience
export type { ValidationResult, CreativeType, CreativeSpecs };

// ─────────────────────────────────────────────────────────────────────────────
// Platform and Category Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported advertising platforms
 */
export type Platform = "google" | "reddit" | "facebook";

/**
 * Content category for ad types
 * - paid: Traditional paid advertisements
 * - organic: Natural content posted to platforms
 * - promoted: Organic-style content that can be promoted
 */
export type ContentCategory = "paid" | "organic" | "promoted";

/**
 * Generic ad data type for validation
 */
export type AdData = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Field Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Available field types for ad type definitions
 */
export type FieldType =
  | "text" // Single-line text
  | "textarea" // Multi-line text
  | "url" // URL with validation
  | "number" // Numeric input
  | "select" // Single selection
  | "multiselect" // Multiple selection
  | "boolean" // Checkbox/toggle
  | "array"; // Multiple values (e.g., multiple headlines)

/**
 * Option for select/multiselect fields
 */
export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Defines a single field within an ad type
 */
export interface AdFieldDefinition {
  /** Field identifier, e.g., 'headline' */
  id: string;

  /** Display name, e.g., 'Headline' */
  name: string;

  /** Field type */
  type: FieldType;

  /** Whether the field is required */
  required: boolean;

  /** Minimum length for text fields */
  minLength?: number;

  /** Maximum length for text fields */
  maxLength?: number;

  /** Minimum value for number fields */
  minValue?: number;

  /** Maximum value for number fields */
  maxValue?: number;

  /** Regex pattern for validation */
  pattern?: string;

  /** Options for select/multiselect fields */
  options?: FieldOption[];

  /** Minimum count for array fields */
  minCount?: number;

  /** Maximum count for array fields */
  maxCount?: number;

  /** Placeholder text */
  placeholder?: string;

  /** Help text for the field */
  helpText?: string;

  /** Whether the field supports variable patterns like {variable} */
  supportsVariables: boolean;

  /** Group related fields, e.g., 'urls' */
  group?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Creative Types (imported from creatives/types.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines creative asset requirements for an ad type
 */
export interface CreativeRequirement {
  /** Unique identifier, e.g., 'primary-image' */
  id: string;

  /** Display name, e.g., 'Primary Image' */
  name: string;

  /** Type of creative asset */
  type: CreativeType;

  /** Whether this creative is required */
  required: boolean;

  /** Specifications for the creative */
  specs: CreativeSpecs;

  /** Minimum count for carousels/galleries */
  minCount?: number;

  /** Maximum count for carousels/galleries */
  maxCount?: number;

  /** Help text for the creative requirement */
  helpText?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constraints Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platform-specific constraints for an ad type
 */
export interface AdConstraints {
  /** Character limits by field name */
  characterLimits: Record<string, number>;

  /** Fields that must have values */
  minimumFields?: string[];

  /** Patterns that are not allowed */
  forbiddenPatterns?: RegExp[];

  /** List of platform-specific rule descriptions */
  platformRules?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Ad Type Features
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Feature flags for ad type capabilities
 */
export interface AdTypeFeatures {
  /** Can use {variable} patterns */
  supportsVariables: boolean;

  /** Supports multiple ads per ad group */
  supportsMultipleAds: boolean;

  /** Supports keyword targeting */
  supportsKeywords: boolean;

  /** Supports ad-level scheduling */
  supportsScheduling: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Ad Type Definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The fundamental building block of the ad type system.
 * Each ad type is a self-describing object that includes field definitions,
 * creative requirements, validation rules, and preview components.
 */
export interface AdTypeDefinition {
  /** Unique identifier, e.g., 'reddit-carousel' */
  id: string;

  /** Platform this ad type belongs to */
  platform: Platform;

  /** Display name, e.g., 'Carousel Ad' */
  name: string;

  /** Brief description of the ad type */
  description: string;

  /** Content category: 'paid', 'organic', or 'promoted' */
  category: ContentCategory;

  /** Icon name or emoji for UI */
  icon: string;

  /** Field definitions for this ad type */
  fields: AdFieldDefinition[];

  /** Creative asset requirements */
  creatives: CreativeRequirement[];

  /** Platform-specific constraints */
  constraints: AdConstraints;

  /** Feature flags */
  features: AdTypeFeatures;

  /** Validation function */
  validate: (data: AdData) => ValidationResult;

  /** Preview renderer (React component name or path) */
  previewComponent: string;
}
