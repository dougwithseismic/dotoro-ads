/**
 * Ad Type Validation Functions
 *
 * Provides validation utilities for ad type data and field validation.
 */

import type {
  AdTypeDefinition,
  AdFieldDefinition,
  AdData,
  ValidationResult,
  Platform,
} from "./types.js";
import { adTypeRegistry } from "./registry.js";

/**
 * Validate ad data against an ad type definition
 */
export function validateAdData(
  adType: AdTypeDefinition,
  data: AdData
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each field
  for (const field of adType.fields) {
    const value = data[field.id];
    const fieldErrors = validateField(field, value);
    errors.push(...fieldErrors);
  }

  // Run the ad type's custom validation
  const customResult = adType.validate(data);
  errors.push(...customResult.errors);
  warnings.push(...customResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single field value against its definition
 */
export function validateField(
  field: AdFieldDefinition,
  value: unknown
): string[] {
  const errors: string[] = [];

  // Required check
  if (field.required && isEmpty(value)) {
    errors.push(`${field.name} is required`);
    return errors; // Early return if required field is empty
  }

  // Skip further validation if value is empty and field is optional
  if (isEmpty(value)) {
    return errors;
  }

  // Type-specific validation
  switch (field.type) {
    case "text":
    case "textarea":
      if (typeof value === "string") {
        errors.push(...validateTextValue(field, value));
      }
      break;

    case "url":
      if (typeof value === "string") {
        errors.push(...validateUrlValue(field, value));
      }
      break;

    case "number":
      if (typeof value === "number" || typeof value === "string") {
        errors.push(...validateNumberValue(field, value));
      }
      break;

    case "array":
      if (Array.isArray(value)) {
        errors.push(...validateArrayValue(field, value));
      }
      break;

    case "select":
      if (typeof value === "string" && field.options) {
        if (!field.options.some((opt) => opt.value === value)) {
          errors.push(`${field.name} has invalid value`);
        }
      }
      break;

    case "multiselect":
      if (Array.isArray(value) && field.options) {
        const validValues = field.options.map((opt) => opt.value);
        for (const v of value) {
          if (!validValues.includes(v)) {
            errors.push(`${field.name} contains invalid value: ${v}`);
          }
        }
      }
      break;
  }

  return errors;
}

/**
 * Validate a text value
 */
function validateTextValue(
  field: AdFieldDefinition,
  value: string
): string[] {
  const errors: string[] = [];

  // Length validation (skip if value contains variables)
  const hasVariables = value.includes("{") && value.includes("}");

  if (!hasVariables) {
    if (field.minLength !== undefined && value.length < field.minLength) {
      errors.push(
        `${field.name} must be at least ${field.minLength} characters`
      );
    }

    if (field.maxLength !== undefined && value.length > field.maxLength) {
      errors.push(
        `${field.name} must not exceed ${field.maxLength} characters`
      );
    }
  }

  // Pattern validation
  if (field.pattern) {
    const regex = new RegExp(field.pattern);
    if (!regex.test(value)) {
      errors.push(`${field.name} has invalid format`);
    }
  }

  return errors;
}

/**
 * Validate a URL value
 */
function validateUrlValue(field: AdFieldDefinition, value: string): string[] {
  const errors: string[] = [];

  // Skip validation if value contains variables
  const hasVariables = value.includes("{") && value.includes("}");
  if (hasVariables) {
    return errors;
  }

  // Basic URL validation
  try {
    new URL(value);
  } catch {
    errors.push(`${field.name} must be a valid URL`);
  }

  return errors;
}

/**
 * Validate a number value
 */
function validateNumberValue(
  field: AdFieldDefinition,
  value: number | string
): string[] {
  const errors: string[] = [];

  // Skip validation if value contains variables
  if (
    typeof value === "string" &&
    value.includes("{") &&
    value.includes("}")
  ) {
    return errors;
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    errors.push(`${field.name} must be a number`);
    return errors;
  }

  if (field.minValue !== undefined && numValue < field.minValue) {
    errors.push(`${field.name} must be at least ${field.minValue}`);
  }

  if (field.maxValue !== undefined && numValue > field.maxValue) {
    errors.push(`${field.name} must not exceed ${field.maxValue}`);
  }

  return errors;
}

/**
 * Validate an array value
 */
function validateArrayValue(
  field: AdFieldDefinition,
  value: unknown[]
): string[] {
  const errors: string[] = [];

  if (field.minCount !== undefined && value.length < field.minCount) {
    errors.push(`${field.name} requires at least ${field.minCount} items`);
  }

  if (field.maxCount !== undefined && value.length > field.maxCount) {
    errors.push(`${field.name} allows at most ${field.maxCount} items`);
  }

  // Validate each item's length if maxLength is specified
  if (field.maxLength !== undefined) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item === "string") {
        const hasVariables = item.includes("{") && item.includes("}");
        if (!hasVariables && item.length > field.maxLength) {
          errors.push(
            `${field.name} item ${i + 1} exceeds ${field.maxLength} characters`
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Check if a value is empty
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Validate ad type by looking it up in the registry
 */
export function validateAdType(
  platform: Platform,
  adTypeId: string,
  data: AdData
): ValidationResult {
  const adType = adTypeRegistry.get(platform, adTypeId);

  if (!adType) {
    return {
      valid: false,
      errors: [`Ad type "${adTypeId}" not found for platform "${platform}"`],
      warnings: [],
    };
  }

  return validateAdData(adType, data);
}

/**
 * Get character count for a text value after variable substitution
 */
export function getCharacterCount(
  value: string,
  variables: Record<string, unknown>
): number {
  let result = value;

  // Replace variables with their values
  const variablePattern = /\{([^}|]+)(?:\|[^}]*)?\}/g;
  result = result.replace(variablePattern, (match, varName) => {
    const varValue = variables[varName];
    return varValue !== undefined ? String(varValue) : "";
  });

  return result.length;
}

/**
 * Extract variable names from a pattern
 */
export function extractVariables(pattern: string): string[] {
  const variables: string[] = [];
  const variablePattern = /\{([^}|]+)(?:\|([^}]+))?\}/g;

  let match;
  while ((match = variablePattern.exec(pattern)) !== null) {
    // Add the primary variable
    const primaryVar = match[1];
    if (primaryVar) {
      variables.push(primaryVar);
    }

    // Add fallback variables if present
    if (match[2]) {
      const fallbacks = match[2].split("|");
      variables.push(...fallbacks);
    }
  }

  return [...new Set(variables)]; // Remove duplicates
}
