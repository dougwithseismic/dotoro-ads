import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SyncEngine,
  type PlatformAdapter,
  type LocalState,
  type PlatformState,
  type SyncOperation,
  type EntityType,
} from "../sync-engine.js";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAdapter(): PlatformAdapter {
  return {
    fetchCampaign: vi.fn().mockResolvedValue(null),
    fetchAdGroup: vi.fn().mockResolvedValue(null),
    fetchAd: vi.fn().mockResolvedValue(null),
    createCampaign: vi.fn().mockResolvedValue({ id: "platform-campaign-1" }),
    updateCampaign: vi.fn().mockResolvedValue(undefined),
    deleteCampaign: vi.fn().mockResolvedValue(undefined),
    createAdGroup: vi.fn().mockResolvedValue({ id: "platform-adgroup-1" }),
    updateAdGroup: vi.fn().mockResolvedValue(undefined),
    deleteAdGroup: vi.fn().mockResolvedValue(undefined),
    createAd: vi.fn().mockResolvedValue({ id: "platform-ad-1" }),
    updateAd: vi.fn().mockResolvedValue(undefined),
    deleteAd: vi.fn().mockResolvedValue(undefined),
  };
}

function createEmptyLocalState(): LocalState {
  return {
    campaigns: [],
    adGroups: [],
    ads: [],
  };
}

function createEmptyPlatformState(): PlatformState {
  return {
    campaigns: [],
    adGroups: [],
    ads: [],
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("SyncEngine", () => {
  let adapter: PlatformAdapter;
  let engine: SyncEngine;

  beforeEach(() => {
    adapter = createMockAdapter();
    engine = new SyncEngine(adapter);
  });

  describe("diff", () => {
    it("should detect new campaigns that need creation", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local-1",
            platformId: null,
            name: "New Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const platformState = createEmptyPlatformState();

      const diff = engine.diff(localState, platformState);

      expect(diff.creates).toHaveLength(1);
      expect(diff.creates[0]).toEqual({
        type: "campaign",
        localId: "local-1",
        data: { name: "New Campaign", objective: "AWARENESS" },
      });
      expect(diff.updates).toHaveLength(0);
      expect(diff.deletes).toHaveLength(0);
      expect(diff.inSync).toHaveLength(0);
    });

    it("should detect campaigns that need updates", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local-1",
            platformId: "platform-1",
            name: "Updated Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform-1",
            name: "Original Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const diff = engine.diff(localState, platformState);

      expect(diff.creates).toHaveLength(0);
      expect(diff.updates).toHaveLength(1);
      expect(diff.updates[0]).toMatchObject({
        type: "campaign",
        localId: "local-1",
        platformId: "platform-1",
        changes: ["name"],
        newValues: { name: "Updated Campaign" },
      });
      expect(diff.deletes).toHaveLength(0);
      expect(diff.inSync).toHaveLength(0);
    });

    it("should detect campaigns that are in sync", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local-1",
            platformId: "platform-1",
            name: "Same Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform-1",
            name: "Same Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const diff = engine.diff(localState, platformState);

      expect(diff.creates).toHaveLength(0);
      expect(diff.updates).toHaveLength(0);
      expect(diff.deletes).toHaveLength(0);
      expect(diff.inSync).toHaveLength(1);
      expect(diff.inSync[0]).toEqual({
        type: "campaign",
        localId: "local-1",
        platformId: "platform-1",
      });
    });

    it("should detect deletions when trackDeletions is enabled", () => {
      const localState = createEmptyLocalState();

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform-orphan",
            name: "Orphan Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const diff = engine.diff(localState, platformState, {
        trackDeletions: true,
      });

      expect(diff.creates).toHaveLength(0);
      expect(diff.updates).toHaveLength(0);
      expect(diff.deletes).toHaveLength(1);
      expect(diff.deletes[0]).toEqual({
        type: "campaign",
        platformId: "platform-orphan",
      });
      expect(diff.inSync).toHaveLength(0);
    });

    it("should not track deletions by default", () => {
      const localState = createEmptyLocalState();

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform-orphan",
            name: "Orphan Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const diff = engine.diff(localState, platformState);

      expect(diff.deletes).toHaveLength(0);
    });

    it("should handle empty states", () => {
      const localState = createEmptyLocalState();
      const platformState = createEmptyPlatformState();

      const diff = engine.diff(localState, platformState);

      expect(diff.creates).toHaveLength(0);
      expect(diff.updates).toHaveLength(0);
      expect(diff.deletes).toHaveLength(0);
      expect(diff.inSync).toHaveLength(0);
    });

    it("should handle mixed entity types", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local-campaign-1",
            platformId: null,
            name: "New Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [
          {
            id: "local-adgroup-1",
            platformId: null,
            campaignId: "local-campaign-1",
            name: "New Ad Group",
            status: "ACTIVE",
            data: {},
          },
        ],
        ads: [
          {
            id: "local-ad-1",
            platformId: null,
            adGroupId: "local-adgroup-1",
            name: "New Ad",
            status: "ACTIVE",
            data: {},
          },
        ],
      };

      const platformState = createEmptyPlatformState();

      const diff = engine.diff(localState, platformState);

      expect(diff.creates).toHaveLength(3);
      expect(diff.creates.map((c) => c.type)).toEqual([
        "campaign",
        "ad_group",
        "ad",
      ]);
    });
  });

  describe("generateOperations", () => {
    it("should generate operations from diff result", () => {
      const diff = {
        creates: [
          {
            type: "campaign" as EntityType,
            localId: "local-1",
            data: { name: "New Campaign" },
          },
        ],
        updates: [
          {
            type: "ad_group" as EntityType,
            localId: "local-2",
            platformId: "platform-2",
            changes: ["name"],
            newValues: { name: "Updated Group" },
          },
        ],
        deletes: [
          {
            type: "ad" as EntityType,
            platformId: "platform-3",
          },
        ],
        inSync: [],
      };

      const operations = engine.generateOperations(diff);

      expect(operations).toHaveLength(3);
      expect(operations[0]).toMatchObject({
        type: "create",
        entityType: "campaign",
        localId: "local-1",
      });
      expect(operations[1]).toMatchObject({
        type: "update",
        entityType: "ad_group",
        platformId: "platform-2",
      });
      expect(operations[2]).toMatchObject({
        type: "delete",
        entityType: "ad",
        platformId: "platform-3",
      });
    });
  });

  describe("executeSync", () => {
    it("should execute operations in correct order (creates first)", async () => {
      const operations: SyncOperation[] = [
        {
          type: "update",
          entityType: "campaign",
          platformId: "platform-1",
          data: { name: "Updated" },
        },
        {
          type: "create",
          entityType: "campaign",
          localId: "local-1",
          data: { name: "New Campaign" },
        },
      ];

      const result = await engine.executeSync(operations);

      expect(result.success).toBe(true);
      expect(result.executed).toHaveLength(2);
      // Create should be executed first
      expect(result.executed[0].operation.type).toBe("create");
      expect(result.executed[1].operation.type).toBe("update");
    });

    it("should execute deletes in reverse entity order (ads first, then ad_groups, then campaigns)", async () => {
      const operations: SyncOperation[] = [
        {
          type: "delete",
          entityType: "campaign",
          platformId: "platform-campaign",
        },
        {
          type: "delete",
          entityType: "ad",
          platformId: "platform-ad",
        },
        {
          type: "delete",
          entityType: "ad_group",
          platformId: "platform-adgroup",
        },
      ];

      const result = await engine.executeSync(operations);

      expect(result.success).toBe(true);
      expect(result.executed).toHaveLength(3);
      // Deletes should be in reverse entity order
      expect(result.executed[0].operation.entityType).toBe("ad");
      expect(result.executed[1].operation.entityType).toBe("ad_group");
      expect(result.executed[2].operation.entityType).toBe("campaign");
    });

    it("should handle dry run mode", async () => {
      const operations: SyncOperation[] = [
        {
          type: "create",
          entityType: "campaign",
          localId: "local-1",
          data: { name: "New Campaign" },
        },
      ];

      const result = await engine.executeSync(operations, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.executed).toHaveLength(1);
      expect(adapter.createCampaign).not.toHaveBeenCalled();
    });

    it("should rollback on failure in transaction mode", async () => {
      // First create succeeds, second fails
      (adapter.createCampaign as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "platform-1" })
        .mockRejectedValueOnce(new Error("API Error"));

      const operations: SyncOperation[] = [
        {
          type: "create",
          entityType: "campaign",
          localId: "local-1",
          data: { name: "Campaign 1" },
        },
        {
          type: "create",
          entityType: "campaign",
          localId: "local-2",
          data: { name: "Campaign 2" },
        },
      ];

      const result = await engine.executeSync(operations, {
        transactionMode: true,
      });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(adapter.deleteCampaign).toHaveBeenCalledWith("platform-1");
    });

    it("should continue on failure in non-transaction mode", async () => {
      // First create fails, second succeeds
      (adapter.createCampaign as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("API Error"))
        .mockResolvedValueOnce({ id: "platform-2" });

      const operations: SyncOperation[] = [
        {
          type: "create",
          entityType: "campaign",
          localId: "local-1",
          data: { name: "Campaign 1" },
        },
        {
          type: "create",
          entityType: "campaign",
          localId: "local-2",
          data: { name: "Campaign 2" },
        },
      ];

      const result = await engine.executeSync(operations);

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.executed).toHaveLength(1);
      expect(result.executed[0].success).toBe(true);
    });

    it("should validate data before executing create operation", async () => {
      const operations: SyncOperation[] = [
        {
          type: "create",
          entityType: "campaign",
          localId: "local-1",
          data: { name: "" }, // Invalid: empty name
        },
      ];

      const result = await engine.executeSync(operations);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Validation failed");
      expect(adapter.createCampaign).not.toHaveBeenCalled();
    });

    it("should record sync history", async () => {
      const operations: SyncOperation[] = [
        {
          type: "create",
          entityType: "campaign",
          localId: "local-1",
          data: { name: "Campaign 1" },
        },
      ];

      await engine.executeSync(operations);
      const history = engine.getSyncHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        operationsCount: 1,
        success: true,
      });
      expect(history[0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("platformId validation", () => {
    it("should fail update operation when platformId is missing", async () => {
      const operations: SyncOperation[] = [
        {
          type: "update",
          entityType: "campaign",
          localId: "local-1",
          platformId: undefined as unknown as string, // Force missing platformId
          data: { name: "Updated" },
          changes: ["name"],
        } as SyncOperation,
      ];

      const result = await engine.executeSync(operations);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Platform ID required");
    });

    it("should fail delete operation when platformId is missing", async () => {
      const operations: SyncOperation[] = [
        {
          type: "delete",
          entityType: "campaign",
          platformId: undefined as unknown as string, // Force missing platformId
        } as SyncOperation,
      ];

      const result = await engine.executeSync(operations);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Platform ID required");
    });
  });

  describe("edge cases", () => {
    it("should handle campaigns with status changes", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local-1",
            platformId: "platform-1",
            name: "Campaign",
            objective: "AWARENESS",
            status: "PAUSED",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform-1",
            name: "Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const diff = engine.diff(localState, platformState);

      expect(diff.updates).toHaveLength(1);
      expect(diff.updates[0].changes).toContain("status");
    });

    it("should handle case-insensitive status comparison", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local-1",
            platformId: "platform-1",
            name: "Campaign",
            objective: "AWARENESS",
            status: "active",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform-1",
            name: "Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      const diff = engine.diff(localState, platformState);

      // Should be in sync because status comparison is case-insensitive
      expect(diff.updates).toHaveLength(0);
      expect(diff.inSync).toHaveLength(1);
    });
  });
});
