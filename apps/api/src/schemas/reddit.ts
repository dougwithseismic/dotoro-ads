import { z } from "@hono/zod-openapi";

// ============================================================================
// OAuth Schemas
// ============================================================================

export const redditOAuthCallbackSchema = z.object({
  code: z.string().min(1).openapi({
    description: "Authorization code from Reddit",
    example: "abc123xyz",
  }),
  state: z.string().min(1).openapi({
    description: "State parameter for CSRF protection",
    example: "random-state-string",
  }),
});

export const redditOAuthTokensSchema = z.object({
  accessToken: z.string().openapi({
    description: "Access token for Reddit API",
  }),
  refreshToken: z.string().openapi({
    description: "Refresh token for obtaining new access tokens",
  }),
  expiresAt: z.string().datetime().openapi({
    description: "Token expiration time",
  }),
  scope: z.array(z.string()).openapi({
    description: "Granted scopes",
  }),
});

export const redditOAuthInitSchema = z.object({
  accountId: z.string().uuid().openapi({
    description: "Internal account ID to link with Reddit",
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
  redirectUri: z.string().url().optional().openapi({
    description: "Custom redirect URI (defaults to configured value)",
    example: "https://example.com/callback",
  }),
});

export const redditOAuthInitResponseSchema = z.object({
  authorizationUrl: z.string().url().openapi({
    description: "URL to redirect user to for authorization",
  }),
  state: z.string().openapi({
    description: "State parameter to validate on callback",
  }),
});

// ============================================================================
// Campaign Schemas
// ============================================================================

export const redditCampaignCreateSchema = z.object({
  accountId: z.string().openapi({
    description: "Reddit Ads account ID",
    example: "t5_abc123",
  }),
  name: z.string().max(255).openapi({
    description: "Campaign name",
    example: "My Campaign Q1 2025",
  }),
  objective: z.enum(["AWARENESS", "CONSIDERATION", "CONVERSIONS"]).openapi({
    description: "Campaign objective",
    example: "CONVERSIONS",
  }),
  fundingInstrumentId: z.string().openapi({
    description: "Funding instrument (payment method) ID",
    example: "fi_xyz789",
  }),
  startDate: z.string().datetime().openapi({
    description: "Campaign start date (ISO 8601)",
    example: "2025-02-01T00:00:00Z",
  }),
  endDate: z.string().datetime().optional().openapi({
    description: "Campaign end date (ISO 8601)",
    example: "2025-03-01T00:00:00Z",
  }),
  totalBudgetMicro: z.number().optional().openapi({
    description: "Total budget in micro units (1/1,000,000 of currency)",
    example: 100000000,
  }),
  dailyBudgetMicro: z.number().optional().openapi({
    description: "Daily budget in micro units",
    example: 10000000,
  }),
});

export const redditCampaignResponseSchema = z.object({
  id: z.string().openapi({
    description: "Campaign ID on Reddit platform",
  }),
  accountId: z.string(),
  name: z.string(),
  objective: z.enum(["AWARENESS", "CONSIDERATION", "CONVERSIONS"]),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "DELETED"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  totalBudgetMicro: z.number().nullable(),
  dailyBudgetMicro: z.number().nullable(),
  isPaid: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const redditCampaignUpdateSchema = z.object({
  name: z.string().max(255).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  endDate: z.string().datetime().optional(),
  totalBudgetMicro: z.number().optional(),
  dailyBudgetMicro: z.number().optional(),
});

export const redditCampaignStatusResponseSchema = z.object({
  campaignId: z.string(),
  platformStatus: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "DELETED", "PENDING_REVIEW"]),
  syncStatus: z.enum(["synced", "pending", "error"]),
  lastSyncedAt: z.string().datetime().nullable(),
  errors: z.array(z.string()).optional(),
});

// ============================================================================
// Sync Schemas
// ============================================================================

export const redditSyncRequestSchema = z.object({
  accountId: z.string().openapi({
    description: "Reddit Ads account ID",
  }),
  campaignIds: z.array(z.string()).optional().openapi({
    description: "Specific campaign IDs to sync (syncs all if omitted)",
  }),
  dryRun: z.boolean().optional().default(false).openapi({
    description: "If true, shows what would be synced without executing",
  }),
});

export const redditSyncResponseSchema = z.object({
  success: z.boolean(),
  syncedCount: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  deletedCount: z.number(),
  errors: z.array(
    z.object({
      entityType: z.string(),
      entityId: z.string().optional(),
      message: z.string(),
    })
  ),
  timestamp: z.string().datetime(),
});

// ============================================================================
// Account Schema
// ============================================================================

export const redditAccountIdParamSchema = z.object({
  accountId: z.string().openapi({
    param: {
      name: "accountId",
      in: "path",
    },
    description: "Reddit Ads account ID",
    example: "t5_abc123",
  }),
});

export const redditCampaignIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    description: "Reddit campaign ID",
    example: "camp_123",
  }),
});
