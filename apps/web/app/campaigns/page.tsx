"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { GeneratedCampaign, CampaignFilters as CampaignFiltersType } from "./types";
import { CampaignsTable } from "./components/CampaignsTable";
import { CampaignFilters } from "./components/CampaignFilters";
import { BatchActions } from "./components/BatchActions";
import styles from "./CampaignsList.module.css";

interface CampaignsResponse {
  data: GeneratedCampaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TemplateOption {
  id: string;
  name: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<GeneratedCampaign[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<CampaignFiltersType>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.status && filters.status.length > 0) {
        params.set("status", filters.status.join(","));
      }
      if (filters.templateId) {
        params.set("templateId", filters.templateId);
      }
      if (filters.dateRange?.start) {
        params.set("startDate", filters.dateRange.start.toISOString());
      }
      if (filters.dateRange?.end) {
        params.set("endDate", filters.dateRange.end.toISOString());
      }

      const queryString = params.toString();
      const url = `${API_BASE}/api/v1/campaigns${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }
      const data: CampaignsResponse = await response.json();
      setCampaigns(
        data.data.map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          lastSyncedAt: c.lastSyncedAt ? new Date(c.lastSyncedAt) : undefined,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/templates`);
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const data = await response.json();
      setTemplates(
        data.data.map((t: { id: string; name: string }) => ({
          id: t.id,
          name: t.name,
        }))
      );
    } catch {
      // Silently fail for templates - they're optional for filtering
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSync = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsSyncing(true);
      const response = await fetch(`${API_BASE}/api/v1/campaigns/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync campaigns");
      }

      setSelectedIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync campaigns");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} campaign(s)?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/campaigns`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete campaigns");
      }

      setSelectedIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete campaigns");
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleFiltersChange = (newFilters: CampaignFiltersType) => {
    setFilters(newFilters);
    setSelectedIds([]);
  };

  const statusCounts = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [campaigns]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading campaigns...</span>
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
          <button onClick={fetchCampaigns} className={styles.retryButton}>
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
          <h1 className={styles.title}>Generated Campaigns</h1>
          <p className={styles.subtitle}>
            View and manage your generated ad campaigns
          </p>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{campaigns.length}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          <div className={styles.stat} data-status="synced">
            <span className={styles.statValue}>{statusCounts.synced || 0}</span>
            <span className={styles.statLabel}>Synced</span>
          </div>
          <div className={styles.stat} data-status="pending">
            <span className={styles.statValue}>{statusCounts.pending_sync || 0}</span>
            <span className={styles.statLabel}>Pending</span>
          </div>
          <div className={styles.stat} data-status="error">
            <span className={styles.statValue}>{statusCounts.sync_error || 0}</span>
            <span className={styles.statLabel}>Errors</span>
          </div>
        </div>
      </header>

      <CampaignFilters
        filters={filters}
        templates={templates}
        onChange={handleFiltersChange}
      />

      <BatchActions
        selectedCount={selectedIds.length}
        onSync={handleSync}
        onDelete={handleDelete}
        onClearSelection={handleClearSelection}
        isSyncing={isSyncing}
      />

      <CampaignsTable
        campaigns={campaigns}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
