"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { TemplateGrid } from "./components/TemplateGrid";
import {
  PlatformFilter,
  type Platform,
  type PlatformCounts,
} from "./components/PlatformFilter";
import { SearchInput } from "./components/SearchInput";
import type { CampaignTemplate } from "./components/TemplateCard";
import styles from "./TemplateList.module.css";

interface TemplateListResponse {
  data: CampaignTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<Platform | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(API_BASE + "/api/v1/templates/" + id, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete template");
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete template"
      );
    }
  }, []);

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        const templateToDuplicate = templates.find((t) => t.id === id);
        if (!templateToDuplicate) return;

        const response = await fetch(API_BASE + "/api/v1/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateToDuplicate.name + " (Copy)",
            platform: templateToDuplicate.platform,
            structure: templateToDuplicate.structure,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to duplicate template");
        }
        const newTemplate = await response.json();
        setTemplates((prev) => [newTemplate, ...prev]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to duplicate template"
        );
      }
    },
    [templates]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const platformCounts = useMemo((): PlatformCounts => {
    return {
      reddit: templates.filter((t) => t.platform === "reddit").length,
      google: templates.filter((t) => t.platform === "google").length,
      facebook: templates.filter((t) => t.platform === "facebook").length,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (platformFilter) {
      result = result.filter((t) => t.platform === platformFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((t) => t.name.toLowerCase().includes(query));
    }

    return result;
  }, [templates, platformFilter, searchQuery]);

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
        <Link href="/templates/new" className={styles.createButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
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

      {templates.length > 0 && (
        <div className={styles.filterBar}>
          <PlatformFilter
            selected={platformFilter}
            onChange={setPlatformFilter}
            counts={platformCounts}
          />
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={handleClearSearch}
          />
        </div>
      )}

      <TemplateGrid
        templates={filteredTemplates}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
