/**
 * Schedule API Syncs Job Handler Tests
 *
 * Tests for the scheduled job orchestrator that periodically checks
 * API data sources and enqueues sync jobs for those that are due.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PgBoss } from "pg-boss";

// Mock the database module
vi.mock("../../../services/db.js", () => {
  const mockDbSelect = vi.fn();
  return {
    db: {
      select: mockDbSelect,
    },
    dataSources: { id: "id", type: "type", config: "config" },
    __mockDbSelect: mockDbSelect,
  };
});

// Import after mocking
import {
  SCHEDULE_API_SYNCS_JOB,
  SCHEDULE_API_SYNCS_CRON,
  createScheduleApiSyncsHandler,
  registerScheduleApiSyncsHandler,
  type ScheduleApiSyncsResult,
} from "../schedule-api-syncs.js";
import { SYNC_API_DATA_SOURCE_JOB } from "../sync-api-data-source.js";

// Get mock references after imports
const dbModule = await vi.importMock<{
  __mockDbSelect: ReturnType<typeof vi.fn>;
}>("../../../services/db.js");

const mockDbSelect = dbModule.__mockDbSelect;

// Mock pg-boss
const mockBossSend = vi.fn();
const mockBossGetQueueSize = vi.fn();
const mockBossCreateQueue = vi.fn();
const mockBossWork = vi.fn();
const mockBossSchedule = vi.fn();

const createMockBoss = (): Partial<PgBoss> => ({
  send: mockBossSend,
  getQueueSize: mockBossGetQueueSize,
  createQueue: mockBossCreateQueue,
  work: mockBossWork,
  schedule: mockBossSchedule,
});

describe("Schedule API Syncs Job Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("SCHEDULE_API_SYNCS_JOB constant", () => {
    it("should export the correct job name", () => {
      expect(SCHEDULE_API_SYNCS_JOB).toBe("schedule-api-syncs");
    });
  });

  describe("SCHEDULE_API_SYNCS_CRON constant", () => {
    it("should run every 15 minutes", () => {
      expect(SCHEDULE_API_SYNCS_CRON).toBe("*/15 * * * *");
    });
  });

  describe("createScheduleApiSyncsHandler", () => {
    it("should query API data sources with non-manual frequency", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-1",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data1",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z", // 2 hours ago, due
            },
          },
        },
        {
          id: "ds-2",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data2",
              method: "GET",
              syncFrequency: "24h",
              lastSyncAt: "2025-01-15T11:00:00Z", // 1 hour ago, not due
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      mockBossSend.mockResolvedValue("job-id-1");

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      const result = await handler();

      // Should have queried the database
      expect(mockDbSelect).toHaveBeenCalled();

      // Should have enqueued only the due data source (ds-1)
      expect(mockBossSend).toHaveBeenCalledTimes(1);
      expect(mockBossSend).toHaveBeenCalledWith(
        SYNC_API_DATA_SOURCE_JOB,
        expect.objectContaining({
          dataSourceId: "ds-1",
          triggeredBy: "schedule",
        }),
        expect.any(Object)
      );
    });

    it("should enqueue jobs for due syncs", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-1",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data1",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z", // Due
            },
          },
        },
        {
          id: "ds-2",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data2",
              method: "GET",
              syncFrequency: "6h",
              lastSyncAt: "2025-01-15T05:00:00Z", // Due (7 hours ago)
            },
          },
        },
        {
          id: "ds-3",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data3",
              method: "GET",
              syncFrequency: "24h",
              // No lastSyncAt -> due (never synced)
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      mockBossSend.mockResolvedValue("job-id");

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      const result = await handler();

      // All 3 should be due
      expect(mockBossSend).toHaveBeenCalledTimes(3);
      expect(result.enqueued).toBe(3);
      expect(result.skipped).toBe(0);
    });

    it("should skip sources that already have pending jobs", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-1",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data1",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z",
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      // Return null from send to indicate job already exists (singularKey dedup)
      mockBossSend.mockResolvedValue(null);

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      const result = await handler();

      // Job was attempted but skipped due to dedup
      expect(mockBossSend).toHaveBeenCalledTimes(1);
      expect(result.enqueued).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should stagger job start times", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-1",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data1",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z",
            },
          },
        },
        {
          id: "ds-2",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data2",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z",
            },
          },
        },
        {
          id: "ds-3",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data3",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z",
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      mockBossSend.mockResolvedValue("job-id");

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      await handler();

      // Check that jobs have staggered start times
      const calls = mockBossSend.mock.calls;
      expect(calls.length).toBe(3);

      // Each job should have startAfter option with increasing offset
      const startAfters = calls.map((call) => call[2]?.startAfter);
      expect(startAfters[0]).toBeDefined();
      expect(startAfters[1]).toBeDefined();
      expect(startAfters[2]).toBeDefined();

      // Convert to timestamps and verify they're staggered
      const times = startAfters.map((d) => new Date(d).getTime());
      expect(times[1]).toBeGreaterThan(times[0]);
      expect(times[2]).toBeGreaterThan(times[1]);
    });

    it("should use isSyncDue correctly for each frequency", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-manual",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "manual", // Should never be due
              lastSyncAt: "2025-01-01T00:00:00Z", // Very old but manual
            },
          },
        },
        {
          id: "ds-1h-not-due",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T11:30:00Z", // 30 min ago, not due
            },
          },
        },
        {
          id: "ds-1h-due",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:30:00Z", // 1.5 hours ago, due
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      mockBossSend.mockResolvedValue("job-id");

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      const result = await handler();

      // Only ds-1h-due should be enqueued (manual is filtered out early, ds-1h-not-due is too recent)
      expect(mockBossSend).toHaveBeenCalledTimes(1);
      expect(mockBossSend).toHaveBeenCalledWith(
        SYNC_API_DATA_SOURCE_JOB,
        expect.objectContaining({ dataSourceId: "ds-1h-due" }),
        expect.any(Object)
      );
      expect(result.enqueued).toBe(1);
    });

    it("should skip data sources without apiFetch config", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-no-config",
          type: "api",
          config: {}, // No apiFetch
        },
        {
          id: "ds-null-config",
          type: "api",
          config: null, // Null config
        },
        {
          id: "ds-valid",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z", // Due
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      mockBossSend.mockResolvedValue("job-id");

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      const result = await handler();

      // Only the valid one should be processed
      expect(mockBossSend).toHaveBeenCalledTimes(1);
      expect(mockBossSend).toHaveBeenCalledWith(
        SYNC_API_DATA_SOURCE_JOB,
        expect.objectContaining({ dataSourceId: "ds-valid" }),
        expect.any(Object)
      );
    });

    it("should use singletonKey to prevent duplicate jobs", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-1",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z",
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      mockBossSend.mockResolvedValue("job-id");

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      await handler();

      // Verify singletonKey is used
      expect(mockBossSend).toHaveBeenCalledWith(
        SYNC_API_DATA_SOURCE_JOB,
        expect.any(Object),
        expect.objectContaining({
          singletonKey: expect.stringContaining("ds-1"),
        })
      );
    });

    it("should return correct result summary", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-1",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z", // Due
            },
          },
        },
        {
          id: "ds-2",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z", // Due but deduped
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      // First succeeds, second is deduped
      mockBossSend
        .mockResolvedValueOnce("job-id-1")
        .mockResolvedValueOnce(null);

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      const result = await handler();

      expect(result).toEqual({
        checked: 2,
        enqueued: 1,
        skipped: 1,
        errors: 0,
      });
    });

    it("should handle errors gracefully and continue", async () => {
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const mockDataSources = [
        {
          id: "ds-1",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z",
            },
          },
        },
        {
          id: "ds-2",
          type: "api",
          config: {
            apiFetch: {
              url: "https://api.example.com/data",
              method: "GET",
              syncFrequency: "1h",
              lastSyncAt: "2025-01-15T10:00:00Z",
            },
          },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDataSources),
        }),
      });

      // First fails, second succeeds
      mockBossSend
        .mockRejectedValueOnce(new Error("Queue error"))
        .mockResolvedValueOnce("job-id-2");

      const mockBoss = createMockBoss() as PgBoss;
      const handler = createScheduleApiSyncsHandler(mockBoss);
      const result = await handler();

      expect(result).toEqual({
        checked: 2,
        enqueued: 1,
        skipped: 0,
        errors: 1,
      });
    });
  });

  describe("registerScheduleApiSyncsHandler", () => {
    it("should create queue and register worker", async () => {
      const mockBoss = createMockBoss() as PgBoss;
      mockBossCreateQueue.mockResolvedValue(undefined);
      mockBossSchedule.mockResolvedValue(undefined);

      await registerScheduleApiSyncsHandler(mockBoss);

      expect(mockBossCreateQueue).toHaveBeenCalledWith(SCHEDULE_API_SYNCS_JOB);
      expect(mockBossWork).toHaveBeenCalledWith(
        SCHEDULE_API_SYNCS_JOB,
        expect.any(Function)
      );
    });

    it("should schedule the cron job", async () => {
      const mockBoss = createMockBoss() as PgBoss;
      mockBossCreateQueue.mockResolvedValue(undefined);
      mockBossSchedule.mockResolvedValue(undefined);

      await registerScheduleApiSyncsHandler(mockBoss);

      expect(mockBossSchedule).toHaveBeenCalledWith(
        SCHEDULE_API_SYNCS_JOB,
        SCHEDULE_API_SYNCS_CRON,
        {},
        expect.any(Object)
      );
    });
  });
});
