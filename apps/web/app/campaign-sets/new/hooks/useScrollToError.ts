"use client";

import { useCallback, useMemo } from "react";

/**
 * Represents a field-level validation error
 */
export interface FieldError {
  /** Unique identifier for the field (matches data-field-id attribute or element id) */
  fieldId: string;
  /** Human-readable error message */
  message: string;
  /** Optional section ID for accordion expansion */
  sectionId?: string;
}

/**
 * Options for the useScrollToError hook
 */
export interface ScrollToErrorOptions {
  /** Array of field errors to track */
  errors?: FieldError[];
  /** Set of currently expanded accordion section IDs */
  expandedSections?: Set<string>;
  /** Callback to expand an accordion section */
  onExpandSection?: (sectionId: string) => void;
  /** Scroll behavior: 'smooth' for animation, 'auto' for instant */
  scrollBehavior?: ScrollBehavior;
  /** Scroll block position: where in the viewport to position the element */
  block?: ScrollLogicalPosition;
  /** Whether to focus the element after scrolling (default: true) */
  focusAfterScroll?: boolean;
  /** Whether to fallback to next error if first element not found (default: false) */
  fallbackToNextError?: boolean;
  /** Callback when scroll completes successfully */
  onScrollComplete?: (fieldId: string) => void;
  /** Callback when error element cannot be found */
  onErrorNotFound?: (fieldId: string) => void;
}

/**
 * Return type for the useScrollToError hook
 */
export interface ScrollToErrorResult {
  /** Function to scroll to the first error field */
  scrollToFirstError: () => void;
  /** Whether there are any errors */
  hasErrors: boolean;
  /** ID of the first error field, if any */
  firstErrorFieldId: string | undefined;
  /** Array of all error field IDs */
  errorFieldIds: string[];
}

/**
 * Delay in ms to wait for accordion section to expand before scrolling
 */
const SECTION_EXPAND_DELAY = 100;

/**
 * Finds an element by various strategies:
 * 1. data-field-id attribute
 * 2. element id
 * 3. aria-describedby containing the field id (for error associations)
 */
function findErrorElement(fieldId: string): HTMLElement | null {
  if (!fieldId) return null;

  // Strategy 1: Find by data-field-id attribute
  let element = document.querySelector<HTMLElement>(
    `[data-field-id="${fieldId}"]`
  );
  if (element) return element;

  // Strategy 2: Find by element id
  element = document.getElementById(fieldId);
  if (element) return element;

  // Strategy 3: Find by aria-describedby containing the field id (for error associations)
  // This looks for inputs that reference error messages like "fieldId-errors"
  element = document.querySelector<HTMLElement>(
    `[aria-describedby*="${fieldId}"]`
  );
  if (element) return element;

  return null;
}

/**
 * Hook to scroll to the first validation error field
 *
 * Features:
 * - Scrolls to the first error field with smooth animation
 * - Focuses the element after scrolling for accessibility
 * - Expands collapsed accordion sections containing errors
 * - Supports multiple element finding strategies (data-field-id, id, aria-describedby)
 * - Configurable scroll behavior and callbacks
 *
 * @example
 * ```tsx
 * const { scrollToFirstError, hasErrors } = useScrollToError({
 *   errors: [{ fieldId: 'campaign-name', message: 'Name is required' }],
 *   expandedSections: expandedSectionsSet,
 *   onExpandSection: (sectionId) => setExpandedSections(prev => new Set([...prev, sectionId])),
 * });
 *
 * // On form submission
 * if (hasErrors) {
 *   scrollToFirstError();
 *   return;
 * }
 * ```
 */
export function useScrollToError(
  options: ScrollToErrorOptions
): ScrollToErrorResult {
  const {
    errors = [],
    expandedSections,
    onExpandSection,
    scrollBehavior = "smooth",
    block = "center",
    focusAfterScroll = true,
    fallbackToNextError = false,
    onScrollComplete,
    onErrorNotFound,
  } = options;

  // Safely handle undefined/null errors
  const safeErrors = errors ?? [];

  // Compute derived values
  const hasErrors = safeErrors.length > 0;
  const firstErrorFieldId = safeErrors[0]?.fieldId;
  const errorFieldIds = useMemo(
    () => safeErrors.map((e) => e.fieldId),
    [safeErrors]
  );

  /**
   * Scrolls to an element and optionally focuses it
   */
  const scrollToElement = useCallback(
    (element: HTMLElement, fieldId: string) => {
      element.scrollIntoView({
        behavior: scrollBehavior,
        block,
      });

      if (focusAfterScroll) {
        element.focus();
      }

      // Call completion callback after a short delay for animation
      if (onScrollComplete) {
        setTimeout(() => {
          onScrollComplete(fieldId);
        }, 100);
      }
    },
    [scrollBehavior, block, focusAfterScroll, onScrollComplete]
  );

  /**
   * Scrolls to the first error field
   * - Expands the accordion section if collapsed
   * - Waits for DOM update before scrolling
   * - Focuses the element for accessibility
   */
  const scrollToFirstError = useCallback(() => {
    if (!hasErrors) return;

    // Find the errors to try (either just first or all if fallback enabled)
    const errorsToTry = fallbackToNextError ? safeErrors : [safeErrors[0]];

    for (const error of errorsToTry) {
      if (!error) continue;

      const { fieldId, sectionId } = error;

      // Check if we need to expand a collapsed section
      const needsExpansion =
        sectionId &&
        expandedSections &&
        onExpandSection &&
        !expandedSections.has(sectionId);

      if (needsExpansion && sectionId) {
        // Expand the section first
        onExpandSection(sectionId);

        // Wait for DOM update then scroll
        setTimeout(() => {
          const element = findErrorElement(fieldId);
          if (element) {
            scrollToElement(element, fieldId);
          } else if (onErrorNotFound) {
            onErrorNotFound(fieldId);
          }
        }, SECTION_EXPAND_DELAY);

        return; // Exit after handling the first expandable error
      }

      // No section expansion needed, try to scroll immediately
      const element = findErrorElement(fieldId);
      if (element) {
        scrollToElement(element, fieldId);
        return; // Found and scrolled, exit
      }

      // Element not found
      if (!fallbackToNextError) {
        if (onErrorNotFound) {
          onErrorNotFound(fieldId);
        }
        return;
      }
      // Continue to next error if fallback enabled
    }

    // If we get here with fallback enabled, no elements were found
    if (fallbackToNextError && onErrorNotFound && safeErrors[0]) {
      onErrorNotFound(safeErrors[0].fieldId);
    }
  }, [
    hasErrors,
    safeErrors,
    fallbackToNextError,
    expandedSections,
    onExpandSection,
    scrollToElement,
    onErrorNotFound,
  ]);

  return {
    scrollToFirstError,
    hasErrors,
    firstErrorFieldId,
    errorFieldIds,
  };
}
