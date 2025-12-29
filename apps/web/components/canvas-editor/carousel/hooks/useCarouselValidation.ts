'use client';

import { useMemo } from 'react';
import type {
  CarouselTemplate,
  CarouselValidationResult,
  CarouselValidationError,
} from '@repo/core';
import { validateCarousel, validateDataRowSelection } from '@repo/core';

export interface UseCarouselValidationReturn {
  /** Full validation result */
  result: CarouselValidationResult;
  /** Whether the carousel is valid */
  isValid: boolean;
  /** Whether there are errors */
  hasErrors: boolean;
  /** Whether there are warnings */
  hasWarnings: boolean;
  /** Array of error messages */
  errors: CarouselValidationError[];
  /** Array of warning messages */
  warnings: CarouselValidationError[];
  /** Get errors for a specific card by index */
  getCardErrors: (cardIndex: number) => CarouselValidationError[];
  /** Get errors for a specific field */
  getFieldErrors: (field: string, cardIndex?: number) => CarouselValidationError[];
}

/**
 * useCarouselValidation - Validate carousel template in real-time
 *
 * Provides validation state and helper functions for displaying
 * validation errors in the carousel editor UI.
 */
export function useCarouselValidation(
  template: CarouselTemplate | null
): UseCarouselValidationReturn {
  const result = useMemo((): CarouselValidationResult => {
    if (!template) {
      return { valid: true, errors: [], warnings: [] };
    }
    return validateCarousel(template);
  }, [template]);

  const getCardErrors = useMemo(
    () => (cardIndex: number) =>
      result.errors.filter((e) => e.cardIndex === cardIndex),
    [result.errors]
  );

  const getFieldErrors = useMemo(
    () => (field: string, cardIndex?: number) =>
      result.errors.filter(
        (e) =>
          e.field === field &&
          (cardIndex === undefined || e.cardIndex === cardIndex)
      ),
    [result.errors]
  );

  return {
    result,
    isValid: result.valid,
    hasErrors: result.errors.length > 0,
    hasWarnings: result.warnings.length > 0,
    errors: result.errors,
    warnings: result.warnings,
    getCardErrors,
    getFieldErrors,
  };
}

export interface UseDataRowValidationReturn {
  /** Full validation result */
  result: CarouselValidationResult;
  /** Whether the selection is valid */
  isValid: boolean;
  /** Whether there are errors */
  hasErrors: boolean;
  /** Error messages */
  errors: CarouselValidationError[];
}

/**
 * useDataRowValidation - Validate data row selection for data-driven mode
 */
export function useDataRowValidation(
  selectedCount: number,
  platform: CarouselTemplate['platform']
): UseDataRowValidationReturn {
  const result = useMemo(
    () => validateDataRowSelection(selectedCount, platform),
    [selectedCount, platform]
  );

  return {
    result,
    isValid: result.valid,
    hasErrors: result.errors.length > 0,
    errors: result.errors,
  };
}

export default useCarouselValidation;
