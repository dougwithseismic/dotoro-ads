/**
 * Campaign Sets Frontend Types
 *
 * Types for the campaign sets management pages.
 * Aligned with @repo/core campaign-set types and API schemas.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campaign Set Status
 * Lifecycle status of a campaign set
 */
export type CampaignSetStatus =
  | "draft"
  | "pending"
  | "syncing"
  | "active"
  | "paused"
  | "completed"
  | "archived"
  | "error";

/**
 * Campaign Set Sync Status
 * Synchronization status with ad platforms
 */
export type CampaignSetSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict";

/**
 * Campaign Status
 * Status for individual campaigns
 */
export type CampaignStatus =
  | "draft"
  | "pending"
  | "active"
  | "paused"
  | "completed"
  | "error";

/**
 * Entity Status
 * Status for ads, ad groups, and keywords
 */
export type EntityStatus = "active" | "paused" | "removed";

/**
 * Keyword Match Type
 */
export type KeywordMatchType = "broad" | "phrase" | "exact";

/**
 * Platform
 */
export type Platform = "google" | "meta" | "linkedin" | "tiktok" | "reddit";

// ─────────────────────────────────────────────────────────────────────────────
// Entity Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keyword
 */
export interface Keyword {
  id: string;
  adGroupId: string;
  keyword: string;
  matchType: KeywordMatchType;
  bid?: number;
  platformKeywordId?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ad Assets
 */
export interface AdAssets {
  images?: Array<{
    id?: string;
    url: string;
    width?: number;
    height?: number;
    altText?: string;
    type?: "square" | "landscape" | "portrait";
  }>;
  videos?: Array<{
    id?: string;
    url: string;
    thumbnailUrl?: string;
    duration?: number;
  }>;
  logos?: Array<{
    id?: string;
    url: string;
    width?: number;
    height?: number;
  }>;
  additionalHeadlines?: string[];
  additionalDescriptions?: string[];
  sitelinks?: Array<{
    text: string;
    url: string;
    description?: string;
  }>;
  callouts?: string[];
  structuredSnippets?: {
    header: string;
    values: string[];
  };
}

/**
 * Ad
 */
export interface Ad {
  id: string;
  adGroupId: string;
  orderIndex: number;
  headline?: string | null;
  description?: string | null;
  displayUrl?: string | null;
  finalUrl?: string | null;
  callToAction?: string | null;
  assets?: AdAssets | null;
  platformAdId?: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ad Group
 */
export interface AdGroup {
  id: string;
  campaignId: string;
  name: string;
  orderIndex: number;
  settings?: Record<string, unknown> | null;
  platformAdGroupId?: string;
  status: EntityStatus;
  ads: Ad[];
  keywords: Keyword[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Budget Info
 */
export interface BudgetInfo {
  type: "daily" | "lifetime" | "shared";
  amount: number;
  currency: string;
}

/**
 * Campaign
 */
export interface Campaign {
  id: string;
  campaignSetId: string;
  name: string;
  platform: Platform;
  orderIndex: number;
  templateId?: string | null;
  dataRowId?: string | null;
  campaignData?: Record<string, unknown> | null;
  status: CampaignStatus;
  syncStatus: CampaignSetSyncStatus;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  platformCampaignId?: string | null;
  platformData?: Record<string, unknown> | null;
  adGroups: AdGroup[];
  budget?: BudgetInfo | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data Source Column
 */
export interface DataSourceColumnType {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "unknown";
  sampleValues?: string[];
}

/**
 * Campaign Set Config
 */
export interface CampaignSetConfig {
  dataSourceId: string;
  availableColumns: string[] | DataSourceColumnType[];
  selectedPlatforms: string[];
  /** Reddit Ad Account ID - required for Reddit platform sync */
  adAccountId?: string;
  selectedAdTypes: Record<string, string[]>;
  campaignConfig: {
    namePattern: string;
    objective?: string;
  };
  budgetConfig?: {
    type: "daily" | "lifetime" | "shared";
    amountPattern: string;
    currency: string;
    pacing?: "standard" | "accelerated";
  };
  platformBudgets?: Record<string, {
    type: "daily" | "lifetime" | "shared";
    amountPattern: string;
    currency: string;
    pacing?: "standard" | "accelerated";
  } | null>;
  biddingConfig?: Record<string, unknown>;
  hierarchyConfig: {
    adGroups: Array<{
      id?: string;
      namePattern: string;
      keywords?: string[];
      ads: Array<{
        id?: string;
        headline?: string;
        headlineFallback?: "truncate" | "truncate_word" | "error";
        description?: string;
        descriptionFallback?: "truncate" | "truncate_word" | "error";
        displayUrl?: string;
        finalUrl?: string;
        callToAction?: string;
      }>;
    }>;
  };
  targetingConfig?: {
    locations?: string[];
    devices?: string[];
    audiences?: string[];
    languages?: string[];
    [key: string]: unknown;
  };
  ruleIds?: string[];
  inlineRules?: Array<{
    id?: string;
    name?: string;
    field?: string;
    operator?: string;
    value?: unknown;
    enabled?: boolean;
    logic?: "AND" | "OR";
    conditions?: Array<{
      id: string;
      field: string;
      operator: string;
      value: string;
    }>;
    actions?: Array<{
      id: string;
      type: string;
    }>;
  }>;
  threadConfig?: {
    post: {
      title: string;
      body: string;
      url?: string;
      type: "text" | "link" | "image" | "video";
      subreddit: string;
      flair?: string;
      nsfw?: boolean;
      spoiler?: boolean;
      sendReplies?: boolean;
    };
    comments?: Array<{
      id: string;
      body: string;
      parentId?: string;
      authorPersonaId?: string;
      depth?: number;
    }>;
    personas?: Array<{
      id: string;
      name: string;
      username?: string;
      avatar?: string;
    }>;
  };
  generatedAt: string;
  rowCount: number;
  campaignCount: number;
}

/**
 * Campaign Set
 * Full representation with all nested relations
 */
export interface CampaignSet {
  id: string;
  userId: string | null;
  name: string;
  description?: string | null;
  dataSourceId?: string | null;
  templateId?: string | null;
  config: CampaignSetConfig;
  campaigns: Campaign[];
  status: CampaignSetStatus;
  syncStatus: CampaignSetSyncStatus;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Campaign Set Summary
 * Lightweight representation for list views
 */
export interface CampaignSetSummary {
  id: string;
  name: string;
  description?: string | null;
  status: CampaignSetStatus;
  syncStatus: CampaignSetSyncStatus;
  campaignCount: number;
  adGroupCount: number;
  adCount: number;
  platforms: Platform[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campaign Set List Response
 */
export interface CampaignSetListResponse {
  data: CampaignSetSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Sync Response
 */
export interface SyncResponse {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Pause Response
 */
export interface PauseResponse {
  paused: number;
}

/**
 * Resume Response
 */
export interface ResumeResponse {
  resumed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filters for campaign set listing
 */
export interface CampaignSetFilters {
  status?: CampaignSetStatus;
  syncStatus?: CampaignSetSyncStatus;
  search?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync SSE Event Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSE event types emitted by the sync stream
 */
export type SyncProgressEventType =
  | "connected"
  | "progress"
  | "campaign_synced"
  | "campaign_failed"
  | "completed"
  | "error";

/**
 * Data payload for SSE sync progress events
 */
export interface SyncProgressData {
  /** Number of campaigns synced so far */
  synced?: number;
  /** Number of campaigns that failed */
  failed?: number;
  /** Total number of campaigns to sync */
  total?: number;
  /** Campaign ID (for campaign_synced/campaign_failed) */
  campaignId?: string;
  /** Campaign name (for campaign_synced/campaign_failed) */
  campaignName?: string;
  /** Platform-assigned ID (for campaign_synced) */
  platformId?: string;
  /** Error message (for campaign_failed/error) */
  error?: string;
  /** Job state (for connected event) */
  state?: string;
}

/**
 * SSE event received from sync stream
 */
export interface SyncProgressEvent {
  /** Event type */
  type: SyncProgressEventType;
  /** Event data payload */
  data: SyncProgressData;
}

/**
 * Response from POST /api/v1/campaign-sets/{setId}/sync
 * Returns a queued job that can be tracked via SSE
 */
export interface QueuedJobResponse {
  /** The pg-boss job ID */
  jobId: string;
  /** Job status (always "queued" for this response) */
  status: "queued";
  /** Human-readable message */
  message: string;
}

/**
 * Campaign sync state for UI tracking
 */
export type CampaignSyncState = "pending" | "syncing" | "success" | "failed";

/**
 * Individual campaign sync status for modal display
 */
export interface CampaignSyncStatusItem {
  /** Campaign ID */
  id: string;
  /** Campaign name */
  name: string;
  /** Current sync state */
  state: CampaignSyncState;
  /** Platform-assigned ID if synced successfully */
  platformId?: string;
  /** Error message if sync failed */
  error?: string;
}

/**
 * Overall sync progress for modal display
 */
export interface SyncProgress {
  /** Number of campaigns synced successfully */
  synced: number;
  /** Number of campaigns that failed */
  failed: number;
  /** Total campaigns to sync */
  total: number;
}

/**
 * Sync status states for the modal
 */
export type SyncFlowStatus =
  | "idle"
  | "starting"
  | "connected"
  | "syncing"
  | "completed"
  | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Pre-Sync Validation Preview Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Information about a valid ad that will sync successfully
 */
export interface ValidAdInfo {
  adId: string;
  adGroupId: string;
  campaignId: string;
  name: string;
}

/**
 * Information about an ad that will use fallback content
 */
export interface FallbackAdInfo {
  adId: string;
  adGroupId: string;
  campaignId: string;
  name: string;
  reason: string;
  fallbackAdId?: string;
}

/**
 * Information about an ad that will be skipped during sync
 */
export interface SkippedAdInfo {
  adId: string;
  adGroupId: string;
  campaignId: string;
  name: string;
  productName?: string;
  reason: string;
  errorCode: string;
  field: string;
  value?: unknown;
  expected?: string;
}

/**
 * Breakdown of ads by validation status
 */
export interface SyncPreviewBreakdown {
  valid: number;
  fallback: number;
  skipped: number;
}

/**
 * Complete preview of what will happen during sync
 */
export interface SyncPreviewResponse {
  campaignSetId: string;
  totalAds: number;
  breakdown: SyncPreviewBreakdown;
  validAds: ValidAdInfo[];
  fallbackAds: FallbackAdInfo[];
  skippedAds: SkippedAdInfo[];
  canProceed: boolean;
  warnings: string[];
  validationTimeMs: number;
}

/**
 * View states for the preview modal
 */
export type PreviewModalView = "summary" | "skipped" | "fallback";
