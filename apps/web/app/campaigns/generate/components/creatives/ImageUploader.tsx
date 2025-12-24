"use client";

import { useState, useCallback, useRef } from "react";
import type { CreativeAsset, CreativeSpecs } from "@repo/core/creatives";
import { formatFileSize } from "@repo/core/creatives";
import { DropZone } from "./DropZone";
import { useCreativeUpload } from "../../hooks/useCreativeUpload";
import styles from "./ImageUploader.module.css";

type SourceMode = "upload" | "variable" | "url";

interface ImageUploaderProps {
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
  /** Show variable source option */
  showVariableOption?: boolean;
  /** Available columns for variable selection */
  availableColumns?: string[];
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Test ID */
  testId?: string;
}

export function ImageUploader({
  value,
  onChange,
  specs,
  label = "Image",
  helpText,
  required = false,
  showVariableOption = false,
  availableColumns = [],
  disabled = false,
  testId = "image-uploader",
}: ImageUploaderProps) {
  const [mode, setMode] = useState<SourceMode>(
    value?.source.type === "variable"
      ? "variable"
      : value?.source.type === "remote"
        ? "url"
        : "upload"
  );
  const [selectedColumn, setSelectedColumn] = useState<string>(
    value?.source.type === "variable" ? value.source.pattern.replace(/[{}]/g, "") : ""
  );
  const [remoteUrl, setRemoteUrl] = useState<string>(
    value?.source.type === "remote" ? value.source.url : ""
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const { status, handleFileSelect, blobUrl } = useCreativeUpload({
    specs,
    onAssetChange: onChange,
    initialAsset: value,
  });

  const handleModeChange = useCallback((newMode: SourceMode) => {
    setMode(newMode);
    // Clear the asset when switching modes
    if (value) {
      onChange(null);
    }
  }, [value, onChange]);

  const handleColumnSelect = useCallback(
    (column: string) => {
      setSelectedColumn(column);
      const pattern = `{${column}}`;
      const asset: CreativeAsset = {
        id: crypto.randomUUID(),
        type: "image",
        source: { type: "variable", pattern },
        metadata: {},
        validation: { isValid: true, errors: [], warnings: [] },
      };
      onChange(asset);
    },
    [onChange]
  );

  const handleRemoveAsset = useCallback(() => {
    onChange(null);
    setSelectedColumn("");
    setRemoteUrl("");
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

  // Build recommended size string
  const recommendedSize =
    specs.recommendedWidth && specs.recommendedHeight
      ? `Recommended: ${specs.recommendedWidth} x ${specs.recommendedHeight}`
      : undefined;

  // Build accept types
  const acceptTypes = (specs.allowedFormats || ["jpg", "png", "gif"]).map((f) => {
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    return mimeMap[f] || `image/${f}`;
  });

  const hasValue = value !== null;
  const isAnalyzing = status === "analyzing";

  // Determine preview URL
  const previewUrl =
    value?.source.type === "blob"
      ? value.source.blobUrl
      : value?.source.type === "remote"
        ? value.source.url
        : null;

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

      {/* Mode tabs (only if variable option is enabled) */}
      {showVariableOption && (
        <div className={styles.modeTabs} role="tablist">
          <button
            type="button"
            role="tab"
            className={`${styles.modeTab} ${mode === "upload" ? styles.modeTabActive : ""}`}
            aria-selected={mode === "upload"}
            onClick={() => handleModeChange("upload")}
            disabled={disabled}
          >
            Upload
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.modeTab} ${mode === "variable" ? styles.modeTabActive : ""}`}
            aria-selected={mode === "variable"}
            onClick={() => handleModeChange("variable")}
            disabled={disabled}
          >
            Variable
          </button>
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && !hasValue && (
        <DropZone
          label=""
          description={recommendedSize}
          accept={acceptTypes}
          onFileSelect={handleFileSelect}
          maxSize={specs.maxFileSize}
          disabled={disabled}
          isLoading={isAnalyzing}
          testId={`${testId}-dropzone`}
        />
      )}

      {/* Variable mode */}
      {mode === "variable" && !hasValue && (
        <div className={styles.variableMode}>
          <select
            className={styles.columnSelect}
            value={selectedColumn}
            onChange={(e) => handleColumnSelect(e.target.value)}
            disabled={disabled}
            data-testid="variable-column-select"
          >
            <option value="">Select column with image URLs...</option>
            {availableColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
          <p className={styles.variableHint}>
            Select a column that contains image URLs. Each row's URL will be used
            for its corresponding ad.
          </p>
        </div>
      )}

      {/* Preview */}
      {hasValue && (
        <div
          className={`${styles.preview} ${!value.validation.isValid ? styles.previewError : ""}`}
          data-testid="image-preview"
          data-error={!value.validation.isValid ? "true" : "false"}
        >
          <div className={styles.previewContent}>
            {/* Image or variable display */}
            {value.source.type === "variable" ? (
              <div className={styles.variablePreview}>
                <div className={styles.variableIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </div>
                <span className={styles.variablePattern}>
                  {value.source.pattern}
                </span>
              </div>
            ) : previewUrl ? (
              <div className={styles.imagePreviewContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className={styles.imagePreview}
                />
              </div>
            ) : null}

            {/* Metadata */}
            <div className={styles.metadata}>
              {value.metadata.fileName && (
                <span className={styles.fileName}>{value.metadata.fileName}</span>
              )}
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

            {/* Actions */}
            <div className={styles.actions}>
              {value.source.type !== "variable" && (
                <>
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
                </>
              )}
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
