/**
 * Toast Utility Functions
 *
 * Provides typed, consistent toast notification helpers for the application.
 * Uses sonner under the hood with standardized configurations.
 *
 * @example
 * ```tsx
 * import { showError, showSuccess } from "@/lib/toast";
 *
 * // Show error notification
 * showError("Failed to save changes", "Please try again");
 *
 * // Show success notification
 * showSuccess("Team created");
 *
 * // Show loading state
 * const id = showLoading("Creating team...");
 * // Later: dismissToast(id);
 * ```
 */

import { toast, type ExternalToast } from "sonner";

/** Default duration for error toasts (5 seconds) */
const ERROR_DURATION = 5000;

/** Default duration for success toasts (3 seconds) */
const SUCCESS_DURATION = 3000;

/** Default duration for warning toasts (4 seconds) */
const WARNING_DURATION = 4000;

/**
 * Shows an error toast notification
 *
 * @param message - Main error message (should be user-friendly)
 * @param description - Optional additional context
 * @returns Toast ID for programmatic control
 */
export function showError(message: string, description?: string): string | number {
  return toast.error(message, {
    description,
    duration: ERROR_DURATION,
    dismissible: true,
  });
}

/**
 * Shows a success toast notification
 *
 * @param message - Success message
 * @param description - Optional additional context
 * @returns Toast ID for programmatic control
 */
export function showSuccess(message: string, description?: string): string | number {
  return toast.success(message, {
    description,
    duration: SUCCESS_DURATION,
    dismissible: true,
  });
}

/**
 * Shows a warning toast notification
 *
 * @param message - Warning message
 * @param description - Optional additional context
 * @returns Toast ID for programmatic control
 */
export function showWarning(message: string, description?: string): string | number {
  return toast.warning(message, {
    description,
    duration: WARNING_DURATION,
    dismissible: true,
  });
}

/**
 * Shows an info toast notification
 *
 * @param message - Info message
 * @param description - Optional additional context
 * @returns Toast ID for programmatic control
 */
export function showInfo(message: string, description?: string): string | number {
  return toast.info(message, {
    description,
    duration: SUCCESS_DURATION,
    dismissible: true,
  });
}

/**
 * Shows a loading toast that persists until dismissed
 *
 * @param message - Loading message
 * @returns Toast ID to use with dismissToast
 */
export function showLoading(message: string): string | number {
  return toast.loading(message, {
    duration: Infinity, // Persist until manually dismissed
  });
}

/**
 * Dismisses a specific toast by ID
 *
 * @param toastId - The ID returned by a toast function
 */
export function dismissToast(toastId: string | number): void {
  toast.dismiss(toastId);
}

/**
 * Dismisses all active toasts
 */
export function dismissAllToasts(): void {
  toast.dismiss();
}

/**
 * Shows a toast with promise integration
 * Automatically shows loading, success, and error states
 *
 * @param promise - The promise to track
 * @param messages - Messages for each state
 * @returns The promise result
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  toast.promise(promise, messages);
  return promise;
}

/**
 * Extracts a user-friendly error message from an error object
 *
 * @param error - The error to extract message from
 * @param fallback - Fallback message if extraction fails
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown, fallback = "An error occurred"): string {
  if (error instanceof Error) {
    // Don't expose technical details, use generic messages for common errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return "Network error. Please check your connection.";
    }
    if (error.message.includes("401") || error.message.includes("unauthorized")) {
      return "Please sign in to continue.";
    }
    if (error.message.includes("403") || error.message.includes("forbidden")) {
      return "You don't have permission to do this.";
    }
    if (error.message.includes("404")) {
      return "The requested resource was not found.";
    }
    if (error.message.includes("500") || error.message.includes("server")) {
      return "Server error. Please try again later.";
    }
    // Return the error message if it seems user-friendly (not too technical)
    if (error.message.length < 100 && !error.message.includes("Error:")) {
      return error.message;
    }
  }
  return fallback;
}
