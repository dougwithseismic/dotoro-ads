import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// Test the events module
import {
  jobEvents,
  emitSyncProgress,
  type SyncProgressEvent,
} from "../events.js";

describe("Job Events Module", () => {
  beforeEach(() => {
    // Remove all listeners before each test
    jobEvents.removeAllListeners();
  });

  afterEach(() => {
    // Clean up listeners after each test
    jobEvents.removeAllListeners();
  });

  describe("jobEvents", () => {
    it("should be an EventEmitter instance", () => {
      expect(jobEvents).toBeInstanceOf(EventEmitter);
    });

    it("should be a singleton (same instance across imports)", async () => {
      // Import again to verify it's the same instance
      const { jobEvents: jobEvents2 } = await import("../events.js");
      expect(jobEvents).toBe(jobEvents2);
    });
  });

  describe("SyncProgressEvent type", () => {
    it("should accept valid progress event", () => {
      const event: SyncProgressEvent = {
        jobId: "job-123",
        campaignSetId: "set-456",
        type: "progress",
        data: {
          synced: 5,
          total: 10,
        },
        timestamp: new Date().toISOString(),
      };

      expect(event.type).toBe("progress");
      expect(event.data.synced).toBe(5);
    });

    it("should accept valid campaign_synced event", () => {
      const event: SyncProgressEvent = {
        jobId: "job-123",
        campaignSetId: "set-456",
        type: "campaign_synced",
        data: {
          campaignId: "campaign-789",
          platformId: "reddit-123",
          synced: 6,
          total: 10,
        },
        timestamp: new Date().toISOString(),
      };

      expect(event.type).toBe("campaign_synced");
      expect(event.data.campaignId).toBe("campaign-789");
    });

    it("should accept valid campaign_failed event", () => {
      const event: SyncProgressEvent = {
        jobId: "job-123",
        campaignSetId: "set-456",
        type: "campaign_failed",
        data: {
          campaignId: "campaign-789",
          error: "Rate limit exceeded",
          synced: 5,
          failed: 1,
          total: 10,
        },
        timestamp: new Date().toISOString(),
      };

      expect(event.type).toBe("campaign_failed");
      expect(event.data.error).toBe("Rate limit exceeded");
    });

    it("should accept valid completed event", () => {
      const event: SyncProgressEvent = {
        jobId: "job-123",
        campaignSetId: "set-456",
        type: "completed",
        data: {
          synced: 8,
          failed: 2,
          total: 10,
        },
        timestamp: new Date().toISOString(),
      };

      expect(event.type).toBe("completed");
      expect(event.data.synced).toBe(8);
      expect(event.data.failed).toBe(2);
    });

    it("should accept valid error event", () => {
      const event: SyncProgressEvent = {
        jobId: "job-123",
        campaignSetId: "set-456",
        type: "error",
        data: {
          error: "Network failure",
        },
        timestamp: new Date().toISOString(),
      };

      expect(event.type).toBe("error");
      expect(event.data.error).toBe("Network failure");
    });
  });

  describe("emitSyncProgress", () => {
    it("should emit event on jobEvents with correct event name", () => {
      const listener = vi.fn();
      const jobId = "job-123";

      jobEvents.on(`sync:${jobId}`, listener);

      const event: SyncProgressEvent = {
        jobId,
        campaignSetId: "set-456",
        type: "progress",
        data: {
          synced: 3,
          total: 10,
        },
        timestamp: new Date().toISOString(),
      };

      emitSyncProgress(event);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(event);
    });

    it("should emit events to correct job listeners only", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      jobEvents.on("sync:job-1", listener1);
      jobEvents.on("sync:job-2", listener2);

      const event: SyncProgressEvent = {
        jobId: "job-1",
        campaignSetId: "set-456",
        type: "progress",
        data: { synced: 1, total: 5 },
        timestamp: new Date().toISOString(),
      };

      emitSyncProgress(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });

    it("should emit completed events that trigger done listeners", () => {
      const progressListener = vi.fn();
      const doneListener = vi.fn();
      const jobId = "job-123";

      jobEvents.on(`sync:${jobId}`, progressListener);
      jobEvents.on(`sync:${jobId}:done`, doneListener);

      const completedEvent: SyncProgressEvent = {
        jobId,
        campaignSetId: "set-456",
        type: "completed",
        data: { synced: 5, failed: 0, total: 5 },
        timestamp: new Date().toISOString(),
      };

      emitSyncProgress(completedEvent);

      expect(progressListener).toHaveBeenCalledTimes(1);
      expect(doneListener).toHaveBeenCalledTimes(1);
    });

    it("should emit error events that trigger done listeners", () => {
      const doneListener = vi.fn();
      const jobId = "job-123";

      jobEvents.on(`sync:${jobId}:done`, doneListener);

      const errorEvent: SyncProgressEvent = {
        jobId,
        campaignSetId: "set-456",
        type: "error",
        data: { error: "Critical failure" },
        timestamp: new Date().toISOString(),
      };

      emitSyncProgress(errorEvent);

      expect(doneListener).toHaveBeenCalledTimes(1);
    });

    it("should not emit done event for non-terminal event types", () => {
      const doneListener = vi.fn();
      const jobId = "job-123";

      jobEvents.on(`sync:${jobId}:done`, doneListener);

      const progressEvent: SyncProgressEvent = {
        jobId,
        campaignSetId: "set-456",
        type: "progress",
        data: { synced: 3, total: 10 },
        timestamp: new Date().toISOString(),
      };

      emitSyncProgress(progressEvent);

      expect(doneListener).not.toHaveBeenCalled();
    });

    it("should handle multiple listeners for the same job", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const jobId = "job-123";

      jobEvents.on(`sync:${jobId}`, listener1);
      jobEvents.on(`sync:${jobId}`, listener2);

      const event: SyncProgressEvent = {
        jobId,
        campaignSetId: "set-456",
        type: "campaign_synced",
        data: { campaignId: "c-1", synced: 1, total: 5 },
        timestamp: new Date().toISOString(),
      };

      emitSyncProgress(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });
});
