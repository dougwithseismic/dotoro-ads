"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./TemplateList.module.css";

interface CampaignTemplate {
  id: string;
  userId: string | null;
  name: string;
  platform: "reddit" | "google" | "facebook";
  structure: {
    objective?: string;
    budget?: {
      type: "daily" | "lifetime";
      amount: number;
      currency: string;
    };
    targeting?: Record<string, unknown>;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface TemplateListResponse {
  data: CampaignTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const PLATFORM_LABELS: Record<string, string> = {
  reddit: "Reddit",
  google: "Google",
  facebook: "Facebook",
};

const PLATFORM_COLORS: Record<string, string> = {
  reddit: "#ff4500",
  google: "#4285f4",
  facebook: "#1877f2",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_BASE + "/api/v1/templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const data: TemplateListResponse = await response.json();
      setTemplates(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(API_BASE + "/api/v1/templates/" + id, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete template");
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading templates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchTemplates} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Campaign Templates</h1>
          <p className={styles.subtitle}>
            Create and manage your ad campaign templates
          </p>
        </div>
        <Link href="/templates/editor" className={styles.createButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 4V16M4 10H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Create Template
        </Link>
      </header>

      {templates.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="8"
                y="8"
                width="32"
                height="32"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <path
                d="M24 18V30M18 24H30"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2>No templates yet</h2>
          <p>Create your first campaign template to get started</p>
          <Link href="/templates/editor" className={styles.emptyButton}>
            Create Your First Template
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {templates.map((template) => (
            <article key={template.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span
                  className={styles.platform}
                  style={
                    {
                      "--platform-color": PLATFORM_COLORS[template.platform],
                    } as React.CSSProperties
                  }
                >
                  {PLATFORM_LABELS[template.platform]}
                </span>
                <span className={styles.date}>
                  {formatDate(template.createdAt)}
                </span>
              </div>

              <h2 className={styles.cardTitle}>{template.name}</h2>

              {template.structure?.objective && (
                <p className={styles.cardObjective}>
                  Objective: {template.structure.objective}
                </p>
              )}

              {template.structure?.budget && (
                <p className={styles.cardBudget}>
                  {template.structure.budget.type === "daily"
                    ? "Daily"
                    : "Lifetime"}{" "}
                  Budget: {template.structure.budget.currency}{" "}
                  {template.structure.budget.amount}
                </p>
              )}

              <div className={styles.cardActions}>
                <Link
                  href={"/templates/editor/" + template.id}
                  className={styles.actionButton}
                >
                  Edit
                </Link>
                <Link
                  href={"/templates/" + template.id + "/preview"}
                  className={styles.actionButton}
                >
                  Preview
                </Link>
                {deleteConfirm === template.id ? (
                  <div className={styles.deleteConfirm}>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className={styles.deleteConfirmYes}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className={styles.deleteConfirmNo}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(template.id)}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
