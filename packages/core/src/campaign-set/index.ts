/**
 * Campaign Set Module
 *
 * Exports all campaign set types, services, and utilities.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

// Export all types
export type {
  // Status types
  CampaignSetStatus,
  CampaignSetSyncStatus,
  EntityStatus,
  CampaignStatus,
  KeywordMatchType,
  // Supporting types
  BudgetInfo,
  AdGroupSettings,
  AdAssets,
  AdDefinitionSnapshot,
  AdGroupDefinitionSnapshot,
  HierarchyConfigSnapshot,
  InlineRule,
  // Config types
  CampaignSetConfig,
  // Main entity types
  CampaignSet,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  // DTO types
  CreateCampaignSetInput,
  UpdateCampaignSetInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateAdGroupInput,
  UpdateAdGroupInput,
  CreateAdInput,
  UpdateAdInput,
  CreateKeywordInput,
  UpdateKeywordInput,
  // Utility types
  CampaignSetWithRelations,
  CampaignSetSummary,
  SyncResult,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Platform Adapter Exports
// ─────────────────────────────────────────────────────────────────────────────

export type {
  CampaignSetPlatformAdapter,
  PlatformCampaignResult,
  PlatformAdGroupResult,
  PlatformAdResult,
  PlatformKeywordResult,
} from "./platform-adapter.js";

export { isCampaignSetPlatformAdapter } from "./platform-adapter.js";

// ─────────────────────────────────────────────────────────────────────────────
// Sync Service Exports
// ─────────────────────────────────────────────────────────────────────────────

export type {
  CampaignSetSyncService,
  CampaignSetSyncResult,
  CampaignSyncResult,
  PauseResult,
  ResumeResult,
  SyncError,
  CampaignSetRepository,
  CampaignWithSet,
} from "./sync-service.js";

export { DefaultCampaignSetSyncService } from "./sync-service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Diff Service Exports
// ─────────────────────────────────────────────────────────────────────────────

export type {
  DiffSyncService,
  CampaignSetDiff,
  CampaignUpdate,
  AdGroupWithCampaign,
  AdWithAdGroup,
  KeywordWithAdGroup,
  DiffCalculationOptions,
  DiffSyncResult,
} from "./diff-service.js";

export { DefaultDiffSyncService } from "./diff-service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Adapter Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  MockPlatformAdapter,
  GoogleAdsAdapter,
  FacebookAdsAdapter,
  RedditAdsAdapter,
} from "./adapters/index.js";

export type {
  MockAdapterOptions,
  GoogleAdsAdapterConfig,
  FacebookAdsAdapterConfig,
  RedditAdsAdapterConfig,
} from "./adapters/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Platform Poller Exports (Bidirectional Sync)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  PlatformPoller,
  PlatformCampaignStatus,
  PlatformStatusValue,
  ConflictDetails,
  ConflictField,
  SyncedCampaign,
  SyncBackResult,
  SyncBackSummary,
} from "./platform-poller.js";

export { RedditPoller } from "./reddit-poller.js";

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling & Retry Exports
// ─────────────────────────────────────────────────────────────────────────────

export type {
  CircuitBreakerConfig,
  CircuitState,
  CircuitBreakerStats,
} from "./circuit-breaker.js";

export {
  CircuitBreaker,
  getCircuitBreaker,
  resetCircuitBreakers,
} from "./circuit-breaker.js";

export type { BackoffConfig } from "./backoff.js";

export {
  calculateBackoffDelay,
  DEFAULT_BACKOFF_CONFIG,
} from "./backoff.js";
