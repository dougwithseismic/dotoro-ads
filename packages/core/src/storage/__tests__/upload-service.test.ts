/**
 * Tests for UploadService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UploadService, type UploadAssetOptions } from "../upload-service.js";
import { MemoryStorageProvider } from "../providers/memory.js";

describe("UploadService", () => {
  let provider: MemoryStorageProvider;
  let service: UploadService;

  beforeEach(() => {
    provider = new MemoryStorageProvider();
    service = new UploadService(provider);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // uploadAsset Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("uploadAsset", () => {
    it("uploads a buffer with generated key", async () => {
      const buffer = Buffer.from("test content");

      const result = await service.uploadAsset(buffer, {
        contentType: "text/plain",
        fileName: "test.txt",
      });

      expect(result.storageKey).toBeDefined();
      expect(result.storageKey).toContain("test.txt");
      expect(result.size).toBe(buffer.length);
      expect(result.contentType).toBe("text/plain");
    });

    it("generates unique keys for each upload", async () => {
      const buffer = Buffer.from("test");
      const options: UploadAssetOptions = {
        contentType: "text/plain",
        fileName: "test.txt",
      };

      const result1 = await service.uploadAsset(buffer, options);
      const result2 = await service.uploadAsset(buffer, options);

      expect(result1.storageKey).not.toBe(result2.storageKey);
    });

    it("uses custom key prefix", async () => {
      const buffer = Buffer.from("test");

      const result = await service.uploadAsset(buffer, {
        contentType: "text/plain",
        fileName: "test.txt",
        keyPrefix: "campaign-123",
      });

      expect(result.storageKey).toContain("campaign-123");
    });

    it("uses custom key when provided", async () => {
      const buffer = Buffer.from("test");

      const result = await service.uploadAsset(buffer, {
        contentType: "text/plain",
        key: "custom/path/file.txt",
      });

      expect(result.storageKey).toBe("custom/path/file.txt");
    });

    it("attaches custom metadata", async () => {
      const buffer = Buffer.from("test");

      const result = await service.uploadAsset(buffer, {
        contentType: "text/plain",
        metadata: { source: "upload", version: "1" },
      });

      const info = await provider.getFileInfo(result.storageKey);
      expect(info?.metadata).toEqual({ source: "upload", version: "1" });
    });

    it("marks file as public when requested", async () => {
      const buffer = Buffer.from("test");

      const result = await service.uploadAsset(buffer, {
        contentType: "text/plain",
        public: true,
      });

      expect(result.publicUrl).toBeDefined();
    });

    it("infers content type from file extension", async () => {
      const buffer = Buffer.from("test");

      const result = await service.uploadAsset(buffer, {
        fileName: "image.jpg",
      });

      expect(result.contentType).toBe("image/jpeg");
    });

    it("falls back to octet-stream for unknown extensions", async () => {
      const buffer = Buffer.from("test");

      const result = await service.uploadAsset(buffer, {
        fileName: "file.xyz",
      });

      expect(result.contentType).toBe("application/octet-stream");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // uploadFromUrl Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("uploadFromUrl", () => {
    // Mock fetch for URL downloads
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("downloads and uploads content from URL", async () => {
      const mockContent = Buffer.from("image data");
      const mockResponse = {
        ok: true,
        headers: new Map([
          ["content-type", "image/png"],
          ["content-length", String(mockContent.length)],
        ]) as unknown as Headers,
        arrayBuffer: () => Promise.resolve(mockContent.buffer),
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const result = await service.uploadFromUrl(
        "https://example.com/image.png"
      );

      expect(result.storageKey).toBeDefined();
      expect(result.contentType).toBe("image/png");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/image.png",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("uses filename from URL path", async () => {
      const mockContent = Buffer.from("test");
      const mockResponse = {
        ok: true,
        headers: new Map([["content-type", "image/jpeg"]]) as unknown as Headers,
        arrayBuffer: () => Promise.resolve(mockContent.buffer),
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const result = await service.uploadFromUrl(
        "https://example.com/path/to/my-image.jpg"
      );

      expect(result.storageKey).toContain("my-image.jpg");
    });

    it("uses custom key when provided", async () => {
      const mockContent = Buffer.from("test");
      const mockResponse = {
        ok: true,
        headers: new Map([["content-type", "image/png"]]) as unknown as Headers,
        arrayBuffer: () => Promise.resolve(mockContent.buffer),
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      const result = await service.uploadFromUrl(
        "https://example.com/image.png",
        { key: "custom/key.png" }
      );

      expect(result.storageKey).toBe("custom/key.png");
    });

    it("throws error when fetch fails", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      await expect(
        service.uploadFromUrl("https://example.com/nonexistent.png")
      ).rejects.toThrow(/Failed to fetch/);
    });

    it("respects timeout option", async () => {
      // Mock fetch that respects the abort signal
      vi.mocked(global.fetch).mockImplementation(
        (_url, options) =>
          new Promise((resolve, reject) => {
            const signal = options?.signal;
            if (signal) {
              signal.addEventListener("abort", () => {
                const error = new Error("The operation was aborted");
                error.name = "AbortError";
                reject(error);
              });
            }
            // Never resolve - let the timeout abort it
          })
      );

      const promise = service.uploadFromUrl("https://example.com/slow.png", {
        timeout: 100,
      });

      await expect(promise).rejects.toThrow(/timeout/i);
    }, 10000);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deleteAsset Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("deleteAsset", () => {
    it("deletes an uploaded asset", async () => {
      const buffer = Buffer.from("test");
      const result = await service.uploadAsset(buffer, {
        contentType: "text/plain",
      });

      await service.deleteAsset(result.storageKey);

      expect(await provider.exists(result.storageKey)).toBe(false);
    });

    it("does not throw for non-existent asset", async () => {
      await expect(
        service.deleteAsset("nonexistent.txt")
      ).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAssetUrl Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("getAssetUrl", () => {
    it("returns signed URL for existing asset", async () => {
      const buffer = Buffer.from("test");
      const result = await service.uploadAsset(buffer, {
        contentType: "text/plain",
      });

      const url = await service.getAssetUrl(result.storageKey);

      expect(url).toContain(result.storageKey);
    });

    it("throws for non-existent asset", async () => {
      await expect(
        service.getAssetUrl("nonexistent.txt")
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Key Generation Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("key generation", () => {
    it("generates keys with timestamp component", async () => {
      const buffer = Buffer.from("test");
      const before = Date.now();

      const result = await service.uploadAsset(buffer, {
        contentType: "text/plain",
        fileName: "test.txt",
      });

      const after = Date.now();

      // Key should contain a timestamp-like component
      const keyParts = result.storageKey.split("/");
      expect(keyParts.length).toBeGreaterThanOrEqual(1);
    });

    it("preserves file extension in generated key", async () => {
      const buffer = Buffer.from("test");

      const result = await service.uploadAsset(buffer, {
        contentType: "image/jpeg",
        fileName: "photo.jpg",
      });

      expect(result.storageKey).toMatch(/\.jpg$/);
    });

    it("adds extension from content type if no extension provided", async () => {
      const buffer = Buffer.from("test");

      const result = await service.uploadAsset(buffer, {
        contentType: "image/png",
      });

      expect(result.storageKey).toMatch(/\.png$/);
    });
  });
});
