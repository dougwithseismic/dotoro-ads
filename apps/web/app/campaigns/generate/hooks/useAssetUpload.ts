"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  StorageProvider,
  StorageUploadResult,
} from "@repo/core/storage";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AssetUploadStatus = "idle" | "uploading" | "error";

export interface LocalPreview {
  id: string;
  file: File;
  blobUrl: string;
  name: string;
  type: string;
  size: number;
}

export interface UploadedAsset {
  storageKey: string;
  url: string;
  publicUrl?: string;
  fileName: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

export interface UseAssetUploadOptions {
  /** Storage provider for persisting uploads */
  storageProvider?: StorageProvider;

  /** Prefix for storage keys */
  keyPrefix?: string;

  /** Delete from storage when removing asset */
  deleteOnRemove?: boolean;

  /** Callback when progress updates */
  onProgress?: (progress: number) => void;

  /** Callback when upload completes */
  onUploadComplete?: (result: UploadedAsset) => void;

  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

export interface UseAssetUploadResult {
  /** Current upload status */
  status: AssetUploadStatus;

  /** Upload progress (0-100) */
  progress: number;

  /** Error message if status is error */
  error: string | null;

  /** List of uploaded assets */
  uploadedAssets: UploadedAsset[];

  /** List of local previews (not yet uploaded) */
  localPreviews: LocalPreview[];

  /** Upload a single file */
  uploadFile: (file: File) => Promise<UploadedAsset | null>;

  /** Upload multiple files */
  uploadMultiple: (files: File[]) => Promise<UploadedAsset[]>;

  /** Remove an uploaded asset */
  removeAsset: (storageKey: string) => Promise<void>;

  /** Add a local preview without uploading */
  addLocalPreview: (file: File) => Promise<void>;

  /** Remove a local preview */
  removeLocalPreview: (id: string) => void;

  /** Reset all state */
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Generation
// ─────────────────────────────────────────────────────────────────────────────

function generateStorageKey(fileName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);

  // Sanitize file name
  const sanitized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-");

  const parts = [];
  if (prefix) {
    parts.push(prefix);
  }
  parts.push(`${timestamp}-${random}-${sanitized}`);

  return parts.join("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for managing asset uploads with optional storage provider integration
 *
 * Supports two modes:
 * 1. Preview-only: Local blob URLs without server upload
 * 2. Storage mode: Upload to configured storage provider
 *
 * @example Preview-only mode
 * ```tsx
 * const { addLocalPreview, localPreviews } = useAssetUpload();
 *
 * const handleFileSelect = async (file: File) => {
 *   await addLocalPreview(file);
 * };
 * ```
 *
 * @example Storage mode
 * ```tsx
 * const provider = createStorageProvider({ provider: 'memory' });
 *
 * const { uploadFile, uploadedAssets } = useAssetUpload({
 *   storageProvider: provider,
 *   keyPrefix: 'campaign-123',
 * });
 *
 * const handleFileSelect = async (file: File) => {
 *   await uploadFile(file);
 * };
 * ```
 */
export function useAssetUpload(
  options: UseAssetUploadOptions = {}
): UseAssetUploadResult {
  const {
    storageProvider,
    keyPrefix,
    deleteOnRemove = false,
    onProgress,
    onUploadComplete,
    onError,
  } = options;

  const [status, setStatus] = useState<AssetUploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [localPreviews, setLocalPreviews] = useState<LocalPreview[]>([]);

  // Track blob URLs for cleanup
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Update progress and notify callback
  const updateProgress = useCallback(
    (value: number) => {
      setProgress(value);
      onProgress?.(value);
    },
    [onProgress]
  );

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  /**
   * Upload a single file to storage
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadedAsset | null> => {
      if (!storageProvider) {
        throw new Error("Storage provider is required for upload");
      }

      setStatus("uploading");
      setError(null);
      updateProgress(0);

      try {
        const key = generateStorageKey(file.name, keyPrefix);

        // Simulate progress (since we don't have real progress events)
        updateProgress(30);

        const result: StorageUploadResult = await storageProvider.upload(
          file,
          key,
          {
            contentType: file.type || "application/octet-stream",
            fileName: file.name,
          }
        );

        updateProgress(100);

        const uploadedAsset: UploadedAsset = {
          storageKey: result.storageKey,
          url: result.url,
          publicUrl: result.publicUrl,
          fileName: file.name,
          size: result.size,
          contentType: result.contentType,
          uploadedAt: result.uploadedAt,
        };

        setUploadedAssets((prev) => [...prev, uploadedAsset]);
        setStatus("idle");
        onUploadComplete?.(uploadedAsset);

        return uploadedAsset;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        setStatus("error");
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        throw err;
      }
    },
    [storageProvider, keyPrefix, updateProgress, onUploadComplete, onError]
  );

  /**
   * Upload multiple files
   */
  const uploadMultiple = useCallback(
    async (files: File[]): Promise<UploadedAsset[]> => {
      if (!storageProvider) {
        throw new Error("Storage provider is required for upload");
      }

      const results: UploadedAsset[] = [];
      const totalFiles = files.length;
      let completedFiles = 0;

      setStatus("uploading");
      setError(null);
      updateProgress(0);

      for (const file of files) {
        try {
          const key = generateStorageKey(file.name, keyPrefix);

          const result = await storageProvider.upload(file, key, {
            contentType: file.type || "application/octet-stream",
            fileName: file.name,
          });

          const uploadedAsset: UploadedAsset = {
            storageKey: result.storageKey,
            url: result.url,
            publicUrl: result.publicUrl,
            fileName: file.name,
            size: result.size,
            contentType: result.contentType,
            uploadedAt: result.uploadedAt,
          };

          results.push(uploadedAsset);
          setUploadedAssets((prev) => [...prev, uploadedAsset]);
          onUploadComplete?.(uploadedAsset);
        } catch (err) {
          // Log error but continue with other files
          console.error(`Failed to upload ${file.name}:`, err);
        }

        completedFiles++;
        updateProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      setStatus("idle");
      return results;
    },
    [storageProvider, keyPrefix, updateProgress, onUploadComplete]
  );

  /**
   * Remove an uploaded asset
   */
  const removeAsset = useCallback(
    async (storageKey: string): Promise<void> => {
      if (deleteOnRemove && storageProvider) {
        await storageProvider.delete(storageKey);
      }

      setUploadedAssets((prev) =>
        prev.filter((asset) => asset.storageKey !== storageKey)
      );
    },
    [deleteOnRemove, storageProvider]
  );

  /**
   * Add a local preview without uploading
   */
  const addLocalPreview = useCallback(async (file: File): Promise<void> => {
    const blobUrl = URL.createObjectURL(file);
    blobUrlsRef.current.add(blobUrl);

    const preview: LocalPreview = {
      id: crypto.randomUUID(),
      file,
      blobUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    };

    setLocalPreviews((prev) => [...prev, preview]);
  }, []);

  /**
   * Remove a local preview
   */
  const removeLocalPreview = useCallback((id: string): void => {
    setLocalPreviews((prev) => {
      const preview = prev.find((p) => p.id === id);
      if (preview) {
        URL.revokeObjectURL(preview.blobUrl);
        blobUrlsRef.current.delete(preview.blobUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback((): void => {
    // Revoke all tracked blob URLs
    blobUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrlsRef.current.clear();

    setStatus("idle");
    setProgress(0);
    setError(null);
    setUploadedAssets([]);
    setLocalPreviews([]);
  }, []);

  return {
    status,
    progress,
    error,
    uploadedAssets,
    localPreviews,
    uploadFile,
    uploadMultiple,
    removeAsset,
    addLocalPreview,
    removeLocalPreview,
    reset,
  };
}
