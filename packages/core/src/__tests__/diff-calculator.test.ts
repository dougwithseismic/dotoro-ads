import { describe, it, expect } from "vitest";
import {
  DiffCalculator,
  type LocalCampaign,
  type PlatformCampaign,
  type CampaignData,
} from "../sync/diff-calculator.js";

describe("DiffCalculator", () => {
  const calculator = new DiffCalculator();

  // Helper to create local campaign
  const createLocalCampaign = (
    id: string,
    name: string,
    options: {
      status?: "draft" | "ready";
      data?: Partial<CampaignData>;
      hash?: string;
    } = {}
  ): LocalCampaign => ({
    id,
    name,
    status: options.status ?? "ready",
    data: {
      objective: "CONVERSIONS",
      budget: { type: "daily", amount: 50, currency: "USD" },
      targeting: {},
      ...options.data,
    },
    hash: options.hash ?? `hash-${id}`,
  });

  // Helper to create platform campaign
  const createPlatformCampaign = (
    platformId: string,
    name: string,
    options: {
      localId?: string;
      data?: Partial<CampaignData>;
      hash?: string;
    } = {}
  ): PlatformCampaign => ({
    platformId,
    localId: options.localId,
    name,
    data: {
      objective: "CONVERSIONS",
      budget: { type: "daily", amount: 50, currency: "USD" },
      targeting: {},
      ...options.data,
    },
    hash: options.hash ?? `hash-${platformId}`,
  });

  describe("toCreate - new local campaigns not on platform", () => {
    it("identifies campaigns without matching platformId or hash", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "New Campaign", { hash: "unique-hash-1" }),
        createLocalCampaign("local-2", "Another New", { hash: "unique-hash-2" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      expect(result.toCreate).toHaveLength(2);
      expect(result.toCreate[0]?.id).toBe("local-1");
      expect(result.toCreate[1]?.id).toBe("local-2");
      expect(result.summary.createCount).toBe(2);
    });

    it("ignores draft status campaigns", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Draft Campaign", { status: "draft" }),
        createLocalCampaign("local-2", "Ready Campaign", { status: "ready" }),
      ];

      const result = calculator.calculateDiff(localCampaigns, []);

      // Draft campaigns should not be in toCreate
      expect(result.toCreate).toHaveLength(1);
      expect(result.toCreate[0]?.id).toBe("local-2");
    });
  });

  describe("toUpdate - local campaigns with changes", () => {
    it("identifies campaigns matched by localId with different hash", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Updated Name", { hash: "new-hash" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Old Name", {
          localId: "local-1",
          hash: "old-hash",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      expect(result.toUpdate).toHaveLength(1);
      expect(result.toUpdate[0]?.local.id).toBe("local-1");
      expect(result.toUpdate[0]?.platform.platformId).toBe("platform-1");
      expect(result.summary.updateCount).toBe(1);
    });

    it("identifies campaigns matched by content hash with changes", () => {
      // First synced with hash A, now has hash B (content changed)
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Changed Name", { hash: "new-hash-b" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Original Name", {
          localId: "local-1", // Matched by localId
          hash: "old-hash-a",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      expect(result.toUpdate).toHaveLength(1);
    });
  });

  describe("toDelete - platform campaigns not in local", () => {
    it("identifies orphaned platform campaigns when includeDeleted is true", () => {
      const localCampaigns: LocalCampaign[] = [];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Orphan Campaign", {
          localId: "deleted-local",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns, {
        includeDeleted: true,
      });

      expect(result.toDelete).toHaveLength(1);
      expect(result.toDelete[0]?.platformId).toBe("platform-1");
      expect(result.summary.deleteCount).toBe(1);
    });

    it("excludes orphaned campaigns when includeDeleted is false", () => {
      const localCampaigns: LocalCampaign[] = [];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Orphan Campaign"),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns, {
        includeDeleted: false,
      });

      expect(result.toDelete).toHaveLength(0);
    });

    it("defaults to not including deleted", () => {
      const localCampaigns: LocalCampaign[] = [];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Orphan Campaign"),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      expect(result.toDelete).toHaveLength(0);
    });
  });

  describe("unchanged - identical local and platform", () => {
    it("identifies campaigns with matching hash", () => {
      const sharedHash = "same-content-hash";

      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Same Campaign", { hash: sharedHash }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Same Campaign", {
          localId: "local-1",
          hash: sharedHash,
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      expect(result.unchanged).toHaveLength(1);
      expect(result.unchanged[0]?.local.id).toBe("local-1");
      expect(result.unchanged[0]?.platform.platformId).toBe("platform-1");
      expect(result.summary.unchangedCount).toBe(1);
    });
  });

  describe("matching by localId or content hash", () => {
    it("matches by localId first when available", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Campaign A", { hash: "hash-a" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Campaign A", {
          localId: "local-1",
          hash: "different-hash",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      // Matched by localId, different hash means update
      expect(result.toUpdate).toHaveLength(1);
      expect(result.toCreate).toHaveLength(0);
    });

    it("falls back to hash matching when no localId match", () => {
      const sharedHash = "content-hash-xyz";

      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Campaign", { hash: sharedHash }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Campaign", {
          // No localId set
          hash: sharedHash,
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      // Matched by hash, same hash means unchanged
      expect(result.unchanged).toHaveLength(1);
      expect(result.toCreate).toHaveLength(0);
    });

    it("creates new when neither localId nor hash matches", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "New Campaign", { hash: "unique-hash" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Other Campaign", {
          localId: "other-local",
          hash: "different-hash",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      expect(result.toCreate).toHaveLength(1);
    });
  });

  describe("ignoreFields option", () => {
    it("ignores specified fields when comparing hashes", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Campaign", {
          hash: "hash-with-timestamp-123",
          data: { objective: "CONVERSIONS", lastModified: "2025-01-01" },
        }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Campaign", {
          localId: "local-1",
          hash: "hash-with-timestamp-456", // Different due to timestamp
          data: { objective: "CONVERSIONS", lastModified: "2024-12-01" },
        }),
      ];

      // Without ignoreFields, this would be an update
      const resultWithUpdate = calculator.calculateDiff(
        localCampaigns,
        platformCampaigns
      );
      expect(resultWithUpdate.toUpdate).toHaveLength(1);

      // With ignoreFields including the changing field, use custom compare
      const resultIgnored = calculator.calculateDiff(
        localCampaigns,
        platformCampaigns,
        { ignoreFields: ["lastModified"] }
      );

      // When ignoring lastModified, campaigns should be unchanged
      expect(resultIgnored.unchanged).toHaveLength(1);
    });

    it("compares data fields when ignoreFields is provided", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Campaign", {
          hash: "hash-1",
          data: {
            objective: "CONVERSIONS",
            budget: { type: "daily", amount: 100, currency: "USD" },
          },
        }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Campaign", {
          localId: "local-1",
          hash: "hash-2",
          data: {
            objective: "CONVERSIONS",
            budget: { type: "daily", amount: 50, currency: "USD" }, // Different budget
          },
        }),
      ];

      // Ignore budget field
      const result = calculator.calculateDiff(
        localCampaigns,
        platformCampaigns,
        { ignoreFields: ["budget"] }
      );

      // Should be unchanged when budget is ignored
      expect(result.unchanged).toHaveLength(1);
    });
  });

  describe("summary and API call estimation", () => {
    it("provides accurate summary counts", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "New", { hash: "new-hash" }),
        createLocalCampaign("local-2", "Updated", { hash: "updated-hash" }),
        createLocalCampaign("local-3", "Unchanged", { hash: "same-hash" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-2", "Old Name", {
          localId: "local-2",
          hash: "old-hash",
        }),
        createPlatformCampaign("platform-3", "Unchanged", {
          localId: "local-3",
          hash: "same-hash",
        }),
        createPlatformCampaign("platform-4", "To Delete", {
          localId: "deleted",
          hash: "orphan-hash",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns, {
        includeDeleted: true,
      });

      expect(result.summary.createCount).toBe(1);
      expect(result.summary.updateCount).toBe(1);
      expect(result.summary.deleteCount).toBe(1);
      expect(result.summary.unchangedCount).toBe(1);
    });

    it("estimates API calls correctly", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "New 1"),
        createLocalCampaign("local-2", "New 2"),
        createLocalCampaign("local-3", "Update", { hash: "new-hash" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Update", {
          localId: "local-3",
          hash: "old-hash",
        }),
        createPlatformCampaign("platform-2", "Delete 1"),
        createPlatformCampaign("platform-3", "Delete 2"),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns, {
        includeDeleted: true,
      });

      // 2 creates + 1 update + 2 deletes = 5 API calls
      expect(result.summary.estimatedApiCalls).toBe(5);
    });

    it("does not count unchanged in API calls", () => {
      const hash = "same-hash";
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Same", { hash }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Same", {
          localId: "local-1",
          hash,
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      expect(result.summary.estimatedApiCalls).toBe(0);
      expect(result.summary.unchangedCount).toBe(1);
    });
  });

  describe("complex scenarios", () => {
    it("handles mixed create, update, delete, and unchanged", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("new-1", "Brand New", { hash: "new-hash" }),
        createLocalCampaign("existing-1", "Updated Name", { hash: "changed-hash" }),
        createLocalCampaign("existing-2", "Same", { hash: "unchanged-hash" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("plat-1", "Old Name", {
          localId: "existing-1",
          hash: "old-hash",
        }),
        createPlatformCampaign("plat-2", "Same", {
          localId: "existing-2",
          hash: "unchanged-hash",
        }),
        createPlatformCampaign("plat-3", "Orphan", {
          localId: "deleted-local",
          hash: "orphan-hash",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns, {
        includeDeleted: true,
      });

      expect(result.toCreate).toHaveLength(1);
      expect(result.toUpdate).toHaveLength(1);
      expect(result.toDelete).toHaveLength(1);
      expect(result.unchanged).toHaveLength(1);

      expect(result.toCreate[0]?.id).toBe("new-1");
      expect(result.toUpdate[0]?.local.id).toBe("existing-1");
      expect(result.toDelete[0]?.platformId).toBe("plat-3");
      expect(result.unchanged[0]?.local.id).toBe("existing-2");
    });

    it("handles empty local and platform states", () => {
      const result = calculator.calculateDiff([], []);

      expect(result.toCreate).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.toDelete).toHaveLength(0);
      expect(result.unchanged).toHaveLength(0);
      expect(result.summary.estimatedApiCalls).toBe(0);
    });

    it("handles large number of campaigns efficiently", () => {
      const localCampaigns: LocalCampaign[] = Array.from(
        { length: 1000 },
        (_, i) => createLocalCampaign(`local-${i}`, `Campaign ${i}`, {
          hash: `hash-${i}`,
        })
      );

      const platformCampaigns: PlatformCampaign[] = Array.from(
        { length: 500 },
        (_, i) => createPlatformCampaign(`platform-${i}`, `Campaign ${i}`, {
          localId: `local-${i}`,
          hash: `hash-${i}`, // Same hash = unchanged
        })
      );

      const start = performance.now();
      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);
      const duration = performance.now() - start;

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);

      // 500 unchanged, 500 to create
      expect(result.toCreate).toHaveLength(500);
      expect(result.unchanged).toHaveLength(500);
    });
  });

  describe("edge cases", () => {
    it("handles campaigns with same name but different content", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Duplicate Name", {
          hash: "hash-a",
          data: { objective: "AWARENESS" },
        }),
        createLocalCampaign("local-2", "Duplicate Name", {
          hash: "hash-b",
          data: { objective: "CONVERSIONS" },
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, []);

      expect(result.toCreate).toHaveLength(2);
    });

    it("handles platform campaigns without localId (first sync)", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Campaign", { hash: "my-hash" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        createPlatformCampaign("platform-1", "Campaign", {
          // No localId - was created outside our system
          hash: "different-hash",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns);

      // No match by localId or hash, so local should be created
      expect(result.toCreate).toHaveLength(1);
    });

    it("prefers localId match over hash match when both exist", () => {
      const localCampaigns: LocalCampaign[] = [
        createLocalCampaign("local-1", "Campaign", { hash: "shared-hash" }),
      ];

      const platformCampaigns: PlatformCampaign[] = [
        // This one matches by localId
        createPlatformCampaign("platform-1", "Campaign", {
          localId: "local-1",
          hash: "different-hash",
        }),
        // This one matches by hash but should be ignored
        createPlatformCampaign("platform-2", "Other", {
          hash: "shared-hash",
        }),
      ];

      const result = calculator.calculateDiff(localCampaigns, platformCampaigns, {
        includeDeleted: true,
      });

      // Should update platform-1 (localId match), delete platform-2
      expect(result.toUpdate).toHaveLength(1);
      expect(result.toUpdate[0]?.platform.platformId).toBe("platform-1");
      expect(result.toDelete).toHaveLength(1);
      expect(result.toDelete[0]?.platformId).toBe("platform-2");
    });
  });
});
