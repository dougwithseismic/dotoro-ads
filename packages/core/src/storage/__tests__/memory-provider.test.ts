/**
 * Tests for MemoryStorageProvider
 *
 * The MemoryStorageProvider stores files in memory for testing purposes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStorageProvider } from "../providers/memory.js";
import {
  FileNotFoundError,
  FileTooLargeError,
  InvalidFileTypeError,
} from "../types.js";

describe("MemoryStorageProvider", () => {
  let provider: MemoryStorageProvider;

  beforeEach(() => {
    provider = new MemoryStorageProvider();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Upload Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("upload", () => {
    it("uploads a Buffer successfully", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      const result = await provider.upload(buffer, key, {
        contentType: "text/plain",
      });

      expect(result.storageKey).toBe(key);
      expect(result.size).toBe(buffer.length);
      expect(result.contentType).toBe("text/plain");
      expect(result.url).toContain(key);
      expect(result.uploadedAt).toBeInstanceOf(Date);
    });

    it("uploads with default content type when not specified", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.bin";

      const result = await provider.upload(buffer, key);

      expect(result.contentType).toBe("application/octet-stream");
    });

    it("attaches custom metadata", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";
      const customMetadata = { description: "Test file", version: "1.0" };

      const result = await provider.upload(buffer, key, {
        contentType: "text/plain",
        metadata: customMetadata,
      });

      expect(result.metadata).toBeDefined();

      // Verify metadata was stored
      const fileInfo = await provider.getFileInfo(key);
      expect(fileInfo?.metadata).toEqual(customMetadata);
    });

    it("generates public URL when public option is true", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      const result = await provider.upload(buffer, key, {
        contentType: "text/plain",
        public: true,
      });

      expect(result.publicUrl).toBeDefined();
      expect(result.publicUrl).toContain(key);
    });

    it("overwrites existing file with same key", async () => {
      const key = "test/file.txt";
      const buffer1 = Buffer.from("original content");
      const buffer2 = Buffer.from("updated content");

      await provider.upload(buffer1, key, { contentType: "text/plain" });
      await provider.upload(buffer2, key, { contentType: "text/plain" });

      const content = await provider.get(key);
      expect(content?.toString()).toBe("updated content");
    });
  });

  describe("upload with constraints", () => {
    it("rejects files exceeding maxFileSize", async () => {
      const constrainedProvider = new MemoryStorageProvider({
        maxFileSize: 100,
      });
      const buffer = Buffer.alloc(150); // 150 bytes, exceeds limit

      await expect(
        constrainedProvider.upload(buffer, "test.bin")
      ).rejects.toThrow(FileTooLargeError);
    });

    it("rejects files with disallowed MIME types", async () => {
      const constrainedProvider = new MemoryStorageProvider({
        allowedMimeTypes: ["image/jpeg", "image/png"],
      });
      const buffer = Buffer.from("test");

      await expect(
        constrainedProvider.upload(buffer, "test.txt", {
          contentType: "text/plain",
        })
      ).rejects.toThrow(InvalidFileTypeError);
    });

    it("accepts files within size limit", async () => {
      const constrainedProvider = new MemoryStorageProvider({
        maxFileSize: 100,
      });
      const buffer = Buffer.alloc(50); // 50 bytes, within limit

      const result = await constrainedProvider.upload(buffer, "test.bin");
      expect(result.size).toBe(50);
    });

    it("accepts files with allowed MIME types", async () => {
      const constrainedProvider = new MemoryStorageProvider({
        allowedMimeTypes: ["image/jpeg", "image/png"],
      });
      const buffer = Buffer.from("fake image data");

      const result = await constrainedProvider.upload(buffer, "test.jpg", {
        contentType: "image/jpeg",
      });
      expect(result.contentType).toBe("image/jpeg");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Get Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("get", () => {
    it("retrieves uploaded file content", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      await provider.upload(buffer, key, { contentType: "text/plain" });
      const content = await provider.get(key);

      expect(content).not.toBeNull();
      expect(content?.toString()).toBe("test content");
    });

    it("returns null for non-existent file", async () => {
      const content = await provider.get("nonexistent.txt");
      expect(content).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Delete Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an existing file", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      await provider.upload(buffer, key, { contentType: "text/plain" });
      await provider.delete(key);

      const exists = await provider.exists(key);
      expect(exists).toBe(false);
    });

    it("does not throw when deleting non-existent file", async () => {
      await expect(provider.delete("nonexistent.txt")).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Exists Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("exists", () => {
    it("returns true for existing file", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      await provider.upload(buffer, key, { contentType: "text/plain" });
      const exists = await provider.exists(key);

      expect(exists).toBe(true);
    });

    it("returns false for non-existent file", async () => {
      const exists = await provider.exists("nonexistent.txt");
      expect(exists).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GetSignedUrl Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("getSignedUrl", () => {
    it("returns a signed URL for existing file", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      await provider.upload(buffer, key, { contentType: "text/plain" });
      const signedUrl = await provider.getSignedUrl(key);

      expect(signedUrl).toContain(key);
      expect(signedUrl).toContain("expires=");
      expect(signedUrl).toContain("signature=");
    });

    it("includes expiry time in signed URL", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      await provider.upload(buffer, key, { contentType: "text/plain" });
      const signedUrl = await provider.getSignedUrl(key, 3600);

      expect(signedUrl).toContain("expires=");
    });

    it("throws FileNotFoundError for non-existent file", async () => {
      await expect(provider.getSignedUrl("nonexistent.txt")).rejects.toThrow(
        FileNotFoundError
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GetMetadata Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("getMetadata", () => {
    it("returns metadata for existing file", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      await provider.upload(buffer, key, {
        contentType: "text/plain",
        metadata: { custom: "value" },
      });
      const metadata = await provider.getMetadata(key);

      expect(metadata).not.toBeNull();
      expect(metadata?.mimeType).toBe("text/plain");
      expect(metadata?.fileSize).toBe(buffer.length);
    });

    it("returns null for non-existent file", async () => {
      const metadata = await provider.getMetadata("nonexistent.txt");
      expect(metadata).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GetFileInfo Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("getFileInfo", () => {
    it("returns file info for existing file", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      await provider.upload(buffer, key, {
        contentType: "text/plain",
        metadata: { custom: "value" },
      });
      const info = await provider.getFileInfo(key);

      expect(info).not.toBeNull();
      expect(info?.key).toBe(key);
      expect(info?.size).toBe(buffer.length);
      expect(info?.contentType).toBe("text/plain");
      expect(info?.lastModified).toBeInstanceOf(Date);
      expect(info?.metadata).toEqual({ custom: "value" });
    });

    it("returns null for non-existent file", async () => {
      const info = await provider.getFileInfo("nonexistent.txt");
      expect(info).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // List Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("list", () => {
    beforeEach(async () => {
      // Upload some test files
      await provider.upload(Buffer.from("1"), "folder/a.txt", {
        contentType: "text/plain",
      });
      await provider.upload(Buffer.from("2"), "folder/b.txt", {
        contentType: "text/plain",
      });
      await provider.upload(Buffer.from("3"), "other/c.txt", {
        contentType: "text/plain",
      });
    });

    it("lists all files without prefix", async () => {
      const result = await provider.list();

      expect(result.files).toHaveLength(3);
      expect(result.hasMore).toBe(false);
    });

    it("filters files by prefix", async () => {
      const result = await provider.list({ prefix: "folder/" });

      expect(result.files).toHaveLength(2);
      expect(result.files.every((f) => f.key.startsWith("folder/"))).toBe(true);
    });

    it("limits number of results", async () => {
      const result = await provider.list({ limit: 2 });

      expect(result.files).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it("paginates using cursor", async () => {
      const firstPage = await provider.list({ limit: 2 });
      const secondPage = await provider.list({
        limit: 2,
        cursor: firstPage.nextCursor,
      });

      expect(secondPage.files).toHaveLength(1);
      expect(secondPage.hasMore).toBe(false);

      // Ensure no duplicates
      const allKeys = [
        ...firstPage.files.map((f) => f.key),
        ...secondPage.files.map((f) => f.key),
      ];
      expect(new Set(allKeys).size).toBe(3);
    });

    it("returns empty list when no files match prefix", async () => {
      const result = await provider.list({ prefix: "nonexistent/" });

      expect(result.files).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Copy Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("copy", () => {
    it("copies a file to a new location", async () => {
      const buffer = Buffer.from("test content");
      const sourceKey = "source/file.txt";
      const destKey = "dest/file.txt";

      await provider.upload(buffer, sourceKey, { contentType: "text/plain" });
      const result = await provider.copy(sourceKey, destKey);

      expect(result.storageKey).toBe(destKey);

      // Verify both files exist
      expect(await provider.exists(sourceKey)).toBe(true);
      expect(await provider.exists(destKey)).toBe(true);

      // Verify content is the same
      const sourceContent = await provider.get(sourceKey);
      const destContent = await provider.get(destKey);
      expect(destContent?.toString()).toBe(sourceContent?.toString());
    });

    it("preserves metadata when copying", async () => {
      const buffer = Buffer.from("test content");
      const sourceKey = "source/file.txt";
      const destKey = "dest/file.txt";

      await provider.upload(buffer, sourceKey, {
        contentType: "text/plain",
        metadata: { custom: "value" },
      });
      await provider.copy(sourceKey, destKey);

      const destInfo = await provider.getFileInfo(destKey);
      expect(destInfo?.metadata).toEqual({ custom: "value" });
    });

    it("throws FileNotFoundError when source does not exist", async () => {
      await expect(
        provider.copy("nonexistent.txt", "dest.txt")
      ).rejects.toThrow(FileNotFoundError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Clear Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("clear", () => {
    it("removes all files from storage", async () => {
      await provider.upload(Buffer.from("1"), "a.txt", {
        contentType: "text/plain",
      });
      await provider.upload(Buffer.from("2"), "b.txt", {
        contentType: "text/plain",
      });

      provider.clear();

      const result = await provider.list();
      expect(result.files).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Size Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("size", () => {
    it("returns the number of stored files", async () => {
      expect(provider.size).toBe(0);

      await provider.upload(Buffer.from("1"), "a.txt", {
        contentType: "text/plain",
      });
      expect(provider.size).toBe(1);

      await provider.upload(Buffer.from("2"), "b.txt", {
        contentType: "text/plain",
      });
      expect(provider.size).toBe(2);

      await provider.delete("a.txt");
      expect(provider.size).toBe(1);
    });
  });
});
