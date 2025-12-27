"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { CampaignEditor } from "../../new/components/CampaignEditor";
import type { CampaignSet } from "../../types";
import styles from "./EditCampaignSet.module.css";

interface EditCampaignSetProps {
  /** The campaign set ID passed from the server component */
  setId: string;
}

/**
 * EditCampaignSet - Client component for editing existing campaign sets.
 *
 * Fetches the campaign set data and passes it to CampaignEditor in edit mode.
 * Handles loading states, errors, and navigation.
 */
export function EditCampaignSet({ setId }: EditCampaignSetProps) {
  const router = useRouter();

  // State
  const [campaignSet, setCampaignSet] = useState<CampaignSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
   * Handle save complete - navigate back to detail page
   */
  const handleSaveComplete = useCallback(
    (result: { campaignSetId?: string }) => {
      const targetId = result.campaignSetId ?? setId;
      router.push(`/campaign-sets/${targetId}`);
    },
    [router, setId]
  );

  /**
   * Handle cancel - navigate back to detail page
   */
  const handleCancel = useCallback(() => {
    router.push(`/campaign-sets/${setId}`);
  }, [router, setId]);

  // Loading state
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading campaign set for editing...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !campaignSet) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error ?? "Campaign set not found"}</p>
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

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/campaign-sets" className={styles.breadcrumbLink}>
          Campaign Sets
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link
          href={`/campaign-sets/${setId}`}
          className={styles.breadcrumbLink}
        >
          {campaignSet.name}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>Edit</span>
      </nav>

      {/* Campaign Editor in Edit Mode */}
      <CampaignEditor
        mode="edit"
        campaignSetId={setId}
        initialData={campaignSet}
        onSaveComplete={handleSaveComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
