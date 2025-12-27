/**
 * Job Handler Registration Tests
 *
 * Tests to verify that all job handlers are properly registered with pg-boss.
 * This was added to catch the bug where sync-google-sheets and sync-api-data-source
 * handlers were not being registered during app initialization.
 *
 * Issue: Queue 'sync-google-sheets does not exist' error when syncing Google Sheets
 * Root cause: registerSyncGoogleSheetsHandler was not being called during startup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock pg-boss
const mockBoss = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  work: vi.fn(),
  send: vi.fn().mockResolvedValue("job-id-123"),
  createQueue: vi.fn().mockResolvedValue(undefined),
  getJobById: vi.fn(),
  on: vi.fn(), // Event handler registration
};

vi.mock("pg-boss", () => ({
  PgBoss: vi.fn(() => mockBoss),
}));

// Mock the database module
vi.mock("../../services/db.js", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  dataSources: { id: "id" },
  dataRows: { id: "id", dataSourceId: "data_source_id" },
}));

// Mock the services used by handlers
vi.mock("../../services/api-fetch-service.js", () => ({
  fetchAndIngest: vi.fn(),
}));

vi.mock("../../services/google-sheets-service.js", () => ({
  fetchAndIngestGoogleSheets: vi.fn(),
}));

vi.mock("../../services/oauth-tokens.js", () => ({
  getGoogleCredentials: vi.fn(),
}));

// Import the handlers after mocking
import { registerSyncApiDataSourceHandler, SYNC_API_DATA_SOURCE_JOB } from "../../jobs/handlers/sync-api-data-source.js";
import { registerSyncGoogleSheetsHandler, SYNC_GOOGLE_SHEETS_JOB } from "../../jobs/handlers/sync-google-sheets.js";
import { registerSyncCampaignSetHandler, SYNC_CAMPAIGN_SET_JOB } from "../../jobs/handlers/sync-campaign-set.js";

describe("Job Handler Registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("registerSyncApiDataSourceHandler", () => {
    it("should create the sync-api-data-source queue", async () => {
      await registerSyncApiDataSourceHandler(mockBoss as never);

      expect(mockBoss.createQueue).toHaveBeenCalledWith(SYNC_API_DATA_SOURCE_JOB);
    });

    it("should register a worker for the sync-api-data-source job", async () => {
      await registerSyncApiDataSourceHandler(mockBoss as never);

      expect(mockBoss.work).toHaveBeenCalledWith(
        SYNC_API_DATA_SOURCE_JOB,
        expect.any(Function)
      );
    });
  });

  describe("registerSyncGoogleSheetsHandler", () => {
    it("should create the sync-google-sheets queue", async () => {
      await registerSyncGoogleSheetsHandler(mockBoss as never);

      expect(mockBoss.createQueue).toHaveBeenCalledWith(SYNC_GOOGLE_SHEETS_JOB);
    });

    it("should register a worker for the sync-google-sheets job", async () => {
      await registerSyncGoogleSheetsHandler(mockBoss as never);

      expect(mockBoss.work).toHaveBeenCalledWith(
        SYNC_GOOGLE_SHEETS_JOB,
        expect.any(Function)
      );
    });
  });

  describe("registerSyncCampaignSetHandler", () => {
    it("should create the sync-campaign-set queue", async () => {
      await registerSyncCampaignSetHandler(mockBoss as never);

      expect(mockBoss.createQueue).toHaveBeenCalledWith(SYNC_CAMPAIGN_SET_JOB);
    });

    it("should register a worker for the sync-campaign-set job", async () => {
      await registerSyncCampaignSetHandler(mockBoss as never);

      expect(mockBoss.work).toHaveBeenCalledWith(
        SYNC_CAMPAIGN_SET_JOB,
        expect.any(Function)
      );
    });
  });

  describe("Job queue constants", () => {
    it("should export sync-api-data-source job name", () => {
      expect(SYNC_API_DATA_SOURCE_JOB).toBe("sync-api-data-source");
    });

    it("should export sync-google-sheets job name", () => {
      expect(SYNC_GOOGLE_SHEETS_JOB).toBe("sync-google-sheets");
    });

    it("should export sync-campaign-set job name", () => {
      expect(SYNC_CAMPAIGN_SET_JOB).toBe("sync-campaign-set");
    });
  });
});
