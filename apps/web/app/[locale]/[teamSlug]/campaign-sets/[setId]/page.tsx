"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { useApi } from "@/lib/hooks/useApi";
import { TeamLink } from "@/components/ui/TeamLink";
import { useTeamNavigation, TEAM_ROUTES } from "@/lib/navigation";
import {
  CampaignSetHeader,
  CampaignHierarchyView,
  SyncPreviewModal,
  BypassConfirmDialog,
} from "../components";
import { useSyncPreview } from "../hooks";
import type {
  CampaignSet,
  SyncResponse,
  PauseResponse,
  ResumeResponse,
} from "../types";
import styles from "./CampaignSetDetail.module.css";

/**
 * Campaign Set Detail Page
 *
 * Shows detailed view of a single campaign set including its hierarchy.
 */
export default function CampaignSetDetailPage() {
  const params = useParams();
  const { navigateTo } = useTeamNavigation();
  const setId = params.setId as string;
  const api = useApi();

  // State
  const [campaignSet, setCampaignSet] = useState<CampaignSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync preview hook
  const {
    isOpen: isPreviewOpen,
    preview,
    isLoading: isPreviewLoading,
    error: previewError,
    isBypassDialogOpen,
    openPreview,
    closePreview,
    revalidate,
    openBypassDialog,
    closeBypassDialog,
  } = useSyncPreview();

  /**
   * Fetch campaign set details
   * @param showLoading - Whether to show full-page loading state (default: true for initial load)
   */
  const fetchCampaignSet = useCallback(async (showLoading = true) => {
    if (!api.isReady) return;
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const data = await api.get<CampaignSet>(`/api/v1/campaign-sets/${setId}`);
      setCampaignSet(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Campaign set not found");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [setId, api]);

  useEffect(() => {
    fetchCampaignSet();
  }, [fetchCampaignSet]);

  /**
   * Handle sync button click - opens preview modal first
   */
  const handleSyncClick = async () => {
    if (!campaignSet || isSyncing || !api.isReady) return;
    await openPreview(setId);
  };

  /**
   * Handle actual sync after preview confirmation
   */
  const handleSync = async () => {
    if (!campaignSet || isSyncing || !api.isReady) return;

    closePreview();

    try {
      setIsSyncing(true);
      setActionError(null);
      await api.post<SyncResponse>(`/api/v1/campaign-sets/${setId}/sync`);
      // Refetch without showing full-page loading spinner
      await fetchCampaignSet(false);
    } catch (err) {
      // Extract detailed error message from API response
      if (err instanceof ApiError) {
        setActionError(`Sync failed: ${err.message}`);
      } else {
        setActionError(
          err instanceof Error ? err.message : "Failed to sync campaigns"
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Handle sync with bypass (sync despite validation errors)
   */
  const handleBypassSync = async () => {
    closeBypassDialog();
    await handleSync();
  };

  /**
   * Handle pause all campaigns
   */
  const handlePause = async () => {
    if (!campaignSet || !api.isReady) return;

    try {
      setActionError(null);
      await api.post<PauseResponse>(`/api/v1/campaign-sets/${setId}/pause`);
      // Refetch without showing full-page loading spinner
      await fetchCampaignSet(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(`Pause failed: ${err.message}`);
      } else {
        setActionError(
          err instanceof Error ? err.message : "Failed to pause campaigns"
        );
      }
    }
  };

  /**
   * Handle resume all campaigns
   */
  const handleResume = async () => {
    if (!campaignSet || !api.isReady) return;

    try {
      setActionError(null);
      await api.post<ResumeResponse>(`/api/v1/campaign-sets/${setId}/resume`);
      // Refetch without showing full-page loading spinner
      await fetchCampaignSet(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(`Resume failed: ${err.message}`);
      } else {
        setActionError(
          err instanceof Error ? err.message : "Failed to resume campaigns"
        );
      }
    }
  };

  /**
   * Handle edit navigation
   */
  const handleEdit = () => {
    // Navigate to edit page (could be a modal or separate page)
    navigateTo(TEAM_ROUTES.CAMPAIGN_SET_EDIT(setId));
  };

  /**
   * Handle archive
   */
  const handleArchive = async () => {
    if (!campaignSet || !api.isReady) return;

    const confirmed = window.confirm(
      `Are you sure you want to archive "${campaignSet.name}"? This action can be undone later.`
    );

    if (!confirmed) return;

    try {
      setActionError(null);
      await api.patch(`/api/v1/campaign-sets/${setId}`, { status: "archived" });
      navigateTo(TEAM_ROUTES.CAMPAIGN_SETS);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(`Archive failed: ${err.message}`);
      } else {
        setActionError(
          err instanceof Error ? err.message : "Failed to archive campaign set"
        );
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading campaign set...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !campaignSet) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={() => fetchCampaignSet()} className={styles.retryButton}>
              Try Again
            </button>
            <TeamLink href={TEAM_ROUTES.CAMPAIGN_SETS} className={styles.backLink}>
              Back to Campaign Sets
            </TeamLink>
          </div>
        </div>
      </div>
    );
  }

  if (!campaignSet) {
    return null;
  }

  // Calculate summary stats
  const totalCampaigns = campaignSet.campaigns.length;
  const totalAdGroups = campaignSet.campaigns.reduce(
    (acc, c) => acc + c.adGroups.length,
    0
  );
  const totalAds = campaignSet.campaigns.reduce(
    (acc, c) =>
      acc + c.adGroups.reduce((agAcc, ag) => agAcc + ag.ads.length, 0),
    0
  );
  const totalKeywords = campaignSet.campaigns.reduce(
    (acc, c) =>
      acc + c.adGroups.reduce((agAcc, ag) => agAcc + ag.keywords.length, 0),
    0
  );

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <TeamLink href={TEAM_ROUTES.CAMPAIGN_SETS} className={styles.breadcrumbLink}>
          Campaign Sets
        </TeamLink>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{campaignSet.name}</span>
      </nav>

      {/* Header */}
      <CampaignSetHeader
        set={campaignSet}
        onSync={handleSyncClick}
        onPause={handlePause}
        onResume={handleResume}
        onEdit={handleEdit}
        onArchive={handleArchive}
        isSyncing={isSyncing}
      />

      {/* Action error */}
      {actionError && (
        <div className={styles.actionError} role="alert">
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className={styles.dismissError}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <section className={styles.summarySection}>
        <h2 className={styles.sectionTitle}>Summary</h2>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>
              {totalCampaigns.toLocaleString()}
            </span>
            <span className={styles.summaryLabel}>Campaigns</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>
              {totalAdGroups.toLocaleString()}
            </span>
            <span className={styles.summaryLabel}>Ad Groups</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>
              {totalAds.toLocaleString()}
            </span>
            <span className={styles.summaryLabel}>Ads</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>
              {totalKeywords.toLocaleString()}
            </span>
            <span className={styles.summaryLabel}>Keywords</span>
          </div>
        </div>
      </section>

      {/* Configuration Overview */}
      <section className={styles.configSection}>
        <h2 className={styles.sectionTitle}>Configuration</h2>
        <div className={styles.configGrid}>
          <div className={styles.configItem}>
            <span className={styles.configLabel}>Data Source</span>
            <span className={styles.configValue}>
              {campaignSet.dataSourceId ? (
                <TeamLink
                  href={TEAM_ROUTES.DATA_SOURCE_DETAIL(campaignSet.dataSourceId)}
                  className={styles.configLink}
                >
                  View Data Source
                </TeamLink>
              ) : (
                "Not specified"
              )}
            </span>
          </div>
          <div className={styles.configItem}>
            <span className={styles.configLabel}>Platforms</span>
            <span className={styles.configValue}>
              {campaignSet.config.selectedPlatforms.join(", ") || "None"}
            </span>
          </div>
          <div className={styles.configItem}>
            <span className={styles.configLabel}>Rows Processed</span>
            <span className={styles.configValue}>
              {campaignSet.config.rowCount.toLocaleString()}
            </span>
          </div>
          <div className={styles.configItem}>
            <span className={styles.configLabel}>Created</span>
            <span className={styles.configValue}>
              {new Date(campaignSet.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </section>

      {/* Campaign Hierarchy */}
      <section className={styles.hierarchySection}>
        <h2 className={styles.sectionTitle}>Campaign Hierarchy</h2>
        <CampaignHierarchyView campaigns={campaignSet.campaigns} />
      </section>

      {/* Sync Preview Modal */}
      <SyncPreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        campaignSet={campaignSet}
        preview={preview}
        isLoading={isPreviewLoading}
        error={previewError}
        onSync={handleSync}
        onBypass={openBypassDialog}
        onRevalidate={revalidate}
      />

      {/* Bypass Confirmation Dialog */}
      <BypassConfirmDialog
        isOpen={isBypassDialogOpen}
        onClose={closeBypassDialog}
        onConfirm={handleBypassSync}
        skippedCount={preview?.breakdown.skipped ?? 0}
        totalCount={preview?.totalAds ?? 0}
      />
    </div>
  );
}
