"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./UploadZone.module.css";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadingFileName?: string;
  error?: string | null;
}

export function UploadZone({
  onUpload,
  isUploading = false,
  uploadProgress,
  uploadingFileName,
  error,
}: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setValidationError("Only CSV files are supported");
      return false;
    }
    setValidationError(null);
    return true;
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onUpload(file);
      }
    },
    [onUpload, validateFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        onUpload(file);
      }
      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onUpload, validateFile]
  );

  const handleClick = useCallback(() => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  }, [isUploading]);

  const displayError = error || validationError;

  return (
    <div className={styles.container}>
      <div
        data-testid="drop-zone"
        data-drag-active={isDragActive ? "true" : "false"}
        className={`${styles.dropZone} ${isDragActive ? styles.active : ""} ${isUploading ? styles.uploading : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
      >
        <input
          ref={inputRef}
          data-testid="file-input"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={isUploading}
          className={styles.hiddenInput}
        />

        {isUploading ? (
          <div className={styles.uploadingContent}>
            {uploadProgress !== undefined ? (
              <>
                <div className={styles.progressContainer}>
                  <div
                    className={styles.progressBar}
                    role="progressbar"
                    aria-valuenow={uploadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={styles.progressFill}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>{uploadProgress}%</span>
                </div>
                {uploadingFileName && (
                  <span className={styles.fileName}>{uploadingFileName}</span>
                )}
              </>
            ) : (
              <>
                <div className={styles.spinner} />
                <span>Uploading...</span>
              </>
            )}
          </div>
        ) : (
          <>
            <div className={styles.icon}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 5L20 25M20 5L28 13M20 5L12 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 27V31C8 32.6569 9.34315 34 11 34H29C30.6569 34 32 32.6569 32 31V27"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className={styles.primaryText}>
              Drag and drop a CSV file here
            </p>
            <p className={styles.secondaryText}>or click to browse</p>
          </>
        )}
      </div>

      {displayError && (
        <p className={styles.error} role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
