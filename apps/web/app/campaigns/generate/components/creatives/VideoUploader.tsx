"use client";

import { useCallback, useRef } from "react";
import type { CreativeAsset, CreativeSpecs } from "@repo/core/creatives";
import { formatFileSize, formatDuration } from "@repo/core/creatives";
import { DropZone } from "./DropZone";
import { useCreativeUpload } from "../../hooks/useCreativeUpload";
import styles from "./VideoUploader.module.css";

interface VideoUploaderProps {
  /** Current asset value */
  value: CreativeAsset | null;
  /** Called when asset changes */
  onChange: (asset: CreativeAsset | null) => void;
  /** Creative specifications for validation */
  specs: CreativeSpecs;
  /** Label for the uploader */
  label?: string;
  /** Help text displayed below the uploader */
  helpText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Test ID */
  testId?: string;
}

export function VideoUploader({
  value,
  onChange,
  specs,
  label = "Video",
  helpText,
  required = false,
  disabled = false,
  testId = "video-uploader",
}: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { status, handleFileSelect } = useCreativeUpload({
    specs,
    onAssetChange: onChange,
    initialAsset: value,
  });

  const handleRemoveAsset = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const handleChangeClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleFileSelect]
  );

  // Build duration range string
  const durationRange =
    specs.minDuration && specs.maxDuration
      ? `Duration: ${specs.minDuration}-${specs.maxDuration} seconds`
      : undefined;

  // Build accept types
  const acceptTypes = (specs.allowedFormats || ["mp4", "mov", "webm"]).map((f) => {
    const mimeMap: Record<string, string> = {
      mp4: "video/mp4",
      mov: "video/quicktime",
      webm: "video/webm",
      avi: "video/x-msvideo",
    };
    return mimeMap[f] || `video/${f}`;
  });

  const hasValue = value !== null;
  const isAnalyzing = status === "analyzing";

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
        {helpText && <p className={styles.helpText}>{helpText}</p>}
      </div>

      {/* Drop zone */}
      {!hasValue && (
        <DropZone
          label=""
          description={durationRange}
          accept={acceptTypes}
          onFileSelect={handleFileSelect}
          maxSize={specs.maxFileSize}
          disabled={disabled}
          isLoading={isAnalyzing}
          icon="video"
          testId={`${testId}-dropzone`}
        />
      )}

      {/* Preview */}
      {hasValue && (
        <div
          className={`${styles.preview} ${!value.validation.isValid ? styles.previewError : ""}`}
          data-testid="video-preview"
          data-error={!value.validation.isValid ? "true" : "false"}
        >
          <div className={styles.previewContent}>
            {/* Thumbnail with play button */}
            <div className={styles.thumbnailContainer}>
              {value.thumbnailUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={value.thumbnailUrl}
                    alt="Video thumbnail"
                    className={styles.thumbnail}
                  />
                  <button
                    type="button"
                    className={styles.playButton}
                    data-testid="video-play-button"
                    aria-label="Play video preview"
                  >
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="12" r="12" opacity="0.8" />
                      <polygon points="9,7 17,12 9,17" fill="white" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className={styles.placeholderThumbnail}>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              )}

              {/* Duration badge */}
              {value.metadata.duration && (
                <span className={styles.durationBadge}>
                  {formatDuration(value.metadata.duration)}
                </span>
              )}
            </div>

            {/* Metadata */}
            <div className={styles.metadata}>
              {value.metadata.fileName && (
                <span className={styles.fileName}>{value.metadata.fileName}</span>
              )}
              <div className={styles.details}>
                {value.metadata.width && value.metadata.height && (
                  <span className={styles.dimensions}>
                    {value.metadata.width} x {value.metadata.height}
                    {value.metadata.aspectRatio && (
                      <span className={styles.aspectRatio}>
                        ({value.metadata.aspectRatio})
                      </span>
                    )}
                  </span>
                )}
                {value.metadata.fileSize && (
                  <span className={styles.fileSize}>
                    {formatFileSize(value.metadata.fileSize)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <input
                ref={inputRef}
                type="file"
                accept={acceptTypes.join(",")}
                onChange={handleInputChange}
                className={styles.hiddenInput}
                disabled={disabled}
              />
              <button
                type="button"
                className={styles.changeButton}
                onClick={handleChangeClick}
                disabled={disabled}
              >
                Change
              </button>
              <button
                type="button"
                className={styles.removeButton}
                onClick={handleRemoveAsset}
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          </div>

          {/* Validation messages */}
          {(value.validation.errors.length > 0 ||
            value.validation.warnings.length > 0) && (
            <div className={styles.validationMessages}>
              {value.validation.errors.map((error, i) => (
                <div key={i} className={styles.errorMessage}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2" />
                    <circle cx="12" cy="16" r="1" fill="white" />
                  </svg>
                  {error.message}
                </div>
              ))}
              {value.validation.warnings.map((warning, i) => (
                <div key={i} className={styles.warningMessage}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2L2 22h20L12 2z" />
                    <line x1="12" y1="9" x2="12" y2="15" stroke="white" strokeWidth="2" />
                    <circle cx="12" cy="18" r="1" fill="white" />
                  </svg>
                  {warning.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
