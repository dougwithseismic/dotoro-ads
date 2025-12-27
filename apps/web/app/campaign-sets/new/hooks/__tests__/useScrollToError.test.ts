import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useScrollToError,
  type ScrollToErrorOptions,
  type FieldError,
} from "../useScrollToError";

// Mock scrollIntoView and focus for testing
const mockScrollIntoView = vi.fn();
const mockFocus = vi.fn();

// Helper to clear all children from body
function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

// Create a mock element
function createMockElement(
  id: string,
  options: {
    sectionId?: string;
    isVisible?: boolean;
  } = {}
): HTMLElement {
  const element = document.createElement("input");
  element.id = id;
  element.setAttribute("data-field-id", id);
  if (options.sectionId) {
    element.setAttribute("data-section-id", options.sectionId);
  }
  element.scrollIntoView = mockScrollIntoView;
  element.focus = mockFocus;
  return element;
}

// Mock accordion section toggle function
type ToggleSection = (sectionId: string) => void;

describe("useScrollToError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any elements from previous tests
    clearBody();
  });

  afterEach(() => {
    clearBody();
  });

  // ==========================================================================
  // Basic Functionality Tests
  // ==========================================================================

  describe("Basic Functionality", () => {
    it("returns scrollToFirstError function", () => {
      const { result } = renderHook(() => useScrollToError({}));

      expect(result.current.scrollToFirstError).toBeDefined();
      expect(typeof result.current.scrollToFirstError).toBe("function");
    });

    it("returns hasErrors boolean", () => {
      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "test-field", message: "Required" }],
        })
      );

      expect(result.current.hasErrors).toBe(true);
    });

    it("returns hasErrors as false when no errors", () => {
      const { result } = renderHook(() =>
        useScrollToError({
          errors: [],
        })
      );

      expect(result.current.hasErrors).toBe(false);
    });

    it("returns firstErrorFieldId when errors exist", () => {
      const { result } = renderHook(() =>
        useScrollToError({
          errors: [
            { fieldId: "field-1", message: "Error 1" },
            { fieldId: "field-2", message: "Error 2" },
          ],
        })
      );

      expect(result.current.firstErrorFieldId).toBe("field-1");
    });
  });

  // ==========================================================================
  // Scroll Behavior Tests
  // ==========================================================================

  describe("Scroll Behavior", () => {
    it("scrolls to the first error field", async () => {
      const element = createMockElement("campaign-set-name");
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Name is required" }],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
      });
    });

    it("focuses the error element after scrolling", async () => {
      const element = createMockElement("campaign-set-name");
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Name is required" }],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      // Focus should be called after scrollIntoView
      expect(mockFocus).toHaveBeenCalled();
    });

    it("does nothing when no errors exist", () => {
      const { result } = renderHook(() =>
        useScrollToError({
          errors: [],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).not.toHaveBeenCalled();
      expect(mockFocus).not.toHaveBeenCalled();
    });

    it("does nothing when error element is not found", () => {
      // No element in the DOM

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "non-existent-field", message: "Error" }],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).not.toHaveBeenCalled();
      expect(mockFocus).not.toHaveBeenCalled();
    });

    it("scrolls to element by id when data-field-id not found", () => {
      const element = document.createElement("input");
      element.id = "campaign-set-name";
      element.scrollIntoView = mockScrollIntoView;
      element.focus = mockFocus;
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Name is required" }],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Accordion Section Expansion Tests
  // ==========================================================================

  describe("Accordion Section Expansion", () => {
    it("expands collapsed accordion section containing error", () => {
      const element = createMockElement("campaign-set-name", {
        sectionId: "campaign-set-name-section",
      });
      document.body.appendChild(element);

      const expandedSections = new Set<string>();
      const onExpandSection: ToggleSection = vi.fn((sectionId: string) => {
        expandedSections.add(sectionId);
      });

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Name is required", sectionId: "campaign-set-name-section" }],
          expandedSections,
          onExpandSection,
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(onExpandSection).toHaveBeenCalledWith("campaign-set-name-section");
    });

    it("does not expand section if already expanded", () => {
      const element = createMockElement("campaign-set-name", {
        sectionId: "campaign-set-name-section",
      });
      document.body.appendChild(element);

      const expandedSections = new Set(["campaign-set-name-section"]);
      const onExpandSection: ToggleSection = vi.fn();

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Name is required", sectionId: "campaign-set-name-section" }],
          expandedSections,
          onExpandSection,
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(onExpandSection).not.toHaveBeenCalled();
    });

    it("waits for section to expand before scrolling", async () => {
      vi.useFakeTimers();

      const element = createMockElement("campaign-set-name", {
        sectionId: "campaign-set-name-section",
      });
      document.body.appendChild(element);

      const expandedSections = new Set<string>();
      const onExpandSection: ToggleSection = vi.fn();

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Name is required", sectionId: "campaign-set-name-section" }],
          expandedSections,
          onExpandSection,
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      // Section expansion should be called first
      expect(onExpandSection).toHaveBeenCalledWith("campaign-set-name-section");

      // Scroll and focus should happen after a delay for DOM update
      expect(mockScrollIntoView).not.toHaveBeenCalled();

      // Advance timer to allow for section expansion
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(mockScrollIntoView).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // Error Field Mapping Tests
  // ==========================================================================

  describe("Error Field Mapping", () => {
    it("finds element using data-field-id attribute", () => {
      const element = createMockElement("my-field");
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "my-field", message: "Error" }],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalled();
    });

    it("falls back to element id when data-field-id not found", () => {
      const element = document.createElement("input");
      element.id = "my-field";
      element.scrollIntoView = mockScrollIntoView;
      element.focus = mockFocus;
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "my-field", message: "Error" }],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalled();
    });

    it("finds element using aria-describedby containing error id", () => {
      const element = document.createElement("input");
      element.setAttribute("aria-describedby", "my-field-errors other-info");
      element.scrollIntoView = mockScrollIntoView;
      element.focus = mockFocus;
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "my-field", message: "Error" }],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Configuration Options Tests
  // ==========================================================================

  describe("Configuration Options", () => {
    it("uses custom scroll behavior when provided", () => {
      const element = createMockElement("campaign-set-name");
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Error" }],
          scrollBehavior: "auto",
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: "auto",
        block: "center",
      });
    });

    it("uses custom block position when provided", () => {
      const element = createMockElement("campaign-set-name");
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Error" }],
          block: "start",
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });

    it("skips focus when focusAfterScroll is false", () => {
      const element = createMockElement("campaign-set-name");
      document.body.appendChild(element);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Error" }],
          focusAfterScroll: false,
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalled();
      expect(mockFocus).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Error Updates Tests
  // ==========================================================================

  describe("Error Updates", () => {
    it("updates firstErrorFieldId when errors change", () => {
      const { result, rerender } = renderHook(
        (props: ScrollToErrorOptions) => useScrollToError(props),
        {
          initialProps: {
            errors: [{ fieldId: "field-1", message: "Error 1" }],
          },
        }
      );

      expect(result.current.firstErrorFieldId).toBe("field-1");

      rerender({
        errors: [{ fieldId: "field-2", message: "Error 2" }],
      });

      expect(result.current.firstErrorFieldId).toBe("field-2");
    });

    it("updates hasErrors when errors are cleared", () => {
      const { result, rerender } = renderHook(
        (props: ScrollToErrorOptions) => useScrollToError(props),
        {
          initialProps: {
            errors: [{ fieldId: "field-1", message: "Error 1" }],
          },
        }
      );

      expect(result.current.hasErrors).toBe(true);

      rerender({
        errors: [],
      });

      expect(result.current.hasErrors).toBe(false);
    });
  });

  // ==========================================================================
  // Multiple Errors Tests
  // ==========================================================================

  describe("Multiple Errors", () => {
    it("scrolls to first error when multiple errors exist", () => {
      const element1 = createMockElement("field-1");
      const element2 = createMockElement("field-2");
      document.body.appendChild(element1);
      document.body.appendChild(element2);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [
            { fieldId: "field-1", message: "Error 1" },
            { fieldId: "field-2", message: "Error 2" },
          ],
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      // Should only scroll once, to the first error
      expect(mockScrollIntoView).toHaveBeenCalledTimes(1);
    });

    it("returns all error field IDs", () => {
      const { result } = renderHook(() =>
        useScrollToError({
          errors: [
            { fieldId: "field-1", message: "Error 1" },
            { fieldId: "field-2", message: "Error 2" },
            { fieldId: "field-3", message: "Error 3" },
          ],
        })
      );

      expect(result.current.errorFieldIds).toEqual([
        "field-1",
        "field-2",
        "field-3",
      ]);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles undefined errors gracefully", () => {
      const { result } = renderHook(() =>
        useScrollToError({
          errors: undefined as unknown as FieldError[],
        })
      );

      expect(result.current.hasErrors).toBe(false);
      expect(result.current.firstErrorFieldId).toBeUndefined();

      // Should not throw
      act(() => {
        result.current.scrollToFirstError();
      });
    });

    it("handles empty string fieldId", () => {
      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "", message: "Error" }],
        })
      );

      // Empty fieldId should still be counted as an error
      expect(result.current.hasErrors).toBe(true);

      // But scrollToFirstError should handle it gracefully
      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });

    it("scrolls to second error if first element not found", () => {
      // Only add the second element
      const element2 = createMockElement("field-2");
      document.body.appendChild(element2);

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [
            { fieldId: "field-1", message: "Error 1" },
            { fieldId: "field-2", message: "Error 2" },
          ],
          fallbackToNextError: true,
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe("Callbacks", () => {
    it("calls onScrollComplete callback after scrolling", async () => {
      vi.useFakeTimers();

      const element = createMockElement("campaign-set-name");
      document.body.appendChild(element);

      const onScrollComplete = vi.fn();

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "campaign-set-name", message: "Error" }],
          onScrollComplete,
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      // Callback should be called after scroll completes
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(onScrollComplete).toHaveBeenCalledWith("campaign-set-name");

      vi.useRealTimers();
    });

    it("calls onErrorNotFound when element cannot be found", () => {
      const onErrorNotFound = vi.fn();

      const { result } = renderHook(() =>
        useScrollToError({
          errors: [{ fieldId: "non-existent", message: "Error" }],
          onErrorNotFound,
        })
      );

      act(() => {
        result.current.scrollToFirstError();
      });

      expect(onErrorNotFound).toHaveBeenCalledWith("non-existent");
    });
  });
});
