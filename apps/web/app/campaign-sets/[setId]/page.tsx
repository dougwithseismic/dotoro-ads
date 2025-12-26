"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import {
  CampaignSetHeader,
  CampaignHierarchyView,
} from "../components";
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
  const router = useRouter();
  const setId = params.setId as string;

  // State
  const [campaignSet, setCampaignSet] = useState<CampaignSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Fetch campaign set details
   */
  const fetchCampaignSet = useCallback(async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    fetchCampaignSet();
  }, [fetchCampaignSet]);

  /**
   * Handle sync all campaigns
   */
  const handleSync = async () => {
    if (!campaignSet || isSyncing) return;

    try {
      setIsSyncing(true);
      setActionError(null);
      await api.post<SyncResponse>(`/api/v1/campaign-sets/${setId}/sync`);
      await fetchCampaignSet();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to sync campaigns"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Handle pause all campaigns
   */
  const handlePause = async () => {
    if (!campaignSet) return;

    try {
      setActionError(null);
      await api.post<PauseResponse>(`/api/v1/campaign-sets/${setId}/pause`);
      await fetchCampaignSet();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to pause campaigns"
      );
    }
  };

  /**
   * Handle resume all campaigns
   */
  const handleResume = async () => {
    if (!campaignSet) return;

    try {
      setActionError(null);
      await api.post<ResumeResponse>(`/api/v1/campaign-sets/${setId}/resume`);
      await fetchCampaignSet();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to resume campaigns"
      );
    }
  };

  /**
   * Handle edit navigation
   */
  const handleEdit = () => {
    // Navigate to edit page (could be a modal or separate page)
    router.push(`/campaign-sets/${setId}/edit`);
  };

  /**
   * Handle archive
   */
  const handleArchive = async () => {
    if (!campaignSet) return;

    const confirmed = window.confirm(
      `Are you sure you want to archive "${campaignSet.name}"? This action can be undone later.`
    );

    if (!confirmed) return;

    try {
      setActionError(null);
      await api.patch(`/api/v1/campaign-sets/${setId}`, { status: "archived" });
      router.push("/campaign-sets");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to archive campaign set"
      );
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
            <button onClick={fetchCampaignSet} className={styles.retryButton}>
              Try Again
            </button>
            <Link href="/campaign-sets" className={styles.backLink}>
              Back to Campaign Sets
            </Link>
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
        <Link href="/campaign-sets" className={styles.breadcrumbLink}>
          Campaign Sets
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{campaignSet.name}</span>
      </nav>

      {/* Header */}
      <CampaignSetHeader
        set={campaignSet}
        onSync={handleSync}
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
                <Link
                  href={`/data-sources/${campaignSet.dataSourceId}`}
                  className={styles.configLink}
                >
                  View Data Source
                </Link>
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
    </div>
  );
}
