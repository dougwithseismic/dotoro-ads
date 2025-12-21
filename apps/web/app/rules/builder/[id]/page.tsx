"use client";

import { useState, useEffect, use } from "react";
import RuleBuilder from "../RuleBuilder";
import type { Rule } from "../../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRule() {
      try {
        const response = await fetch(`${API_BASE}/api/v1/rules/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch rule");
        }
        const data = await response.json();
        setRule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rule");
      } finally {
        setLoading(false);
      }
    }

    fetchRule();
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
        <p>Loading rule...</p>
      </div>
    );
  }

  if (error || !rule) {
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
        <p style={{ color: "#dc2626" }}>{error || "Rule not found"}</p>
        <a href="/rules" style={{ color: "inherit" }}>
          Back to Rules
        </a>
      </div>
    );
  }

  return <RuleBuilder initialRule={rule} ruleId={id} />;
}
