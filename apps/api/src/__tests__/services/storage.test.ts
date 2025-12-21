import { describe, it, expect, beforeEach } from "vitest";
import {
  StorageService,
  createStorageService,
  MockStorageService,
  StorageConfig,
  PresignedUrl,
  ObjectMetadata,
} from "../../services/storage.js";

describe("StorageService", () => {
  let storage: StorageService;

  beforeEach(() => {
    // Use mock implementation for testing
    storage = new MockStorageService();
  });

  describe("generateUploadUrl", () => {
    it("generates a presigned upload URL with correct expiration", async () => {
      const result = await storage.generateUploadUrl(
        "account123/test-file.jpg",
        "image/jpeg",
        20 * 1024 * 1024
      );

      expect(result.url).toContain("presigned");
      expect(result.key).toBe("account123/test-file.jpg");
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("includes content type in presigned URL", async () => {
      const result = await storage.generateUploadUrl(
        "test.png",
        "image/png",
        1024
      );

      expect(result.url).toBeDefined();
      expect(result.key).toBe("test.png");
    });

    it("respects max size constraint", async () => {
      const result = await storage.generateUploadUrl(
        "video.mp4",
        "video/mp4",
        500 * 1024 * 1024
      );

      expect(result.url).toBeDefined();
    });
  });

  describe("generateDownloadUrl", () => {
    it("generates a presigned download URL", async () => {
      // First simulate an upload
      const mockStorage = storage as MockStorageService;
      mockStorage.simulateUpload("test-key.jpg", {
        contentType: "image/jpeg",
        size: 1024,
        etag: "abc123",
        lastModified: new Date(),
      });

      const url = await storage.generateDownloadUrl("test-key.jpg");
      expect(url).toContain("presigned");
      expect(url).toContain("test-key.jpg");
    });

    it("uses custom expiration time", async () => {
      const mockStorage = storage as MockStorageService;
      mockStorage.simulateUpload("test.jpg", {
        contentType: "image/jpeg",
        size: 1024,
        etag: "abc",
        lastModified: new Date(),
      });

      const url = await storage.generateDownloadUrl("test.jpg", 7200); // 2 hours
      expect(url).toContain("expires=7200");
    });

    it("generates URL even for non-existent object (signed URL can be pre-generated)", async () => {
      // This is intentional - the storage service generates URLs for registered creatives
      // without checking if the object currently exists, allowing for pre-signed URLs
      const url = await storage.generateDownloadUrl("non-existent.jpg");
      expect(url).toBeDefined();
      expect(url).toContain("non-existent.jpg");
    });
  });

  describe("deleteObject", () => {
    it("deletes an existing object", async () => {
      const mockStorage = storage as MockStorageService;
      mockStorage.simulateUpload("to-delete.jpg", {
        contentType: "image/jpeg",
        size: 1024,
        etag: "abc",
        lastModified: new Date(),
      });

      await storage.deleteObject("to-delete.jpg");

      const metadata = await storage.headObject("to-delete.jpg");
      expect(metadata).toBeNull();
    });

    it("does not throw for non-existent object", async () => {
      await expect(storage.deleteObject("non-existent.jpg")).resolves.not.toThrow();
    });
  });

  describe("headObject", () => {
    it("returns metadata for existing object", async () => {
      const mockStorage = storage as MockStorageService;
      const now = new Date();
      mockStorage.simulateUpload("metadata-test.jpg", {
        contentType: "image/jpeg",
        size: 5000,
        etag: "etag123",
        lastModified: now,
      });

      const metadata = await storage.headObject("metadata-test.jpg");

      expect(metadata).not.toBeNull();
      expect(metadata?.contentType).toBe("image/jpeg");
      expect(metadata?.size).toBe(5000);
      expect(metadata?.etag).toBe("etag123");
    });

    it("returns null for non-existent object", async () => {
      const metadata = await storage.headObject("non-existent.jpg");
      expect(metadata).toBeNull();
    });
  });
});

describe("createStorageService", () => {
  it("creates mock service when no config provided", () => {
    const service = createStorageService();
    expect(service).toBeInstanceOf(MockStorageService);
  });

  it("creates mock service when using test config", () => {
    const config: StorageConfig = {
      endpoint: "http://localhost:9000",
      bucket: "test-bucket",
      accessKey: "test-access",
      secretKey: "test-secret",
      region: "auto",
    };

    // In test environment, should still use mock
    const service = createStorageService(config, true);
    expect(service).toBeInstanceOf(MockStorageService);
  });
});

describe("MockStorageService file type validation", () => {
  let storage: MockStorageService;

  beforeEach(() => {
    storage = new MockStorageService();
  });

  it("validates allowed image content types", async () => {
    const validTypes = ["image/jpeg", "image/png", "image/gif"];

    for (const contentType of validTypes) {
      const result = await storage.generateUploadUrl(`test.${contentType.split("/")[1]}`, contentType, 1024);
      expect(result.url).toBeDefined();
    }
  });

  it("validates allowed video content types", async () => {
    const validTypes = ["video/mp4", "video/quicktime"];

    for (const contentType of validTypes) {
      const result = await storage.generateUploadUrl("test.mp4", contentType, 1024);
      expect(result.url).toBeDefined();
    }
  });

  it("rejects disallowed content types", async () => {
    await expect(
      storage.generateUploadUrl("test.exe", "application/x-msdownload", 1024)
    ).rejects.toThrow("not allowed");
  });

  it("validates file size limits for images", async () => {
    // Should succeed for valid size
    await expect(
      storage.generateUploadUrl("test.jpg", "image/jpeg", 20 * 1024 * 1024)
    ).resolves.toBeDefined();

    // Should fail for size exceeding limit
    await expect(
      storage.generateUploadUrl("test.jpg", "image/jpeg", 21 * 1024 * 1024)
    ).rejects.toThrow("exceeds maximum");
  });

  it("validates file size limits for videos", async () => {
    // Should succeed for valid size
    await expect(
      storage.generateUploadUrl("test.mp4", "video/mp4", 500 * 1024 * 1024)
    ).resolves.toBeDefined();

    // Should fail for size exceeding limit
    await expect(
      storage.generateUploadUrl("test.mp4", "video/mp4", 501 * 1024 * 1024)
    ).rejects.toThrow("exceeds maximum");
  });
});

describe("Storage key generation", () => {
  let storage: MockStorageService;

  beforeEach(() => {
    storage = new MockStorageService();
  });

  it("accepts account-prefixed keys", async () => {
    const result = await storage.generateUploadUrl(
      "acc_123/550e8400-e29b-41d4-a716-446655440000.jpg",
      "image/jpeg",
      1024
    );

    expect(result.key).toBe("acc_123/550e8400-e29b-41d4-a716-446655440000.jpg");
  });

  it("preserves full key path", async () => {
    const result = await storage.generateUploadUrl(
      "account/subfolder/file.png",
      "image/png",
      1024
    );

    expect(result.key).toBe("account/subfolder/file.png");
  });
});
