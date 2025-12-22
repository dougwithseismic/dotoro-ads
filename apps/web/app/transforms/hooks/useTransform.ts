import { useState, useEffect, useCallback } from "react";
import type { Transform } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UseTransformResult {
  transform: Transform | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTransform(id: string | undefined): UseTransformResult {
  const [transform, setTransform] = useState<Transform | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const fetchTransform = useCallback(async () => {
    if (!id) {
      setTransform(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/v1/transforms/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Transform not found");
        }
        throw new Error("Failed to fetch transform");
      }

      const data: Transform = await response.json();
      setTransform(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransform();
  }, [fetchTransform]);

  return {
    transform,
    loading,
    error,
    refetch: fetchTransform,
  };
}
