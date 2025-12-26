/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header for data source external push endpoints.
 * Supports both session auth (no API key) and API key auth.
 */

import type { Context, Next } from "hono";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db, dataSources } from "../services/db.js";
import { createUnauthorizedError } from "../lib/errors.js";
import type { DataSourceConfig, ApiKeyConfig } from "@repo/database/schema";

/**
 * API Key prefix for data source keys.
 */
export const API_KEY_PREFIX = "ds_live_";

/**
 * Default rate limit for API key requests (requests per minute).
 */
export const DEFAULT_RATE_LIMIT = 100;

/**
 * API key format validation regex.
 * Format: ds_live_ followed by 64 hex characters (32 bytes).
 */
const API_KEY_REGEX = /^ds_live_[0-9a-f]{64}$/;

/**
 * Context variables set by the API key auth middleware.
 */
export interface ApiKeyAuthContext {
  apiKeyAuth?: {
    dataSourceId: string;
    rateLimit: number;
  };
}

/**
 * Validates an API key format.
 * @param key - The API key to validate
 * @returns true if the key has a valid format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return API_KEY_REGEX.test(key);
}

/**
 * API Key Authentication Middleware Factory.
 *
 * Creates middleware that validates X-API-Key header for data source endpoints.
 * If no API key is provided, the request falls through to normal auth.
 * If an API key is provided, it must be valid for the target data source.
 *
 * @returns Hono middleware function
 */
export function apiKeyAuth() {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header("X-API-Key");

    // No API key provided - fall through to normal auth
    if (!apiKey) {
      return next();
    }

    // Validate key format
    if (!isValidApiKeyFormat(apiKey)) {
      throw createUnauthorizedError("Invalid API key format. Expected format: ds_live_[64 hex chars]");
    }

    // Extract data source ID from route params
    const dataSourceId = c.req.param("id");
    if (!dataSourceId) {
      throw createUnauthorizedError("Invalid API key");
    }

    // Fetch the data source to verify the API key
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, dataSourceId))
      .limit(1);

    if (!dataSource) {
      throw createUnauthorizedError("Data source not found or API key invalid");
    }

    // Check if the data source has an API key configured
    const config = dataSource.config as DataSourceConfig | null;
    const apiKeyConfig = config?.apiKey as ApiKeyConfig | undefined;

    if (!apiKeyConfig || !apiKeyConfig.keyHash) {
      throw createUnauthorizedError("Invalid API key");
    }

    // Verify the API key hash
    const isValid = await bcrypt.compare(apiKey, apiKeyConfig.keyHash);

    if (!isValid) {
      throw createUnauthorizedError("Invalid API key");
    }

    // Update lastUsedAt timestamp (fire and forget - don't block the request)
    const updatedConfig: DataSourceConfig = {
      ...config,
      apiKey: {
        ...apiKeyConfig,
        lastUsedAt: new Date().toISOString(),
      },
    };

    // Update asynchronously without blocking
    // Use try-catch to handle cases where the db mock doesn't support full Promise chain
    try {
      const updatePromise = db.update(dataSources)
        .set({ config: updatedConfig })
        .where(eq(dataSources.id, dataSourceId));

      // Only chain .then() if it's a real Promise
      if (updatePromise && typeof updatePromise.then === "function") {
        updatePromise
          .then(() => {
            // Success - lastUsedAt updated
          })
          .catch((err: Error) => {
            // Log error but don't fail the request
            console.error("[apiKeyAuth] Failed to update lastUsedAt:", err);
          });
      }
    } catch (err) {
      // Log error but don't fail the request
      console.error("[apiKeyAuth] Failed to update lastUsedAt:", err);
    }

    // Set context variables for downstream handlers
    c.set("apiKeyAuth", {
      dataSourceId,
      rateLimit: apiKeyConfig.rateLimit ?? DEFAULT_RATE_LIMIT,
    });

    return next();
  };
}

/**
 * Get API key auth context from the request.
 * Returns undefined if no API key auth was performed.
 */
export function getApiKeyAuth(c: Context): ApiKeyAuthContext["apiKeyAuth"] | undefined {
  return c.get("apiKeyAuth");
}
