/**
 * Tests for Toast Utility Functions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import {
  showError,
  showSuccess,
  showWarning,
  showInfo,
  showLoading,
  dismissToast,
  dismissAllToasts,
  showPromise,
  getErrorMessage,
} from "../toast";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn().mockReturnValue("toast-error-id"),
    success: vi.fn().mockReturnValue("toast-success-id"),
    warning: vi.fn().mockReturnValue("toast-warning-id"),
    info: vi.fn().mockReturnValue("toast-info-id"),
    loading: vi.fn().mockReturnValue("toast-loading-id"),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

describe("Toast Utility Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("showError", () => {
    it("should call toast.error with message", () => {
      const result = showError("Something went wrong");

      expect(toast.error).toHaveBeenCalledWith("Something went wrong", {
        description: undefined,
        duration: 5000,
        dismissible: true,
      });
      expect(result).toBe("toast-error-id");
    });

    it("should call toast.error with message and description", () => {
      showError("Failed to save", "Please try again");

      expect(toast.error).toHaveBeenCalledWith("Failed to save", {
        description: "Please try again",
        duration: 5000,
        dismissible: true,
      });
    });
  });

  describe("showSuccess", () => {
    it("should call toast.success with message", () => {
      const result = showSuccess("Changes saved");

      expect(toast.success).toHaveBeenCalledWith("Changes saved", {
        description: undefined,
        duration: 3000,
        dismissible: true,
      });
      expect(result).toBe("toast-success-id");
    });

    it("should call toast.success with message and description", () => {
      showSuccess("Team created", "You can now invite members");

      expect(toast.success).toHaveBeenCalledWith("Team created", {
        description: "You can now invite members",
        duration: 3000,
        dismissible: true,
      });
    });
  });

  describe("showWarning", () => {
    it("should call toast.warning with message", () => {
      const result = showWarning("Low disk space");

      expect(toast.warning).toHaveBeenCalledWith("Low disk space", {
        description: undefined,
        duration: 4000,
        dismissible: true,
      });
      expect(result).toBe("toast-warning-id");
    });
  });

  describe("showInfo", () => {
    it("should call toast.info with message", () => {
      const result = showInfo("Feature coming soon");

      expect(toast.info).toHaveBeenCalledWith("Feature coming soon", {
        description: undefined,
        duration: 3000,
        dismissible: true,
      });
      expect(result).toBe("toast-info-id");
    });
  });

  describe("showLoading", () => {
    it("should call toast.loading with message and infinite duration", () => {
      const result = showLoading("Saving changes...");

      expect(toast.loading).toHaveBeenCalledWith("Saving changes...", {
        duration: Infinity,
      });
      expect(result).toBe("toast-loading-id");
    });
  });

  describe("dismissToast", () => {
    it("should call toast.dismiss with toast id", () => {
      dismissToast("my-toast-id");

      expect(toast.dismiss).toHaveBeenCalledWith("my-toast-id");
    });
  });

  describe("dismissAllToasts", () => {
    it("should call toast.dismiss without arguments", () => {
      dismissAllToasts();

      expect(toast.dismiss).toHaveBeenCalledWith();
    });
  });

  describe("showPromise", () => {
    it("should call toast.promise with promise and messages", async () => {
      const promise = Promise.resolve("result");
      const messages = {
        loading: "Loading...",
        success: "Done!",
        error: "Failed",
      };

      const result = showPromise(promise, messages);

      expect(toast.promise).toHaveBeenCalledWith(promise, messages);
      await expect(result).resolves.toBe("result");
    });
  });

  describe("getErrorMessage", () => {
    it("should return fallback for non-Error objects", () => {
      expect(getErrorMessage(null)).toBe("An error occurred");
      expect(getErrorMessage(undefined)).toBe("An error occurred");
      expect(getErrorMessage("string error")).toBe("An error occurred");
      expect(getErrorMessage(123)).toBe("An error occurred");
    });

    it("should return custom fallback", () => {
      expect(getErrorMessage(null, "Custom error")).toBe("Custom error");
    });

    it("should return user-friendly message for network errors", () => {
      expect(getErrorMessage(new Error("fetch failed"))).toBe(
        "Network error. Please check your connection."
      );
      expect(getErrorMessage(new Error("network timeout"))).toBe(
        "Network error. Please check your connection."
      );
    });

    it("should return user-friendly message for auth errors", () => {
      expect(getErrorMessage(new Error("401 Unauthorized"))).toBe(
        "Please sign in to continue."
      );
      expect(getErrorMessage(new Error("unauthorized access"))).toBe(
        "Please sign in to continue."
      );
    });

    it("should return user-friendly message for forbidden errors", () => {
      expect(getErrorMessage(new Error("403 Forbidden"))).toBe(
        "You don't have permission to do this."
      );
      expect(getErrorMessage(new Error("forbidden action"))).toBe(
        "You don't have permission to do this."
      );
    });

    it("should return user-friendly message for not found errors", () => {
      expect(getErrorMessage(new Error("404 Not Found"))).toBe(
        "The requested resource was not found."
      );
    });

    it("should return user-friendly message for server errors", () => {
      expect(getErrorMessage(new Error("500 Internal Server Error"))).toBe(
        "Server error. Please try again later."
      );
      expect(getErrorMessage(new Error("server unavailable"))).toBe(
        "Server error. Please try again later."
      );
    });

    it("should return original message if it is user-friendly", () => {
      expect(getErrorMessage(new Error("Team not found"))).toBe(
        "Team not found"
      );
      expect(getErrorMessage(new Error("Invalid email format"))).toBe(
        "Invalid email format"
      );
    });

    it("should return fallback for technical error messages", () => {
      expect(
        getErrorMessage(
          new Error(
            "Error: TypeError: Cannot read properties of undefined at Object.<anonymous>"
          )
        )
      ).toBe("An error occurred");
    });

    it("should return fallback for very long error messages", () => {
      const longMessage = "A".repeat(150);
      expect(getErrorMessage(new Error(longMessage))).toBe("An error occurred");
    });
  });
});
