/**
 * AsyncState Type Tests
 *
 * Tests for the discriminated union type and utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  type AsyncState,
  isIdle,
  isLoading,
  isError,
  isSuccess,
  mapSuccess,
  getDataOrDefault,
  getDataOrNull,
  getErrorOrNull,
  idle,
  loading,
  error,
  success,
  AsyncStateHelpers,
} from "../async-state";

describe("AsyncState", () => {
  // ============================================================================
  // Factory Functions
  // ============================================================================

  describe("factory functions", () => {
    it("creates idle state", () => {
      const state = idle<string>();
      expect(state.status).toBe("idle");
    });

    it("creates loading state", () => {
      const state = loading<string>();
      expect(state.status).toBe("loading");
    });

    it("creates error state with message", () => {
      const state = error<string>("Something went wrong");
      expect(state.status).toBe("error");
      expect(state.error).toBe("Something went wrong");
    });

    it("creates success state with data", () => {
      const state = success({ name: "John", age: 30 });
      expect(state.status).toBe("success");
      expect(state.data).toEqual({ name: "John", age: 30 });
    });

    it("supports custom error types", () => {
      interface CustomError {
        code: number;
        message: string;
      }
      const customError: CustomError = { code: 404, message: "Not found" };
      const state = error<string, CustomError>(customError);
      expect(state.status).toBe("error");
      expect(state.error).toEqual(customError);
    });
  });

  // ============================================================================
  // Type Guards
  // ============================================================================

  describe("isIdle", () => {
    it("returns true for idle state", () => {
      const state: AsyncState<string> = { status: "idle" };
      expect(isIdle(state)).toBe(true);
    });

    it("returns false for other states", () => {
      expect(isIdle(loading<string>())).toBe(false);
      expect(isIdle(error<string>("err"))).toBe(false);
      expect(isIdle(success("data"))).toBe(false);
    });
  });

  describe("isLoading", () => {
    it("returns true for loading state", () => {
      const state: AsyncState<string> = { status: "loading" };
      expect(isLoading(state)).toBe(true);
    });

    it("returns false for other states", () => {
      expect(isLoading(idle<string>())).toBe(false);
      expect(isLoading(error<string>("err"))).toBe(false);
      expect(isLoading(success("data"))).toBe(false);
    });
  });

  describe("isError", () => {
    it("returns true for error state", () => {
      const state: AsyncState<string> = { status: "error", error: "Failed" };
      expect(isError(state)).toBe(true);
    });

    it("returns false for other states", () => {
      expect(isError(idle<string>())).toBe(false);
      expect(isError(loading<string>())).toBe(false);
      expect(isError(success("data"))).toBe(false);
    });

    it("narrows type to include error property", () => {
      const state: AsyncState<string> = error("Failed to load");
      if (isError(state)) {
        // TypeScript should know state.error exists here
        expect(state.error).toBe("Failed to load");
      }
    });
  });

  describe("isSuccess", () => {
    it("returns true for success state", () => {
      const state: AsyncState<string> = { status: "success", data: "result" };
      expect(isSuccess(state)).toBe(true);
    });

    it("returns false for other states", () => {
      expect(isSuccess(idle<string>())).toBe(false);
      expect(isSuccess(loading<string>())).toBe(false);
      expect(isSuccess(error<string>("err"))).toBe(false);
    });

    it("narrows type to include data property", () => {
      const state: AsyncState<{ id: number }> = success({ id: 42 });
      if (isSuccess(state)) {
        // TypeScript should know state.data exists here
        expect(state.data.id).toBe(42);
      }
    });
  });

  // ============================================================================
  // Utility Functions
  // ============================================================================

  describe("mapSuccess", () => {
    it("transforms success data", () => {
      const state = success({ name: "John" });
      const mapped = mapSuccess(state, (data) => data.name.toUpperCase());

      expect(isSuccess(mapped)).toBe(true);
      if (isSuccess(mapped)) {
        expect(mapped.data).toBe("JOHN");
      }
    });

    it("passes through non-success states unchanged", () => {
      const idleState = idle<string>();
      const loadingState = loading<string>();
      const errorState = error<string>("Failed");

      expect(mapSuccess(idleState, (s) => s.length)).toEqual({ status: "idle" });
      expect(mapSuccess(loadingState, (s) => s.length)).toEqual({
        status: "loading",
      });
      expect(mapSuccess(errorState, (s) => s.length)).toEqual({
        status: "error",
        error: "Failed",
      });
    });
  });

  describe("getDataOrDefault", () => {
    it("returns data from success state", () => {
      const state = success({ count: 10 });
      const result = getDataOrDefault(state, { count: 0 });
      expect(result).toEqual({ count: 10 });
    });

    it("returns default for non-success states", () => {
      const defaultValue = { count: 0 };

      expect(getDataOrDefault(idle<{ count: number }>(), defaultValue)).toEqual(
        defaultValue
      );
      expect(
        getDataOrDefault(loading<{ count: number }>(), defaultValue)
      ).toEqual(defaultValue);
      expect(
        getDataOrDefault(error<{ count: number }>("err"), defaultValue)
      ).toEqual(defaultValue);
    });
  });

  describe("getDataOrNull", () => {
    it("returns data from success state", () => {
      const state = success("result");
      expect(getDataOrNull(state)).toBe("result");
    });

    it("returns null for non-success states", () => {
      expect(getDataOrNull(idle<string>())).toBeNull();
      expect(getDataOrNull(loading<string>())).toBeNull();
      expect(getDataOrNull(error<string>("err"))).toBeNull();
    });
  });

  describe("getErrorOrNull", () => {
    it("returns error from error state", () => {
      const state = error<string>("Something failed");
      expect(getErrorOrNull(state)).toBe("Something failed");
    });

    it("returns null for non-error states", () => {
      expect(getErrorOrNull(idle<string>())).toBeNull();
      expect(getErrorOrNull(loading<string>())).toBeNull();
      expect(getErrorOrNull(success("data"))).toBeNull();
    });
  });

  // ============================================================================
  // AsyncStateHelpers Object
  // ============================================================================

  describe("AsyncStateHelpers", () => {
    it("exposes all factory functions", () => {
      expect(AsyncStateHelpers.idle).toBe(idle);
      expect(AsyncStateHelpers.loading).toBe(loading);
      expect(AsyncStateHelpers.error).toBe(error);
      expect(AsyncStateHelpers.success).toBe(success);
    });

    it("exposes all type guards", () => {
      expect(AsyncStateHelpers.isIdle).toBe(isIdle);
      expect(AsyncStateHelpers.isLoading).toBe(isLoading);
      expect(AsyncStateHelpers.isError).toBe(isError);
      expect(AsyncStateHelpers.isSuccess).toBe(isSuccess);
    });

    it("exposes all utility functions", () => {
      expect(AsyncStateHelpers.mapSuccess).toBe(mapSuccess);
      expect(AsyncStateHelpers.getDataOrDefault).toBe(getDataOrDefault);
      expect(AsyncStateHelpers.getDataOrNull).toBe(getDataOrNull);
      expect(AsyncStateHelpers.getErrorOrNull).toBe(getErrorOrNull);
    });
  });

  // ============================================================================
  // Type Safety Tests (compile-time checks)
  // ============================================================================

  describe("type safety", () => {
    it("prevents accessing data on non-success states", () => {
      // This test verifies that TypeScript prevents invalid access
      // The actual runtime check is that isSuccess guard is required
      const state: AsyncState<{ id: number }> = idle();

      // Without guard, we can't access data
      // @ts-expect-error - data doesn't exist on idle state
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const invalidAccess = () => state.data;

      // With guard, we can access data
      if (isSuccess(state)) {
        expect(state.data.id).toBeDefined();
      }
    });

    it("prevents accessing error on non-error states", () => {
      const state: AsyncState<string> = success("data");

      // Without guard, we can't access error
      // @ts-expect-error - error doesn't exist on success state
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const invalidAccess = () => state.error;

      // With guard, we can access error
      if (isError(state)) {
        expect(state.error).toBeDefined();
      }
    });
  });

  // ============================================================================
  // Real-World Usage Patterns
  // ============================================================================

  describe("real-world usage patterns", () => {
    interface User {
      id: string;
      name: string;
      email: string;
    }

    it("handles state transitions correctly", () => {
      // Start idle
      let state: AsyncState<User> = idle();
      expect(state.status).toBe("idle");

      // Transition to loading
      state = loading();
      expect(state.status).toBe("loading");

      // Transition to success
      state = success({ id: "1", name: "John", email: "john@example.com" });
      expect(state.status).toBe("success");
      if (isSuccess(state)) {
        expect(state.data.name).toBe("John");
      }

      // Or could transition to error
      state = error("Network error");
      expect(state.status).toBe("error");
      if (isError(state)) {
        expect(state.error).toBe("Network error");
      }
    });

    it("works with switch exhaustiveness checking", () => {
      const state: AsyncState<User> = success({
        id: "1",
        name: "John",
        email: "john@example.com",
      });

      const message: string = (() => {
        switch (state.status) {
          case "idle":
            return "Not started";
          case "loading":
            return "Loading...";
          case "error":
            return `Error: ${state.error}`;
          case "success":
            return `Hello, ${state.data.name}!`;
        }
      })();

      expect(message).toBe("Hello, John!");
    });
  });
});
