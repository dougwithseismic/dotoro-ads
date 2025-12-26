/**
 * Platform Poller Tests
 *
 * Tests for the platform poller interface and types.
 * These tests validate that the interface works correctly
 * and that status transformations are consistent.
 */

import { describe, it, expect } from "vitest";
import type {
  PlatformCampaignStatus,
  PlatformPoller,
  ConflictDetails,
} from "../platform-poller.js";

describe("PlatformPoller Interface", () => {
  describe("PlatformCampaignStatus", () => {
    it("should have correct structure for active campaign", () => {
      const status: PlatformCampaignStatus = {
        platformId: "platform-123",
        status: "active",
        budget: {
          type: "daily",
          amount: 100,
        },
        lastModified: new Date("2025-01-15T10:00:00Z"),
      };

      expect(status.platformId).toBe("platform-123");
      expect(status.status).toBe("active");
      expect(status.budget?.type).toBe("daily");
      expect(status.budget?.amount).toBe(100);
      expect(status.lastModified).toBeInstanceOf(Date);
    });

    it("should allow all valid status values", () => {
      const statuses: PlatformCampaignStatus["status"][] = [
        "active",
        "paused",
        "completed",
        "deleted",
        "error",
      ];

      statuses.forEach((status) => {
        const campaignStatus: PlatformCampaignStatus = {
          platformId: "test-id",
          status,
        };
        expect(campaignStatus.status).toBe(status);
      });
    });

    it("should allow budget to be optional", () => {
      const status: PlatformCampaignStatus = {
        platformId: "platform-123",
        status: "active",
      };

      expect(status.budget).toBeUndefined();
    });

    it("should allow lastModified to be optional", () => {
      const status: PlatformCampaignStatus = {
        platformId: "platform-123",
        status: "paused",
      };

      expect(status.lastModified).toBeUndefined();
    });
  });

  describe("ConflictDetails", () => {
    it("should have correct structure for status conflict", () => {
      const conflict: ConflictDetails = {
        detectedAt: new Date("2025-01-15T10:00:00Z"),
        localStatus: "active",
        platformStatus: "paused",
        field: "status",
      };

      expect(conflict.detectedAt).toBeInstanceOf(Date);
      expect(conflict.localStatus).toBe("active");
      expect(conflict.platformStatus).toBe("paused");
      expect(conflict.field).toBe("status");
    });

    it("should allow budget conflict field", () => {
      const conflict: ConflictDetails = {
        detectedAt: new Date(),
        localStatus: "100",
        platformStatus: "200",
        field: "budget",
      };

      expect(conflict.field).toBe("budget");
    });

    it("should allow other conflict field for unspecified conflicts", () => {
      const conflict: ConflictDetails = {
        detectedAt: new Date(),
        localStatus: "value-a",
        platformStatus: "value-b",
        field: "other",
      };

      expect(conflict.field).toBe("other");
    });
  });

  describe("PlatformPoller Interface Contract", () => {
    it("should define platform property", () => {
      // Create a mock implementation to test the interface
      const mockPoller: PlatformPoller = {
        platform: "reddit",
        getCampaignStatus: async (_platformCampaignId: string) => null,
        listCampaignStatuses: async (_accountId: string) => [],
      };

      expect(mockPoller.platform).toBe("reddit");
    });

    it("should define getCampaignStatus method returning PlatformCampaignStatus or null", async () => {
      const mockPoller: PlatformPoller = {
        platform: "reddit",
        getCampaignStatus: async (platformCampaignId: string) => {
          if (platformCampaignId === "existing") {
            return {
              platformId: platformCampaignId,
              status: "active",
            };
          }
          return null;
        },
        listCampaignStatuses: async () => [],
      };

      const existingResult = await mockPoller.getCampaignStatus("existing");
      expect(existingResult).not.toBeNull();
      expect(existingResult?.platformId).toBe("existing");

      const nonExistentResult = await mockPoller.getCampaignStatus("non-existent");
      expect(nonExistentResult).toBeNull();
    });

    it("should define listCampaignStatuses method returning array", async () => {
      const mockPoller: PlatformPoller = {
        platform: "reddit",
        getCampaignStatus: async () => null,
        listCampaignStatuses: async (_accountId: string) => [
          { platformId: "campaign-1", status: "active" },
          { platformId: "campaign-2", status: "paused" },
        ],
      };

      const results = await mockPoller.listCampaignStatuses("account-123");
      expect(results).toHaveLength(2);
      expect(results[0]?.platformId).toBe("campaign-1");
      expect(results[1]?.platformId).toBe("campaign-2");
    });
  });
});
