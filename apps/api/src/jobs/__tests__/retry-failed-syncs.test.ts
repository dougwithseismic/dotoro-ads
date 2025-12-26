/**
 * Retry Failed Syncs Job Handler Tests
 *
 * Tests for the background job that retries failed campaign syncs
 * using exponential backoff and circuit breaker patterns.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to create mock objects that are available during vi.mock
const {
  mockCircuitBreaker,
  mockRepository,
  mockGetCircuitBreaker,
} = vi.hoisted(() => {
  const mockCircuitBreaker = {
    canExecute: vi.fn(),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    getState: vi.fn(),
    getName: vi.fn(),
  };

  const mockGetCircuitBreaker = vi.fn().mockReturnValue(mockCircuitBreaker);

  const mockRepository = {
    getFailedCampaignsForRetry: vi.fn(),
    incrementRetryCount: vi.fn(),
    markPermanentFailure: vi.fn(),
    resetSyncForRetry: vi.fn(),
    getCampaignById: vi.fn(),
  };

  return {
    mockCircuitBreaker,
    mockRepository,
    mockGetCircuitBreaker,
  };
});

// Mock the circuit breaker
vi.mock("@repo/core/campaign-set", () => ({
  getCircuitBreaker: mockGetCircuitBreaker,
  resetCircuitBreakers: vi.fn(),
}));

// Mock repository
vi.mock("../../repositories/campaign-set-repository.js", () => ({
  DrizzleCampaignSetRepository: vi.fn().mockImplementation(() => mockRepository),
}));

// Mock db
vi.mock("../../services/db.js", () => ({
  db: {},
}));

// Import after mocking
import {
  RETRY_FAILED_SYNCS_JOB,
  createRetryFailedSyncsHandler,
  type RetryFailedSyncsJob,
  type RetryResult,
} from "../handlers/retry-failed-syncs.js";
import { getCircuitBreaker } from "@repo/core/campaign-set";

describe("Retry Failed Syncs Job Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to circuit breaker allowing execution
    mockCircuitBreaker.canExecute.mockReturnValue(true);
    mockCircuitBreaker.getState.mockReturnValue("closed");
    mockCircuitBreaker.getName.mockReturnValue("reddit");
  });

  describe("RETRY_FAILED_SYNCS_JOB constant", () => {
    it("should export the correct job name", () => {
      expect(RETRY_FAILED_SYNCS_JOB).toBe("retry-failed-syncs");
    });
  });

  describe("createRetryFailedSyncsHandler", () => {
    const mockJobData: RetryFailedSyncsJob = {
      userId: "user-123",
      maxRetries: 3,
    };

    it("should return empty result when no failed campaigns exist", async () => {
      // Arrange
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([]);

      // Act
      const handler = createRetryFailedSyncsHandler();
      const result = await handler(mockJobData);

      // Assert
      expect(result).toEqual({
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        permanentFailures: 0,
      });
      expect(mockRepository.getFailedCampaignsForRetry).toHaveBeenCalledWith(
        "user-123",
        3
      );
    });

    it("should skip campaigns when circuit breaker is open", async () => {
      // Arrange
      mockCircuitBreaker.canExecute.mockReturnValue(false);
      mockCircuitBreaker.getState.mockReturnValue("open");
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([
        {
          syncRecordId: "sync-1",
          campaignId: "campaign-1",
          platform: "reddit",
          retryCount: 1,
          errorLog: "Rate limit exceeded",
          lastRetryAt: new Date(),
        },
      ]);

      // Act
      const handler = createRetryFailedSyncsHandler();
      const result = await handler(mockJobData);

      // Assert
      expect(result.skipped).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(getCircuitBreaker).toHaveBeenCalledWith("reddit");
    });

    it("should increment retry count when retrying", async () => {
      // Arrange
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([
        {
          syncRecordId: "sync-1",
          campaignId: "campaign-1",
          platform: "reddit",
          retryCount: 1,
          errorLog: "Temporary error",
          lastRetryAt: new Date(),
        },
      ]);
      mockRepository.incrementRetryCount.mockResolvedValue(2);
      mockRepository.resetSyncForRetry.mockResolvedValue(undefined);

      // Act
      const handler = createRetryFailedSyncsHandler();
      const result = await handler(mockJobData);

      // Assert
      expect(mockRepository.incrementRetryCount).toHaveBeenCalledWith("campaign-1");
      expect(mockRepository.resetSyncForRetry).toHaveBeenCalledWith("campaign-1");
      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
    });

    it("should mark permanent failure after max retries", async () => {
      // Arrange
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([
        {
          syncRecordId: "sync-1",
          campaignId: "campaign-1",
          platform: "reddit",
          retryCount: 2, // Already at max - 1
          errorLog: "Persistent error",
          lastRetryAt: new Date(),
        },
      ]);
      mockRepository.incrementRetryCount.mockResolvedValue(3); // Now at max
      mockRepository.markPermanentFailure.mockResolvedValue(undefined);

      // Act
      const handler = createRetryFailedSyncsHandler();
      const result = await handler({ ...mockJobData, maxRetries: 3 });

      // Assert
      expect(mockRepository.markPermanentFailure).toHaveBeenCalledWith(
        "campaign-1",
        expect.stringContaining("Max retries")
      );
      expect(result.permanentFailures).toBe(1);
    });

    it("should record failure on circuit breaker when retry fails", async () => {
      // Arrange
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([
        {
          syncRecordId: "sync-1",
          campaignId: "campaign-1",
          platform: "reddit",
          retryCount: 0,
          errorLog: "Error",
          lastRetryAt: null,
        },
      ]);
      mockRepository.incrementRetryCount.mockResolvedValue(1);
      mockRepository.resetSyncForRetry.mockRejectedValue(new Error("API error"));

      // Act
      const handler = createRetryFailedSyncsHandler();
      const result = await handler(mockJobData);

      // Assert
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
      expect(result.failed).toBe(1);
    });

    it("should record success on circuit breaker when retry succeeds", async () => {
      // Arrange
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([
        {
          syncRecordId: "sync-1",
          campaignId: "campaign-1",
          platform: "reddit",
          retryCount: 0,
          errorLog: "Transient error",
          lastRetryAt: null,
        },
      ]);
      mockRepository.incrementRetryCount.mockResolvedValue(1);
      mockRepository.resetSyncForRetry.mockResolvedValue(undefined);

      // Act
      const handler = createRetryFailedSyncsHandler();
      const result = await handler(mockJobData);

      // Assert
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
      expect(result.succeeded).toBe(1);
    });

    it("should process multiple campaigns", async () => {
      // Arrange
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([
        {
          syncRecordId: "sync-1",
          campaignId: "campaign-1",
          platform: "reddit",
          retryCount: 0,
          errorLog: "Error 1",
          lastRetryAt: null,
        },
        {
          syncRecordId: "sync-2",
          campaignId: "campaign-2",
          platform: "reddit",
          retryCount: 1,
          errorLog: "Error 2",
          lastRetryAt: new Date(),
        },
        {
          syncRecordId: "sync-3",
          campaignId: "campaign-3",
          platform: "google",
          retryCount: 0,
          errorLog: "Error 3",
          lastRetryAt: null,
        },
      ]);
      mockRepository.incrementRetryCount.mockResolvedValue(1);
      mockRepository.resetSyncForRetry.mockResolvedValue(undefined);

      // Act
      const handler = createRetryFailedSyncsHandler();
      const result = await handler(mockJobData);

      // Assert
      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(3);
    });

    it("should use different circuit breakers for different platforms", async () => {
      // Arrange
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([
        {
          syncRecordId: "sync-1",
          campaignId: "campaign-1",
          platform: "reddit",
          retryCount: 0,
          errorLog: "Error",
          lastRetryAt: null,
        },
        {
          syncRecordId: "sync-2",
          campaignId: "campaign-2",
          platform: "google",
          retryCount: 0,
          errorLog: "Error",
          lastRetryAt: null,
        },
      ]);
      mockRepository.incrementRetryCount.mockResolvedValue(1);
      mockRepository.resetSyncForRetry.mockResolvedValue(undefined);

      // Act
      const handler = createRetryFailedSyncsHandler();
      await handler(mockJobData);

      // Assert
      expect(getCircuitBreaker).toHaveBeenCalledWith("reddit");
      expect(getCircuitBreaker).toHaveBeenCalledWith("google");
    });

    it("should stop processing platform when circuit opens mid-batch", async () => {
      // Arrange
      let callCount = 0;
      mockCircuitBreaker.canExecute.mockImplementation(() => {
        callCount++;
        // Open circuit after first campaign
        return callCount === 1;
      });

      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([
        {
          syncRecordId: "sync-1",
          campaignId: "campaign-1",
          platform: "reddit",
          retryCount: 0,
          errorLog: "Error",
          lastRetryAt: null,
        },
        {
          syncRecordId: "sync-2",
          campaignId: "campaign-2",
          platform: "reddit",
          retryCount: 0,
          errorLog: "Error",
          lastRetryAt: null,
        },
      ]);
      mockRepository.incrementRetryCount.mockResolvedValue(1);
      mockRepository.resetSyncForRetry.mockResolvedValue(undefined);

      // Act
      const handler = createRetryFailedSyncsHandler();
      const result = await handler(mockJobData);

      // Assert
      expect(result.succeeded).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it("should use default maxRetries of 3 when not specified", async () => {
      // Arrange
      mockRepository.getFailedCampaignsForRetry.mockResolvedValue([]);

      // Act
      const handler = createRetryFailedSyncsHandler();
      await handler({ userId: "user-123" } as RetryFailedSyncsJob);

      // Assert
      expect(mockRepository.getFailedCampaignsForRetry).toHaveBeenCalledWith(
        "user-123",
        3
      );
    });
  });
});
