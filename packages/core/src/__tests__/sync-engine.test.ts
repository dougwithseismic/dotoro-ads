import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SyncEngine,
  SyncOperation,
  SyncResult,
  LocalState,
  PlatformState,
  DiffResult,
  SyncHistoryEntry,
} from "../sync/sync-engine.js";

describe("SyncEngine", () => {
  let syncEngine: SyncEngine;

  const mockPlatformAdapter = {
    fetchCampaign: vi.fn(),
    fetchAdGroup: vi.fn(),
    fetchAd: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    deleteCampaign: vi.fn(),
    createAdGroup: vi.fn(),
    updateAdGroup: vi.fn(),
    deleteAdGroup: vi.fn(),
    createAd: vi.fn(),
    updateAd: vi.fn(),
    deleteAd: vi.fn(),
  };

  beforeEach(() => {
    syncEngine = new SyncEngine(mockPlatformAdapter);
    vi.clearAllMocks();
  });

  describe("diff", () => {
    it("should detect new items that need creation", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local_1",
            platformId: null,
            name: "New Campaign",
            objective: "AWARENESS",
            status: "draft",
            data: { funding_instrument_id: "fi_123", start_date: "2025-02-01" },
          },
        ],
        adGroups: [],
        ads: [],
      };

      const platformState: PlatformState = {
        campaigns: [],
        adGroups: [],
        ads: [],
      };

      const diff = syncEngine.diff(localState, platformState);

      expect(diff.creates).toHaveLength(1);
      expect(diff.creates[0]?.type).toBe("campaign");
      expect(diff.creates[0]?.localId).toBe("local_1");
      expect(diff.updates).toHaveLength(0);
      expect(diff.deletes).toHaveLength(0);
    });

    it("should detect items that need updates", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local_1",
            platformId: "platform_1",
            name: "Updated Campaign Name",
            objective: "CONVERSIONS",
            status: "active",
            data: { funding_instrument_id: "fi_123", start_date: "2025-02-01" },
          },
        ],
        adGroups: [],
        ads: [],
      };

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform_1",
            name: "Original Campaign Name",
            objective: "CONVERSIONS",
            status: "ACTIVE",
            data: { funding_instrument_id: "fi_123", start_date: "2025-02-01" },
          },
        ],
        adGroups: [],
        ads: [],
      };

      const diff = syncEngine.diff(localState, platformState);

      expect(diff.updates).toHaveLength(1);
      expect(diff.updates[0]?.type).toBe("campaign");
      expect(diff.updates[0]?.changes).toContain("name");
    });

    it("should detect items that need deletion", () => {
      const localState: LocalState = {
        campaigns: [],
        adGroups: [],
        ads: [],
      };

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform_1",
            name: "Orphaned Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: {},
          },
        ],
        adGroups: [],
        ads: [],
      };

      // Enable deletion tracking
      const diff = syncEngine.diff(localState, platformState, { trackDeletions: true });

      expect(diff.deletes).toHaveLength(1);
      expect(diff.deletes[0]?.type).toBe("campaign");
      expect(diff.deletes[0]?.platformId).toBe("platform_1");
    });

    it("should detect items that are in sync", () => {
      const localState: LocalState = {
        campaigns: [
          {
            id: "local_1",
            platformId: "platform_1",
            name: "Same Campaign",
            objective: "AWARENESS",
            status: "active",
            data: { funding_instrument_id: "fi_123", start_date: "2025-02-01" },
          },
        ],
        adGroups: [],
        ads: [],
      };

      const platformState: PlatformState = {
        campaigns: [
          {
            id: "platform_1",
            name: "Same Campaign",
            objective: "AWARENESS",
            status: "ACTIVE",
            data: { funding_instrument_id: "fi_123", start_date: "2025-02-01" },
          },
        ],
        adGroups: [],
        ads: [],
      };

      const diff = syncEngine.diff(localState, platformState);

      expect(diff.creates).toHaveLength(0);
      expect(diff.updates).toHaveLength(0);
      expect(diff.inSync).toHaveLength(1);
    });
  });

  describe("executeSync", () => {
    it("should execute create operations in correct order", async () => {
      const operations: SyncOperation[] = [
        { type: "create", entityType: "campaign", localId: "local_1", data: { name: "New Campaign" } },
        { type: "create", entityType: "ad_group", localId: "local_ag_1", parentId: "local_1", data: { name: "New Ad Group" } },
      ];

      mockPlatformAdapter.createCampaign.mockResolvedValueOnce({ id: "platform_1" });
      mockPlatformAdapter.createAdGroup.mockResolvedValueOnce({ id: "platform_ag_1" });

      const result = await syncEngine.executeSync(operations);

      expect(result.success).toBe(true);
      expect(result.executed).toHaveLength(2);
      expect(mockPlatformAdapter.createCampaign).toHaveBeenCalledBefore(
        mockPlatformAdapter.createAdGroup
      );
    });

    it("should handle errors and record them", async () => {
      const operations: SyncOperation[] = [
        { type: "create", entityType: "campaign", localId: "local_1", data: { name: "New Campaign" } },
      ];

      mockPlatformAdapter.createCampaign.mockRejectedValueOnce(
        new Error("API Error: Invalid funding instrument")
      );

      const result = await syncEngine.executeSync(operations);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain("Invalid funding instrument");
    });

    it("should rollback on failure when transaction mode is enabled", async () => {
      const operations: SyncOperation[] = [
        { type: "create", entityType: "campaign", localId: "local_1", data: { name: "Campaign 1" } },
        { type: "create", entityType: "campaign", localId: "local_2", data: { name: "Campaign 2" } },
      ];

      mockPlatformAdapter.createCampaign
        .mockResolvedValueOnce({ id: "platform_1" })
        .mockRejectedValueOnce(new Error("API Error"));

      mockPlatformAdapter.deleteCampaign.mockResolvedValueOnce(undefined);

      const result = await syncEngine.executeSync(operations, { transactionMode: true });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(mockPlatformAdapter.deleteCampaign).toHaveBeenCalledWith("platform_1");
    });

    it("should continue on failure when transaction mode is disabled", async () => {
      const operations: SyncOperation[] = [
        { type: "create", entityType: "campaign", localId: "local_1", data: { name: "Campaign 1" } },
        { type: "create", entityType: "campaign", localId: "local_2", data: { name: "Campaign 2" } },
      ];

      mockPlatformAdapter.createCampaign
        .mockRejectedValueOnce(new Error("API Error"))
        .mockResolvedValueOnce({ id: "platform_2" });

      const result = await syncEngine.executeSync(operations, { transactionMode: false });

      expect(result.success).toBe(false);
      expect(result.executed).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("getSyncHistory", () => {
    it("should record sync history", async () => {
      const operations: SyncOperation[] = [
        { type: "create", entityType: "campaign", localId: "local_1", data: { name: "Campaign" } },
      ];

      mockPlatformAdapter.createCampaign.mockResolvedValueOnce({ id: "platform_1" });

      await syncEngine.executeSync(operations);

      const history = syncEngine.getSyncHistory();

      expect(history).toHaveLength(1);
      expect(history[0]?.operationsCount).toBe(1);
      expect(history[0]?.success).toBe(true);
    });

    it("should limit history entries", async () => {
      const operations: SyncOperation[] = [
        { type: "create", entityType: "campaign", localId: "local_1", data: { name: "Campaign" } },
      ];

      mockPlatformAdapter.createCampaign.mockResolvedValue({ id: "platform_1" });

      // Execute multiple syncs
      for (let i = 0; i < 15; i++) {
        await syncEngine.executeSync(operations);
      }

      const history = syncEngine.getSyncHistory();

      // Default limit is 10
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe("generateOperations", () => {
    it("should generate operations from diff result", () => {
      const diff: DiffResult = {
        creates: [
          {
            type: "campaign",
            localId: "local_1",
            data: { name: "New Campaign", objective: "AWARENESS" },
          },
        ],
        updates: [
          {
            type: "ad_group",
            localId: "local_ag_1",
            platformId: "platform_ag_1",
            changes: ["name", "bid_micro"],
            newValues: { name: "Updated Name", bid_micro: 100000 },
          },
        ],
        deletes: [],
        inSync: [],
      };

      const operations = syncEngine.generateOperations(diff);

      expect(operations).toHaveLength(2);
      expect(operations[0]?.type).toBe("create");
      expect(operations[1]?.type).toBe("update");
    });
  });
});
