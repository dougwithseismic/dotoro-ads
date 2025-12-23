"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import styles from "./CampaignDetail.module.css";

interface CampaignDetail {
  id: string;
  userId: string;
  templateId: string;
  dataRowId: string;
  campaignData: {
    name: string;
    objective?: string;
    budget?: {
      type: "daily" | "lifetime";
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
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
    case "synced":
      return "Synced";
    case "pending":
    case "pending_sync":
      return "Pending Sync";
    case "error":
    case "sync_error":
      return "Sync Error";
    case "draft":
    default:
      return "Draft";
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<CampaignDetail>(`/api/v1/campaigns/${id}`);
      setCampaign(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Campaign not found");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const handleSync = async () => {
    if (!campaign) return;
    try {
      setSyncing(true);
      await api.post(`/api/v1/campaigns/${id}/sync`, { platform: "google" });
      await fetchCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync campaign");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    try {
      setDeleting(true);
      await api.delete(`/api/v1/campaigns/${id}`);
      router.push("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete campaign");
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading campaign...</span>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={fetchCampaign} className={styles.retryButton}>
              Try Again
            </button>
            <Link href="/campaigns" className={styles.backLink}>
              Back to Campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const adGroups = campaign.campaignData?.adGroups || [];
  const totalAds = adGroups.reduce((sum, group) => sum + (group.ads?.length || 0), 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/campaigns" className={styles.breadcrumbLink}>
            Campaigns
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>
            {campaign.campaignData?.name || "Untitled Campaign"}
          </span>
        </div>

        <div className={styles.headerMain}>
          <div className={styles.headerContent}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>
                {campaign.campaignData?.name || "Untitled Campaign"}
              </h1>
            </div>
            <div className={styles.meta}>
              <span className={`${styles.statusBadge} ${styles[campaign.status]}`}>
                {getStatusLabel(campaign.status)}
              </span>
              {campaign.campaignData?.objective && (
                <span className={styles.metaItem}>
                  {campaign.campaignData.objective}
                </span>
              )}
              <span className={styles.metaItem}>
                Created {formatDate(campaign.createdAt)}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={styles.syncButton}
            >
              {syncing ? "Syncing..." : "Sync to Platform"}
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className={styles.deleteButton}
              aria-label="Delete campaign"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.inlineError} role="alert">
          {error}
          <button
            onClick={() => setError(null)}
            className={styles.dismissError}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      <div className={styles.content}>
        {/* Budget Section */}
        {campaign.campaignData?.budget && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Budget</h2>
            <div className={styles.budgetCard}>
              <div className={styles.budgetAmount}>
                {campaign.campaignData.budget.currency}{" "}
                {campaign.campaignData.budget.amount.toLocaleString()}
              </div>
              <div className={styles.budgetType}>
                {campaign.campaignData.budget.type === "daily" ? "Daily" : "Lifetime"} Budget
              </div>
            </div>
          </section>
        )}

        {/* Ad Groups Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Ad Groups ({adGroups.length}) &middot; {totalAds} Ads
          </h2>
          {adGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No ad groups configured yet.</p>
            </div>
          ) : (
            <div className={styles.adGroupsGrid}>
              {adGroups.map((group, groupIndex) => (
                <div key={groupIndex} className={styles.adGroupCard}>
                  <h3 className={styles.adGroupName}>{group.name}</h3>
                  <div className={styles.adCount}>{group.ads?.length || 0} ads</div>
                  {group.ads && group.ads.length > 0 && (
                    <div className={styles.adsList}>
                      {group.ads.slice(0, 3).map((ad, adIndex) => (
                        <div key={adIndex} className={styles.adPreview}>
                          <div className={styles.adHeadline}>{ad.headline}</div>
                          <div className={styles.adDescription}>{ad.description}</div>
                        </div>
                      ))}
                      {group.ads.length > 3 && (
                        <div className={styles.moreAds}>
                          +{group.ads.length - 3} more ads
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Metadata Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <dl className={styles.detailsList}>
            <div className={styles.detailItem}>
              <dt>Campaign ID</dt>
              <dd className={styles.mono}>{campaign.id}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Template ID</dt>
              <dd className={styles.mono}>{campaign.templateId}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Data Row ID</dt>
              <dd className={styles.mono}>{campaign.dataRowId}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Last Updated</dt>
              <dd>{formatDate(campaign.updatedAt)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className={styles.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className={styles.dialogTitle}>
              Delete Campaign
            </h2>
            <p className={styles.dialogMessage}>
              Are you sure you want to delete &quot;{campaign.campaignData?.name}&quot;? This action cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className={styles.cancelButton}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className={styles.confirmDeleteButton}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
