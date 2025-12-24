/**
 * Tests for useAssetUpload Hook
 *
 * This hook provides upload functionality with progress tracking
 * and storage provider integration.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAssetUpload } from "../useAssetUpload";
import type { StorageProvider, StorageUploadResult } from "@repo/core/storage";

// Mock storage provider
function createMockProvider(): StorageProvider {
  const storage = new Map<string, Buffer>();

  return {
    upload: vi.fn(async (file: File | Buffer, key: string) => {
      // Handle both Buffer and File types
      let size: number;
      if (Buffer.isBuffer(file)) {
        storage.set(key, file);
        size = file.length;
      } else {
        // For File objects, just use the size property
        size = file.size;
        storage.set(key, Buffer.alloc(size));
      }
      return {
        storageKey: key,
        url: `memory://${key}`,
        size,
        contentType: "application/octet-stream",
        uploadedAt: new Date(),
      } as StorageUploadResult;
    }),
    delete: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    getSignedUrl: vi.fn(async (key: string) => `memory://${key}?signed=true`),
    exists: vi.fn(async (key: string) => storage.has(key)),
    getMetadata: vi.fn(async () => null),
    getFileInfo: vi.fn(async () => null),
    get: vi.fn(async (key: string) => storage.get(key) ?? null),
    list: vi.fn(async () => ({ files: [], hasMore: false })),
    copy: vi.fn(async () => ({} as StorageUploadResult)),
  };
}

// Helper to create mock file
function createMockFile(
  name: string,
  type: string,
  size: number = 1024
): File {
  const content = new Array(size).fill("x").join("");
  return new File([content], name, { type });
}

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockUrls: string[] = [];
let urlCounter = 0;

beforeEach(() => {
  mockUrls.length = 0;
  urlCounter = 0;

  globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:test-${urlCounter++}`;
    mockUrls.push(url);
    return url;
  });

  globalThis.URL.revokeObjectURL = vi.fn((url: string) => {
    const index = mockUrls.indexOf(url);
    if (index > -1) {
      mockUrls.splice(index, 1);
    }
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAssetUpload", () => {
  describe("initial state", () => {
    it("starts with idle status", () => {
      const provider = createMockProvider();
      const { result } = renderHook(() =>
        useAssetUpload({ storageProvider: provider })
      );

      expect(result.current.status).toBe("idle");
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.uploadedAssets).toEqual([]);
    });

    it("can be initialized without provider for preview-only mode", () => {
      const { result } = renderHook(() => useAssetUpload());

      expect(result.current.status).toBe("idle");
    });
  });

  describe("uploadFile", () => {
    it("uploads a file using the storage provider", async () => {
      const provider = createMockProvider();
      const { result } = renderHook(() =>
        useAssetUpload({ storageProvider: provider })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.uploadFile(file);
      });

      expect(provider.upload).toHaveBeenCalled();
      expect(result.current.status).toBe("idle");
      expect(result.current.uploadedAssets).toHaveLength(1);
      expect(result.current.uploadedAssets[0]?.storageKey).toBeDefined();
    });

    it("tracks upload progress", async () => {
      const provider = createMockProvider();
      const progressUpdates: number[] = [];

      const { result } = renderHook(() =>
        useAssetUpload({
          storageProvider: provider,
          onProgress: (progress) => progressUpdates.push(progress),
        })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.uploadFile(file);
      });

      // Should have progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      // Final progress should be 100
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it("handles upload errors gracefully", async () => {
      const provider = createMockProvider();
      vi.mocked(provider.upload).mockRejectedValue(new Error("Upload failed"));

      const { result } = renderHook(() =>
        useAssetUpload({ storageProvider: provider })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        try {
          await result.current.uploadFile(file);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.status).toBe("error");
      expect(result.current.error).toBe("Upload failed");
    });

    it("uses custom key prefix when provided", async () => {
      const provider = createMockProvider();
      const { result } = renderHook(() =>
        useAssetUpload({
          storageProvider: provider,
          keyPrefix: "campaign-123",
        })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.uploadFile(file);
      });

      expect(provider.upload).toHaveBeenCalledWith(
        expect.any(File),
        expect.stringContaining("campaign-123"),
        expect.any(Object)
      );
    });
  });

  describe("uploadMultiple", () => {
    it("uploads multiple files", async () => {
      const provider = createMockProvider();
      const { result } = renderHook(() =>
        useAssetUpload({ storageProvider: provider })
      );

      const files = [
        createMockFile("image1.jpg", "image/jpeg"),
        createMockFile("image2.jpg", "image/jpeg"),
        createMockFile("image3.jpg", "image/jpeg"),
      ];

      await act(async () => {
        await result.current.uploadMultiple(files);
      });

      expect(provider.upload).toHaveBeenCalledTimes(3);
      expect(result.current.uploadedAssets).toHaveLength(3);
    });

    it("tracks combined progress for multiple uploads", async () => {
      const provider = createMockProvider();
      const progressUpdates: number[] = [];

      const { result } = renderHook(() =>
        useAssetUpload({
          storageProvider: provider,
          onProgress: (progress) => progressUpdates.push(progress),
        })
      );

      const files = [
        createMockFile("image1.jpg", "image/jpeg"),
        createMockFile("image2.jpg", "image/jpeg"),
      ];

      await act(async () => {
        await result.current.uploadMultiple(files);
      });

      // Final progress should be 100
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it("continues uploading after individual file errors", async () => {
      const provider = createMockProvider();
      let callCount = 0;
      vi.mocked(provider.upload).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Upload failed for file 2");
        }
        return {
          storageKey: `key-${callCount}`,
          url: `memory://key-${callCount}`,
          size: 100,
          contentType: "image/jpeg",
          uploadedAt: new Date(),
        };
      });

      const { result } = renderHook(() =>
        useAssetUpload({ storageProvider: provider })
      );

      const files = [
        createMockFile("image1.jpg", "image/jpeg"),
        createMockFile("image2.jpg", "image/jpeg"),
        createMockFile("image3.jpg", "image/jpeg"),
      ];

      await act(async () => {
        await result.current.uploadMultiple(files);
      });

      // Should have attempted all 3 uploads
      expect(provider.upload).toHaveBeenCalledTimes(3);
      // Should have 2 successful uploads
      expect(result.current.uploadedAssets).toHaveLength(2);
    });
  });

  describe("removeAsset", () => {
    it("removes an uploaded asset from the list", async () => {
      const provider = createMockProvider();
      const { result } = renderHook(() =>
        useAssetUpload({ storageProvider: provider })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.uploadFile(file);
      });

      const assetKey = result.current.uploadedAssets[0]?.storageKey;
      expect(assetKey).toBeDefined();

      await act(async () => {
        await result.current.removeAsset(assetKey!);
      });

      expect(result.current.uploadedAssets).toHaveLength(0);
    });

    it("deletes from storage when configured", async () => {
      const provider = createMockProvider();
      const { result } = renderHook(() =>
        useAssetUpload({
          storageProvider: provider,
          deleteOnRemove: true,
        })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.uploadFile(file);
      });

      const assetKey = result.current.uploadedAssets[0]?.storageKey;

      await act(async () => {
        await result.current.removeAsset(assetKey!);
      });

      expect(provider.delete).toHaveBeenCalledWith(assetKey);
    });
  });

  describe("reset", () => {
    it("clears all state", async () => {
      const provider = createMockProvider();
      const { result } = renderHook(() =>
        useAssetUpload({ storageProvider: provider })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.uploadFile(file);
      });

      expect(result.current.uploadedAssets).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.uploadedAssets).toEqual([]);
    });
  });

  describe("preview-only mode", () => {
    it("creates local previews without storage provider", async () => {
      const { result } = renderHook(() => useAssetUpload());

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addLocalPreview(file);
      });

      expect(result.current.localPreviews).toHaveLength(1);
      expect(result.current.localPreviews[0]?.blobUrl).toBeDefined();
    });

    it("removes local previews and revokes blob URLs", async () => {
      const { result } = renderHook(() => useAssetUpload());

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addLocalPreview(file);
      });

      const previewId = result.current.localPreviews[0]?.id;
      const blobUrl = result.current.localPreviews[0]?.blobUrl;

      act(() => {
        result.current.removeLocalPreview(previewId!);
      });

      expect(result.current.localPreviews).toHaveLength(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
    });
  });

  describe("callbacks", () => {
    it("calls onUploadComplete when upload succeeds", async () => {
      const provider = createMockProvider();
      const onUploadComplete = vi.fn();

      const { result } = renderHook(() =>
        useAssetUpload({
          storageProvider: provider,
          onUploadComplete,
        })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.uploadFile(file);
      });

      expect(onUploadComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          storageKey: expect.any(String),
        })
      );
    });

    it("calls onError when upload fails", async () => {
      const provider = createMockProvider();
      vi.mocked(provider.upload).mockRejectedValue(new Error("Network error"));
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useAssetUpload({
          storageProvider: provider,
          onError,
        })
      );

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        try {
          await result.current.uploadFile(file);
        } catch {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("cleanup", () => {
    it("revokes blob URLs on unmount", async () => {
      const { result, unmount } = renderHook(() => useAssetUpload());

      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addLocalPreview(file);
      });

      const blobUrl = result.current.localPreviews[0]?.blobUrl;

      unmount();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
    });
  });
});
