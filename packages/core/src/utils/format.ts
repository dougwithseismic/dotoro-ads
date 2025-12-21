/**
 * Formatting utilities
 */

/**
 * Format bytes to human-readable string
 *
 * @param bytes - The number of bytes to format
 * @returns Human-readable string representation (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 0) return "Invalid size";
  if (bytes === 0) return "0 Bytes";
  if (!Number.isFinite(bytes)) return "Invalid size";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
