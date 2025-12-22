import { useState, useCallback, useRef, useEffect } from "react";
import type { PreviewResponse, TransformConfig } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UsePreviewTransformResult {
  preview: PreviewResponse | null;
  loading: boolean;
  error: string | null;
  fetchPreview: (
    sourceDataSourceId: string,
    config: TransformConfig,
    limit?: number
  ) => Promise<PreviewResponse | null>;
  clearPreview: () => void;
}

/**
 * Hook for previewing transform configuration with debouncing
 */
export function usePreviewTransform(
  debounceMs: number = 500
): UsePreviewTransformResult {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchPreview = useCallback(
    async (
      sourceDataSourceId: string,
      config: TransformConfig,
      limit: number = 10
    ): Promise<PreviewResponse | null> => {
      // Clear any pending request
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      return new Promise((resolve) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            setLoading(true);
            setError(null);

            abortControllerRef.current = new AbortController();

            const response = await fetch(
              `${API_BASE}/api/v1/transforms/preview`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sourceDataSourceId,
                  config,
                  limit,
                }),
                signal: abortControllerRef.current.signal,
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || "Failed to preview transform");
            }

            const data: PreviewResponse = await response.json();
            setPreview(data);
            resolve(data);
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
              resolve(null);
              return;
            }
            const message =
              err instanceof Error ? err.message : "Failed to preview transform";
            setError(message);
            resolve(null);
          } finally {
            setLoading(false);
          }
        }, debounceMs);
      });
    },
    [debounceMs]
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    preview,
    loading,
    error,
    fetchPreview,
    clearPreview,
  };
}
