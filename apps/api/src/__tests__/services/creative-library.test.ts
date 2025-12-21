import { describe, it, expect, beforeEach } from "vitest";
import {
  CreativeLibraryService,
  RegisterCreativeInput,
  CreativeFilters,
  UpdateCreativeInput,
} from "../../services/creative-library.js";

describe("CreativeLibraryService", () => {
  let service: CreativeLibraryService;

  beforeEach(() => {
    service = new CreativeLibraryService();
    service.clear(); // Clear in-memory store between tests
  });

  describe("registerCreative", () => {
    it("registers a new creative successfully", async () => {
      const input: RegisterCreativeInput = {
        key: "account123/file.jpg",
        name: "Test Image",
        type: "IMAGE",
        accountId: "account123",
        mimeType: "image/jpeg",
        fileSize: 1024 * 1024,
        dimensions: { width: 800, height: 600 },
      };

      const creative = await service.registerCreative(input);

      expect(creative.id).toBeDefined();
      expect(creative.name).toBe("Test Image");
      expect(creative.type).toBe("IMAGE");
      expect(creative.accountId).toBe("account123");
      expect(creative.storageKey).toBe("account123/file.jpg");
      expect(creative.status).toBe("UPLOADED");
    });

    it("registers creative with tags", async () => {
      const input: RegisterCreativeInput = {
        key: "account123/file.jpg",
        name: "Tagged Image",
        type: "IMAGE",
        accountId: "account123",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["hero", "summer-campaign"],
      };

      const creative = await service.registerCreative(input);
      const retrieved = await service.getCreative(creative.id);

      expect(retrieved?.tags).toContain("hero");
      expect(retrieved?.tags).toContain("summer-campaign");
    });

    it("generates unique IDs for each creative", async () => {
      const input: RegisterCreativeInput = {
        key: "account123/file1.jpg",
        name: "Test 1",
        type: "IMAGE",
        accountId: "account123",
        mimeType: "image/jpeg",
        fileSize: 1024,
      };

      const creative1 = await service.registerCreative(input);
      const creative2 = await service.registerCreative({
        ...input,
        key: "account123/file2.jpg",
        name: "Test 2",
      });

      expect(creative1.id).not.toBe(creative2.id);
    });
  });

  describe("getCreative", () => {
    it("returns creative by ID", async () => {
      const input: RegisterCreativeInput = {
        key: "account123/test.jpg",
        name: "Findable",
        type: "IMAGE",
        accountId: "account123",
        mimeType: "image/jpeg",
        fileSize: 2048,
      };

      const created = await service.registerCreative(input);
      const found = await service.getCreative(created.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe("Findable");
    });

    it("returns null for non-existent ID", async () => {
      const found = await service.getCreative("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("listCreatives", () => {
    beforeEach(async () => {
      // Set up test data
      await service.registerCreative({
        key: "acc1/img1.jpg",
        name: "Image 1",
        type: "IMAGE",
        accountId: "acc1",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["hero"],
      });
      await service.registerCreative({
        key: "acc1/img2.png",
        name: "Image 2",
        type: "IMAGE",
        accountId: "acc1",
        mimeType: "image/png",
        fileSize: 2048,
        tags: ["banner"],
      });
      await service.registerCreative({
        key: "acc1/video.mp4",
        name: "Video 1",
        type: "VIDEO",
        accountId: "acc1",
        mimeType: "video/mp4",
        fileSize: 1024 * 1024,
      });
      await service.registerCreative({
        key: "acc2/img.jpg",
        name: "Other Account",
        type: "IMAGE",
        accountId: "acc2",
        mimeType: "image/jpeg",
        fileSize: 1024,
      });
    });

    it("filters by accountId", async () => {
      const result = await service.listCreatives({ accountId: "acc1" });

      expect(result.data.length).toBe(3);
      expect(result.data.every((c) => c.accountId === "acc1")).toBe(true);
    });

    it("filters by type", async () => {
      const result = await service.listCreatives({
        accountId: "acc1",
        type: "VIDEO",
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.type).toBe("VIDEO");
    });

    it("filters by tags", async () => {
      const result = await service.listCreatives({
        accountId: "acc1",
        tags: ["hero"],
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe("Image 1");
    });

    it("paginates results", async () => {
      const page1 = await service.listCreatives({
        accountId: "acc1",
        page: 1,
        limit: 2,
      });

      expect(page1.data.length).toBe(2);
      expect(page1.total).toBe(3);
      expect(page1.totalPages).toBe(2);

      const page2 = await service.listCreatives({
        accountId: "acc1",
        page: 2,
        limit: 2,
      });

      expect(page2.data.length).toBe(1);
    });

    it("sorts by createdAt descending by default", async () => {
      const result = await service.listCreatives({ accountId: "acc1" });

      // Most recent first
      const dates = result.data.map((c) => new Date(c.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]! >= dates[i]!).toBe(true);
      }
    });

    it("sorts by name ascending when specified", async () => {
      const result = await service.listCreatives({
        accountId: "acc1",
        sortBy: "name",
        sortOrder: "asc",
      });

      expect(result.data[0]?.name).toBe("Image 1");
    });
  });

  describe("updateCreative", () => {
    it("updates creative name", async () => {
      const created = await service.registerCreative({
        key: "acc/test.jpg",
        name: "Original Name",
        type: "IMAGE",
        accountId: "acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
      });

      const updated = await service.updateCreative(created.id, {
        name: "New Name",
      });

      expect(updated.name).toBe("New Name");
      // updatedAt should be set (we don't compare exact times due to test speed)
      expect(updated.updatedAt).toBeDefined();
    });

    it("throws error for non-existent creative", async () => {
      await expect(
        service.updateCreative("non-existent", { name: "New" })
      ).rejects.toThrow("not found");
    });
  });

  describe("deleteCreative", () => {
    it("deletes an existing creative", async () => {
      const created = await service.registerCreative({
        key: "acc/delete-me.jpg",
        name: "To Delete",
        type: "IMAGE",
        accountId: "acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
      });

      await service.deleteCreative(created.id);

      const found = await service.getCreative(created.id);
      expect(found).toBeNull();
    });

    it("does not throw for non-existent creative", async () => {
      await expect(
        service.deleteCreative("non-existent")
      ).resolves.not.toThrow();
    });
  });

  describe("Tag management", () => {
    it("adds tags to creative", async () => {
      const created = await service.registerCreative({
        key: "acc/tag-test.jpg",
        name: "Taggable",
        type: "IMAGE",
        accountId: "acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["initial"],
      });

      await service.addTags(created.id, ["new-tag", "another-tag"]);

      const updated = await service.getCreative(created.id);
      expect(updated?.tags).toContain("initial");
      expect(updated?.tags).toContain("new-tag");
      expect(updated?.tags).toContain("another-tag");
    });

    it("removes tags from creative", async () => {
      const created = await service.registerCreative({
        key: "acc/tag-remove.jpg",
        name: "Untaggable",
        type: "IMAGE",
        accountId: "acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["keep", "remove"],
      });

      await service.removeTags(created.id, ["remove"]);

      const updated = await service.getCreative(created.id);
      expect(updated?.tags).toContain("keep");
      expect(updated?.tags).not.toContain("remove");
    });

    it("does not add duplicate tags", async () => {
      const created = await service.registerCreative({
        key: "acc/dup-tag.jpg",
        name: "No Duplicates",
        type: "IMAGE",
        accountId: "acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["existing"],
      });

      await service.addTags(created.id, ["existing", "new"]);

      const updated = await service.getCreative(created.id);
      const existingCount = updated?.tags?.filter((t) => t === "existing").length;
      expect(existingCount).toBe(1);
    });
  });

  describe("getCreativesByTags", () => {
    beforeEach(async () => {
      await service.registerCreative({
        key: "acc/multi1.jpg",
        name: "Multi Tag 1",
        type: "IMAGE",
        accountId: "acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["summer", "hero"],
      });
      await service.registerCreative({
        key: "acc/multi2.jpg",
        name: "Multi Tag 2",
        type: "IMAGE",
        accountId: "acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["summer", "banner"],
      });
      await service.registerCreative({
        key: "acc/single.jpg",
        name: "Single Tag",
        type: "IMAGE",
        accountId: "acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["winter"],
      });
    });

    it("finds creatives matching ANY tag (default)", async () => {
      const result = await service.getCreativesByTags("acc", ["summer", "winter"]);

      expect(result.length).toBe(3);
    });

    it("finds creatives matching ALL tags", async () => {
      const result = await service.getCreativesByTags(
        "acc",
        ["summer", "hero"],
        true
      );

      expect(result.length).toBe(1);
      expect(result[0]?.name).toBe("Multi Tag 1");
    });

    it("returns empty array when no matches", async () => {
      const result = await service.getCreativesByTags("acc", ["nonexistent"]);

      expect(result).toEqual([]);
    });

    it("only returns creatives for the specified account", async () => {
      // Add creative to a different account
      await service.registerCreative({
        key: "other/tag.jpg",
        name: "Other Account",
        type: "IMAGE",
        accountId: "other-acc",
        mimeType: "image/jpeg",
        fileSize: 1024,
        tags: ["summer"],
      });

      const result = await service.getCreativesByTags("acc", ["summer"]);

      // Should only return creatives from "acc", not "other-acc"
      expect(result.length).toBe(2);
      expect(result.every((c) => c.accountId === "acc")).toBe(true);
    });
  });
});
