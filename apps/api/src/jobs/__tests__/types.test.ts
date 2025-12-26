import { describe, it, expect } from "vitest";
import type { SyncCampaignSetJob, JobStatus, JobState } from "../types.js";

describe("Job Types", () => {
  describe("SyncCampaignSetJob", () => {
    it("should accept valid sync job data", () => {
      const job: SyncCampaignSetJob = {
        campaignSetId: "123e4567-e89b-12d3-a456-426614174000",
        userId: "user-123",
        adAccountId: "ad-account-456",
        fundingInstrumentId: "funding-789",
        platform: "reddit",
      };

      // Type check passes, verify runtime structure
      expect(job.campaignSetId).toBeDefined();
      expect(job.userId).toBeDefined();
      expect(job.adAccountId).toBeDefined();
      expect(job.fundingInstrumentId).toBeDefined();
      expect(job.platform).toBe("reddit");
    });

    it("should support all valid platforms", () => {
      const platforms: SyncCampaignSetJob["platform"][] = [
        "reddit",
        "google",
        "facebook",
      ];

      platforms.forEach((platform) => {
        const job: SyncCampaignSetJob = {
          campaignSetId: "123",
          userId: "user",
          adAccountId: "account",
          fundingInstrumentId: "funding",
          platform,
        };
        expect(job.platform).toBe(platform);
      });
    });
  });

  describe("JobStatus", () => {
    it("should accept valid completed job status", () => {
      const status: JobStatus = {
        id: "job-123",
        name: "sync-campaign-set",
        state: "completed",
        data: { campaignSetId: "123" },
        progress: 100,
        output: { synced: 5, failed: 0 },
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
      };

      expect(status.id).toBe("job-123");
      expect(status.state).toBe("completed");
      expect(status.progress).toBe(100);
    });

    it("should accept minimal job status (pending job)", () => {
      const status: JobStatus = {
        id: "job-456",
        name: "sync-campaign-set",
        state: "created",
        data: { campaignSetId: "456" },
        createdAt: new Date(),
      };

      // Optional fields should be undefined
      expect(status.progress).toBeUndefined();
      expect(status.output).toBeUndefined();
      expect(status.startedAt).toBeUndefined();
      expect(status.completedAt).toBeUndefined();
    });

    it("should support all valid job states", () => {
      const validStates: JobState[] = [
        "created",
        "active",
        "completed",
        "failed",
        "cancelled",
      ];

      validStates.forEach((state) => {
        const status: JobStatus = {
          id: "job",
          name: "test",
          state,
          data: {},
          createdAt: new Date(),
        };
        expect(status.state).toBe(state);
      });
    });

    it("should include error field for failed jobs", () => {
      const status: JobStatus = {
        id: "job-failed",
        name: "sync-campaign-set",
        state: "failed",
        data: { campaignSetId: "789" },
        error: "Connection timeout",
        createdAt: new Date(),
        completedAt: new Date(),
      };

      expect(status.error).toBe("Connection timeout");
    });
  });
});
