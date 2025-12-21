import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Error codes used throughout the API
 */
export const ErrorCode = {
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_UUID: "INVALID_UUID",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Authentication/Authorization errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Rate limiting
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // Business logic errors
  RULE_EVALUATION_ERROR: "RULE_EVALUATION_ERROR",
  TEMPLATE_GENERATION_ERROR: "TEMPLATE_GENERATION_ERROR",
  SYNC_ERROR: "SYNC_ERROR",
  UPLOAD_ERROR: "UPLOAD_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard error response format
 */
export interface ApiError {
  error: string;
  code: ErrorCodeType;
  details?: Record<string, unknown>;
}

/**
 * Custom API exception that includes error code and optional details
 */
export class ApiException extends HTTPException {
  public readonly code: ErrorCodeType;
  public readonly details?: Record<string, unknown>;

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCodeType,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(status, { message });
    this.code = code;
    this.details = details;
  }

  toJSON(): ApiError {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Helper functions to create common errors
 */
export const createNotFoundError = (resource: string, id?: string): ApiException => {
  const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
  return new ApiException(404, ErrorCode.NOT_FOUND, message, { resource, id });
};

export const createValidationError = (
  message: string,
  details?: Record<string, unknown>
): ApiException => {
  return new ApiException(400, ErrorCode.VALIDATION_ERROR, message, details);
};

export const createConflictError = (
  message: string,
  details?: Record<string, unknown>
): ApiException => {
  return new ApiException(409, ErrorCode.CONFLICT, message, details);
};

export const createUnauthorizedError = (message = "Unauthorized"): ApiException => {
  return new ApiException(401, ErrorCode.UNAUTHORIZED, message);
};

export const createForbiddenError = (message = "Forbidden"): ApiException => {
  return new ApiException(403, ErrorCode.FORBIDDEN, message);
};

export const createInternalError = (
  message = "Internal server error",
  details?: Record<string, unknown>
): ApiException => {
  return new ApiException(500, ErrorCode.INTERNAL_ERROR, message, details);
};

export const createDatabaseError = (
  message = "Database error",
  details?: Record<string, unknown>
): ApiException => {
  return new ApiException(500, ErrorCode.DATABASE_ERROR, message, details);
};
