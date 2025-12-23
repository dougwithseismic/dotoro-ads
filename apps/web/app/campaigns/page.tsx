"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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
  templateName?: string;
  dataRowId: string;
  campaignData: {
    name: string;
    budget?: {
      type: string;
      amount: number;
      currency: string;
    };
    adGroups?: Array<{
      name: string;
      ads: Array<{
        headline: string;
        description: string;
      }>;
    }>;
    objective?: string;
  };
  platform?: string;
  status: string;
  platformId?: string;
  lastSyncedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateOption {
  id: string;
  name: string;
}

interface TemplatesResponse {
  data: Array<{ id: string; name: string; [key: string]: unknown }>;
}

/**
 * Map API status to frontend status
 */
function mapStatus(apiStatus: string): GeneratedCampaign["status"] {
  switch (apiStatus) {
    case "active":
    case "synced":
      return "synced";
    case "pending":
    case "pending_sync":
      return "pending_sync";
    case "error":
    case "sync_error":
      return "sync_error";
    case "draft":
    default:
      return "draft";
  }
}

/**
 * Calculate total ad count from ad groups
 */
function calculateAdCount(adGroups?: CampaignApiItem["campaignData"]["adGroups"]): number {
  if (!adGroups || adGroups.length === 0) return 0;
  return adGroups.reduce((total, group) => total + (group.ads?.length || 0), 0);
}

/**
 * Transform API ad groups to frontend format
 */
function transformAdGroups(adGroups?: CampaignApiItem["campaignData"]["adGroups"]): GeneratedCampaign["adGroups"] {
  if (!adGroups) return undefined;
  return adGroups.map((group, index) => ({
    id: `ag-${index}`,
    name: group.name,
    adCount: group.ads?.length || 0,
  }));
}

/**
 * Transform API response to frontend format
 */
function transformCampaign(
  campaign: CampaignApiItem,
  templateMap: Map<string, string>
): GeneratedCampaign {
  const adGroups = campaign.campaignData?.adGroups;

  return {
    id: campaign.id,
    templateId: campaign.templateId,
    templateName: templateMap.get(campaign.templateId) || campaign.templateName || "Unknown Template",
    dataRowId: campaign.dataRowId,
    name: campaign.campaignData?.name || "Untitled Campaign",
    platform: (campaign.platform as Platform) || "google",
    status: mapStatus(campaign.status),
    paused: campaign.status === "paused",
    adCount: calculateAdCount(adGroups),
    adGroups: transformAdGroups(adGroups),
    platformId: campaign.platformId,
    lastSyncedAt: campaign.lastSyncedAt ? new Date(campaign.lastSyncedAt) : undefined,
    errorMessage: campaign.errorMessage,
    createdAt: new Date(campaign.createdAt),
  };
}

export default function CampaignsPage() {
  const [rawCampaigns, setRawCampaigns] = useState<CampaignApiItem[]>([]);
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
      setRawCampaigns(response.data);
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

  // Create template lookup map
  const templateMap = useMemo(() => {
    return new Map(templates.map((t) => [t.id, t.name]));
  }, [templates]);

  // Transform raw campaigns with template names
  const campaigns = useMemo(() => {
    return rawCampaigns.map((c) => transformCampaign(c, templateMap));
  }, [rawCampaigns, templateMap]);

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
        <div className={styles.headerActions}>
          <Link href="/campaigns/generate" className={styles.generateButton}>
            + Generate Campaigns
          </Link>
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
