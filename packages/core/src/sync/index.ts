export {
  SyncEngine,
  EntityTypeSchema,
  OperationTypeSchema,
} from "./sync-engine.js";

export type {
  EntityType,
  OperationType,
  LocalCampaign as SyncLocalCampaign,
  LocalAdGroup,
  LocalAd,
  LocalState,
  PlatformCampaign as SyncPlatformCampaign,
  PlatformAdGroup,
  PlatformAd,
  PlatformState,
  SyncOperation,
  CreateDiff,
  UpdateDiff,
  DeleteDiff,
  InSyncItem,
  DiffResult as SyncDiffResult,
  DiffOptions as SyncDiffOptions,
  SyncOptions,
  ExecutedOperation,
  SyncError,
  SyncResult,
  SyncHistoryEntry,
  PlatformAdapter,
} from "./sync-engine.js";

// Export diff calculator
export { DiffCalculator } from "./diff-calculator.js";

export type {
  CampaignData,
  LocalCampaign,
  PlatformCampaign,
  CampaignToCreate,
  CampaignToUpdate,
  CampaignToDelete,
  UnchangedCampaign,
  DiffSummary,
  DiffResult,
  DiffOptions,
} from "./diff-calculator.js";
