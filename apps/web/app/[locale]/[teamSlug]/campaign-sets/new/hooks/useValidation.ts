"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type {
  HierarchyConfig,
  Platform,
  DataSourceColumn,
  PLATFORM_LIMITS,
} from "../types";
import { interpolatePattern, extractVariables } from "../types";
import { validateUrl, validateDisplayUrl } from "../components/UrlValidator";
import type { ValidationItem, ValidationCategory } from "../components/ValidationSummary";

/**
 * Platform character limits for validation
 */
const LIMITS = {
  google: {
    headline: 30,
    description: 90,
    displayUrl: 30,
  },
  reddit: {
    headline: 100,
    description: 500,
    displayUrl: 25,
  },
  facebook: {
    headline: 40,
    description: 125,
    displayUrl: 30,
  },
} as const;

interface FieldValidation {
  hasError: boolean;
  hasWarning: boolean;
  errors: string[];
  warnings: string[];
}

interface UseValidationOptions {
  hierarchyConfig: HierarchyConfig | null;
  sampleData: Record<string, unknown>[];
  selectedPlatforms: Platform[];
  availableColumns: DataSourceColumn[];
}

interface UseValidationResult {
  isValidating: boolean;
  errors: ValidationItem[];
  warnings: ValidationItem[];
  errorsByField: Map<string, ValidationItem[]>;
  categories: ValidationCategory;
  getFieldValidation: (field: string, adGroupIndex: number, adIndex: number) => FieldValidation;
}

/**
 * Get the most restrictive limit for a field across selected platforms
 */
function getMostRestrictiveLimit(
  field: "headline" | "description" | "displayUrl",
  platforms: Platform[]
): number {
  if (platforms.length === 0) return Infinity;

  let minLimit = Infinity;
  for (const platform of platforms) {
    const platformLimits = LIMITS[platform];
    if (platformLimits && platformLimits[field] !== undefined) {
      minLimit = Math.min(minLimit, platformLimits[field]);
    }
  }

  return minLimit === Infinity ? 100 : minLimit;
}

/**
 * Check if a pattern contains only variable references
 */
function isVariablePattern(value: string): boolean {
  return /^\{[^}]+\}$/.test(value.trim());
}

/**
 * useValidation - Real-time validation hook for campaign set wizard.
 *
 * Validates:
 * - Character limits against platform constraints
 * - URL format (HTTPS requirement for finalUrl)
 * - Variable references exist in data source
 * - Interpolated sample data values
 *
 * Features:
 * - Debounced validation (300ms) to avoid performance issues
 * - Cached results to prevent unnecessary re-computation
 * - Platform-aware limits (uses most restrictive)
 *
 * @example
 * const { errors, warnings, getFieldValidation } = useValidation({
 *   hierarchyConfig,
 *   sampleData,
 *   selectedPlatforms: ["google", "reddit"],
 *   availableColumns,
 * });
 */
export function useValidation({
  hierarchyConfig,
  sampleData,
  selectedPlatforms,
  availableColumns,
}: UseValidationOptions): UseValidationResult {
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState<ValidationItem[]>([]);
  const [warnings, setWarnings] = useState<ValidationItem[]>([]);

  // Cache key for memoization
  const cacheKeyRef = useRef<string>("");
  const cachedResultRef = useRef<{ errors: ValidationItem[]; warnings: ValidationItem[] }>({
    errors: [],
    warnings: [],
  });

  // Generate cache key
  const currentCacheKey = useMemo(() => {
    return JSON.stringify({
      hierarchyConfig,
      sampleDataLength: sampleData.length,
      selectedPlatforms,
      columnsCount: availableColumns.length,
    });
  }, [hierarchyConfig, sampleData.length, selectedPlatforms, availableColumns.length]);

  // Validate function
  const validate = useCallback(() => {
    if (!hierarchyConfig) {
      setErrors([]);
      setWarnings([]);
      return;
    }

    // Check cache
    if (currentCacheKey === cacheKeyRef.current) {
      setErrors(cachedResultRef.current.errors);
      setWarnings(cachedResultRef.current.warnings);
      return;
    }

    const newErrors: ValidationItem[] = [];
    const newWarnings: ValidationItem[] = [];
    const columnNames = new Set(availableColumns.map((c) => c.name.toLowerCase()));

    // Limits for validation
    const headlineLimit = getMostRestrictiveLimit("headline", selectedPlatforms);
    const descriptionLimit = getMostRestrictiveLimit("description", selectedPlatforms);
    const displayUrlLimit = getMostRestrictiveLimit("displayUrl", selectedPlatforms);

    // Validate each ad group
    hierarchyConfig.adGroups.forEach((adGroup, adGroupIndex) => {
      // Validate ad group name pattern - variable reference check
      const nameVars = extractVariables(adGroup.namePattern);
      for (const varName of nameVars) {
        if (!columnNames.has(varName.toLowerCase())) {
          newErrors.push({
            field: "namePattern",
            message: `Variable "{${varName}}" not found in data source columns`,
            step: "hierarchy",
            adGroupIndex,
            severity: "error",
          });
        }
      }

      // Validate each ad
      adGroup.ads.forEach((ad, adIndex) => {
        // --- Headline validation ---
        if (ad.headline) {
          // Check variable references
          const headlineVars = extractVariables(ad.headline);
          for (const varName of headlineVars) {
            if (!columnNames.has(varName.toLowerCase())) {
              newErrors.push({
                field: "headline",
                message: `Variable "{${varName}}" not found in data source columns`,
                step: "hierarchy",
                adGroupIndex,
                adIndex,
                severity: "error",
              });
            }
          }

          // Check character limit for static text
          if (!isVariablePattern(ad.headline) && ad.headline.length > headlineLimit) {
            newErrors.push({
              field: "headline",
              message: `Headline exceeds ${headlineLimit} character limit (${ad.headline.length}/${headlineLimit})`,
              step: "hierarchy",
              adGroupIndex,
              adIndex,
              severity: "error",
            });
          }

          // Check interpolated values from sample data
          if (headlineVars.length > 0 && sampleData.length > 0) {
            let rowsExceeding = 0;
            for (const row of sampleData) {
              const interpolated = interpolatePattern(ad.headline, row);
              if (interpolated.length > headlineLimit) {
                rowsExceeding++;
              }
            }
            if (rowsExceeding > 0) {
              newErrors.push({
                field: "headline",
                message: `${rowsExceeding} row${rowsExceeding !== 1 ? "s" : ""} exceed headline limit (${headlineLimit} chars)`,
                step: "hierarchy",
                adGroupIndex,
                adIndex,
                severity: "error",
              });
            }
          }
        }

        // --- Description validation ---
        if (ad.description) {
          const descVars = extractVariables(ad.description);
          for (const varName of descVars) {
            if (!columnNames.has(varName.toLowerCase())) {
              newErrors.push({
                field: "description",
                message: `Variable "{${varName}}" not found in data source columns`,
                step: "hierarchy",
                adGroupIndex,
                adIndex,
                severity: "error",
              });
            }
          }

          if (!isVariablePattern(ad.description) && ad.description.length > descriptionLimit) {
            newErrors.push({
              field: "description",
              message: `Description exceeds ${descriptionLimit} character limit (${ad.description.length}/${descriptionLimit})`,
              step: "hierarchy",
              adGroupIndex,
              adIndex,
              severity: "error",
            });
          }

          // Check interpolated values
          if (descVars.length > 0 && sampleData.length > 0) {
            let rowsExceeding = 0;
            for (const row of sampleData) {
              const interpolated = interpolatePattern(ad.description, row);
              if (interpolated.length > descriptionLimit) {
                rowsExceeding++;
              }
            }
            if (rowsExceeding > 0) {
              newErrors.push({
                field: "description",
                message: `${rowsExceeding} row${rowsExceeding !== 1 ? "s" : ""} exceed description limit (${descriptionLimit} chars)`,
                step: "hierarchy",
                adGroupIndex,
                adIndex,
                severity: "error",
              });
            }
          }
        }

        // --- Display URL validation ---
        if (ad.displayUrl) {
          const displayUrlVars = extractVariables(ad.displayUrl);
          for (const varName of displayUrlVars) {
            if (!columnNames.has(varName.toLowerCase())) {
              newErrors.push({
                field: "displayUrl",
                message: `Variable "{${varName}}" not found in data source columns`,
                step: "hierarchy",
                adGroupIndex,
                adIndex,
                severity: "error",
              });
            }
          }

          if (!isVariablePattern(ad.displayUrl)) {
            const urlValidation = validateDisplayUrl(ad.displayUrl, displayUrlLimit);
            if (!urlValidation.valid) {
              for (const error of urlValidation.errors) {
                newErrors.push({
                  field: "displayUrl",
                  message: error,
                  step: "hierarchy",
                  adGroupIndex,
                  adIndex,
                  severity: "error",
                });
              }
            }
          }
        }

        // --- Final URL validation ---
        if (ad.finalUrl) {
          const finalUrlVars = extractVariables(ad.finalUrl);
          for (const varName of finalUrlVars) {
            if (!columnNames.has(varName.toLowerCase())) {
              newErrors.push({
                field: "finalUrl",
                message: `Variable "{${varName}}" not found in data source columns`,
                step: "hierarchy",
                adGroupIndex,
                adIndex,
                severity: "error",
              });
            }
          }

          if (!isVariablePattern(ad.finalUrl)) {
            const urlValidation = validateUrl(ad.finalUrl);
            if (!urlValidation.valid) {
              for (const error of urlValidation.errors) {
                newErrors.push({
                  field: "finalUrl",
                  message: error,
                  step: "hierarchy",
                  adGroupIndex,
                  adIndex,
                  severity: "error",
                });
              }
            }
          }
        }
      });
    });

    // Update cache
    cacheKeyRef.current = currentCacheKey;
    cachedResultRef.current = { errors: newErrors, warnings: newWarnings };

    setErrors(newErrors);
    setWarnings(newWarnings);
  }, [hierarchyConfig, sampleData, selectedPlatforms, availableColumns, currentCacheKey]);

  // Debounced validation effect
  useEffect(() => {
    setIsValidating(true);
    const timeout = setTimeout(() => {
      validate();
      setIsValidating(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [validate]);

  // Build errorsByField map
  const errorsByField = useMemo(() => {
    const map = new Map<string, ValidationItem[]>();
    for (const error of errors) {
      const key = `${error.field}-${error.adGroupIndex ?? ""}-${error.adIndex ?? ""}`;
      const existing = map.get(key) || [];
      existing.push(error);
      map.set(key, existing);
    }
    return map;
  }, [errors]);

  // Build categories for ValidationSummary
  const categories = useMemo<ValidationCategory>(() => {
    const characterLimits: ValidationItem[] = [];
    const urlFormat: ValidationItem[] = [];
    const requiredFields: ValidationItem[] = [];
    const variableReferences: ValidationItem[] = [];

    for (const error of errors) {
      if (error.message.includes("character") || error.message.includes("exceed")) {
        characterLimits.push(error);
      } else if (error.message.includes("URL") || error.message.includes("HTTPS")) {
        urlFormat.push(error);
      } else if (error.message.includes("required")) {
        requiredFields.push(error);
      } else if (error.message.includes("Variable") || error.message.includes("not found")) {
        variableReferences.push(error);
      } else {
        // Default to character limits for uncategorized
        characterLimits.push(error);
      }
    }

    return {
      characterLimits,
      urlFormat,
      requiredFields,
      variableReferences,
      warnings,
    };
  }, [errors, warnings]);

  // Get validation for a specific field
  const getFieldValidation = useCallback(
    (field: string, adGroupIndex: number, adIndex: number): FieldValidation => {
      const key = `${field}-${adGroupIndex}-${adIndex}`;
      const fieldErrors = errorsByField.get(key) || [];
      const fieldWarnings = warnings.filter(
        (w) =>
          w.field === field &&
          w.adGroupIndex === adGroupIndex &&
          w.adIndex === adIndex
      );

      return {
        hasError: fieldErrors.length > 0,
        hasWarning: fieldWarnings.length > 0,
        errors: fieldErrors.map((e) => e.message),
        warnings: fieldWarnings.map((w) => w.message),
      };
    },
    [errorsByField, warnings]
  );

  return {
    isValidating,
    errors,
    warnings,
    errorsByField,
    categories,
    getFieldValidation,
  };
}

export default useValidation;
