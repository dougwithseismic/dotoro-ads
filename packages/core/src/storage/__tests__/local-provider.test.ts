/**
 * Tests for LocalStorageProvider
 *
 * The LocalStorageProvider stores files on the local file system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LocalStorageProvider } from "../providers/local.js";
import {
  FileNotFoundError,
  FileTooLargeError,
  InvalidFileTypeError,
} from "../types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("LocalStorageProvider", () => {
  let provider: LocalStorageProvider;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "storage-test-"));
    provider = new LocalStorageProvider({ basePath: testDir });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Upload Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("upload", () => {
    it("uploads a Buffer to the file system", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.txt";

      const result = await provider.upload(buffer, key, {
        contentType: "text/plain",
      });

      expect(result.storageKey).toBe(key);
      expect(result.size).toBe(buffer.length);
      expect(result.contentType).toBe("text/plain");
      expect(result.uploadedAt).toBeInstanceOf(Date);

      // Verify file exists on disk
      const filePath = path.join(testDir, key);
      const content = await fs.readFile(filePath);
      expect(content.toString()).toBe("test content");
    });

    it("creates nested directories as needed", async () => {
      const buffer = Buffer.from("nested content");
      const key = "deep/nested/folder/file.txt";

      await provider.upload(buffer, key, { contentType: "text/plain" });

      const filePath = path.join(testDir, key);
      const content = await fs.readFile(filePath);
      expect(content.toString()).toBe("nested content");
    });

    it("stores metadata in a sidecar file", async () => {
      const buffer = Buffer.from("test");
      const key = "test/file.txt";

      await provider.upload(buffer, key, {
        contentType: "text/plain",
        metadata: { custom: "value" },
      });

      const metaPath = path.join(testDir, key + ".meta.json");
      const metaContent = await fs.readFile(metaPath, "utf-8");
      const meta = JSON.parse(metaContent);

      expect(meta.contentType).toBe("text/plain");
      expect(meta.metadata.custom).toBe("value");
    });

    it("uses default content type when not specified", async () => {
      const buffer = Buffer.from("test content");
      const key = "test/file.bin";

      const result = await provider.upload(buffer, key);

      expect(result.contentType).toBe("application/octet-stream");
    });

    it("overwrites existing file", async () => {
      const key = "test/file.txt";

      await provider.upload(Buffer.from("original"), key, {
        contentType: "text/plain",
      });
      await provider.upload(Buffer.from("updated"), key, {
        contentType: "text/plain",
      });

      const content = await provider.get(key);
      expect(content?.toString()).toBe("updated");
    });
  });

  describe("upload with constraints", () => {
    it("rejects files exceeding maxFileSize", async () => {
      const constrainedProvider = new LocalStorageProvider({
        basePath: testDir,
        maxFileSize: 100,
      });
      const buffer = Buffer.alloc(150);

      await expect(
        constrainedProvider.upload(buffer, "test.bin")
      ).rejects.toThrow(FileTooLargeError);
    });

    it("rejects files with disallowed MIME types", async () => {
      const constrainedProvider = new LocalStorageProvider({
        basePath: testDir,
        allowedMimeTypes: ["image/jpeg", "image/png"],
      });
      const buffer = Buffer.from("test");

      await expect(
        constrainedProvider.upload(buffer, "test.txt", {
          contentType: "text/plain",
        })
      ).rejects.toThrow(InvalidFileTypeError);
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
    it("deletes an existing file and its metadata", async () => {
      const buffer = Buffer.from("test");
      const key = "test/file.txt";

      await provider.upload(buffer, key, {
        contentType: "text/plain",
        metadata: { custom: "value" },
      });
      await provider.delete(key);

      expect(await provider.exists(key)).toBe(false);

      // Metadata file should also be deleted
      const metaPath = path.join(testDir, key + ".meta.json");
      await expect(fs.access(metaPath)).rejects.toThrow();
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
      const buffer = Buffer.from("test");
      const key = "test/file.txt";

      await provider.upload(buffer, key, { contentType: "text/plain" });
      expect(await provider.exists(key)).toBe(true);
    });

    it("returns false for non-existent file", async () => {
      expect(await provider.exists("nonexistent.txt")).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GetSignedUrl Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("getSignedUrl", () => {
    it("returns a file:// URL for existing file", async () => {
      const buffer = Buffer.from("test");
      const key = "test/file.txt";

      await provider.upload(buffer, key, { contentType: "text/plain" });
      const url = await provider.getSignedUrl(key);

      expect(url).toContain("file://");
      expect(url).toContain(key);
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

      await provider.upload(buffer, key, { contentType: "text/plain" });
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
    });

    it("paginates using cursor", async () => {
      const firstPage = await provider.list({ limit: 2 });
      const secondPage = await provider.list({
        limit: 2,
        cursor: firstPage.nextCursor,
      });

      expect(secondPage.files.length).toBeGreaterThan(0);
      expect(secondPage.hasMore).toBe(false);
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
      expect(await provider.exists(sourceKey)).toBe(true);
      expect(await provider.exists(destKey)).toBe(true);

      const destContent = await provider.get(destKey);
      expect(destContent?.toString()).toBe("test content");
    });

    it("preserves metadata when copying", async () => {
      const buffer = Buffer.from("test");
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
  // PublicUrl Configuration
  // ─────────────────────────────────────────────────────────────────────────

  describe("publicUrl configuration", () => {
    it("uses publicUrl prefix when configured", async () => {
      const providerWithPublicUrl = new LocalStorageProvider({
        basePath: testDir,
        publicUrl: "http://localhost:3000/storage",
      });

      const buffer = Buffer.from("test");
      const result = await providerWithPublicUrl.upload(buffer, "test.txt", {
        contentType: "text/plain",
        public: true,
      });

      expect(result.publicUrl).toBe("http://localhost:3000/storage/test.txt");
    });
  });
});
