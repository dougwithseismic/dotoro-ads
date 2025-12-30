// Export OAuth
export {
  RedditOAuth,
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  REDDIT_OAUTH_ENDPOINTS,
} from "./oauth.js";
export type {
  RedditOAuthConfig,
  AuthorizationUrlResult,
  AuthorizationUrlOptions,
} from "./oauth.js";

// Export Client
export {
  RedditApiClient,
  REDDIT_ADS_API_BASE_URL,
} from "./client.js";
export type {
  RedditClientConfig,
  RateLimitConfig,
  RetryConfig,
  RequestOptions,
  RequestInfo,
  ResponseInfo,
  RateLimitStatus,
} from "./client.js";

// Export Services
export { AdAccountService } from "./accounts.js";
export type { RedditAdAccount, RedditBusiness } from "./accounts.js";
export { CampaignService, MAX_CAMPAIGN_NAME_LENGTH, MAX_CAMPAIGNS_PER_ACCOUNT } from "./campaigns.js";
export { AdGroupService, MAX_AD_GROUP_NAME_LENGTH, MAX_AD_GROUPS_PER_CAMPAIGN } from "./ad-groups.js";
export {
  AdService,
  MAX_AD_NAME_LENGTH,
  MAX_HEADLINE_LENGTH,
  MAX_BODY_LENGTH,
  MAX_DISPLAY_URL_LENGTH,
  MAX_ADS_PER_AD_GROUP,
} from "./ads.js";
export {
  CreativeService,
  MAX_CREATIVE_NAME_LENGTH,
  MAX_FILE_SIZE_BYTES,
  MIN_IMAGE_WIDTH,
  MIN_IMAGE_HEIGHT,
  ALLOWED_MIME_TYPES,
} from "./creatives.js";
export type { CreativeFilters } from "./creatives.js";

// Export Types
export type {
  OAuthScope,
  OAuthTokens,
  OAuthState,
  CampaignObjective,
  CampaignConfiguredStatus,
  CampaignStatus,
  SpecialAdCategory, // v3 API - required for campaign creation
  RedditCampaign,
  UpdateCampaign,
  CampaignResponse,
  CampaignFilters,
  AdGroupStatus,
  AdGroupConfiguredStatus,
  BidStrategy,
  BidType,
  GoalType, // v3 API - required for ad group budget
  RedditAdGroup,
  UpdateAdGroup,
  AdGroupResponse,
  AdGroupFilters,
  AdStatus,
  CallToAction,
  RedditAd,
  UpdateAd,
  AdResponse,
  AdFilters,
  CreativeType,
  CreativeStatus,
  CreativeUpload,
  CreativeResponse,
  RedditApiErrorCode,
  RedditApiError,
  RateLimiterConfig,
  RequestQueueItem,
  RedditApiResponse,
  RedditApiListResponse,
} from "./types.js";

export { RedditApiException } from "./types.js";
