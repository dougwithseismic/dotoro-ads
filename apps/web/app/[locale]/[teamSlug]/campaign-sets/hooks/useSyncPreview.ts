"use client";

import { useState, useCallback } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { ApiError } from "@/lib/api-client";
import type { SyncPreviewResponse } from "../types";

/**
 * State for sync preview flow
 */
interface SyncPreviewState {
  /** Whether the preview modal is open */
  isOpen: boolean;
  /** The preview data from the API */
  preview: SyncPreviewResponse | null;
  /** Whether the preview is loading */
  isLoading: boolean;
  /** Error message if preview failed */
  error: string | null;
  /** Whether the bypass confirmation dialog is open */
  isBypassDialogOpen: boolean;
}

/**
 * Return value for useSyncPreview hook
 */
interface UseSyncPreviewResult extends SyncPreviewState {
  /** Open the preview modal and fetch preview data */
  openPreview: (campaignSetId: string) => Promise<void>;
  /** Close the preview modal */
  closePreview: () => void;
  /** Refresh the preview data */
  revalidate: () => Promise<void>;
  /** Open the bypass confirmation dialog */
  openBypassDialog: () => void;
  /** Close the bypass confirmation dialog */
  closeBypassDialog: () => void;
  /** The campaign set ID being previewed */
  campaignSetId: string | null;
}

/**
 * Hook for managing sync preview state and API interactions
 *
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   preview,
 *   isLoading,
 *   error,
 *   openPreview,
 *   closePreview,
 *   revalidate,
 * } = useSyncPreview();
 *
 * // Open preview when user clicks sync button
 * const handleSyncClick = () => openPreview(campaignSetId);
 * ```
 */
export function useSyncPreview(): UseSyncPreviewResult {
  const api = useApi();
  const [campaignSetId, setCampaignSetId] = useState<string | null>(null);
  const [state, setState] = useState<SyncPreviewState>({
    isOpen: false,
    preview: null,
    isLoading: false,
    error: null,
    isBypassDialogOpen: false,
  });

  /**
   * Fetch preview data from the API
   */
  const fetchPreview = useCallback(async (setId: string): Promise<void> => {
    if (!api.isReady) return;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const preview = await api.post<SyncPreviewResponse>(
        `/api/v1/campaign-sets/${setId}/preview-sync`
      );
      setState((prev) => ({
        ...prev,
        preview,
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load preview";
      setState((prev) => ({
        ...prev,
        error: message,
        isLoading: false,
      }));
    }
  }, [api]);

  /**
   * Open the preview modal and fetch preview data
   */
  const openPreview = useCallback(async (setId: string): Promise<void> => {
    setCampaignSetId(setId);
    setState({
      isOpen: true,
      preview: null,
      isLoading: true,
      error: null,
      isBypassDialogOpen: false,
    });
    await fetchPreview(setId);
  }, [fetchPreview]);

  /**
   * Close the preview modal
   */
  const closePreview = useCallback((): void => {
    setState({
      isOpen: false,
      preview: null,
      isLoading: false,
      error: null,
      isBypassDialogOpen: false,
    });
    setCampaignSetId(null);
  }, []);

  /**
   * Refresh the preview data
   */
  const revalidate = useCallback(async (): Promise<void> => {
    if (!campaignSetId) return;
    await fetchPreview(campaignSetId);
  }, [campaignSetId, fetchPreview]);

  /**
   * Open the bypass confirmation dialog
   */
  const openBypassDialog = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      isBypassDialogOpen: true,
    }));
  }, []);

  /**
   * Close the bypass confirmation dialog
   */
  const closeBypassDialog = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      isBypassDialogOpen: false,
    }));
  }, []);

  return {
    ...state,
    campaignSetId,
    openPreview,
    closePreview,
    revalidate,
    openBypassDialog,
    closeBypassDialog,
  };
}
