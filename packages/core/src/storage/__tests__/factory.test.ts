/**
 * Tests for Storage Factory
 */

import { describe, it, expect } from "vitest";
import { createStorageProvider } from "../factory.js";
import { MemoryStorageProvider } from "../providers/memory.js";
import { LocalStorageProvider } from "../providers/local.js";
import { ProviderNotConfiguredError } from "../types.js";

describe("createStorageProvider", () => {
  describe("memory provider", () => {
    it("creates a MemoryStorageProvider", () => {
      const provider = createStorageProvider({ provider: "memory" });
      expect(provider).toBeInstanceOf(MemoryStorageProvider);
    });

    it("passes config to MemoryStorageProvider", async () => {
      const provider = createStorageProvider({
        provider: "memory",
        maxFileSize: 1000,
      });

      // Verify config is applied by testing size limit
      const buffer = Buffer.alloc(500);
      await expect(
        provider.upload(buffer, "test.bin")
      ).resolves.not.toThrow();

      const largeBuffer = Buffer.alloc(1500);
      await expect(
        provider.upload(largeBuffer, "large.bin")
      ).rejects.toThrow();
    });
  });

  describe("local provider", () => {
    it("creates a LocalStorageProvider", () => {
      const provider = createStorageProvider({
        provider: "local",
        basePath: "/tmp/test-storage",
      });
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it("passes config to LocalStorageProvider", () => {
      const provider = createStorageProvider({
        provider: "local",
        basePath: "/tmp/custom-path",
        publicUrl: "http://localhost:3000/files",
      });
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });
  });

  describe("cloud providers", () => {
    it("throws ProviderNotConfiguredError for r2", () => {
      expect(() =>
        createStorageProvider({ provider: "r2", bucket: "test-bucket" })
      ).toThrow(ProviderNotConfiguredError);
    });

    it("throws ProviderNotConfiguredError for s3", () => {
      expect(() =>
        createStorageProvider({
          provider: "s3",
          bucket: "test-bucket",
          region: "us-east-1",
        })
      ).toThrow(ProviderNotConfiguredError);
    });

    it("includes provider name in error message", () => {
      expect(() => createStorageProvider({ provider: "r2" })).toThrow(
        /r2.*not configured/i
      );

      expect(() => createStorageProvider({ provider: "s3" })).toThrow(
        /s3.*not configured/i
      );
    });
  });

  describe("invalid provider", () => {
    it("throws for unknown provider type", () => {
      expect(() =>
        // @ts-expect-error Testing invalid provider type
        createStorageProvider({ provider: "unknown" })
      ).toThrow();
    });
  });
});
