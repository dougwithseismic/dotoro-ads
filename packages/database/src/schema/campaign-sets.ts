import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  jsonb,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { dataSources } from "./data-sources.js";
import { campaignTemplates } from "./campaign-templates.js";
import { generatedCampaigns } from "./generated-campaigns.js";
import { teams } from "./teams.js";

/**
 * Campaign Set Status Enum
 * Tracks the lifecycle status of a campaign set
 */
export const campaignSetStatusEnum = pgEnum("campaign_set_status", [
  "draft",
  "pending",
  "syncing",
  "active",
  "paused",
  "completed",
  "archived",
  "error",
]);

/**
 * Campaign Set Sync Status Enum
 * Tracks synchronization status with ad platforms
 */
export const campaignSetSyncStatusEnum = pgEnum("campaign_set_sync_status", [
  "pending",
  "syncing",
  "synced",
  "failed",
  "conflict",
]);

/**
 * Campaign Sets Table
 * A campaign set is a collection of campaigns created from the wizard.
 * It stores the configuration used to generate campaigns and tracks their status.
 */
export const campaignSets = pgTable(
  "campaign_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // Nullable for now, will be required when auth is implemented
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }), // Nullable for migration, will be required
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, {
      onDelete: "set null",
    }),
    templateId: uuid("template_id").references(() => campaignTemplates.id, {
      onDelete: "set null",
    }),
    config: jsonb("config").$type<CampaignSetConfig>(),
    status: campaignSetStatusEnum("status").notNull().default("draft"),
    syncStatus: campaignSetSyncStatusEnum("sync_status")
      .notNull()
      .default("pending"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("campaign_sets_user_idx").on(table.userId),
    index("campaign_sets_team_idx").on(table.teamId),
    index("campaign_sets_status_idx").on(table.status),
    index("campaign_sets_sync_status_idx").on(table.syncStatus),
    index("campaign_sets_data_source_idx").on(table.dataSourceId),
    index("campaign_sets_template_idx").on(table.templateId),
  ]
);

// Relations
export const campaignSetsRelations = relations(campaignSets, ({ one, many }) => ({
  dataSource: one(dataSources, {
    fields: [campaignSets.dataSourceId],
    references: [dataSources.id],
  }),
  template: one(campaignTemplates, {
    fields: [campaignSets.templateId],
    references: [campaignTemplates.id],
  }),
  campaigns: many(generatedCampaigns),
}));

// ============================================================================
// Supporting Types for CampaignSetConfig
// ============================================================================

/** Budget configuration for a platform */
export interface BudgetConfig {
  type: "daily" | "lifetime" | "shared";
  amountPattern: string;
  currency: string;
  pacing?: "standard" | "accelerated";
}

/** Fallback strategy for text that exceeds character limits */
export type FallbackStrategy = "truncate" | "truncate_word" | "error";

/** Ad definition with optional ID and fallback strategies */
export interface AdDefinition {
  id?: string;
  headline?: string;
  headlineFallback?: FallbackStrategy;
  description?: string;
  descriptionFallback?: FallbackStrategy;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

/** Ad group definition with optional ID */
export interface AdGroupDefinition {
  id?: string;
  namePattern: string;
  keywords?: string[];
  ads: AdDefinition[];
}

/** Hierarchy configuration with enhanced ad groups and ads */
export interface HierarchyConfig {
  adGroups: AdGroupDefinition[];
}

/** Inline condition for rule evaluation */
export interface InlineCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

/** Inline action to execute when rule conditions are met */
export interface InlineAction {
  id: string;
  type: "skip" | "set_field" | "modify_field" | "add_tag";
  field?: string;
  value?: string;
  operation?: "append" | "prepend" | "replace";
  tag?: string;
}

/** Enhanced inline rule with conditions and actions */
export interface EnhancedInlineRule {
  id: string;
  name: string;
  enabled: boolean;
  logic: "AND" | "OR";
  conditions: InlineCondition[];
  actions: InlineAction[];
}

/** Legacy inline rule (for backwards compatibility) */
export interface LegacyInlineRule {
  field: string;
  operator: string;
  value: unknown;
  enabled: boolean;
}

/** Inline rule (union of enhanced and legacy formats) */
export type InlineRule = EnhancedInlineRule | LegacyInlineRule;

/** Persona role for Reddit threads */
export type PersonaRole =
  | "op"
  | "community_member"
  | "skeptic"
  | "enthusiast"
  | "expert"
  | "curious"
  | "moderator";

/** Persona tone for Reddit threads */
export type PersonaTone =
  | "friendly"
  | "skeptical"
  | "enthusiastic"
  | "neutral"
  | "curious";

/** Reddit post type */
export type RedditPostType = "text" | "link" | "image" | "video";

/** Author persona for thread generation */
export interface AuthorPersona {
  id: string;
  name: string;
  description: string;
  role: PersonaRole;
  tone?: PersonaTone;
}

/** Reddit post configuration */
export interface RedditPostConfig {
  title: string;
  body?: string;
  url?: string;
  type: RedditPostType;
  subreddit: string;
  flair?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  sendReplies?: boolean;
}

/** Comment definition for thread */
export interface CommentDefinition {
  id: string;
  parentId?: string | null;
  persona: string;
  body: string;
  depth: number;
  sortOrder: number;
}

/** Thread configuration for Reddit organic content */
export interface ThreadConfig {
  post: RedditPostConfig;
  comments: CommentDefinition[];
  personas: AuthorPersona[];
}

/** Data source column with type information */
export interface DataSourceColumn {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "unknown";
  sampleValues?: string[];
}

/** Available columns (legacy string array or enhanced with type info) */
export type AvailableColumns = string[] | DataSourceColumn[];

// ============================================================================
// Platform Advanced Settings Types
// ============================================================================

/** Reddit special ad categories */
export type SpecialAdCategory = "NONE" | "HOUSING" | "EMPLOYMENT" | "CREDIT" | "HOUSING_EMPLOYMENT_CREDIT";

/** Reddit campaign advanced settings */
export interface RedditCampaignAdvancedSettings {
  /** Campaign start time in ISO 8601 format with timezone */
  startTime?: string;
  /** Campaign end time in ISO 8601 format with timezone */
  endTime?: string;
  /** Special ad categories for compliance (default: ["NONE"]) */
  specialAdCategories?: SpecialAdCategory[];
  /** View-through attribution window in days (1-30, Reddit default: 1) */
  viewThroughAttributionDays?: number;
  /** Click-through attribution window in days (1-30, Reddit default: 1) */
  clickThroughAttributionDays?: number;
}

/** Reddit ad group advanced settings */
export interface RedditAdGroupAdvancedSettings {
  /** Ad group start time in ISO 8601 format with timezone */
  startTime?: string;
  /** Ad group end time in ISO 8601 format with timezone */
  endTime?: string;
}

/** Reddit platform advanced settings */
export interface RedditAdvancedSettings {
  campaign?: RedditCampaignAdvancedSettings;
  adGroup?: RedditAdGroupAdvancedSettings;
}

/** Google Ads campaign advanced settings (future expansion) */
export interface GoogleCampaignAdvancedSettings {
  startDate?: string;
  endDate?: string;
}

/** Google platform advanced settings (future expansion) */
export interface GoogleAdvancedSettings {
  campaign?: GoogleCampaignAdvancedSettings;
}

/**
 * Platform Advanced Settings
 * Extensible structure for platform-specific advanced configuration options.
 * Each platform has its own settings namespace.
 */
export interface PlatformAdvancedSettings {
  reddit?: RedditAdvancedSettings;
  google?: GoogleAdvancedSettings;
  // Future: meta?: MetaAdvancedSettings;
}

// ============================================================================
// Fallback Ad System Types
// ============================================================================

/**
 * Strategy for handling ads that fail validation due to field length limits.
 *
 * - "skip": Skip the ad entirely (safest, no invalid data sent to platform)
 * - "truncate": Truncate fields to fit within limits
 * - "use_fallback": Replace with a pre-defined fallback ad
 */
export type CampaignSetFallbackStrategy = "skip" | "truncate" | "use_fallback";

/**
 * Static fallback ad definition (no variables allowed).
 * Used when fallbackStrategy is "use_fallback".
 */
export interface FallbackAdDefinition {
  /** Headline text - max 100 chars for Reddit, 30 for Google */
  headline: string;
  /** Description text - max 500 chars for Reddit, 90 for Google */
  description: string;
  /** Display URL - max 25 chars */
  displayUrl?: string;
  /** Final URL - must be valid, no truncation allowed */
  finalUrl: string;
  /** Call to action - must be valid enum value */
  callToAction?: string;
}

/**
 * Configuration for truncation behavior.
 */
export interface TruncationConfig {
  /** Whether to allow truncating headlines */
  truncateHeadline: boolean;
  /** Whether to allow truncating descriptions */
  truncateDescription: boolean;
  /** Whether to preserve word boundaries when truncating */
  preserveWordBoundary: boolean;
}

// ============================================================================
// Campaign Set Config Interface
// ============================================================================

/**
 * CampaignSetConfig - Wizard state snapshot
 * Stores the complete configuration from the campaign wizard
 * Enhanced to support all fields needed for round-trip editing
 */
export interface CampaignSetConfig {
  // Core required fields
  /** ID of the data source used for generation */
  dataSourceId: string;
  /** Available columns from the data source (string[] or DataSourceColumn[]) */
  availableColumns: AvailableColumns;
  /** Selected advertising platforms */
  selectedPlatforms: string[];
  /** Reddit Ad Account ID - required for Reddit platform sync */
  adAccountId?: string;
  /** Selected ad types per platform */
  selectedAdTypes: Record<string, string[]>;
  /** Campaign naming and structure configuration */
  campaignConfig: {
    /** Pattern for campaign names, e.g., "{brand}-performance" */
    namePattern: string;
    /** Campaign objective (optional) */
    objective?: string;
  };
  /** Hierarchy configuration snapshot from wizard (enhanced with IDs and fallbacks) */
  hierarchyConfig: HierarchyConfig;
  /** Timestamp when campaigns were generated (ISO date string) */
  generatedAt: string;
  /** Number of data rows processed */
  rowCount: number;
  /** Number of campaigns generated */
  campaignCount: number;

  // Budget configuration (legacy and per-platform)
  /** Legacy single budget configuration */
  budgetConfig?: BudgetConfig;
  /** Per-platform budget configuration */
  platformBudgets?: Record<string, BudgetConfig | null>;

  // Bidding and targeting
  /** Per-platform bidding configuration */
  biddingConfig?: Record<string, unknown>;
  /** Targeting configuration */
  targetingConfig?: Record<string, unknown>;

  // Rules (legacy and enhanced)
  /** Rule template IDs */
  ruleIds?: string[];
  /** Inline rules for data transformation (enhanced or legacy format) */
  inlineRules?: InlineRule[];

  // Thread config (for Reddit)
  /** Thread configuration for Reddit organic content */
  threadConfig?: ThreadConfig;

  // Platform-specific advanced settings
  /**
   * Advanced settings for platform-specific configuration.
   * Includes scheduling (start/end times), attribution windows,
   * special ad categories, and other platform-specific options.
   */
  advancedSettings?: PlatformAdvancedSettings;

  // Fallback ad system configuration
  /**
   * Strategy for handling ads that fail validation due to field length limits.
   * Default: "skip" (safest option)
   */
  fallbackStrategy?: CampaignSetFallbackStrategy;
  /**
   * Static fallback ad to use when fallbackStrategy is "use_fallback".
   * Must not contain any variables (e.g., {product_name}).
   */
  fallbackAd?: FallbackAdDefinition;
  /**
   * Configuration for truncation behavior.
   * Used when fallbackStrategy is "truncate".
   */
  truncationConfig?: TruncationConfig;
}

// Type exports
export type CampaignSet = typeof campaignSets.$inferSelect;
export type NewCampaignSet = typeof campaignSets.$inferInsert;
