/**
 * Ad Type Registry
 *
 * Central registry for all ad type definitions across platforms.
 * Provides methods to register, retrieve, and filter ad types.
 */

import type { AdTypeDefinition, Platform, ContentCategory } from "./types.js";

/**
 * Registry class for managing ad type definitions
 */
export class AdTypeRegistry {
  private types: Map<string, AdTypeDefinition> = new Map();

  /**
   * Register an ad type in the registry
   * Uses platform:id as the key to allow same id across platforms
   */
  register(adType: AdTypeDefinition): void {
    const key = `${adType.platform}:${adType.id}`;
    this.types.set(key, adType);
  }

  /**
   * Get a specific ad type by platform and id
   */
  get(platform: Platform, adTypeId: string): AdTypeDefinition | undefined {
    return this.types.get(`${platform}:${adTypeId}`);
  }

  /**
   * Get all ad types for a specific platform
   */
  getByPlatform(platform: Platform): AdTypeDefinition[] {
    return Array.from(this.types.values()).filter(
      (type) => type.platform === platform
    );
  }

  /**
   * Get all ad types for a specific category across all platforms
   */
  getByCategory(category: ContentCategory): AdTypeDefinition[] {
    return Array.from(this.types.values()).filter(
      (type) => type.category === category
    );
  }

  /**
   * Get all paid ad types for a specific platform
   */
  getPaidTypes(platform: Platform): AdTypeDefinition[] {
    return this.getByPlatform(platform).filter(
      (type) => type.category === "paid"
    );
  }

  /**
   * Get all organic ad types for a specific platform
   */
  getOrganicTypes(platform: Platform): AdTypeDefinition[] {
    return this.getByPlatform(platform).filter(
      (type) => type.category === "organic"
    );
  }

  /**
   * Get all promoted ad types for a specific platform
   */
  getPromotedTypes(platform: Platform): AdTypeDefinition[] {
    return this.getByPlatform(platform).filter(
      (type) => type.category === "promoted"
    );
  }

  /**
   * Get all registered ad types
   */
  all(): AdTypeDefinition[] {
    return Array.from(this.types.values());
  }

  /**
   * Clear all registered ad types from the registry
   * Useful for testing or reinitializing the registry
   */
  clear(): void {
    this.types.clear();
  }
}

/**
 * Singleton instance of the ad type registry
 */
export const adTypeRegistry = new AdTypeRegistry();
