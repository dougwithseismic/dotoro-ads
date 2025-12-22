"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { GeneratedCampaign, CampaignFilters as CampaignFiltersType, Platform } from "./types";
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

// Mock data for development
const MOCK_CAMPAIGNS: GeneratedCampaign[] = [
  {
    id: "c1",
    templateId: "t1",
    templateName: "Summer Sale Template",
    dataRowId: "d1",
    name: "Summer Sale - Product A",
    platform: "reddit",
    status: "synced",
    paused: false,
    adCount: 12,
    adGroups: [
      { id: "ag1", name: "Interest Targeting", adCount: 6 },
      { id: "ag2", name: "Retargeting", adCount: 6 },
    ],
    platformId: "ext-123",
    lastSyncedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    createdAt: new Date("2024-01-10T09:00:00Z"),
  },
  {
    id: "c2",
    templateId: "t1",
    templateName: "Summer Sale Template",
    dataRowId: "d2",
    name: "Summer Sale - Product B",
    platform: "google",
    status: "pending_sync",
    paused: false,
    adCount: 8,
    adGroups: [
      { id: "ag3", name: "Search Ads", adCount: 4 },
      { id: "ag4", name: "Display Ads", adCount: 4 },
    ],
    createdAt: new Date("2024-01-11T09:00:00Z"),
  },
  {
    id: "c3",
    templateId: "t2",
    templateName: "Winter Campaign",
    dataRowId: "d3",
    name: "Winter Campaign - Region X",
    platform: "facebook",
    status: "sync_error",
    paused: false,
    adCount: 15,
    errorMessage: "API rate limit exceeded. Please wait 5 minutes before retrying.",
    createdAt: new Date("2024-01-12T09:00:00Z"),
  },
  {
    id: "c4",
    templateId: "t2",
    templateName: "Winter Campaign",
    dataRowId: "d4",
    name: "Draft Campaign",
    platform: "reddit",
    status: "draft",
    paused: false,
    adCount: 5,
    createdAt: new Date("2024-01-13T09:00:00Z"),
  },
  {
    id: "c5",
    templateId: "t1",
    templateName: "Summer Sale Template",
    dataRowId: "d5",
    name: "Paused Campaign",
    platform: "google",
    status: "synced",
    paused: true,
    adCount: 10,
    platformId: "ext-456",
    lastSyncedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    createdAt: new Date("2024-01-08T09:00:00Z"),
  },
  {
    id: "c6",
    templateId: "t3",
    templateName: "Holiday Promo",
    dataRowId: "d6",
    name: "Holiday Promo - Midwest",
    platform: "facebook",
    status: "pending_sync",
    paused: false,
    adCount: 20,
    adGroups: [
      { id: "ag5", name: "Lookalike Audience", adCount: 10 },
      { id: "ag6", name: "Custom Audience", adCount: 10 },
    ],
    createdAt: new Date("2024-01-14T09:00:00Z"),
  },
];

const MOCK_TEMPLATES: TemplateOption[] = [
  { id: "t1", name: "Summer Sale Template" },
  { id: "t2", name: "Winter Campaign" },
  { id: "t3", name: "Holiday Promo" },
];

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

      // Use mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay
      setCampaigns(MOCK_CAMPAIGNS);
      setTemplates(MOCK_TEMPLATES);

      /* Real API implementation:
      const params = new URLSearchParams();
      if (filters.status && filters.status.length > 0) {
        params.set("status", filters.status.join(","));
      }
      if (filters.platform) {
        params.set("platform", filters.platform);
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
      */
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    // Using mock data
    /* Real API implementation:
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
    */
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

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      /* Real API implementation:
      const response = await fetch(`${API_BASE}/api/v1/campaigns/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync campaigns");
      }
      */

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

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

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

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSelectedIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause campaigns");
    }
  };

  const handleResumeSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSelectedIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume campaigns");
    }
  };

  const handlePauseSingle = async (id: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause campaign");
    }
  };

  const handleResumeSingle = async (id: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      /* Real API implementation:
      const response = await fetch(`${API_BASE}/api/v1/campaigns`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete campaigns");
      }
      */

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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
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
