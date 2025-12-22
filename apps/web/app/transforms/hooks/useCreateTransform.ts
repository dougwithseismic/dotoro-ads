import { useState, useCallback } from "react";
import type { Transform, CreateTransformRequest } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UseCreateTransformResult {
  createTransform: (data: CreateTransformRequest) => Promise<Transform>;
  loading: boolean;
  error: string | null;
}

export function useCreateTransform(): UseCreateTransformResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTransform = useCallback(
    async (data: CreateTransformRequest): Promise<Transform> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/v1/transforms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create transform");
        }

        const transform: Transform = await response.json();
        return transform;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create transform";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    createTransform,
    loading,
    error,
  };
}
