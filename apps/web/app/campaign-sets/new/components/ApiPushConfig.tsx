"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./ApiPushConfig.module.css";

/**
 * API Key configuration stored in data source config.
 */
export interface ApiKeyConfig {
  /** Masked key prefix for display (e.g., "ds_live_01234567...") */
  keyPrefix: string;
  /** ISO timestamp when the key was created */
  createdAt: string;
  /** ISO timestamp when the key was last used (optional) */
  lastUsedAt?: string;
}

export interface ApiPushConfigProps {
  /** The data source ID for the API endpoint */
  dataSourceId: string;
  /** Existing API key configuration (if any) */
  apiKeyConfig?: ApiKeyConfig;
  /** Callback when a new key is generated */
  onKeyGenerated?: () => void;
}

/**
 * API Push Configuration component.
 * Displays the API endpoint URL, allows generating/regenerating API keys,
 * and shows example curl commands for external systems to push data.
 */
export function ApiPushConfig({
  dataSourceId,
  apiKeyConfig,
  onKeyGenerated,
}: ApiPushConfigProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [exampleExpanded, setExampleExpanded] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Build the endpoint URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const endpointPath = `/api/v1/data-sources/${dataSourceId}/items`;
  const endpointUrl = `${baseUrl}${endpointPath}`;

  // Format last used timestamp
  const formatLastUsed = (timestamp?: string): string => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Copy to clipboard helper
  const copyToClipboard = async (
    text: string,
    setCopied: (value: boolean) => void
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  // Generate API key
  const handleGenerateKey = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/data-sources/${dataSourceId}/api-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate API key");
      }

      const data = await response.json();
      setGeneratedKey(data.key);
      setShowKeyModal(true);
      onKeyGenerated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate API key");
    } finally {
      setIsLoading(false);
    }
  }, [dataSourceId, onKeyGenerated]);

  // Regenerate API key
  const handleRegenerateKey = useCallback(async () => {
    setShowRegenerateConfirm(false);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/data-sources/${dataSourceId}/api-key/regenerate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to regenerate API key");
      }

      const data = await response.json();
      setGeneratedKey(data.key);
      setShowKeyModal(true);
      onKeyGenerated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate API key");
    } finally {
      setIsLoading(false);
    }
  }, [dataSourceId, onKeyGenerated]);

  // Close key modal
  const handleCloseModal = useCallback(() => {
    setShowKeyModal(false);
    setGeneratedKey(null);
  }, []);

  // Trap focus within modal
  useEffect(() => {
    if (!showKeyModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseModal();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus first element when modal opens
    firstFocusableRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showKeyModal, handleCloseModal]);

  // Build curl example
  const curlExample = `curl -X POST "${endpointUrl}" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"items": [{"column1": "value1"}], "mode": "append"}'`;

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>API Push Configuration</h3>

      {/* Endpoint URL Section */}
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Endpoint URL</label>
        <div className={styles.endpointContainer}>
          <code className={styles.endpointCode}>
            POST {endpointPath}
          </code>
          <button
            type="button"
            className={styles.copyButton}
            onClick={() => copyToClipboard(endpointUrl, setCopiedEndpoint)}
            aria-label="Copy endpoint URL"
          >
            {copiedEndpoint ? (
              <span className={styles.copiedText}>Copied!</span>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10.5 1H3.5C2.67 1 2 1.67 2 2.5V11H3.5V2.5H10.5V1ZM12.5 4H6.5C5.67 4 5 4.67 5 5.5V13.5C5 14.33 5.67 15 6.5 15H12.5C13.33 15 14 14.33 14 13.5V5.5C14 4.67 13.33 4 12.5 4ZM12.5 13.5H6.5V5.5H12.5V13.5Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
        <p className={styles.fieldHint}>
          External systems can push data to this endpoint
        </p>
      </div>

      {/* API Key Section */}
      <div className={styles.field}>
        <label className={styles.fieldLabel}>API Key</label>

        {apiKeyConfig ? (
          <div className={styles.keyDisplay}>
            <div className={styles.keyInfo}>
              <code className={styles.keyPrefix}>{apiKeyConfig.keyPrefix}</code>
              <span className={styles.keyMeta}>
                Last used: {formatLastUsed(apiKeyConfig.lastUsedAt)}
              </span>
            </div>
            <button
              type="button"
              className={styles.regenerateButton}
              onClick={() => setShowRegenerateConfirm(true)}
              disabled={isLoading}
              aria-label="Regenerate API key"
            >
              {isLoading ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.generateButton}
            onClick={handleGenerateKey}
            disabled={isLoading}
            aria-label="Generate API key"
          >
            {isLoading ? "Generating..." : "Generate API Key"}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Example Section (Collapsible) */}
      <div className={styles.exampleSection}>
        <button
          type="button"
          className={styles.exampleHeader}
          onClick={() => setExampleExpanded(!exampleExpanded)}
          aria-expanded={exampleExpanded}
        >
          <span>Example curl command</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`${styles.chevron} ${exampleExpanded ? styles.chevronExpanded : ""}`}
            aria-hidden="true"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {exampleExpanded && (
          <div className={styles.exampleContent}>
            <div className={styles.codeBlock}>
              <pre>
                <code>{curlExample}</code>
              </pre>
              <button
                type="button"
                className={styles.copyButton}
                onClick={() => copyToClipboard(curlExample, setCopiedCurl)}
                aria-label="Copy curl command"
              >
                {copiedCurl ? (
                  <span className={styles.copiedText}>Copied!</span>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.5 1H3.5C2.67 1 2 1.67 2 2.5V11H3.5V2.5H10.5V1ZM12.5 4H6.5C5.67 4 5 4.67 5 5.5V13.5C5 14.33 5.67 15 6.5 15H12.5C13.33 15 14 14.33 14 13.5V5.5C14 4.67 13.33 4 12.5 4ZM12.5 13.5H6.5V5.5H12.5V13.5Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className={styles.exampleHint}>
              Replace <code>YOUR_API_KEY</code> with your generated API key
            </p>
          </div>
        )}
      </div>

      {/* Regenerate Confirmation Dialog */}
      {showRegenerateConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowRegenerateConfirm(false)}
        >
          <div
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="confirm-title" className={styles.confirmTitle}>
              Regenerate API Key?
            </h4>
            <p className={styles.confirmText}>
              This will invalidate your previous key. Any systems using the old
              key will need to be updated.
            </p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowRegenerateConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleRegenerateKey}
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Display Modal */}
      {showKeyModal && generatedKey && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div
            ref={modalRef}
            className={styles.keyModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="modal-title" className={styles.modalTitle}>
              API Key Generated
            </h4>

            <div className={styles.warningBanner}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 1.5C5.30558 1.5 1.5 5.30558 1.5 10C1.5 14.6944 5.30558 18.5 10 18.5C14.6944 18.5 18.5 14.6944 18.5 10C18.5 5.30558 14.6944 1.5 10 1.5ZM10 5.5C10.4142 5.5 10.75 5.83579 10.75 6.25V10.75C10.75 11.1642 10.4142 11.5 10 11.5C9.58579 11.5 9.25 11.1642 9.25 10.75V6.25C9.25 5.83579 9.58579 5.5 10 5.5ZM10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15C10.5523 15 11 14.5523 11 14C11 13.4477 10.5523 13 10 13Z"
                  fill="currentColor"
                />
              </svg>
              <span>This key will only be shown once. Copy it now.</span>
            </div>

            <div className={styles.keyDisplayModal}>
              <code className={styles.fullKey}>{generatedKey}</code>
              <button
                ref={firstFocusableRef}
                type="button"
                className={styles.copyButton}
                onClick={() => copyToClipboard(generatedKey, setCopiedKey)}
                aria-label="Copy API key"
              >
                {copiedKey ? (
                  <span className={styles.copiedText}>Copied!</span>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.5 1H3.5C2.67 1 2 1.67 2 2.5V11H3.5V2.5H10.5V1ZM12.5 4H6.5C5.67 4 5 4.67 5 5.5V13.5C5 14.33 5.67 15 6.5 15H12.5C13.33 15 14 14.33 14 13.5V5.5C14 4.67 13.33 4 12.5 4ZM12.5 13.5H6.5V5.5H12.5V13.5Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
            </div>

            <button
              ref={lastFocusableRef}
              type="button"
              className={styles.dismissButton}
              onClick={handleCloseModal}
            >
              I've copied the key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
