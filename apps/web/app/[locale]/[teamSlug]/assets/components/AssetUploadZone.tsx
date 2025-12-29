"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./AssetUploadZone.module.css";

/**
 * Accepted file types for the asset library
 */
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

/**
 * File size limits (in bytes)
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * File extensions for accept attribute
 */
const ACCEPT_EXTENSIONS = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm";

interface AssetUploadZoneProps {
  /** Callback when files are selected/dropped */
  onFilesSelected: (files: File[]) => void;
  /** Current folder ID for context display */
  currentFolderId?: string | null;
  /** Current folder name for context display */
  currentFolderName?: string;
  /** Whether uploads are disabled */
  disabled?: boolean;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export interface FileValidationResult {
  file: File;
  valid: boolean;
  error?: string;
}

/**
 * Validate a file for upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file type
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return {
      file,
      valid: false,
      error: `Unsupported file type: ${file.type || "unknown"}. Accepted: JPEG, PNG, GIF, WebP, MP4, MOV, WebM`,
    };
  }

  // Check file size based on type
  const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  const maxSizeLabel = isVideo ? "100MB" : "10MB";

  if (file.size > maxSize) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      file,
      valid: false,
      error: `File too large (${fileSizeMB}MB). Maximum size: ${maxSizeLabel}`,
    };
  }

  return { file, valid: true };
}

/**
 * AssetUploadZone Component
 *
 * Drag-and-drop zone for uploading images and videos to the asset library.
 * Supports file validation with size limits and type checking.
 */
export function AssetUploadZone({
  onFilesSelected,
  // Reserved for future use: folder context for upload destination
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentFolderId: _currentFolderId,
  currentFolderName,
  disabled = false,
  compact = false,
  className = "",
}: AssetUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Process and validate files, then call callback with valid files
   */
  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        const result = validateFile(file);
        if (result.valid) {
          validFiles.push(file);
        } else if (result.error) {
          errors.push(`${file.name}: ${result.error}`);
        }
      }

      setValidationErrors(errors);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragActive(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragActive(true);
      }
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset input so the same files can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [processFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled]
  );

  const clearErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  return (
    <div className={`${styles.container} ${className}`}>
      <div
        data-testid="asset-upload-zone"
        className={`${styles.dropZone} ${isDragActive ? styles.active : ""} ${disabled ? styles.disabled : ""} ${compact ? styles.compact : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload assets by dropping files or clicking to browse"
        aria-disabled={disabled}
      >
        <input
          ref={inputRef}
          data-testid="file-input"
          type="file"
          accept={ACCEPT_EXTENSIONS}
          multiple
          onChange={handleFileSelect}
          disabled={disabled}
          className={styles.hiddenInput}
        />

        <div className={styles.content}>
          <UploadIcon className={styles.icon} />
          <div className={styles.textContent}>
            <p className={styles.primaryText}>
              {isDragActive
                ? "Drop files here"
                : "Drag and drop files here"}
            </p>
            <p className={styles.secondaryText}>
              or <span className={styles.browseLink}>browse</span> to upload
            </p>
            {currentFolderName && (
              <p className={styles.folderContext}>
                Uploading to: <strong>{currentFolderName}</strong>
              </p>
            )}
            {!compact && (
              <p className={styles.fileTypes}>
                JPEG, PNG, GIF, WebP, MP4, MOV, WebM
              </p>
            )}
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className={styles.errorContainer} role="alert">
          <div className={styles.errorHeader}>
            <span className={styles.errorTitle}>
              {validationErrors.length} file{validationErrors.length > 1 ? "s" : ""} could not be uploaded
            </span>
            <button
              type="button"
              className={styles.dismissButton}
              onClick={clearErrors}
              aria-label="Dismiss errors"
            >
              <CloseIcon />
            </button>
          </div>
          <ul className={styles.errorList}>
            {validationErrors.map((error, index) => (
              <li key={index} className={styles.errorItem}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Icon components
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M24 6V30" />
      <path d="M12 18L24 6L36 18" />
      <path d="M40 30V40C40 41.1 39.1 42 38 42H10C8.9 42 8 41.1 8 40V30" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M2 2L12 12M12 2L2 12" />
    </svg>
  );
}
