/**
 * Job Types Module
 *
 * Defines TypeScript types for background jobs in the system.
 */

/**
 * Supported platforms for campaign sync.
 */
export type Platform = "reddit" | "google" | "facebook";

/**
 * Job states matching pg-boss states.
 */
export type JobState = "created" | "active" | "completed" | "failed" | "cancelled";

/**
 * Data payload for sync campaign set jobs.
 */
export interface SyncCampaignSetJob {
  /** The campaign set ID to sync */
  campaignSetId: string;

  /** The user who initiated the sync */
  userId: string;

  /** The ad account ID to use for the sync */
  adAccountId: string;

  /** The funding instrument ID for the platform */
  fundingInstrumentId: string;

  /** The platform to sync to */
  platform: Platform;
}

/**
 * Status information for a job.
 */
export interface JobStatus {
  /** Unique job identifier */
  id: string;

  /** Job name/type */
  name: string;

  /** Current job state */
  state: JobState;

  /** Job input data */
  data: unknown;

  /** Progress percentage (0-100) */
  progress?: number;

  /** Job output/result on completion */
  output?: unknown;

  /** Error message for failed jobs */
  error?: string;

  /** When the job started processing */
  startedAt?: Date;

  /** When the job completed (success or failure) */
  completedAt?: Date;

  /** When the job was created */
  createdAt: Date;
}

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  /** Number of campaigns successfully synced */
  synced: number;

  /** Number of campaigns that failed to sync */
  failed: number;

  /** Number of campaigns skipped */
  skipped: number;

  /** Array of error details for failed campaigns */
  errors: Array<{
    campaignId: string;
    message: string;
  }>;
}

/**
 * Response when a job is queued.
 */
export interface QueuedJobResponse {
  /** The job ID for tracking */
  jobId: string;

  /** Job status */
  status: "queued";

  /** Human-readable message */
  message: string;
}

/**
 * Data payload for sync-from-platform jobs (bidirectional sync).
 */
export interface SyncFromPlatformJob {
  /** The ad account ID to sync from */
  adAccountId: string;

  /** The user who initiated the sync */
  userId: string;

  /** The platform to sync from */
  platform: Platform;
}

/**
 * Result of a sync-from-platform operation.
 */
export interface SyncFromPlatformResult {
  /** Number of campaigns updated from platform */
  updated: number;

  /** Number of conflicts detected */
  conflicts: number;

  /** Number of campaigns unchanged */
  unchanged: number;

  /** Number of deleted campaigns detected */
  deleted: number;

  /** Number of errors encountered */
  errors: number;

  /** Error messages if any */
  errorMessages: Array<{
    campaignId: string;
    message: string;
  }>;
}
