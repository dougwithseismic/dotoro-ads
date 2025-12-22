import { useState, useCallback } from "react";
import type { Transform, UpdateTransformRequest } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UseUpdateTransformResult {
  updateTransform: (
    id: string,
    data: UpdateTransformRequest
  ) => Promise<Transform>;
  loading: boolean;
  error: string | null;
}

export function useUpdateTransform(): UseUpdateTransformResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTransform = useCallback(
    async (id: string, data: UpdateTransformRequest): Promise<Transform> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/v1/transforms/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update transform");
        }

        const transform: Transform = await response.json();
        return transform;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update transform";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    updateTransform,
    loading,
    error,
  };
}
