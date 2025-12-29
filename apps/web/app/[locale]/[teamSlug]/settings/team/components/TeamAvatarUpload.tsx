/**
 * TeamAvatarUpload Component
 *
 * Avatar display and upload component for team settings.
 * Shows circular avatar with initials fallback and upload functionality.
 */

"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";

interface TeamAvatarUploadProps {
  /** Team name for generating initials fallback */
  teamName: string;
  /** Current avatar URL (null if not set) */
  avatarUrl: string | null;
  /** Callback when a file is uploaded */
  onUpload: (file: File) => Promise<void>;
  /** Whether the current user can edit (owner/admin) */
  isOwnerOrAdmin: boolean;
  /** Additional CSS classes */
  className?: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Generates initials from a team name (max 2 characters)
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const firstWord = words[0] ?? "";
  const secondWord = words[1] ?? "";
  if (words.length === 1) {
    return firstWord.charAt(0).toUpperCase();
  }
  return (firstWord.charAt(0) + secondWord.charAt(0)).toUpperCase();
}

/**
 * TeamAvatarUpload - Avatar with upload functionality for teams
 *
 * Features:
 * - Circular avatar preview (80x80)
 * - Fallback to team name initials
 * - Click/button to upload
 * - Accepts jpg, png, webp, gif
 * - Max file size 2MB with validation
 * - Loading state during upload
 * - Error handling with clear messaging
 *
 * @example
 * ```tsx
 * <TeamAvatarUpload
 *   teamName="Acme Corp"
 *   avatarUrl="https://example.com/avatar.jpg"
 *   onUpload={async (file) => {
 *     const url = await uploadToStorage(file);
 *     await updateTeam({ avatarUrl: url });
 *   }}
 *   isOwnerOrAdmin={true}
 * />
 * ```
 */
export function TeamAvatarUpload({
  teamName,
  avatarUrl,
  onUpload,
  isOwnerOrAdmin,
  className = "",
}: TeamAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(teamName);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous error
    setError(null);

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Invalid file type. Please upload a JPG, PNG, WebP, or GIF image.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File too large. Maximum size is 2MB.");
      return;
    }

    setIsUploading(true);

    try {
      await onUpload(file);
    } catch (err) {
      setError(
        `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div data-testid="team-avatar-upload" className={`flex flex-col items-start gap-3 ${className}`}>
      {/* Avatar Container */}
      <div className="flex items-center gap-4">
        <div
          data-testid="avatar-container"
          aria-label={`${teamName} team avatar`}
          className="relative w-20 h-20 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${teamName} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-semibold text-neutral-600 dark:text-neutral-300">
              {initials}
            </span>
          )}

          {/* Upload overlay on hover (for owners/admins) */}
          {isOwnerOrAdmin && !isUploading && (
            <div
              onClick={handleButtonClick}
              className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
            >
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}

          {/* Loading overlay */}
          {isUploading && (
            <div
              data-testid="upload-loading"
              className="absolute inset-0 bg-black/50 flex items-center justify-center"
            >
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <span className="w-4 h-4 border-2 border-neutral-400/30 border-t-neutral-400 rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Change avatar
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {isOwnerOrAdmin && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          JPG, PNG, WebP, or GIF. Max 2MB.
        </p>
      )}
    </div>
  );
}
