"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createTeamApi } from "../api-client";
import type { UploadItem } from "@/app/[locale]/[teamSlug]/assets/components/UploadProgress";
import { validateFile } from "@/app/[locale]/[teamSlug]/assets/components/AssetUploadZone";

/**
 * Presigned URL response from API
 */
interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  fields?: Record<string, string>;
}

/**
 * Created asset response from API
 */
interface CreatedAssetResponse {
  id: string;
  name: string;
  type: "IMAGE" | "VIDEO";
  storageKey: string;
  mimeType: string;
  fileSize: number;
  status: "PENDING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
  folderId: string | null;
  createdAt: string;
}

/**
 * Options for the useAssetUpload hook
 */
export interface UseAssetUploadOptions {
  /** Team ID for API calls */
  teamId?: string;
  /** Account ID for associating assets */
  accountId?: string;
  /** Folder ID to assign uploaded assets to */
  folderId?: string | null;
  /** Callback when an upload completes successfully */
  onUploadComplete?: (asset: CreatedAssetResponse) => void;
  /** Callback when an upload fails */
  onUploadError?: (id: string, error: Error) => void;
  /** Callback when all uploads complete */
  onAllComplete?: () => void;
}

/**
 * Return type for useAssetUpload hook
 */
export interface UseAssetUploadReturn {
  /** List of current upload items */
  uploads: UploadItem[];
  /** Whether any uploads are in progress */
  isUploading: boolean;
  /** Total upload count (all statuses) */
  totalCount: number;
  /** Pending/uploading count */
  pendingCount: number;
  /** Success count */
  successCount: number;
  /** Error count */
  errorCount: number;
  /** Add files to the upload queue */
  addFiles: (files: File[]) => void;
  /** Cancel an upload */
  cancelUpload: (id: string) => void;
  /** Retry a failed upload */
  retryUpload: (id: string) => void;
  /** Remove an upload from the list */
  removeUpload: (id: string) => void;
  /** Clear all completed/failed uploads */
  clearCompleted: () => void;
  /** Clear all uploads */
  clearAll: () => void;
}

/**
 * Generate a unique ID for an upload
 */
function generateId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Hook for managing asset uploads to the API
 *
 * Handles:
 * - Multi-file upload queue
 * - Requesting presigned URLs from API
 * - Tracking progress per file
 * - Cancel/retry functionality
 *
 * @example
 * ```tsx
 * const { currentTeam } = useTeam();
 * const {
 *   uploads,
 *   isUploading,
 *   addFiles,
 *   cancelUpload,
 *   retryUpload,
 *   removeUpload,
 * } = useAssetUpload({
 *   teamId: currentTeam?.id,
 *   accountId: selectedAccountId,
 *   folderId: currentFolderId,
 *   onUploadComplete: () => fetchAssets(),
 * });
 *
 * // In your component
 * <AssetUploadZone onFilesSelected={addFiles} />
 * <UploadProgress
 *   uploads={uploads}
 *   onCancel={cancelUpload}
 *   onRetry={retryUpload}
 *   onRemove={removeUpload}
 * />
 * ```
 */
export function useAssetUpload(
  options: UseAssetUploadOptions = {}
): UseAssetUploadReturn {
  const {
    teamId,
    accountId,
    folderId,
    onUploadComplete,
    onUploadError,
    onAllComplete,
  } = options;

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  // Create team-aware API client
  const teamApi = useMemo(() => createTeamApi(teamId), [teamId]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    const blobUrls = blobUrlsRef.current;
    const abortControllers = abortControllersRef.current;

    return () => {
      blobUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      abortControllers.forEach((controller) => {
        controller.abort();
      });
    };
  }, []);

  // Calculate counts
  const isUploading = uploads.some(
    (u) => u.status === "uploading" || u.status === "pending"
  );
  const totalCount = uploads.length;
  const pendingCount = uploads.filter(
    (u) => u.status === "pending" || u.status === "uploading"
  ).length;
  const successCount = uploads.filter((u) => u.status === "success").length;
  const errorCount = uploads.filter((u) => u.status === "error").length;

  /**
   * Update a specific upload item
   */
  const updateUpload = useCallback(
    (id: string, updates: Partial<UploadItem>) => {
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
      );
    },
    []
  );

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (item: UploadItem) => {
      if (!teamId || !accountId) {
        updateUpload(item.id, {
          status: "error",
          error: "Missing team or account context",
        });
        return;
      }

      const controller = new AbortController();
      abortControllersRef.current.set(item.id, controller);

      try {
        updateUpload(item.id, { status: "uploading", progress: 5 });

        // 1. Request presigned URL
        const presigned = await teamApi.post<PresignedUrlResponse>(
          `/api/v1/creatives/presigned-url`,
          {
            fileName: item.file.name,
            contentType: item.file.type,
            fileSize: item.file.size,
            accountId,
          }
        );

        if (controller.signal.aborted) return;
        updateUpload(item.id, { progress: 15 });

        // 2. Upload to storage
        if (presigned.fields) {
          // S3-style multipart form upload
          const formData = new FormData();
          Object.entries(presigned.fields).forEach(([key, value]) => {
            formData.append(key, value);
          });
          formData.append("file", item.file);

          const uploadResponse = await fetch(presigned.uploadUrl, {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }
        } else {
          // Direct PUT upload
          const uploadResponse = await fetch(presigned.uploadUrl, {
            method: "PUT",
            body: item.file,
            headers: {
              "Content-Type": item.file.type,
            },
            signal: controller.signal,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }
        }

        if (controller.signal.aborted) return;
        updateUpload(item.id, { progress: 70 });

        // 3. Create asset record
        const assetType = item.file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
        const asset = await teamApi.post<CreatedAssetResponse>(
          `/api/v1/creatives`,
          {
            accountId,
            name: item.file.name,
            type: assetType,
            storageKey: presigned.key,
            mimeType: item.file.type,
            fileSize: item.file.size,
            folderId: folderId || null,
          }
        );

        if (controller.signal.aborted) return;

        updateUpload(item.id, { status: "success", progress: 100 });
        onUploadComplete?.(asset);

        // Check if all uploads are complete
        setUploads((prev) => {
          const remaining = prev.filter(
            (u) => u.id !== item.id && (u.status === "pending" || u.status === "uploading")
          );
          if (remaining.length === 0) {
            // Use setTimeout to avoid calling during render
            setTimeout(() => onAllComplete?.(), 0);
          }
          return prev;
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        const error = err instanceof Error ? err : new Error("Upload failed");
        updateUpload(item.id, {
          status: "error",
          error: error.message,
        });
        onUploadError?.(item.id, error);
      } finally {
        abortControllersRef.current.delete(item.id);
      }
    },
    [teamId, accountId, folderId, teamApi, updateUpload, onUploadComplete, onUploadError, onAllComplete]
  );

  /**
   * Add files to the upload queue
   */
  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: UploadItem[] = [];

      for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) continue;

        const id = generateId();
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        if (previewUrl) {
          blobUrlsRef.current.set(id, previewUrl);
        }

        const item: UploadItem = {
          id,
          file,
          status: "pending",
          progress: 0,
          previewUrl,
        };

        newItems.push(item);
      }

      if (newItems.length === 0) return;

      setUploads((prev) => [...prev, ...newItems]);

      // Start uploading
      newItems.forEach((item) => {
        uploadFile(item);
      });
    },
    [uploadFile]
  );

  /**
   * Cancel an upload
   */
  const cancelUpload = useCallback(
    (id: string) => {
      const controller = abortControllersRef.current.get(id);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(id);
      }

      const blobUrl = blobUrlsRef.current.get(id);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current.delete(id);
      }

      setUploads((prev) => prev.filter((u) => u.id !== id));
    },
    []
  );

  /**
   * Retry a failed upload
   */
  const retryUpload = useCallback(
    (id: string) => {
      const upload = uploads.find((u) => u.id === id);
      if (!upload || upload.status !== "error") return;

      updateUpload(id, { status: "pending", progress: 0, error: undefined });
      uploadFile(upload);
    },
    [uploads, updateUpload, uploadFile]
  );

  /**
   * Remove an upload from the list
   */
  const removeUpload = useCallback(
    (id: string) => {
      const blobUrl = blobUrlsRef.current.get(id);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current.delete(id);
      }

      setUploads((prev) => prev.filter((u) => u.id !== id));
    },
    []
  );

  /**
   * Clear all completed/failed uploads
   */
  const clearCompleted = useCallback(() => {
    setUploads((prev) => {
      const toRemove = prev.filter(
        (u) => u.status === "success" || u.status === "error"
      );

      toRemove.forEach((u) => {
        const blobUrl = blobUrlsRef.current.get(u.id);
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrlsRef.current.delete(u.id);
        }
      });

      return prev.filter(
        (u) => u.status === "pending" || u.status === "uploading"
      );
    });
  }, []);

  /**
   * Clear all uploads
   */
  const clearAll = useCallback(() => {
    // Abort all pending uploads
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();

    // Revoke all blob URLs
    blobUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrlsRef.current.clear();

    setUploads([]);
  }, []);

  return {
    uploads,
    isUploading,
    totalCount,
    pendingCount,
    successCount,
    errorCount,
    addFiles,
    cancelUpload,
    retryUpload,
    removeUpload,
    clearCompleted,
    clearAll,
  };
}
