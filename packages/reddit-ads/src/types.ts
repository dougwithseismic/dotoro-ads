import { z } from "zod";

// ============================================================================
// OAuth Types
// ============================================================================

// Reddit Ads API scopes
export const OAuthScopesSchema = z.enum([
  "adsread",
  "adsconversions",
  "history",
  "adsedit",
  "read",
]);
export type OAuthScope = z.infer<typeof OAuthScopesSchema>;

export const OAuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal("bearer"),
  expiresIn: z.number(),
  expiresAt: z.date(),
  scope: z.array(OAuthScopesSchema),
});
export type OAuthTokens = z.infer<typeof OAuthTokensSchema>;

export const OAuthStateSchema = z.object({
  state: z.string(),
  codeVerifier: z.string().optional(),
  redirectUri: z.string(),
  createdAt: z.date(),
});
export type OAuthState = z.infer<typeof OAuthStateSchema>;

// ============================================================================
// Campaign Types
// ============================================================================

// Reddit v3 API campaign objectives
export const CampaignObjectiveSchema = z.enum([
  "APP_INSTALLS",
  "CATALOG_SALES",
  "CLICKS",
  "CONVERSIONS",
  "IMPRESSIONS",
  "LEAD_GENERATION",
  "VIDEO_VIEWABLE_IMPRESSIONS",
]);
export type CampaignObjective = z.infer<typeof CampaignObjectiveSchema>;

// Reddit v3 API uses configured_status
export const CampaignConfiguredStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
]);
export type CampaignConfiguredStatus = z.infer<typeof CampaignConfiguredStatusSchema>;

// Legacy status enum for backward compatibility
export const CampaignStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "DELETED",
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

// Reddit v3 API special ad categories
export const SpecialAdCategorySchema = z.enum([
  "NONE",
  "HOUSING",
  "EMPLOYMENT",
  "CREDIT",
]);
export type SpecialAdCategory = z.infer<typeof SpecialAdCategorySchema>;

// Base campaign schema for Reddit v3 API
const RedditCampaignBaseSchema = z.object({
  name: z.string().max(255),
  objective: CampaignObjectiveSchema,
  configured_status: CampaignConfiguredStatusSchema,
  special_ad_categories: z.array(SpecialAdCategorySchema), // Required in v3 API
  funding_instrument_id: z.string().optional(), // Optional in v3 API
  total_budget_micro: z.number().optional(),
  daily_budget_micro: z.number().optional(),
  is_paid: z.boolean().optional(),
  view_through_attribution_window_days: z.number().min(1).max(30).optional(),
  click_through_attribution_window_days: z.number().min(1).max(30).optional(),
});

// Full campaign schema
export const RedditCampaignSchema = RedditCampaignBaseSchema;
export type RedditCampaign = z.infer<typeof RedditCampaignSchema>;

// Update schema includes status for pause/activate operations
export const UpdateCampaignSchema = RedditCampaignBaseSchema.partial().refine(
  () => true, // No validation needed for partial updates
  { message: "End date must be after start date" }
);
export type UpdateCampaign = z.infer<typeof UpdateCampaignSchema>;

export const CampaignResponseSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  name: z.string(),
  objective: CampaignObjectiveSchema,
  funding_instrument_id: z.string().nullable().optional(), // Optional in v3 API
  status: CampaignStatusSchema,
  start_date: z.string(),
  end_date: z.string().nullable(),
  total_budget_micro: z.number().nullable(),
  daily_budget_micro: z.number().nullable(),
  is_paid: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CampaignResponse = z.infer<typeof CampaignResponseSchema>;

export const CampaignFiltersSchema = z.object({
  status: CampaignStatusSchema.optional(),
  objective: CampaignObjectiveSchema.optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});
export type CampaignFilters = z.infer<typeof CampaignFiltersSchema>;

// ============================================================================
// Ad Group Types
// ============================================================================

export const AdGroupStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "DELETED",
]);
export type AdGroupStatus = z.infer<typeof AdGroupStatusSchema>;

// Reddit v3 API bid strategies
export const BidStrategySchema = z.enum([
  "BIDLESS",
  "MANUAL_BIDDING",
  "MAXIMIZE_VOLUME",
  "TARGET_CPX",
]);
export type BidStrategy = z.infer<typeof BidStrategySchema>;

// Reddit v3 API bid types (required for ad groups)
export const BidTypeSchema = z.enum([
  "CPC",  // Cost per click
  "CPM",  // Cost per mille (thousand impressions)
  "CPV",  // Cost per view
]);
export type BidType = z.infer<typeof BidTypeSchema>;

// Ad group configured status for v3 API
export const AdGroupConfiguredStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
]);
export type AdGroupConfiguredStatus = z.infer<typeof AdGroupConfiguredStatusSchema>;

// Reddit v3 API goal types for budget allocation
export const GoalTypeSchema = z.enum([
  "DAILY_SPEND",
  "LIFETIME_SPEND",
]);
export type GoalType = z.infer<typeof GoalTypeSchema>;

// Reddit v3 API ad group schema - uses configured_status instead of start_date
export const RedditAdGroupSchema = z.object({
  name: z.string().max(255),
  campaign_id: z.string(),
  bid_strategy: BidStrategySchema,
  bid_type: BidTypeSchema, // Required in v3 API
  configured_status: AdGroupConfiguredStatusSchema,
  bid_value: z.number().optional(), // v3 API uses bid_value, not bid_micro
  goal_type: GoalTypeSchema.optional(), // Required for budget in v3 API
  goal_value: z.number().optional(), // Budget amount in micro-units
  start_time: z.string().optional(), // ISO format with timezone
  end_time: z.string().optional(), // ISO format with timezone
  targeting: z.object({
    subreddits: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    devices: z.array(z.enum(["DESKTOP", "MOBILE", "TABLET"])).optional(),
  }).optional(),
});
export type RedditAdGroup = z.infer<typeof RedditAdGroupSchema>;

// Update schema includes status for pause/activate operations
export const UpdateAdGroupSchema = RedditAdGroupSchema.partial().extend({
  status: AdGroupStatusSchema.optional(),
});
export type UpdateAdGroup = z.infer<typeof UpdateAdGroupSchema>;

export const AdGroupResponseSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  campaign_id: z.string(),
  name: z.string(),
  status: AdGroupStatusSchema,
  configured_status: AdGroupConfiguredStatusSchema.optional(),
  bid_strategy: BidStrategySchema,
  bid_type: BidTypeSchema.optional(),
  bid_value: z.number().nullable(), // v3 API uses bid_value
  goal_type: GoalTypeSchema.optional(),
  goal_value: z.number().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdGroupResponse = z.infer<typeof AdGroupResponseSchema>;

export const AdGroupFiltersSchema = z.object({
  status: AdGroupStatusSchema.optional(),
  campaign_id: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});
export type AdGroupFilters = z.infer<typeof AdGroupFiltersSchema>;

// ============================================================================
// Ad Types
// ============================================================================

export const AdStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "PENDING_REVIEW",
  "REJECTED",
  "DELETED",
]);
export type AdStatus = z.infer<typeof AdStatusSchema>;

export const CallToActionSchema = z.enum([
  "LEARN_MORE",
  "SIGN_UP",
  "SHOP_NOW",
  "DOWNLOAD",
  "INSTALL",
  "GET_QUOTE",
  "CONTACT_US",
  "BOOK_NOW",
  "APPLY_NOW",
  "WATCH_MORE",
  "GET_STARTED",
  "SUBSCRIBE",
  "ORDER_NOW",
  "SEE_MORE",
  "VIEW_MORE",
  "PLAY_NOW",
]);
export type CallToAction = z.infer<typeof CallToActionSchema>;

export const RedditAdSchema = z.object({
  name: z.string().max(255),
  ad_group_id: z.string(),
  headline: z.string().max(100),
  body: z.string().max(500).optional(),
  click_url: z.string().url(),
  display_url: z.string().max(25).optional(),
  call_to_action: CallToActionSchema,
  creative_id: z.string().optional(),
});
export type RedditAd = z.infer<typeof RedditAdSchema>;

// Update schema includes status for pause/activate operations
export const UpdateAdSchema = RedditAdSchema.partial().extend({
  status: AdStatusSchema.optional(),
});
export type UpdateAd = z.infer<typeof UpdateAdSchema>;

export const AdResponseSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  ad_group_id: z.string(),
  name: z.string(),
  status: AdStatusSchema,
  headline: z.string(),
  body: z.string().nullable(),
  click_url: z.string(),
  display_url: z.string().nullable(),
  call_to_action: CallToActionSchema,
  creative_id: z.string().nullable(),
  rejection_reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdResponse = z.infer<typeof AdResponseSchema>;

export const AdFiltersSchema = z.object({
  status: AdStatusSchema.optional(),
  ad_group_id: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});
export type AdFilters = z.infer<typeof AdFiltersSchema>;

// ============================================================================
// Creative Types
// ============================================================================

export const CreativeTypeSchema = z.enum([
  "IMAGE",
  "VIDEO",
  "CAROUSEL",
]);
export type CreativeType = z.infer<typeof CreativeTypeSchema>;

export const CreativeStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "DELETED",
]);
export type CreativeStatus = z.infer<typeof CreativeStatusSchema>;

export const CreativeUploadSchema = z.object({
  name: z.string().max(255),
  type: CreativeTypeSchema,
  file_path: z.string().optional(),
  file_url: z.string().url().optional(),
  file_buffer: z.instanceof(Buffer).optional(),
  mime_type: z.enum(["image/jpeg", "image/png", "image/gif"]).optional(),
}).refine(
  (data) => data.file_path || data.file_url || data.file_buffer,
  { message: "Must provide file_path, file_url, or file_buffer" }
);
export type CreativeUpload = z.infer<typeof CreativeUploadSchema>;

export const CreativeResponseSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  name: z.string(),
  type: CreativeTypeSchema,
  status: CreativeStatusSchema,
  url: z.string(),
  width: z.number(),
  height: z.number(),
  file_size: z.number(),
  rejection_reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CreativeResponse = z.infer<typeof CreativeResponseSchema>;

// ============================================================================
// Error Types
// ============================================================================

export const RedditApiErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "INVALID_TOKEN",
  "EXPIRED_TOKEN",
  "RATE_LIMIT_EXCEEDED",
  "RESOURCE_NOT_FOUND",
  "VALIDATION_ERROR",
  "PERMISSION_DENIED",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
]);
export type RedditApiErrorCode = z.infer<typeof RedditApiErrorCodeSchema>;

export interface RedditApiError {
  code: RedditApiErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  retryable: boolean;
  retryAfter?: number; // seconds
}

export class RedditApiException extends Error {
  public readonly code: RedditApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;

  constructor(error: RedditApiError) {
    super(error.message);
    this.name = "RedditApiException";
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.details = error.details;
    this.retryable = error.retryable;
    this.retryAfter = error.retryAfter;
  }

  toJSON(): RedditApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
    };
  }
}

// ============================================================================
// Rate Limiter Types
// ============================================================================

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number; // 10 minutes = 600000ms
}

export interface RequestQueueItem {
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  priority: number;
  addedAt: number;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface RedditApiResponse<T> {
  data: T;
  pagination?: {
    before?: string;
    after?: string;
    count: number;
  };
}

export interface RedditApiListResponse<T> {
  data: T[];
  pagination: {
    before?: string;
    after?: string;
    count: number;
  };
}
