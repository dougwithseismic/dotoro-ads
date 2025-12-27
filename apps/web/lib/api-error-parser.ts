/**
 * API Error Parser
 *
 * Parses API errors into a structured format for display in the UI.
 * Handles various error formats including Zod validation errors, HTTP errors,
 * and network errors.
 */

import { ApiError } from "./api-client";

/**
 * Error types for categorization
 */
export type ApiErrorType =
  | "validation"
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "server"
  | "unknown";

/**
 * Represents a field-level validation error from Zod
 */
export interface ZodFieldError {
  /** Field name (may be dot-notation for nested fields) */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Original path array from Zod */
  path: (string | number)[];
}

/**
 * Formatted field error for UI display
 */
export interface FormattedFieldError {
  /** Field ID matching form element id or data-field-id attribute */
  fieldId: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Parsed API error result
 */
export interface ParsedApiError {
  /** Error type category */
  type: ApiErrorType;
  /** Human-readable error message */
  message: string;
  /** HTTP status code (if applicable) */
  status?: number;
  /** Field-level validation errors */
  fieldErrors: ZodFieldError[];
  /** Whether the error is retryable */
  isRetryable: boolean;
  /** Original error data */
  rawData?: unknown;
}

/**
 * Zod error issue structure
 */
interface ZodIssue {
  code: string;
  path: (string | number)[];
  message: string;
  [key: string]: unknown;
}

/**
 * Zod error data structure from API
 */
interface ZodErrorData {
  success: false;
  error: {
    issues: ZodIssue[];
    name: string;
  };
}

/**
 * Simple error data with message
 */
interface SimpleErrorData {
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Retryable HTTP status codes
 */
const RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error (sometimes retryable)
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

/**
 * Network error indicators in error messages
 */
const NETWORK_ERROR_PATTERNS = [
  "failed to fetch",
  "network",
  "networkerror",
  "net::err",
  "econnrefused",
  "econnreset",
  "etimedout",
];

/**
 * Field path to field ID mappings for common API fields
 */
const FIELD_PATH_MAPPINGS: Record<string, string> = {
  name: "campaign-set-name",
  "config.campaignConfig.namePattern": "campaign-name-pattern",
  "config.hierarchyConfig": "hierarchy-config",
  "config.selectedPlatforms": "platform-selector",
  dataSourceId: "data-source-combobox",
};

/**
 * Maps a Zod path array to a form field ID
 */
function pathToFieldId(path: (string | number)[]): string {
  const fullPath = path.join(".");

  // Check for exact mapping
  if (FIELD_PATH_MAPPINGS[fullPath]) {
    return FIELD_PATH_MAPPINGS[fullPath];
  }

  // Check for prefix mappings (for nested fields)
  for (const [prefix, fieldId] of Object.entries(FIELD_PATH_MAPPINGS)) {
    if (fullPath.startsWith(prefix)) {
      return fieldId;
    }
  }

  // Default: convert path to kebab-case field ID
  const stringPath = path.filter((p) => typeof p === "string").join("-");
  return stringPath.toLowerCase().replace(/\./g, "-");
}

/**
 * Checks if an error is Zod validation error data
 */
function isZodErrorData(data: unknown): data is ZodErrorData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === false &&
    obj.error !== null &&
    typeof obj.error === "object" &&
    Array.isArray((obj.error as Record<string, unknown>).issues)
  );
}

/**
 * Checks if an error has a simple errors array format
 */
function hasErrorsArray(
  data: unknown
): data is { errors: Array<{ field: string; message: string }> } {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.errors) &&
    obj.errors.length > 0 &&
    typeof obj.errors[0] === "object" &&
    obj.errors[0] !== null &&
    "field" in obj.errors[0] &&
    "message" in obj.errors[0]
  );
}

/**
 * Extracts field errors from Zod error data
 */
function extractZodFieldErrors(data: ZodErrorData): ZodFieldError[] {
  return data.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    path: issue.path,
  }));
}

/**
 * Extracts field errors from errors array format
 */
function extractArrayFieldErrors(
  errors: Array<{ field: string; message: string }>
): ZodFieldError[] {
  return errors.map((err) => ({
    field: err.field,
    message: err.message,
    path: [err.field],
  }));
}

/**
 * Determines the error type from HTTP status code
 */
function getErrorTypeFromStatus(status: number): ApiErrorType {
  if (status === 400) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "unknown";
}

/**
 * Extracts message from error data
 */
function extractMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;

  // Don't extract message from Zod error data
  if (isZodErrorData(data)) {
    return undefined;
  }

  const obj = data as SimpleErrorData;
  return obj.message || obj.error;
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  // TypeError is often thrown for network failures
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
  }

  // Check Error message for network patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
  }

  return false;
}

/**
 * Parses any error into a structured ParsedApiError
 */
export function parseApiError(error: unknown): ParsedApiError {
  // Handle null/undefined
  if (!error) {
    return {
      type: "unknown",
      message: "An unexpected error occurred",
      fieldErrors: [],
      isRetryable: false,
    };
  }

  // Handle network errors first
  if (isNetworkError(error)) {
    return {
      type: "network",
      message:
        "Unable to connect to the server. Please check your network connection.",
      fieldErrors: [],
      isRetryable: true,
    };
  }

  // Handle ApiError
  if (error instanceof ApiError) {
    const { status, data, message } = error;
    const errorType = getErrorTypeFromStatus(status);
    const isRetryable = RETRYABLE_STATUS_CODES.has(status);

    // Try to extract field errors
    let fieldErrors: ZodFieldError[] = [];

    if (isZodErrorData(data)) {
      fieldErrors = extractZodFieldErrors(data);
    } else if (hasErrorsArray(data)) {
      fieldErrors = extractArrayFieldErrors(data.errors);
    }

    // Extract user-friendly message
    const extractedMessage = extractMessage(data) || message;

    return {
      type: fieldErrors.length > 0 ? "validation" : errorType,
      message: extractedMessage,
      status,
      fieldErrors,
      isRetryable,
      rawData: data,
    };
  }

  // Handle generic Error
  if (error instanceof Error) {
    return {
      type: "unknown",
      message: error.message || "An unexpected error occurred",
      fieldErrors: [],
      isRetryable: false,
    };
  }

  // Handle unknown error types
  return {
    type: "unknown",
    message: "An unexpected error occurred",
    fieldErrors: [],
    isRetryable: false,
  };
}

/**
 * Formats Zod field errors into FormattedFieldError array for UI display
 */
export function formatZodErrors(
  fieldErrors: ZodFieldError[]
): FormattedFieldError[] {
  if (!fieldErrors || fieldErrors.length === 0) {
    return [];
  }

  return fieldErrors.map((error) => ({
    fieldId: pathToFieldId(error.path),
    message: error.message,
  }));
}

/**
 * Gets a user-friendly error message based on error type
 */
export function getErrorMessage(
  result: ParsedApiError,
  customMessage?: string
): string {
  // Allow custom message override
  if (customMessage) {
    return customMessage;
  }

  switch (result.type) {
    case "network":
      return "Unable to connect to the server. Please check your internet connection and try again.";

    case "validation":
      return "Please correct the errors in the form and try again.";

    case "not_found":
      return "The requested resource could not be found.";

    case "unauthorized":
      return "You are not authorized to perform this action. Please log in and try again.";

    case "forbidden":
      return "You do not have permission to perform this action.";

    case "server":
      return "An unexpected server error occurred. Please try again later.";

    case "unknown":
    default:
      return result.message || "An unexpected error occurred";
  }
}
