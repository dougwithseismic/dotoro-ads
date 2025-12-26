import { useMemo, useCallback } from "react";
import {
  adTypeRegistry,
  initializeAdTypeRegistry,
  type AdTypeDefinition,
  type ContentCategory,
  type CreativeRequirement,
} from "@repo/core/ad-types";
import type { Platform } from "../types";

// Ensure registry is initialized
initializeAdTypeRegistry();

export interface UseAdTypesOptions {
  /** Filter by content category (paid, organic, promoted) */
  category?: ContentCategory;
}

export interface UseAdTypesResult {
  /** Ad types organized by platform */
  adTypes: Record<Platform, AdTypeDefinition[]>;
  /** Get a specific ad type by platform and id */
  getAdType: (platform: Platform, adTypeId: string) => AdTypeDefinition | undefined;
  /** Get required fields for a specific ad type */
  getRequiredFields: (platform: Platform, adTypeId: string) => string[];
  /** Get creative requirements for a specific ad type */
  getCreativeRequirements: (
    platform: Platform,
    adTypeId: string
  ) => CreativeRequirement[];
  /** Get character limits for a specific ad type */
  getCharacterLimits: (
    platform: Platform,
    adTypeId: string
  ) => Record<string, number>;
}

/**
 * Hook to fetch and manage ad types from the registry.
 * Provides filtered ad types by platform and category, with helper methods
 * for accessing field definitions, creative requirements, and character limits.
 *
 * @param platforms - Array of platforms to fetch ad types for
 * @param options - Options for filtering (e.g., by category)
 * @returns Ad types organized by platform with helper methods
 *
 * @example
 * const { adTypes, getAdType } = useAdTypes(['google', 'reddit']);
 * // adTypes.google contains all Google ad types
 * // adTypes.reddit contains all Reddit ad types
 */
export function useAdTypes(
  platforms: Platform[] = [],
  options: UseAdTypesOptions = {}
): UseAdTypesResult {
  const { category } = options;

  // Memoize the ad types fetching to prevent unnecessary recalculations
  const adTypes = useMemo(() => {
    const result: Record<Platform, AdTypeDefinition[]> = {
      google: [],
      reddit: [],
      facebook: [],
    };

    // Handle undefined/null platforms
    if (!platforms || !Array.isArray(platforms)) {
      return result;
    }

    for (const platform of platforms) {
      let types = adTypeRegistry.getByPlatform(platform);

      // Filter by category if specified
      if (category) {
        types = types.filter((type) => type.category === category);
      }

      result[platform] = types;
    }

    return result;
  }, [platforms, category]);

  // Get a specific ad type
  const getAdType = useCallback(
    (platform: Platform, adTypeId: string): AdTypeDefinition | undefined => {
      return adTypeRegistry.get(platform, adTypeId);
    },
    []
  );

  // Get required fields for an ad type
  const getRequiredFields = useCallback(
    (platform: Platform, adTypeId: string): string[] => {
      const adType = adTypeRegistry.get(platform, adTypeId);
      if (!adType) {
        return [];
      }

      return adType.fields
        .filter((field) => field.required)
        .map((field) => field.id);
    },
    []
  );

  // Get creative requirements for an ad type
  const getCreativeRequirements = useCallback(
    (platform: Platform, adTypeId: string): CreativeRequirement[] => {
      const adType = adTypeRegistry.get(platform, adTypeId);
      if (!adType) {
        return [];
      }

      return adType.creatives;
    },
    []
  );

  // Get character limits for an ad type
  const getCharacterLimits = useCallback(
    (platform: Platform, adTypeId: string): Record<string, number> => {
      const adType = adTypeRegistry.get(platform, adTypeId);
      if (!adType) {
        return {};
      }

      return adType.constraints.characterLimits;
    },
    []
  );

  return {
    adTypes,
    getAdType,
    getRequiredFields,
    getCreativeRequirements,
    getCharacterLimits,
  };
}
