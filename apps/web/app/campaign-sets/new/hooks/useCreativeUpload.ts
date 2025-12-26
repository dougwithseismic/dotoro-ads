"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  CreativeAsset,
  CreativeSpecs,
  AssetMetadata,
  AssetValidation,
  CreativeType,
} from "@repo/core/creatives";
import { calculateAspectRatio, validateAsset } from "@repo/core/creatives";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UploadStatus = "idle" | "analyzing" | "ready" | "error";

export interface UseCreativeUploadOptions {
  /** Creative specifications for validation */
  specs?: CreativeSpecs;
  /** Callback when asset changes */
  onAssetChange?: (asset: CreativeAsset | null) => void;
  /** Initial asset value */
  initialAsset?: CreativeAsset | null;
}

export interface UseCreativeUploadResult {
  /** Current upload status */
  status: UploadStatus;
  /** The current creative asset */
  asset: CreativeAsset | null;
  /** Blob URL for preview (if source is blob) */
  blobUrl: string | null;
  /** Error message if any */
  error: string | null;
  /** Handle file selection */
  handleFileSelect: (file: File) => void;
  /** Remove the current asset */
  handleRemove: () => void;
  /** Set a variable pattern as the source */
  setVariablePattern: (pattern: string) => void;
  /** Set a remote URL as the source */
  setRemoteUrl: (url: string) => void;
  /** Reset to initial state */
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for managing creative asset uploads with blob URL preview.
 *
 * Handles:
 * - File selection and analysis
 * - Blob URL creation and cleanup
 * - Variable pattern support
 * - Remote URL support
 * - Validation against specs
 */
export function useCreativeUpload(
  options: UseCreativeUploadOptions = {}
): UseCreativeUploadResult {
  const { specs, onAssetChange, initialAsset = null } = options;

  const [status, setStatus] = useState<UploadStatus>(
    initialAsset ? "ready" : "idle"
  );
  const [asset, setAsset] = useState<CreativeAsset | null>(initialAsset);
  const [blobUrl, setBlobUrl] = useState<string | null>(
    initialAsset?.source.type === "blob" ? initialAsset.source.blobUrl : null
  );
  const [error, setError] = useState<string | null>(null);

  // Track blob URLs for cleanup
  const blobUrlRef = useRef<string | null>(blobUrl);

  // Update ref when blobUrl changes
  useEffect(() => {
    blobUrlRef.current = blobUrl;
  }, [blobUrl]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Revoke previous blob URL when it changes
  const revokePreviousBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const updateAsset = useCallback(
    (newAsset: CreativeAsset | null) => {
      setAsset(newAsset);
      onAssetChange?.(newAsset);
    },
    [onAssetChange]
  );

  /**
   * Determine creative type from MIME type
   */
  const getCreativeType = (mimeType: string): CreativeType => {
    if (mimeType === "image/gif") return "gif";
    if (mimeType.startsWith("video/")) return "video";
    return "image";
  };

  /**
   * Validate metadata against specs using the shared validation function.
   * Returns a default valid result if no specs are provided.
   */
  const validateMetadata = (metadata: AssetMetadata): AssetValidation => {
    if (!specs) {
      return { isValid: true, errors: [], warnings: [] };
    }
    return validateAsset(metadata, specs);
  };

  /**
   * Handle file selection and analysis
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      setStatus("analyzing");
      setError(null);

      // Revoke previous blob URL
      revokePreviousBlobUrl();

      // Create new blob URL
      const newBlobUrl = URL.createObjectURL(file);
      setBlobUrl(newBlobUrl);
      blobUrlRef.current = newBlobUrl;

      const creativeType = getCreativeType(file.type);

      if (creativeType === "video") {
        // Analyze video
        const video = document.createElement("video");
        video.onloadedmetadata = () => {
          const width = video.videoWidth;
          const height = video.videoHeight;
          const duration = video.duration;

          // Generate thumbnail
          video.currentTime = Math.min(1, duration / 2);
        };

        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(video, 0, 0);
          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

          const metadata: AssetMetadata = {
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            width: video.videoWidth,
            height: video.videoHeight,
            aspectRatio: calculateAspectRatio(video.videoWidth, video.videoHeight),
            duration: video.duration,
            analyzedAt: new Date().toISOString(),
          };

          const validation = validateMetadata(metadata);

          const newAsset: CreativeAsset = {
            id: crypto.randomUUID(),
            type: "video",
            source: { type: "blob", blobUrl: newBlobUrl, file },
            metadata,
            validation,
            thumbnailUrl,
          };

          updateAsset(newAsset);
          setStatus(validation.isValid ? "ready" : "error");
          if (!validation.isValid && validation.errors[0]) {
            setError(validation.errors[0].message);
          }
        };

        video.onerror = () => {
          setError("Failed to load video");
          setStatus("error");
        };

        video.src = newBlobUrl;
      } else {
        // Analyze image
        const img = new Image();
        img.onload = () => {
          const metadata: AssetMetadata = {
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: calculateAspectRatio(img.naturalWidth, img.naturalHeight),
            analyzedAt: new Date().toISOString(),
          };

          const validation = validateMetadata(metadata);

          const newAsset: CreativeAsset = {
            id: crypto.randomUUID(),
            type: creativeType,
            source: { type: "blob", blobUrl: newBlobUrl, file },
            metadata,
            validation,
          };

          updateAsset(newAsset);
          setStatus(validation.isValid ? "ready" : "error");
          if (!validation.isValid && validation.errors[0]) {
            setError(validation.errors[0].message);
          }
        };

        img.onerror = () => {
          setError("Failed to load image");
          setStatus("error");
        };

        img.src = newBlobUrl;
      }
    },
    [revokePreviousBlobUrl, updateAsset, specs]
  );

  /**
   * Remove the current asset
   */
  const handleRemove = useCallback(() => {
    revokePreviousBlobUrl();
    setBlobUrl(null);
    setStatus("idle");
    setError(null);
    updateAsset(null);
  }, [revokePreviousBlobUrl, updateAsset]);

  /**
   * Set a variable pattern as the source
   */
  const setVariablePattern = useCallback(
    (pattern: string) => {
      revokePreviousBlobUrl();
      setBlobUrl(null);
      setError(null);

      const newAsset: CreativeAsset = {
        id: crypto.randomUUID(),
        type: "image",
        source: { type: "variable", pattern },
        metadata: {},
        validation: { isValid: true, errors: [], warnings: [] },
      };

      updateAsset(newAsset);
      setStatus("ready");
    },
    [revokePreviousBlobUrl, updateAsset]
  );

  /**
   * Set a remote URL as the source
   */
  const setRemoteUrl = useCallback(
    (url: string) => {
      revokePreviousBlobUrl();
      setBlobUrl(null);
      setError(null);

      const newAsset: CreativeAsset = {
        id: crypto.randomUUID(),
        type: "image",
        source: { type: "remote", url },
        metadata: {},
        validation: { isValid: true, errors: [], warnings: [] },
      };

      updateAsset(newAsset);
      setStatus("ready");
    },
    [revokePreviousBlobUrl, updateAsset]
  );

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    revokePreviousBlobUrl();
    setBlobUrl(null);
    setStatus("idle");
    setError(null);
    updateAsset(null);
  }, [revokePreviousBlobUrl, updateAsset]);

  return {
    status,
    asset,
    blobUrl,
    error,
    handleFileSelect,
    handleRemove,
    setVariablePattern,
    setRemoteUrl,
    reset,
  };
}
