import { describe, it, expect } from "vitest";
import {
  parseApiError,
  formatZodErrors,
  isNetworkError,
  getErrorMessage,
  type ParsedApiError,
  type ZodFieldError,
} from "../api-error-parser";
import { ApiError } from "../api-client";

describe("api-error-parser", () => {
  // ==========================================================================
  // parseApiError Tests
  // ==========================================================================

  describe("parseApiError", () => {
    it("parses ApiError with Zod validation errors", () => {
      const zodErrorData = {
        success: false,
        error: {
          issues: [
            {
              code: "invalid_type",
              expected: "string",
              received: "undefined",
              path: ["name"],
              message: "Required",
            },
            {
              code: "too_small",
              minimum: 3,
              type: "string",
              inclusive: true,
              exact: false,
              path: ["description"],
              message: "String must contain at least 3 character(s)",
            },
          ],
          name: "ZodError",
        },
      };

      const apiError = new ApiError("Validation failed", 400, zodErrorData);
      const result = parseApiError(apiError);

      expect(result.type).toBe("validation");
      expect(result.message).toBe("Validation failed");
      expect(result.status).toBe(400);
      expect(result.fieldErrors).toHaveLength(2);
      expect(result.fieldErrors[0]).toEqual({
        field: "name",
        message: "Required",
        path: ["name"],
      });
      expect(result.fieldErrors[1]).toEqual({
        field: "description",
        message: "String must contain at least 3 character(s)",
        path: ["description"],
      });
    });

    it("parses ApiError with nested Zod path errors", () => {
      const zodErrorData = {
        success: false,
        error: {
          issues: [
            {
              code: "invalid_type",
              path: ["config", "campaignConfig", "namePattern"],
              message: "Name pattern is required",
            },
            {
              code: "invalid_type",
              path: ["config", "hierarchyConfig", "adGroups", 0, "name"],
              message: "Ad group name is required",
            },
          ],
          name: "ZodError",
        },
      };

      const apiError = new ApiError("Validation failed", 400, zodErrorData);
      const result = parseApiError(apiError);

      expect(result.fieldErrors).toHaveLength(2);
      expect(result.fieldErrors[0]?.field).toBe("config.campaignConfig.namePattern");
      expect(result.fieldErrors[1]?.field).toBe("config.hierarchyConfig.adGroups.0.name");
    });

    it("parses ApiError with simple error message", () => {
      const errorData = {
        message: "Campaign set not found",
      };

      const apiError = new ApiError("Not found", 404, errorData);
      const result = parseApiError(apiError);

      expect(result.type).toBe("not_found");
      expect(result.message).toBe("Campaign set not found");
      expect(result.status).toBe(404);
      expect(result.fieldErrors).toHaveLength(0);
    });

    it("parses ApiError with errors array format", () => {
      const errorData = {
        errors: [
          { field: "name", message: "Name already exists" },
          { field: "email", message: "Invalid email format" },
        ],
      };

      const apiError = new ApiError("Validation failed", 400, errorData);
      const result = parseApiError(apiError);

      expect(result.type).toBe("validation");
      expect(result.fieldErrors).toHaveLength(2);
      expect(result.fieldErrors[0]).toEqual({
        field: "name",
        message: "Name already exists",
        path: ["name"],
      });
    });

    it("parses ApiError without error data", () => {
      const apiError = new ApiError("Server error", 500, null);
      const result = parseApiError(apiError);

      expect(result.type).toBe("server");
      expect(result.message).toBe("Server error");
      expect(result.status).toBe(500);
      expect(result.fieldErrors).toHaveLength(0);
    });

    it("parses generic Error", () => {
      const error = new Error("Something went wrong");
      const result = parseApiError(error);

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("Something went wrong");
      expect(result.status).toBeUndefined();
      expect(result.fieldErrors).toHaveLength(0);
    });

    it("parses network error (TypeError)", () => {
      const error = new TypeError("Failed to fetch");
      const result = parseApiError(error);

      expect(result.type).toBe("network");
      expect(result.message).toContain("network");
      expect(result.isRetryable).toBe(true);
    });

    it("parses unknown error types", () => {
      const result = parseApiError("string error");

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("An unexpected error occurred");
      expect(result.fieldErrors).toHaveLength(0);
    });

    it("identifies retryable errors", () => {
      // 503 Service Unavailable - retryable
      const apiError503 = new ApiError("Service unavailable", 503, null);
      const result503 = parseApiError(apiError503);
      expect(result503.isRetryable).toBe(true);

      // 429 Too Many Requests - retryable
      const apiError429 = new ApiError("Rate limited", 429, null);
      const result429 = parseApiError(apiError429);
      expect(result429.isRetryable).toBe(true);

      // 400 Bad Request - not retryable
      const apiError400 = new ApiError("Bad request", 400, null);
      const result400 = parseApiError(apiError400);
      expect(result400.isRetryable).toBe(false);
    });

    it("handles authorization errors", () => {
      const apiError = new ApiError("Unauthorized", 401, null);
      const result = parseApiError(apiError);

      expect(result.type).toBe("unauthorized");
      expect(result.isRetryable).toBe(false);
    });

    it("handles forbidden errors", () => {
      const apiError = new ApiError("Forbidden", 403, null);
      const result = parseApiError(apiError);

      expect(result.type).toBe("forbidden");
      expect(result.isRetryable).toBe(false);
    });
  });

  // ==========================================================================
  // formatZodErrors Tests
  // ==========================================================================

  describe("formatZodErrors", () => {
    it("formats Zod errors for display", () => {
      const fieldErrors: ZodFieldError[] = [
        { field: "name", message: "Required", path: ["name"] },
        { field: "email", message: "Invalid email", path: ["email"] },
      ];

      const formatted = formatZodErrors(fieldErrors);

      expect(formatted).toHaveLength(2);
      // "name" maps to "campaign-set-name" via FIELD_PATH_MAPPINGS
      expect(formatted[0]).toEqual({
        fieldId: "campaign-set-name",
        message: "Required",
      });
      // "email" has no mapping, so it uses the raw field name
      expect(formatted[1]).toEqual({
        fieldId: "email",
        message: "Invalid email",
      });
    });

    it("converts nested paths to field IDs", () => {
      const fieldErrors: ZodFieldError[] = [
        {
          field: "config.campaignConfig.namePattern",
          message: "Required",
          path: ["config", "campaignConfig", "namePattern"],
        },
      ];

      const formatted = formatZodErrors(fieldErrors);

      expect(formatted[0]?.fieldId).toBe("campaign-name-pattern");
    });

    it("handles array indices in paths", () => {
      const fieldErrors: ZodFieldError[] = [
        {
          field: "config.hierarchyConfig.adGroups.0.name",
          message: "Required",
          path: ["config", "hierarchyConfig", "adGroups", 0, "name"],
        },
      ];

      const formatted = formatZodErrors(fieldErrors);

      // Should use a sensible field ID mapping
      expect(formatted[0]?.fieldId).toBe("hierarchy-config");
    });

    it("returns empty array for empty input", () => {
      expect(formatZodErrors([])).toEqual([]);
    });
  });

  // ==========================================================================
  // isNetworkError Tests
  // ==========================================================================

  describe("isNetworkError", () => {
    it("returns true for TypeError with fetch message", () => {
      expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
      expect(isNetworkError(new TypeError("NetworkError when attempting to fetch"))).toBe(true);
    });

    it("returns true for network-related error messages", () => {
      expect(isNetworkError(new Error("Network request failed"))).toBe(true);
      expect(isNetworkError(new Error("net::ERR_INTERNET_DISCONNECTED"))).toBe(true);
    });

    it("returns false for non-network errors", () => {
      expect(isNetworkError(new Error("Validation failed"))).toBe(false);
      expect(isNetworkError(new ApiError("Bad request", 400, null))).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  // ==========================================================================
  // getErrorMessage Tests
  // ==========================================================================

  describe("getErrorMessage", () => {
    it("returns user-friendly message for network errors", () => {
      const result: ParsedApiError = {
        type: "network",
        message: "Failed to fetch",
        fieldErrors: [],
        isRetryable: true,
      };

      expect(getErrorMessage(result)).toBe(
        "Unable to connect to the server. Please check your internet connection and try again."
      );
    });

    it("returns user-friendly message for validation errors", () => {
      const result: ParsedApiError = {
        type: "validation",
        message: "Validation failed",
        status: 400,
        fieldErrors: [
          { field: "name", message: "Required", path: ["name"] },
        ],
        isRetryable: false,
      };

      expect(getErrorMessage(result)).toBe(
        "Please correct the errors in the form and try again."
      );
    });

    it("returns user-friendly message for not found errors", () => {
      const result: ParsedApiError = {
        type: "not_found",
        message: "Resource not found",
        status: 404,
        fieldErrors: [],
        isRetryable: false,
      };

      expect(getErrorMessage(result)).toBe(
        "The requested resource could not be found."
      );
    });

    it("returns user-friendly message for unauthorized errors", () => {
      const result: ParsedApiError = {
        type: "unauthorized",
        message: "Unauthorized",
        status: 401,
        fieldErrors: [],
        isRetryable: false,
      };

      expect(getErrorMessage(result)).toBe(
        "You are not authorized to perform this action. Please log in and try again."
      );
    });

    it("returns user-friendly message for forbidden errors", () => {
      const result: ParsedApiError = {
        type: "forbidden",
        message: "Forbidden",
        status: 403,
        fieldErrors: [],
        isRetryable: false,
      };

      expect(getErrorMessage(result)).toBe(
        "You do not have permission to perform this action."
      );
    });

    it("returns user-friendly message for server errors", () => {
      const result: ParsedApiError = {
        type: "server",
        message: "Internal server error",
        status: 500,
        fieldErrors: [],
        isRetryable: true,
      };

      expect(getErrorMessage(result)).toBe(
        "An unexpected server error occurred. Please try again later."
      );
    });

    it("returns original message for unknown errors", () => {
      const result: ParsedApiError = {
        type: "unknown",
        message: "Something went wrong",
        fieldErrors: [],
        isRetryable: false,
      };

      expect(getErrorMessage(result)).toBe("Something went wrong");
    });

    it("accepts an optional custom message override", () => {
      const result: ParsedApiError = {
        type: "server",
        message: "Internal error",
        status: 500,
        fieldErrors: [],
        isRetryable: true,
      };

      expect(getErrorMessage(result, "Custom error message")).toBe("Custom error message");
    });
  });
});
