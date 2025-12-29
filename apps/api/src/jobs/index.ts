/**
 * Jobs Module Barrel Export
 *
 * Exports all job queue functionality for background job processing.
 */

// Queue management
export {
  getJobQueue,
  getJobQueueReady,
  stopJobQueue,
  resetJobQueue,
  setHandlersRegistrationPromise,
  areHandlersRegistered,
} from "./queue.js";

// Events
export {
  jobEvents,
  emitSyncProgress,
  emitGenerationProgress,
  type SyncProgressEvent,
  type SyncProgressEventType,
  type SyncProgressData,
  type GenerationProgressEvent,
  type GenerationProgressEventType,
  type GenerationProgressData,
} from "./events.js";

// Types
export type {
  SyncCampaignSetJob,
  JobStatus,
  JobState,
  Platform,
  SyncResult,
  QueuedJobResponse,
  GenerateCreativesJob,
  GenerateCreativesResult,
  AspectRatioSpec,
  RowFilter,
} from "./types.js";

// Job handlers
export {
  SYNC_CAMPAIGN_SET_JOB,
  createSyncCampaignSetHandler,
  createSyncCampaignSetHandlerWithEvents,
  registerSyncCampaignSetHandler,
  type SyncCampaignSetHandlerWithEvents,
} from "./handlers/sync-campaign-set.js";

// Retry job handler
export {
  RETRY_FAILED_SYNCS_JOB,
  createRetryFailedSyncsHandler,
  registerRetryFailedSyncsHandler,
  scheduleRetryJob,
  type RetryFailedSyncsJob,
  type RetryResult,
} from "./handlers/retry-failed-syncs.js";

// Sync API data source job handler (Phase 2C)
export {
  SYNC_API_DATA_SOURCE_JOB,
  createSyncApiDataSourceHandler,
  registerSyncApiDataSourceHandler,
  isSyncDue,
  SYNC_INTERVALS,
  type SyncApiDataSourceJob,
  type SyncApiDataSourceResult,
} from "./handlers/sync-api-data-source.js";

// Schedule API syncs job handler (Phase 2C)
export {
  SCHEDULE_API_SYNCS_JOB,
  SCHEDULE_API_SYNCS_CRON,
  createScheduleApiSyncsHandler,
  registerScheduleApiSyncsHandler,
  type ScheduleApiSyncsResult,
} from "./handlers/schedule-api-syncs.js";

// Sync Google Sheets job handler
export {
  SYNC_GOOGLE_SHEETS_JOB,
  createSyncGoogleSheetsHandler,
  registerSyncGoogleSheetsHandler,
  type SyncGoogleSheetsJob,
  type SyncGoogleSheetsResult,
} from "./handlers/sync-google-sheets.js";

// Generate Creatives job handler
export {
  GENERATE_CREATIVES_JOB,
  createGenerateCreativesHandler,
  registerGenerateCreativesHandler,
} from "./handlers/generate-creatives.js";
