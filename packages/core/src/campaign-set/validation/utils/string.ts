/**
 * String Validation Utilities
 *
 * Utilities for validating string fields (required, length, enum values).
 */

import { ValidationError, ValidationErrorCode } from "../types.js";

/**
 * Validate a required string field.
 *
 * @param value - The string value to validate
 * @param fieldName - Name of the field for error messages
 * @param entityType - Type of entity being validated
 * @param entityId - ID of the entity
 * @param entityName - Name of the entity
 * @returns ValidationError or null
 */
export function validateRequiredString(
  value: string | undefined | null,
  fieldName: string,
  entityType: "campaign" | "adGroup" | "ad" | "keyword",
  entityId: string,
  entityName: string
): ValidationError | null {
  if (value === undefined || value === null || value.trim() === "") {
    return {
      entityType,
      entityId,
      entityName,
      field: fieldName,
      code: ValidationErrorCode.REQUIRED_FIELD,
      message: `${fieldName} is required`,
      value,
    };
  }
  return null;
}

/**
 * Validate string length does not exceed maximum.
 *
 * @param value - The string value to validate
 * @param fieldName - Name of the field
 * @param maxLength - Maximum allowed length
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param entityName - Name of the entity
 * @returns ValidationError or null
 */
export function validateStringLength(
  value: string | undefined | null,
  fieldName: string,
  maxLength: number,
  entityType: "campaign" | "adGroup" | "ad" | "keyword",
  entityId: string,
  entityName: string
): ValidationError | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (value.length > maxLength) {
    return {
      entityType,
      entityId,
      entityName,
      field: fieldName,
      code: ValidationErrorCode.FIELD_TOO_LONG,
      message: `${fieldName} exceeds maximum length of ${maxLength} characters (got ${value.length})`,
      value,
      expected: `Maximum ${maxLength} characters`,
    };
  }

  return null;
}

/**
 * Validate that a value is one of the allowed enum values.
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field
 * @param allowedValues - Array of allowed values
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param entityName - Name of the entity
 * @param required - Whether the field is required
 * @returns ValidationError or null
 */
export function validateEnumValue<T extends string>(
  value: T | string | undefined | null,
  fieldName: string,
  allowedValues: readonly T[],
  entityType: "campaign" | "adGroup" | "ad" | "keyword",
  entityId: string,
  entityName: string,
  required = false
): ValidationError | null {
  if (value === undefined || value === null || value === "") {
    if (required) {
      return {
        entityType,
        entityId,
        entityName,
        field: fieldName,
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: `${fieldName} is required`,
        value,
      };
    }
    return null;
  }

  if (!allowedValues.includes(value as T)) {
    return {
      entityType,
      entityId,
      entityName,
      field: fieldName,
      code: ValidationErrorCode.INVALID_ENUM_VALUE,
      message: `${fieldName} must be one of: ${allowedValues.join(", ")}`,
      value,
      expected: allowedValues.join(" | "),
    };
  }

  return null;
}

/**
 * Validate that an array field is not empty (for required arrays).
 *
 * @param value - The array to validate
 * @param fieldName - Name of the field
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param entityName - Name of the entity
 * @returns ValidationError or null
 */
export function validateRequiredArray<T>(
  value: T[] | undefined | null,
  fieldName: string,
  entityType: "campaign" | "adGroup" | "ad" | "keyword",
  entityId: string,
  entityName: string
): ValidationError | null {
  if (value === undefined || value === null || value.length === 0) {
    return {
      entityType,
      entityId,
      entityName,
      field: fieldName,
      code: ValidationErrorCode.REQUIRED_FIELD,
      message: `${fieldName} is required and must not be empty`,
      value,
    };
  }
  return null;
}

/**
 * Validate that each element in an array is one of allowed values.
 *
 * @param values - Array of values to validate
 * @param fieldName - Name of the field
 * @param allowedValues - Array of allowed values
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param entityName - Name of the entity
 * @returns ValidationError or null (returns first invalid value found)
 */
export function validateEnumArray<T extends string>(
  values: T[] | string[] | undefined | null,
  fieldName: string,
  allowedValues: readonly T[],
  entityType: "campaign" | "adGroup" | "ad" | "keyword",
  entityId: string,
  entityName: string
): ValidationError | null {
  if (values === undefined || values === null) {
    return null;
  }

  for (const value of values) {
    if (!allowedValues.includes(value as T)) {
      return {
        entityType,
        entityId,
        entityName,
        field: fieldName,
        code: ValidationErrorCode.INVALID_ENUM_VALUE,
        message: `${fieldName} contains invalid value "${value}". Must be one of: ${allowedValues.join(", ")}`,
        value: values,
        expected: allowedValues.join(" | "),
      };
    }
  }

  return null;
}
