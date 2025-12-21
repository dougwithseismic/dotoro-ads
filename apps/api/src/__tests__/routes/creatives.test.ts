import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { testClient } from "hono/testing";
import { creativesApp, resetCreativesState, getStorageServiceForTesting } from "../../routes/creatives.js";
import type { MockStorageService } from "../../services/storage.js";

const client = testClient(creativesApp);

// Helper for direct fetch calls (better error handling)
async function makeRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return creativesApp.fetch(request);
}

// Helper to simulate file upload before registering
function simulateUpload(key: string, contentType: string = "image/jpeg", size: number = 1024) {
  const storage = getStorageServiceForTesting();
  storage.simulateUpload(key, {
    contentType,
    size,
    etag: "abc123",
    lastModified: new Date(),
  });
}

// Helper to create a creative with proper storage simulation
async function createTestCreative(
  key: string,
  name: string,
  type: "IMAGE" | "VIDEO" | "CAROUSEL",
  accountId: string,
  tags?: string[]
) {
  // First simulate the file existing in storage
  const contentType = type === "VIDEO" ? "video/mp4" : "image/jpeg";
  simulateUpload(key, contentType, 1024);

  // Then register the creative
  const res = await client.api.v1.creatives.$post({
    json: {
      key,
      name,
      type,
      accountId,
      tags,
    },
  });
  return res;
}

describe("Creatives API Routes", () => {
  beforeEach(() => {
    resetCreativesState();
  });

  afterEach(() => {
    resetCreativesState();
  });

  describe("POST /api/v1/creatives/upload", () => {
    it("generates upload URL for valid image request", async () => {
      const res = await client.api.v1.creatives.upload.$post({
        json: {
          fileName: "test-image.jpg",
          contentType: "image/jpeg",
          fileSize: 1024 * 1024, // 1MB
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.uploadUrl).toBeDefined();
      expect(data.key).toContain(".jpg"); // Key includes extension derived from contentType
      expect(data.expiresAt).toBeDefined();
    });

    it("generates upload URL for valid video request", async () => {
      const res = await client.api.v1.creatives.upload.$post({
        json: {
          fileName: "promo-video.mp4",
          contentType: "video/mp4",
          fileSize: 50 * 1024 * 1024, // 50MB
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.uploadUrl).toBeDefined();
    });

    it("rejects invalid content type", async () => {
      const res = await makeRequest("POST", "/api/v1/creatives/upload", {
        fileName: "file.exe",
        contentType: "application/x-msdownload",
        fileSize: 1024,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("not allowed");
    });

    it("rejects oversized image", async () => {
      const res = await makeRequest("POST", "/api/v1/creatives/upload", {
        fileName: "huge.jpg",
        contentType: "image/jpeg",
        fileSize: 25 * 1024 * 1024, // 25MB > 20MB limit
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("exceeds");
    });
  });

  describe("POST /api/v1/creatives", () => {
    it("registers a new creative when file exists in storage", async () => {
      const res = await createTestCreative(
        "account123/550e8400-e29b-41d4-a716-446655440000.jpg",
        "Hero Banner",
        "IMAGE",
        "account123",
        ["hero", "summer"]
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe("Hero Banner");
      expect(data.type).toBe("IMAGE");
      expect(data.status).toBe("UPLOADED");
    });

    it("rejects registration when file does not exist in storage", async () => {
      // Don't simulate upload - file doesn't exist
      const res = await client.api.v1.creatives.$post({
        json: {
          key: "nonexistent/file.jpg",
          name: "Missing File",
          type: "IMAGE",
          accountId: "account123",
        },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("not found in storage");
    });

    it("validates required fields", async () => {
      const res = await client.api.v1.creatives.$post({
        json: {
          key: "test.jpg",
          // Missing name, type, accountId
        } as any,
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/creatives", () => {
    beforeEach(async () => {
      // Seed test data with proper storage simulation
      await createTestCreative("acc1/img1.jpg", "Image 1", "IMAGE", "acc1", ["hero"]);
      await createTestCreative("acc1/vid1.mp4", "Video 1", "VIDEO", "acc1");
      await createTestCreative("acc2/img1.jpg", "Other Account", "IMAGE", "acc2");
    });

    it("lists creatives for an account", async () => {
      const res = await client.api.v1.creatives.$get({
        query: { accountId: "acc1" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBe(2);
      expect(data.total).toBe(2);
    });

    it("filters by type", async () => {
      const res = await client.api.v1.creatives.$get({
        query: { accountId: "acc1", type: "VIDEO" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBe(1);
      expect(data.data[0].type).toBe("VIDEO");
    });

    it("filters by tags", async () => {
      const res = await client.api.v1.creatives.$get({
        query: { accountId: "acc1", tags: "hero" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBe(1);
      expect(data.data[0].name).toBe("Image 1");
    });

    it("paginates results", async () => {
      const res = await client.api.v1.creatives.$get({
        query: { accountId: "acc1", page: "1", limit: "1" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBe(1);
      expect(data.totalPages).toBe(2);
    });
  });

  describe("GET /api/v1/creatives/:id", () => {
    it("returns creative by ID with proper authorization", async () => {
      const createRes = await createTestCreative(
        "acc/test.jpg",
        "Test Creative",
        "IMAGE",
        "acc"
      );
      const created = await createRes.json();

      const res = await makeRequest("GET", `/api/v1/creatives/${created.id}?accountId=acc`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(created.id);
      expect(data.name).toBe("Test Creative");
    });

    it("returns 403 for wrong account ID", async () => {
      const createRes = await createTestCreative(
        "acc/test.jpg",
        "Test Creative",
        "IMAGE",
        "acc"
      );
      const created = await createRes.json();

      const res = await makeRequest("GET", `/api/v1/creatives/${created.id}?accountId=other-account`);

      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent ID", async () => {
      const res = await makeRequest("GET", "/api/v1/creatives/550e8400-e29b-41d4-a716-446655440000?accountId=acc");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/v1/creatives/:id", () => {
    it("updates creative metadata with proper authorization", async () => {
      const createRes = await createTestCreative(
        "acc/update-test.jpg",
        "Original Name",
        "IMAGE",
        "acc"
      );
      const created = await createRes.json();

      const res = await makeRequest("PUT", `/api/v1/creatives/${created.id}?accountId=acc`, {
        name: "Updated Name",
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("Updated Name");
    });

    it("updates tags with proper authorization", async () => {
      const createRes = await createTestCreative(
        "acc/tag-update.jpg",
        "Tag Test",
        "IMAGE",
        "acc",
        ["old-tag"]
      );
      const created = await createRes.json();

      const res = await makeRequest("PUT", `/api/v1/creatives/${created.id}?accountId=acc`, {
        tags: ["new-tag-1", "new-tag-2"],
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags).toContain("new-tag-1");
      expect(data.tags).toContain("new-tag-2");
    });

    it("returns 403 for wrong account ID", async () => {
      const createRes = await createTestCreative(
        "acc/update-test.jpg",
        "Original Name",
        "IMAGE",
        "acc"
      );
      const created = await createRes.json();

      const res = await makeRequest("PUT", `/api/v1/creatives/${created.id}?accountId=other-account`, {
        name: "Hacked Name",
      });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/creatives/:id", () => {
    it("deletes a creative with proper authorization", async () => {
      const createRes = await createTestCreative(
        "acc/to-delete.jpg",
        "Delete Me",
        "IMAGE",
        "acc"
      );
      const created = await createRes.json();

      const deleteRes = await makeRequest("DELETE", `/api/v1/creatives/${created.id}?accountId=acc`);

      expect(deleteRes.status).toBe(200);
      const data = await deleteRes.json();
      expect(data.success).toBe(true);

      // Verify deletion
      const getRes = await makeRequest("GET", `/api/v1/creatives/${created.id}?accountId=acc`);
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for non-existent creative", async () => {
      const res = await makeRequest("DELETE", "/api/v1/creatives/550e8400-e29b-41d4-a716-446655440000?accountId=acc");
      expect(res.status).toBe(404);
    });

    it("returns 403 for wrong account ID", async () => {
      const createRes = await createTestCreative(
        "acc/to-delete.jpg",
        "Delete Me",
        "IMAGE",
        "acc"
      );
      const created = await createRes.json();

      const deleteRes = await makeRequest("DELETE", `/api/v1/creatives/${created.id}?accountId=other-account`);

      expect(deleteRes.status).toBe(403);
    });
  });

  describe("POST /api/v1/creatives/:id/tags", () => {
    it("adds tags to creative with proper authorization", async () => {
      const createRes = await createTestCreative(
        "acc/add-tags.jpg",
        "Add Tags",
        "IMAGE",
        "acc",
        ["existing"]
      );
      const created = await createRes.json();

      const res = await makeRequest("POST", `/api/v1/creatives/${created.id}/tags?accountId=acc`, {
        tags: ["new-tag"],
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags).toContain("existing");
      expect(data.tags).toContain("new-tag");
    });

    it("returns 403 for wrong account ID", async () => {
      const createRes = await createTestCreative(
        "acc/add-tags.jpg",
        "Add Tags",
        "IMAGE",
        "acc",
        ["existing"]
      );
      const created = await createRes.json();

      const res = await makeRequest("POST", `/api/v1/creatives/${created.id}/tags?accountId=other-account`, {
        tags: ["new-tag"],
      });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/creatives/:id/tags", () => {
    it("removes tags from creative with proper authorization", async () => {
      const createRes = await createTestCreative(
        "acc/remove-tags.jpg",
        "Remove Tags",
        "IMAGE",
        "acc",
        ["keep", "remove"]
      );
      const created = await createRes.json();

      const res = await makeRequest("DELETE", `/api/v1/creatives/${created.id}/tags?accountId=acc`, {
        tags: ["remove"],
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags).toContain("keep");
      expect(data.tags).not.toContain("remove");
    });

    it("returns 403 for wrong account ID", async () => {
      const createRes = await createTestCreative(
        "acc/remove-tags.jpg",
        "Remove Tags",
        "IMAGE",
        "acc",
        ["keep", "remove"]
      );
      const created = await createRes.json();

      const res = await makeRequest("DELETE", `/api/v1/creatives/${created.id}/tags?accountId=other-account`, {
        tags: ["remove"],
      });

      expect(res.status).toBe(403);
    });
  });
});
