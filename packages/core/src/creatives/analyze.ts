/**
 * Creative Asset Analysis Utilities
 *
 * Functions for analyzing images and videos on the client side.
 * Browser-specific functions (analyzeImage, analyzeVideo) require DOM APIs.
 */

import type { ImageAnalysisResult, VideoAnalysisResult } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Pure Utility Functions (work in Node and Browser)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the aspect ratio from width and height.
 * Maps to common ratios when close enough (within tolerance).
 *
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Aspect ratio string (e.g., "16:9", "1:1", "4:5")
 */
export function calculateAspectRatio(width: number, height: number): string {
  const ratio = width / height;

  // Check for common ratios first (with tolerance)
  // 1:1 (square)
  if (Math.abs(ratio - 1) < 0.01) return "1:1";
  // 1.91:1 (Facebook landscape)
  if (Math.abs(ratio - 1.91) < 0.05) return "1.91:1";
  // 16:9 (widescreen)
  if (Math.abs(ratio - 16 / 9) < 0.05) return "16:9";
  // 4:5 (portrait)
  if (Math.abs(ratio - 4 / 5) < 0.05) return "4:5";
  // 9:16 (vertical video)
  if (Math.abs(ratio - 9 / 16) < 0.05) return "9:16";
  // 4:3 (standard)
  if (Math.abs(ratio - 4 / 3) < 0.05) return "4:3";

  // Calculate simplified ratio using GCD
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  return `${w}:${h}`;
}

/**
 * Convert a MIME type to a file format extension.
 *
 * @param mimeType - MIME type (e.g., "image/jpeg", "video/mp4")
 * @returns Format extension (e.g., "jpg", "mp4")
 */
export function mimeToFormat(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-msvideo": "avi",
  };

  if (map[mimeType]) {
    return map[mimeType];
  }

  // Try to extract from MIME type
  const parts = mimeType.split("/");
  if (parts.length === 2 && parts[1]) {
    return parts[1];
  }

  return "unknown";
}

/**
 * Format file size in human-readable format.
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "500 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const base = 1024;
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
  const value = bytes / Math.pow(base, unitIndex);

  // Format with appropriate precision
  if (unitIndex === 0) {
    return `${bytes} B`;
  }

  // Use up to 2 decimal places, but remove trailing zeros
  const formatted = value.toFixed(2);
  const trimmed = parseFloat(formatted).toString();

  return `${trimmed} ${units[unitIndex]}`;
}

/**
 * Format duration in seconds to a human-readable string.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "1:30" for 90s, "45s" for 45s)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${secs}s`;
}

/**
 * Check if a MIME type represents an image.
 *
 * @param mimeType - MIME type to check
 * @returns True if the MIME type is a valid image type
 */
export function isImageMimeType(mimeType: string): boolean {
  if (!mimeType || !mimeType.startsWith("image/")) {
    return false;
  }

  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
  ];

  return validTypes.includes(mimeType);
}

/**
 * Check if a MIME type represents a video.
 *
 * @param mimeType - MIME type to check
 * @returns True if the MIME type is a valid video type
 */
export function isVideoMimeType(mimeType: string): boolean {
  if (!mimeType || !mimeType.startsWith("video/")) {
    return false;
  }

  const validTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/mpeg",
    "video/ogg",
  ];

  return validTypes.includes(mimeType);
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser-Only Functions (require DOM APIs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze an image file on the client side.
 * Requires browser environment with Image and URL APIs.
 *
 * @param file - Image file to analyze
 * @returns Promise resolving to image analysis result
 */
export async function analyzeImage(file: File): Promise<ImageAnalysisResult> {
  return new Promise((resolve, reject) => {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || typeof Image === "undefined") {
      reject(new Error("analyzeImage requires a browser environment"));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = calculateAspectRatio(width, height);

      URL.revokeObjectURL(url);

      resolve({
        width,
        height,
        aspectRatio,
        fileSize: file.size,
        mimeType: file.type,
        isAnimated: file.type === "image/gif",
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Analyze a video file on the client side.
 * Requires browser environment with HTMLVideoElement and Canvas APIs.
 *
 * @param file - Video file to analyze
 * @returns Promise resolving to video analysis result
 */
export async function analyzeVideo(file: File): Promise<VideoAnalysisResult> {
  return new Promise((resolve, reject) => {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("analyzeVideo requires a browser environment"));
      return;
    }

    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;

      // Seek to 1 second (or middle for short videos) for thumbnail
      video.currentTime = Math.min(1, duration / 2);
    };

    video.onseeked = () => {
      // Create thumbnail
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

      URL.revokeObjectURL(url);

      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: calculateAspectRatio(video.videoWidth, video.videoHeight),
        duration: video.duration,
        fileSize: file.size,
        mimeType: file.type,
        thumbnailUrl,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}
