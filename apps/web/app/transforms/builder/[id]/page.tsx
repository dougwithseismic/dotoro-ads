"use client";

import { useState, useEffect, use } from "react";
import TransformBuilder from "../TransformBuilder";
import type { Transform } from "../../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function EditTransformPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [transform, setTransform] = useState<Transform | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransform() {
      try {
        const response = await fetch(`${API_BASE}/api/v1/transforms/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch transform");
        }
        const data = await response.json();
        setTransform(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load transform"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchTransform();
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <p>Loading transform...</p>
      </div>
    );
  }

  if (error || !transform) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          gap: "16px",
        }}
      >
        <p style={{ color: "#dc2626" }}>{error || "Transform not found"}</p>
        <a href="/transforms" style={{ color: "inherit" }}>
          Back to Transforms
        </a>
      </div>
    );
  }

  return <TransformBuilder initialTransform={transform} transformId={id} />;
}
