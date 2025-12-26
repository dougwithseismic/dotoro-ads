/**
 * Jobs Module Barrel Export
 *
 * Exports all job queue functionality for background job processing.
 */

// Queue management
export { getJobQueue, stopJobQueue, resetJobQueue } from "./queue.js";

// Events
export {
  jobEvents,
  emitSyncProgress,
  type SyncProgressEvent,
  type SyncProgressEventType,
  type SyncProgressData,
} from "./events.js";

// Types
export type {
  SyncCampaignSetJob,
  JobStatus,
  JobState,
  Platform,
  SyncResult,
  QueuedJobResponse,
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
