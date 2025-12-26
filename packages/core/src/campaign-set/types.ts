/**
 * Campaign Set Type Definitions
 *
 * Comprehensive TypeScript types for campaign sets and their hierarchy.
 * These types align with the database schema defined in packages/database/src/schema/
 * and are used across the web app and API routes.
 *
 * Hierarchy:
 * CampaignSet -> Campaign[] -> AdGroup[] -> Ad[] & Keyword[]
 */

import type { Platform } from "../ad-types/types.js";
import type { BudgetConfig, BiddingConfig } from "../budget/types.js";
import type { TargetingConfig } from "../targeting/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Status Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campaign Set Status
 * Tracks the lifecycle status of a campaign set
 *
 * Matches database enum: campaign_set_status
 */
export type CampaignSetStatus =
  | "draft" // Initial state, being edited
  | "pending" // Awaiting processing/sync
  | "syncing" // Currently syncing to platforms
  | "active" // Live and running
  | "paused" // Temporarily stopped
  | "completed" // Finished running
  | "archived" // Moved to archive
  | "error"; // Error state

/**
 * Campaign Set Sync Status
 * Tracks synchronization status with ad platforms
 *
 * Matches database enum: campaign_set_sync_status
 */
export type CampaignSetSyncStatus =
  | "pending" // Not yet synced
  | "syncing" // Currently syncing
  | "synced" // Successfully synced
  | "failed" // Sync failed
  | "conflict"; // Sync conflict detected

/**
 * Entity Status
 * Status for ads, ad groups, and keywords
 *
 * Matches database enums: ad_status, ad_group_status, keyword_status
 */
export type EntityStatus = "active" | "paused" | "removed";

/**
 * Campaign Status
 * Status for individual campaigns
 *
 * Matches database enum: campaign_status
 */
export type CampaignStatus =
  | "draft"
  | "pending"
  | "active"
  | "paused"
  | "completed"
  | "error";

/**
 * Keyword Match Type
 * Defines how closely the search query must match the keyword
 *
 * Matches database enum: keyword_match_type
 */
export type KeywordMatchType = "broad" | "phrase" | "exact";

// ─────────────────────────────────────────────────────────────────────────────
// Supporting Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Budget Info
 * Budget information that can be set at campaign or campaign set level
 */
export interface BudgetInfo {
  /** Budget type */
  type: "daily" | "lifetime" | "shared";
  /** Budget amount in currency units */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
}

/**
 * Ad Group Settings
 * Flexible configuration for ad group behavior
 */
export interface AdGroupSettings {
  /** Targeting configuration overrides */
  targeting?: Record<string, unknown>;
  /** Bidding configuration */
  bidding?: Record<string, unknown>;
  /** Allow additional custom settings */
  [key: string]: unknown;
}

/**
 * Ad Assets
 * Media and additional creative elements for ads
 * Aligned with database schema for rich asset support
 */
export interface AdAssets {
  /** Image assets with metadata */
  images?: Array<{
    id?: string;
    url: string;
    width?: number;
    height?: number;
    altText?: string;
    type?: "square" | "landscape" | "portrait";
  }>;
  /** Video assets with metadata */
  videos?: Array<{
    id?: string;
    url: string;
    thumbnailUrl?: string;
    duration?: number;
  }>;
  /** Logo assets with metadata */
  logos?: Array<{
    id?: string;
    url: string;
    width?: number;
    height?: number;
  }>;
  /** Additional headlines for responsive ads */
  additionalHeadlines?: string[];
  /** Additional descriptions for responsive ads */
  additionalDescriptions?: string[];
  /** Site links */
  sitelinks?: Array<{
    text: string;
    url: string;
    description?: string;
  }>;
  /** Callout extensions */
  callouts?: string[];
  /** Structured snippets */
  structuredSnippets?: {
    header: string;
    values: string[];
  };
  /** Allow additional custom assets */
  [key: string]: unknown;
}

/**
 * Ad Definition Snapshot
 * Stores an ad's content as defined in the wizard
 */
export interface AdDefinitionSnapshot {
  /** Ad headline pattern */
  headline?: string;
  /** Ad description pattern */
  description?: string;
  /** Display URL pattern */
  displayUrl?: string;
  /** Final/landing URL pattern */
  finalUrl?: string;
  /** Call to action text */
  callToAction?: string;
}

/**
 * Ad Group Definition Snapshot
 * Stores an ad group's structure as defined in the wizard
 */
export interface AdGroupDefinitionSnapshot {
  /** Pattern for ad group name, e.g., "{product}" */
  namePattern: string;
  /** Keywords for this ad group */
  keywords?: string[];
  /** Ads within this ad group */
  ads: AdDefinitionSnapshot[];
}

/**
 * Hierarchy Config Snapshot
 * Stores the hierarchy configuration from the wizard at the time of creation
 * This matches the actual structure stored in the database
 */
export interface HierarchyConfigSnapshot {
  /** Ad groups with their ads and keywords */
  adGroups: AdGroupDefinitionSnapshot[];
}

/**
 * Inline Rule
 * Simplified rule that can be stored inline in campaign set config
 */
export interface InlineRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign Set Config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campaign Set Config
 * Complete wizard state snapshot stored at creation time
 * This captures the full configuration used to generate campaigns
 */
export interface CampaignSetConfig {
  // Data source
  /** ID of the data source used for generation */
  dataSourceId: string;
  /** Available columns from the data source */
  availableColumns: string[];

  // Platform selection
  /** Selected advertising platforms */
  selectedPlatforms: Platform[];
  /** Selected ad types per platform */
  selectedAdTypes: Partial<Record<Platform, string[]>>;

  // Campaign configuration
  /** Campaign naming and structure configuration */
  campaignConfig: {
    /** Pattern for campaign names, e.g., "{brand}-performance" */
    namePattern: string;
  };

  // Budget and bidding (optional)
  /** Budget configuration */
  budgetConfig?: BudgetConfig;
  /** Per-platform bidding configuration */
  biddingConfig?: Partial<Record<Platform, BiddingConfig>>;

  // Hierarchy
  /** Hierarchy configuration snapshot from wizard */
  hierarchyConfig: HierarchyConfigSnapshot;

  // Targeting (optional)
  /** Targeting configuration */
  targetingConfig?: TargetingConfig;

  // Rules (optional)
  /** Inline rules for data transformation */
  inlineRules?: InlineRule[];

  // Generation metadata
  /** Timestamp when campaigns were generated (ISO 8601 string) */
  generatedAt: string;
  /** Number of data rows processed */
  rowCount: number;
  /** Number of campaigns generated */
  campaignCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entity Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campaign Set
 * Top-level container for a collection of campaigns created from the wizard.
 * Stores the configuration used to generate campaigns and tracks their status.
 */
export interface CampaignSet {
  /** Unique identifier */
  id: string;
  /** User who owns this campaign set */
  userId: string;
  /** Display name for the campaign set */
  name: string;
  /** Optional description */
  description?: string;

  // Source references
  /** ID of the data source used for generation */
  dataSourceId?: string;
  /** ID of the template used (if any) */
  templateId?: string;

  // Configuration snapshot (wizard state at creation time)
  /** Complete configuration from wizard */
  config: CampaignSetConfig;

  // Contained entities
  /** Campaigns within this set */
  campaigns: Campaign[];

  // Status
  /** Current lifecycle status */
  status: CampaignSetStatus;
  /** Sync status with ad platforms */
  syncStatus: CampaignSetSyncStatus;
  /** Last sync timestamp */
  lastSyncedAt?: Date;

  // Timestamps
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Campaign
 * A single campaign within a campaign set
 */
export interface Campaign {
  /** Unique identifier */
  id: string;
  /** Parent campaign set ID */
  campaignSetId: string;
  /** Campaign name */
  name: string;
  /** Target advertising platform */
  platform: Platform;
  /** Order within the campaign set */
  orderIndex: number;

  // Generation source (from database generated_campaigns table)
  /** ID of the template used for generation */
  templateId?: string;
  /** ID of the source data row */
  dataRowId?: string;
  /** Generated campaign data snapshot */
  campaignData?: Record<string, unknown>;

  // Status
  /** Current campaign status */
  status: CampaignStatus;
  /** Sync status with ad platform */
  syncStatus: CampaignSetSyncStatus;
  /** Last sync timestamp */
  lastSyncedAt?: Date;
  /** Error message if sync failed */
  syncError?: string;

  // Platform-specific
  /** ID assigned by the ad platform after sync */
  platformCampaignId?: string;
  /** Platform-specific data/settings */
  platformData?: Record<string, unknown>;

  // Hierarchy
  /** Ad groups within this campaign */
  adGroups: AdGroup[];

  // Budget (can override set-level)
  /** Campaign-specific budget override */
  budget?: BudgetInfo;

  // Timestamps
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Ad Group
 * A group of ads within a campaign
 */
export interface AdGroup {
  /** Unique identifier */
  id: string;
  /** Parent campaign ID */
  campaignId: string;
  /** Ad group name */
  name: string;
  /** Order within the campaign */
  orderIndex: number;

  // Settings
  /** Ad group specific settings */
  settings?: AdGroupSettings;

  // Platform-specific
  /** ID assigned by the ad platform after sync */
  platformAdGroupId?: string;

  // Status
  /** Current ad group status */
  status: EntityStatus;

  // Children
  /** Ads within this ad group */
  ads: Ad[];
  /** Keywords for this ad group */
  keywords: Keyword[];

  // Timestamps
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Ad
 * An individual advertisement within an ad group
 */
export interface Ad {
  /** Unique identifier */
  id: string;
  /** Parent ad group ID */
  adGroupId: string;
  /** Order within the ad group */
  orderIndex: number;

  // Content
  /** Main headline (optional to align with database nullable columns) */
  headline?: string;
  /** Description text (optional to align with database nullable columns) */
  description?: string;
  /** Display URL (shown to users) */
  displayUrl?: string;
  /** Final URL (actual destination) */
  finalUrl?: string;
  /** Call to action text */
  callToAction?: string;

  // Assets
  /** Media and creative assets */
  assets?: AdAssets;

  // Platform-specific
  /** ID assigned by the ad platform after sync */
  platformAdId?: string;

  // Status
  /** Current ad status */
  status: EntityStatus;

  // Timestamps
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Keyword
 * A targeting keyword for an ad group
 */
export interface Keyword {
  /** Unique identifier */
  id: string;
  /** Parent ad group ID */
  adGroupId: string;

  // Content
  /** The keyword text */
  keyword: string;
  /** Match type for the keyword */
  matchType: KeywordMatchType;
  /** Optional bid amount (uses ad group default if not set) */
  bid?: number;

  // Platform-specific
  /** ID assigned by the ad platform after sync */
  platformKeywordId?: string;

  // Status
  /** Current keyword status */
  status: EntityStatus;

  // Timestamps
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// DTO Types (Data Transfer Objects)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create Campaign Set Input
 * Data required to create a new campaign set
 */
export type CreateCampaignSetInput = Omit<
  CampaignSet,
  "id" | "campaigns" | "createdAt" | "updatedAt"
>;

/**
 * Update Campaign Set Input
 * Data that can be updated on an existing campaign set
 */
export type UpdateCampaignSetInput = Partial<
  Omit<CampaignSet, "id" | "userId" | "campaigns" | "createdAt" | "updatedAt">
>;

/**
 * Create Campaign Input
 * Data required to create a new campaign
 */
export type CreateCampaignInput = Omit<
  Campaign,
  "id" | "adGroups" | "createdAt" | "updatedAt"
>;

/**
 * Update Campaign Input
 * Data that can be updated on an existing campaign
 */
export type UpdateCampaignInput = Partial<
  Omit<Campaign, "id" | "campaignSetId" | "adGroups" | "createdAt" | "updatedAt">
>;

/**
 * Create Ad Group Input
 * Data required to create a new ad group
 */
export type CreateAdGroupInput = Omit<
  AdGroup,
  "id" | "ads" | "keywords" | "createdAt" | "updatedAt"
>;

/**
 * Update Ad Group Input
 * Data that can be updated on an existing ad group
 */
export type UpdateAdGroupInput = Partial<
  Omit<AdGroup, "id" | "campaignId" | "ads" | "keywords" | "createdAt" | "updatedAt">
>;

/**
 * Create Ad Input
 * Data required to create a new ad
 */
export type CreateAdInput = Omit<Ad, "id" | "createdAt" | "updatedAt">;

/**
 * Update Ad Input
 * Data that can be updated on an existing ad
 */
export type UpdateAdInput = Partial<
  Omit<Ad, "id" | "adGroupId" | "createdAt" | "updatedAt">
>;

/**
 * Create Keyword Input
 * Data required to create a new keyword
 */
export type CreateKeywordInput = Omit<Keyword, "id" | "createdAt" | "updatedAt">;

/**
 * Update Keyword Input
 * Data that can be updated on an existing keyword
 */
export type UpdateKeywordInput = Partial<
  Omit<Keyword, "id" | "adGroupId" | "createdAt" | "updatedAt">
>;

// ─────────────────────────────────────────────────────────────────────────────
// Utility Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Campaign Set With Relations
 * Campaign set with all nested relations loaded
 */
export type CampaignSetWithRelations = CampaignSet & {
  campaigns: (Campaign & {
    adGroups: (AdGroup & {
      ads: Ad[];
      keywords: Keyword[];
    })[];
  })[];
};

/**
 * Campaign Set Summary
 * Lightweight summary for listing campaign sets
 */
export interface CampaignSetSummary {
  id: string;
  name: string;
  description?: string;
  status: CampaignSetStatus;
  syncStatus: CampaignSetSyncStatus;
  campaignCount: number;
  adGroupCount: number;
  adCount: number;
  platforms: Platform[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync Result
 * Result of syncing a campaign set to ad platforms
 */
export interface SyncResult {
  success: boolean;
  campaignSetId: string;
  syncedAt: Date;
  syncedCampaigns: number;
  failedCampaigns: number;
  errors: Array<{
    campaignId: string;
    error: string;
  }>;
}
