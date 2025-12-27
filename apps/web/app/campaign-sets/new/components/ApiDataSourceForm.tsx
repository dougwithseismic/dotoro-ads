"use client";

import { useState, useCallback, useEffect } from "react";
import styles from "./ApiDataSourceForm.module.css";
import { HeadersEditor } from "./HeadersEditor";
import type { ApiAuthType, SyncFrequency } from "@/app/data-sources/types";
import { api, ApiError } from "@/lib/api-client";

/**
 * Authentication configuration for API form (form-specific structure)
 * This differs from the canonical ApiFetchConfig to provide a better form UX.
 * The form uses a combined auth object that gets transformed on submit.
 */
export interface ApiAuthFormConfig {
  type: ApiAuthType;
  value?: string;
}

/**
 * Flatten configuration for array handling (form-specific)
 */
export interface ApiFlattenFormConfig {
  arrayHandling: "join" | "first" | "expand";
}

/**
 * Form-specific configuration for an API fetch data source.
 * This type is used for form state and differs from the canonical ApiFetchConfig.
 * The CreateDataSourceDrawer transforms this to the API format on submit.
 */
export interface ApiFetchConfig {
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  auth?: ApiAuthFormConfig;
  dataPath?: string;
  flatten?: ApiFlattenFormConfig;
  syncFrequency: SyncFrequency;
}

/**
 * Props for the ApiDataSourceForm component
 */
export interface ApiDataSourceFormProps {
  /** Callback when form is submitted with name and config */
  onSubmit: (name: string, config: ApiFetchConfig) => Promise<void>;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Whether the form is in a loading state (e.g., during submission) */
  isLoading?: boolean;
}

/**
 * Preview data returned from test connection
 */
interface PreviewData {
  columns: string[];
  preview: Record<string, unknown>[];
  rowCount: number;
}

/**
 * Auth type labels for display
 */
const AUTH_TYPE_LABELS: Record<string, string> = {
  none: "None",
  bearer: "Bearer Token",
  "api-key": "API Key",
  basic: "Basic Auth (Credentials)",
};

/**
 * Get the appropriate label for auth value input
 */
function getAuthValueLabel(authType: string): string {
  switch (authType) {
    case "bearer":
      return "Bearer Token";
    case "api-key":
      return "API Key";
    case "basic":
      return "Credentials (user:password)";
    default:
      return "Auth Value";
  }
}

/**
 * Validate if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate if a string is valid JSON
 */
function isValidJson(str: string): boolean {
  if (!str.trim()) return true; // Empty is valid
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * ApiDataSourceForm - Form for configuring API fetch data sources
 *
 * Features:
 * - Configure URL, method, headers, body, auth
 * - Test connection with preview
 * - Configure data path for JSONPath extraction
 * - Configure array handling (flatten options)
 * - Configure sync frequency
 */
export function ApiDataSourceForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: ApiDataSourceFormProps) {
  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [authType, setAuthType] = useState<ApiAuthType>("none");
  const [authValue, setAuthValue] = useState("");
  const [dataPath, setDataPath] = useState("");
  const [arrayHandling, setArrayHandling] = useState<"join" | "first" | "expand">("join");
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("manual");

  // UI state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testedUrl, setTestedUrl] = useState("");

  // Clear preview when URL or important config changes
  useEffect(() => {
    if (testedUrl && url !== testedUrl) {
      setPreviewData(null);
      setError(null);
    }
  }, [url, testedUrl]);

  // Validation
  const isNameValid = name.trim().length > 0;
  const isUrlValid = url.trim().length > 0 && isValidUrl(url.trim());
  const isUrlFilled = url.trim().length > 0;
  const isBodyValid = method === "GET" || isValidJson(body);
  const isAuthValid = authType === "none" || authValue.trim().length > 0;
  const canSubmit = isNameValid && isUrlValid && isBodyValid && isAuthValid && !isLoading;
  const canTest = isUrlFilled && !testLoading && !isLoading;

  /**
   * Handle test connection button click
   */
  const handleTestConnection = useCallback(async () => {
    setError(null);
    setPreviewData(null);

    // Validate URL before testing
    if (!isValidUrl(url.trim())) {
      setError("Please enter a valid URL (must start with http:// or https://)");
      return;
    }

    setTestLoading(true);

    try {
      const requestBody: Record<string, unknown> = {
        url: url.trim(),
        method,
      };

      // Add headers if any
      if (Object.keys(headers).length > 0) {
        // Filter out empty headers
        const filteredHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
          if (key.trim()) {
            filteredHeaders[key] = value;
          }
        }
        if (Object.keys(filteredHeaders).length > 0) {
          requestBody.headers = filteredHeaders;
        }
      }

      // Add body for POST
      if (method === "POST" && body.trim()) {
        requestBody.body = body;
      }

      // Add auth config
      if (authType !== "none" && authValue.trim()) {
        requestBody.auth = { type: authType, value: authValue };
      }

      // Add data path
      if (dataPath.trim()) {
        requestBody.dataPath = dataPath.trim();
      }

      const data = await api.post<PreviewData>(
        "/api/v1/data-sources/api-fetch/test-connection",
        requestBody
      );

      setPreviewData(data);
      setTestedUrl(url);
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const errorData = err.data as { error?: string };
        setError(errorData.error || "Failed to test connection");
      } else {
        setError(err instanceof Error ? err.message : "Network error");
      }
    } finally {
      setTestLoading(false);
    }
  }, [url, method, headers, body, authType, authValue, dataPath]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate URL
      if (!isValidUrl(url.trim())) {
        setError("Please enter a valid URL (must start with http:// or https://)");
        return;
      }

      // Validate JSON body for POST
      if (method === "POST" && body.trim() && !isValidJson(body)) {
        setError("Invalid JSON in request body");
        return;
      }

      // Validate auth value if auth type is set
      if (authType !== "none" && !authValue.trim()) {
        setError(`${getAuthValueLabel(authType)} is required when authentication is enabled`);
        return;
      }

      // Build config
      const config: ApiFetchConfig = {
        url: url.trim(),
        method,
        syncFrequency,
      };

      // Add optional fields
      if (Object.keys(headers).length > 0) {
        const filteredHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
          if (key.trim()) {
            filteredHeaders[key] = value;
          }
        }
        if (Object.keys(filteredHeaders).length > 0) {
          config.headers = filteredHeaders;
        }
      }

      if (method === "POST" && body.trim()) {
        config.body = body;
      }

      if (authType !== "none") {
        config.auth = { type: authType, value: authValue };
      }

      if (dataPath.trim()) {
        config.dataPath = dataPath.trim();
      }

      config.flatten = { arrayHandling };

      await onSubmit(name.trim(), config);
    },
    [name, url, method, headers, body, authType, authValue, dataPath, arrayHandling, syncFrequency, onSubmit]
  );

  const hasError = error !== null;
  const hasPreview = previewData !== null;
  const isPreviewEmpty = hasPreview && previewData.columns.length === 0 && previewData.preview.length === 0;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Name field */}
      <div className={styles.field}>
        <label htmlFor="api-name" className={styles.label}>
          Name
        </label>
        <input
          id="api-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My API Data Source"
          className={styles.input}
          disabled={isLoading}
          aria-required="true"
        />
      </div>

      {/* URL field */}
      <div className={styles.field}>
        <label htmlFor="api-url" className={styles.label}>
          URL
        </label>
        <input
          id="api-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/data"
          className={styles.input}
          disabled={isLoading}
          aria-required="true"
        />
      </div>

      {/* Method select */}
      <div className={styles.field}>
        <label htmlFor="api-method" className={styles.label}>
          Method
        </label>
        <select
          id="api-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
          className={styles.select}
          disabled={isLoading}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
      </div>

      {/* Body field (POST only) */}
      {method === "POST" && (
        <div className={styles.field}>
          <label htmlFor="api-body" className={styles.label}>
            Request Body
          </label>
          <textarea
            id="api-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"query": "value"}'
            className={styles.textarea}
            disabled={isLoading}
          />
          <span className={styles.hint}>JSON format</span>
        </div>
      )}

      {/* Headers editor */}
      <HeadersEditor value={headers} onChange={setHeaders} disabled={isLoading} />

      {/* Auth type select */}
      <div className={styles.field}>
        <label htmlFor="api-auth-type" className={styles.label}>
          Auth Type
        </label>
        <select
          id="api-auth-type"
          value={authType}
          onChange={(e) => {
            setAuthType(e.target.value as ApiAuthType);
            if (e.target.value === "none") {
              setAuthValue("");
            }
          }}
          className={styles.select}
          disabled={isLoading}
        >
          <option value="none">{AUTH_TYPE_LABELS.none}</option>
          <option value="bearer">{AUTH_TYPE_LABELS.bearer}</option>
          <option value="api-key">{AUTH_TYPE_LABELS["api-key"]}</option>
          <option value="basic">{AUTH_TYPE_LABELS.basic}</option>
        </select>
      </div>

      {/* Auth value field (conditional) */}
      {authType !== "none" && (
        <div className={styles.field}>
          <label htmlFor="api-auth-value" className={styles.label}>
            {getAuthValueLabel(authType)}
          </label>
          <input
            id="api-auth-value"
            type="password"
            value={authValue}
            onChange={(e) => setAuthValue(e.target.value)}
            placeholder={`Enter ${getAuthValueLabel(authType).toLowerCase()}`}
            className={styles.input}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Data path field */}
      <div className={styles.field}>
        <label htmlFor="api-data-path" className={styles.label}>
          Data Path
        </label>
        <input
          id="api-data-path"
          type="text"
          value={dataPath}
          onChange={(e) => setDataPath(e.target.value)}
          placeholder="$.response.data"
          className={styles.input}
          disabled={isLoading}
        />
        <span className={styles.hint}>JSONPath to the data array (leave empty for root)</span>
      </div>

      {/* Array handling select */}
      <div className={styles.field}>
        <label htmlFor="api-array-handling" className={styles.label}>
          Array Handling
        </label>
        <select
          id="api-array-handling"
          value={arrayHandling}
          onChange={(e) => setArrayHandling(e.target.value as "join" | "first" | "expand")}
          className={styles.select}
          disabled={isLoading}
        >
          <option value="join">Join (comma-separated)</option>
          <option value="first">First value only</option>
          <option value="expand">Expand (create rows)</option>
        </select>
        <span className={styles.hint}>How to handle nested arrays in responses</span>
      </div>

      {/* Sync frequency select */}
      <div className={styles.field}>
        <label htmlFor="api-sync-frequency" className={styles.label}>
          Sync Frequency
        </label>
        <select
          id="api-sync-frequency"
          value={syncFrequency}
          onChange={(e) => setSyncFrequency(e.target.value as SyncFrequency)}
          className={styles.select}
          disabled={isLoading}
        >
          <option value="manual">Manual</option>
          <option value="1h">Every hour</option>
          <option value="6h">Every 6 hours</option>
          <option value="24h">Every 24 hours</option>
          <option value="7d">Every 7 days</option>
        </select>
      </div>

      {/* Test Connection button */}
      <button
        type="button"
        onClick={handleTestConnection}
        disabled={!canTest}
        className={styles.testButton}
      >
        {testLoading ? (
          <>
            <span className={styles.spinner} data-testid="test-loading" />
            Testing...
          </>
        ) : (
          "Test Connection"
        )}
      </button>

      {/* Error message */}
      {hasError && (
        <div
          data-testid="error-message"
          className={styles.error}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Empty preview state */}
      {isPreviewEmpty && (
        <div data-testid="preview-empty" className={styles.previewEmpty}>
          No data found at the specified URL and path
        </div>
      )}

      {/* Preview section */}
      {hasPreview && !isPreviewEmpty && (
        <div className={styles.previewContainer}>
          <h4 className={styles.previewTitle}>
            Preview ({previewData.columns.length} columns, {previewData.rowCount} rows)
          </h4>
          <div className={styles.tableWrapper}>
            <table data-testid="preview-table" className={styles.table}>
              <thead>
                <tr>
                  {previewData.columns.map((column, index) => (
                    <th key={index} className={styles.th}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.preview.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {previewData.columns.map((column, colIndex) => (
                      <td key={colIndex} className={styles.td}>
                        {String(row[column] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className={styles.submitButton}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Creating...
            </>
          ) : (
            "Create Data Source"
          )}
        </button>
      </div>
    </form>
  );
}
