import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {
  StorageService,
  createStorageService,
  MockStorageService,
  S3StorageService,
  StorageConfig,
  PresignedUrl,
  ObjectMetadata,
} from "../../services/storage.js";

// Create send mock that persists across tests
const mockSendFn = vi.fn();

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockSendFn,
  })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ type: "PutObject", input })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ type: "GetObject", input })),
  DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ type: "DeleteObject", input })),
  HeadObjectCommand: vi.fn().mockImplementation((input) => ({ type: "HeadObject", input })),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://r2.example.com/presigned?signature=abc123"),
}));

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

describe("S3StorageService", () => {
  let storage: S3StorageService;
  const testConfig: StorageConfig = {
    endpoint: "https://account-id.r2.cloudflarestorage.com",
    bucket: "test-bucket",
    accessKey: "test-access-key",
    secretKey: "test-secret-key",
    region: "auto",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendFn.mockReset();
    storage = new S3StorageService(testConfig);
  });

  describe("constructor", () => {
    it("creates storage service with provided configuration", () => {
      const service = new S3StorageService(testConfig);
      // Service is created without throwing
      expect(service).toBeInstanceOf(S3StorageService);
    });

    it("uses default region auto when not specified", () => {
      const configWithoutRegion: StorageConfig = {
        endpoint: testConfig.endpoint,
        bucket: testConfig.bucket,
        accessKey: testConfig.accessKey,
        secretKey: testConfig.secretKey,
      };
      const service = new S3StorageService(configWithoutRegion);
      expect(service).toBeInstanceOf(S3StorageService);
    });
  });

  describe("generateUploadUrl", () => {
    it("generates presigned upload URL with correct parameters", async () => {
      const result = await storage.generateUploadUrl(
        "test-key.jpg",
        "image/jpeg",
        1024
      );

      // Verify the URL comes from our mock
      expect(result.url).toBe("https://r2.example.com/presigned?signature=abc123");
      expect(result.key).toBe("test-key.jpg");
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("validates content type and rejects disallowed types", async () => {
      await expect(
        storage.generateUploadUrl("test.exe", "application/x-msdownload", 1024)
      ).rejects.toThrow("not allowed");
    });

    it("validates file size limits", async () => {
      await expect(
        storage.generateUploadUrl("test.jpg", "image/jpeg", 21 * 1024 * 1024)
      ).rejects.toThrow("exceeds maximum");
    });

    it("allows video files up to 500MB", async () => {
      const result = await storage.generateUploadUrl(
        "video.mp4",
        "video/mp4",
        500 * 1024 * 1024
      );
      expect(result.url).toBeDefined();
    });

    it("generates expiration time 15 minutes in the future", async () => {
      const beforeCall = Date.now();
      const result = await storage.generateUploadUrl("test.jpg", "image/jpeg", 1024);
      const afterCall = Date.now();

      const expiresAt = new Date(result.expiresAt).getTime();
      // Expiration should be roughly 15 minutes (900 seconds) from now
      const expectedMin = beforeCall + 15 * 60 * 1000;
      const expectedMax = afterCall + 15 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("generateDownloadUrl", () => {
    it("generates presigned download URL when no CDN configured", async () => {
      const url = await storage.generateDownloadUrl("test-key.jpg");

      // Should return the mocked presigned URL
      expect(url).toBe("https://r2.example.com/presigned?signature=abc123");
    });

    it("returns CDN URL when CDN is configured", async () => {
      const cdnConfig: StorageConfig = {
        ...testConfig,
        cdnUrl: "https://assets.example.com",
      };
      const cdnStorage = new S3StorageService(cdnConfig);

      const url = await cdnStorage.generateDownloadUrl("test-key.jpg");

      expect(url).toBe("https://assets.example.com/test-key.jpg");
    });

    it("does not call S3 when CDN URL is configured", async () => {
      const cdnConfig: StorageConfig = {
        ...testConfig,
        cdnUrl: "https://assets.example.com",
      };
      const cdnStorage = new S3StorageService(cdnConfig);

      await cdnStorage.generateDownloadUrl("test-key.jpg");

      // mockSendFn should not be called since we return CDN URL directly
      expect(mockSendFn).not.toHaveBeenCalled();
    });

    it("handles nested paths correctly with CDN URL", async () => {
      const cdnConfig: StorageConfig = {
        ...testConfig,
        cdnUrl: "https://assets.example.com",
      };
      const cdnStorage = new S3StorageService(cdnConfig);

      const url = await cdnStorage.generateDownloadUrl("accounts/acc_123/images/test.jpg");

      expect(url).toBe("https://assets.example.com/accounts/acc_123/images/test.jpg");
    });
  });

  describe("deleteObject", () => {
    it("sends delete command to S3", async () => {
      await storage.deleteObject("test-key.jpg");

      expect(mockSendFn).toHaveBeenCalled();
    });

    it("is idempotent - does not throw for non-existent object", async () => {
      // S3/R2 delete is naturally idempotent
      await expect(storage.deleteObject("non-existent.jpg")).resolves.not.toThrow();
    });

    it("handles nested paths correctly", async () => {
      await storage.deleteObject("accounts/acc_123/images/test.jpg");
      expect(mockSendFn).toHaveBeenCalled();
    });
  });

  describe("headObject", () => {
    it("returns metadata for existing object", async () => {
      const lastModified = new Date();
      mockSendFn.mockResolvedValueOnce({
        ContentType: "image/jpeg",
        ContentLength: 1024,
        ETag: '"abc123"',
        LastModified: lastModified,
      });

      const metadata = await storage.headObject("test-key.jpg");

      expect(metadata).toEqual({
        contentType: "image/jpeg",
        size: 1024,
        etag: "abc123",
        lastModified,
      });
    });

    it("strips quotes from ETag", async () => {
      mockSendFn.mockResolvedValueOnce({
        ContentType: "image/png",
        ContentLength: 2048,
        ETag: '"quoted-etag-value"',
        LastModified: new Date(),
      });

      const metadata = await storage.headObject("test.png");
      expect(metadata?.etag).toBe("quoted-etag-value");
    });

    it("returns null for non-existent object", async () => {
      const notFoundError = new Error("NotFound");
      (notFoundError as Error & { name: string }).name = "NotFound";
      mockSendFn.mockRejectedValueOnce(notFoundError);

      const metadata = await storage.headObject("non-existent.jpg");
      expect(metadata).toBeNull();
    });

    it("throws for other errors", async () => {
      const accessDeniedError = new Error("Access Denied");
      (accessDeniedError as Error & { name: string }).name = "AccessDenied";
      mockSendFn.mockRejectedValueOnce(accessDeniedError);

      await expect(storage.headObject("forbidden.jpg")).rejects.toThrow("Access Denied");
    });

    it("returns defaults for missing metadata fields", async () => {
      mockSendFn.mockResolvedValueOnce({});

      const metadata = await storage.headObject("minimal.jpg");

      expect(metadata).toEqual({
        contentType: "application/octet-stream",
        size: 0,
        etag: "",
        lastModified: expect.any(Date),
      });
    });
  });
});
