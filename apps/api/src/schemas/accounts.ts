import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.js";
import { platformSchema } from "./templates.js";

/**
 * Account Status Enum
 */
export const accountStatusSchema = z.enum(["active", "inactive", "error", "revoked"]);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

/**
 * Platform Schema (for accounts)
 * Re-exports platformSchema from templates for consistency
 */
export const accountPlatformSchema = platformSchema;
export type AccountPlatform = z.infer<typeof accountPlatformSchema>;

/**
 * Ad Account Schema - full representation
 * Note: credentials are never returned in API responses for security
 */
export const adAccountSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  platform: accountPlatformSchema,
  accountId: z.string().max(255),
  accountName: z.string().max(255),
  status: accountStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AdAccount = z.infer<typeof adAccountSchema>;

/**
 * Connect Account Request Schema (OAuth flow)
 */
export const connectAccountRequestSchema = z.object({
  platform: accountPlatformSchema,
  redirectUri: z.string().url(),
});

export type ConnectAccountRequest = z.infer<typeof connectAccountRequestSchema>;

/**
 * Connect Account Response Schema
 */
export const connectAccountResponseSchema = z.object({
  authorizationUrl: z.string().url(),
  state: z.string(),
});

export type ConnectAccountResponse = z.infer<typeof connectAccountResponseSchema>;

/**
 * Account Status Response Schema
 */
export const accountStatusResponseSchema = z.object({
  accountId: uuidSchema,
  platform: accountPlatformSchema,
  status: accountStatusSchema,
  isConnected: z.boolean(),
  tokenExpiresAt: z.string().datetime().nullable(),
  lastChecked: z.string().datetime(),
  error: z.string().nullable(),
});

export type AccountStatusResponse = z.infer<typeof accountStatusResponseSchema>;

/**
 * OAuth Token Schema (internal use, not exposed in API)
 */
export const oauthTokenSchema = z.object({
  id: uuidSchema,
  adAccountId: uuidSchema,
  accessToken: z.string(),
  refreshToken: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  scopes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OAuthToken = z.infer<typeof oauthTokenSchema>;

/**
 * Account List Response
 */
export const accountListResponseSchema = z.object({
  data: z.array(adAccountSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type AccountListResponse = z.infer<typeof accountListResponseSchema>;

/**
 * Account Query Parameters
 */
export const accountQuerySchema = paginationSchema.extend({
  platform: accountPlatformSchema.optional(),
  status: accountStatusSchema.optional(),
});

export type AccountQuery = z.infer<typeof accountQuerySchema>;

/**
 * Disconnect Response Schema
 */
export const disconnectResponseSchema = z.object({
  message: z.string(),
  accountId: uuidSchema,
});

export type DisconnectResponse = z.infer<typeof disconnectResponseSchema>;
