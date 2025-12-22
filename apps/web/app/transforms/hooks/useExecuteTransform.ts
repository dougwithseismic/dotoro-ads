import { useState, useCallback } from "react";
import type { ExecuteResponse } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UseExecuteTransformResult {
  executeTransform: (id: string) => Promise<ExecuteResponse>;
  loading: boolean;
  error: string | null;
}

export function useExecuteTransform(): UseExecuteTransformResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeTransform = useCallback(
    async (id: string): Promise<ExecuteResponse> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE}/api/v1/transforms/${id}/execute`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to execute transform");
        }

        const data: ExecuteResponse = await response.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to execute transform";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    executeTransform,
    loading,
    error,
  };
}
