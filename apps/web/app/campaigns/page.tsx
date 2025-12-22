"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { GeneratedCampaign, CampaignFilters as CampaignFiltersType, Platform } from "./types";
import { CampaignsTable } from "./components/CampaignsTable";
import { CampaignFilters } from "./components/CampaignFilters";
import { BatchActions } from "./components/BatchActions";
import { api, buildQueryString } from "@/lib/api-client";
import styles from "./CampaignsList.module.css";

interface CampaignsResponse {
  data: CampaignApiItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CampaignApiItem {
  id: string;
  templateId: string;
  templateName: string;
  dataRowId: string;
  name: string;
  platform: string;
  status: string;
  paused: boolean;
  adCount: number;
  adGroups?: Array<{
    id: string;
    name: string;
    adCount: number;
  }>;
  platformId?: string;
  lastSyncedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

interface TemplateOption {
  id: string;
  name: string;
}

interface TemplatesResponse {
  data: Array<{ id: string; name: string; [key: string]: unknown }>;
}

/**
 * Transform API response dates to Date objects
 */
function transformCampaign(campaign: CampaignApiItem): GeneratedCampaign {
  return {
    ...campaign,
    platform: campaign.platform as Platform,
    status: campaign.status as GeneratedCampaign["status"],
    createdAt: new Date(campaign.createdAt),
    lastSyncedAt: campaign.lastSyncedAt
      ? new Date(campaign.lastSyncedAt)
      : undefined,
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<GeneratedCampaign[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<CampaignFiltersType>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | undefined> = {};
      if (filters.status && filters.status.length > 0) {
        params.status = filters.status.join(",");
      }
      if (filters.platform) {
        params.platform = filters.platform;
      }
      if (filters.templateId) {
        params.templateId = filters.templateId;
      }
      if (filters.dateRange?.start) {
        params.startDate = filters.dateRange.start.toISOString();
      }
      if (filters.dateRange?.end) {
        params.endDate = filters.dateRange.end.toISOString();
      }

      const queryString = buildQueryString(params);
      const response = await api.get<CampaignsResponse>(
        `/api/v1/campaigns${queryString}`
      );
      setCampaigns(response.data.map(transformCampaign));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get<TemplatesResponse>("/api/v1/templates");
      setTemplates(
        response.data.map((t) => ({
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

  const handleSyncSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsSyncing(true);
      setSyncingIds(selectedIds);

      await api.post("/api/v1/campaigns/sync", { ids: selectedIds });

      setSelectedIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync campaigns");
    } finally {
      setIsSyncing(false);
      setSyncingIds([]);
    }
  };

  const handleSyncAllPending = async () => {
    const pendingIds = campaigns
      .filter((c) => c.status === "pending_sync")
      .map((c) => c.id);

    if (pendingIds.length === 0) return;

    try {
      setIsSyncing(true);
      setSyncingIds(pendingIds);

      await api.post("/api/v1/campaigns/sync", { ids: pendingIds });

      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync campaigns");
    } finally {
      setIsSyncing(false);
      setSyncingIds([]);
    }
  };

  const handleSyncSingle = async (id: string) => {
    try {
      setSyncingIds([id]);

      await api.post(`/api/v1/campaigns/${id}/sync`);

      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync campaign");
    } finally {
      setSyncingIds([]);
    }
  };

  const handlePauseSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.post("/api/v1/campaigns/pause", { ids: selectedIds });
      setSelectedIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause campaigns");
    }
  };

  const handleResumeSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.post("/api/v1/campaigns/resume", { ids: selectedIds });
      setSelectedIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume campaigns");
    }
  };

  const handlePauseSingle = async (id: string) => {
    try {
      await api.post(`/api/v1/campaigns/${id}/pause`);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause campaign");
    }
  };

  const handleResumeSingle = async (id: string) => {
    try {
      await api.post(`/api/v1/campaigns/${id}/resume`);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume campaign");
    }
  };

  const handleViewDiff = (id: string) => {
    // TODO: Implement diff view - navigate to diff view or open modal
    void id;
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} campaign(s)?`)) {
      return;
    }

    try {
      // Delete each campaign individually since bulk delete might not be available
      await Promise.all(
        selectedIds.map((id) => api.delete(`/api/v1/campaigns/${id}`))
      );

      setSelectedIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete campaigns");
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) {
      return;
    }

    try {
      await api.delete(`/api/v1/campaigns/${id}`);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete campaign");
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleFiltersChange = (newFilters: CampaignFiltersType) => {
    setFilters(newFilters);
    setSelectedIds([]);
  };

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;

    if (filters.status && filters.status.length > 0) {
      result = result.filter((c) => filters.status!.includes(c.status));
    }

    if (filters.platform) {
      result = result.filter((c) => c.platform === filters.platform);
    }

    if (filters.templateId) {
      result = result.filter((c) => c.templateId === filters.templateId);
    }

    if (filters.dateRange?.start) {
      result = result.filter((c) => new Date(c.createdAt) >= filters.dateRange!.start!);
    }

    if (filters.dateRange?.end) {
      result = result.filter((c) => new Date(c.createdAt) <= filters.dateRange!.end!);
    }

    return result;
  }, [campaigns, filters]);

  const statusCounts = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [campaigns]);

  const pendingCount = statusCounts.pending_sync || 0;

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
        pendingCount={pendingCount}
        onSync={handleSyncSelected}
        onSyncAllPending={handleSyncAllPending}
        onPause={handlePauseSelected}
        onResume={handleResumeSelected}
        onDelete={handleDeleteSelected}
        onClearSelection={handleClearSelection}
        isSyncing={isSyncing}
      />

      <CampaignsTable
        campaigns={filteredCampaigns}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSync={handleSyncSingle}
        onPause={handlePauseSingle}
        onResume={handleResumeSingle}
        onViewDiff={handleViewDiff}
        onDelete={handleDeleteSingle}
        syncingIds={syncingIds}
      />
    </div>
  );
}
