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
