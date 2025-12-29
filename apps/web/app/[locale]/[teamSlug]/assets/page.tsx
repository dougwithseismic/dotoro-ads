"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTeam } from "@/lib/teams/context";
import { useAssetFolders } from "@/lib/hooks/useAssetFolders";
import { useAssets } from "@/lib/hooks/useAssets";
import { FolderSidebar, AssetGrid } from "./components";
import type { Asset, AssetFolder } from "./types";
import styles from "./AssetLibrary.module.css";

/**
 * Toast notification state
 */
interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

/**
 * Asset Library Page
 *
 * Main page for managing creative assets organized in folders.
 * Features:
 * - Folder sidebar with tree navigation
 * - Asset grid with thumbnails
 * - Search and filtering
 * - Bulk selection and actions
 */
export default function AssetLibraryPage() {
  const { currentTeam } = useTeam();

  // Folder state
  const {
    folderTree,
    folders,
    loading: foldersLoading,
    error: foldersError,
    fetchFolders,
    createFolder,
    getFolderAncestors,
  } = useAssetFolders(currentTeam?.id);

  // Asset state
  const {
    assets,
    loading: assetsLoading,
    error: assetsError,
    total,
    totalPages,
    currentPage,
    fetchAssets,
    deleteAsset,
    // Note: bulkMoveAssets reserved for future folder selection modal
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bulkMoveAssets: _bulkMoveAssets,
  } = useAssets(currentTeam?.id);

  // Local state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<AssetFolder[]>([]);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  // Refs
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get selected folder details
  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  /**
   * Show toast notification
   */
  const showToast = useCallback((message: string, type: "success" | "error") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Fetch folders on mount
   */
  useEffect(() => {
    if (currentTeam?.id) {
      fetchFolders({ includeAssetCounts: true });
    }
  }, [currentTeam?.id, fetchFolders]);

  /**
   * Fetch assets when folder or search changes
   */
  useEffect(() => {
    if (currentTeam?.id) {
      fetchAssets({
        folderId: selectedFolderId,
        search: searchTerm || undefined,
        page: 1,
        limit: 24,
      });
    }
  }, [currentTeam?.id, selectedFolderId, searchTerm, fetchAssets]);

  /**
   * Update breadcrumbs when folder changes
   */
  useEffect(() => {
    if (selectedFolderId && currentTeam?.id) {
      getFolderAncestors(selectedFolderId)
        .then(setBreadcrumbs)
        .catch(() => setBreadcrumbs([]));
    } else {
      setBreadcrumbs([]);
    }
  }, [selectedFolderId, currentTeam?.id, getFolderAncestors]);

  /**
   * Handle folder selection
   */
  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSearchTerm("");
  }, []);

  /**
   * Handle search change with debounce
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback(
    (page: number) => {
      fetchAssets({
        folderId: selectedFolderId,
        search: searchTerm || undefined,
        page,
        limit: 24,
      });
    },
    [fetchAssets, selectedFolderId, searchTerm]
  );

  /**
   * Handle create folder
   */
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      await createFolder({
        name: newFolderName.trim(),
        parentId: selectedFolderId,
      });
      showToast("Folder created successfully", "success");
      setShowCreateFolderModal(false);
      setNewFolderName("");
      // Refresh folders
      await fetchFolders({ includeAssetCounts: true });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to create folder",
        "error"
      );
    } finally {
      setCreatingFolder(false);
    }
  }, [newFolderName, selectedFolderId, createFolder, fetchFolders, showToast]);

  /**
   * Handle asset click
   */
  const handleAssetClick = useCallback((asset: Asset) => {
    // TODO: Open asset detail modal or navigate to asset page
    console.log("Asset clicked:", asset.id);
  }, []);

  /**
   * Handle quick view
   */
  const handleQuickView = useCallback((asset: Asset) => {
    // TODO: Open quick view modal
    console.log("Quick view:", asset.id);
  }, []);

  /**
   * Handle delete asset
   */
  const handleDeleteAsset = useCallback(
    async (asset: Asset) => {
      if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) {
        return;
      }

      try {
        await deleteAsset(asset.id, asset.accountId);
        showToast("Asset deleted successfully", "success");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to delete asset",
          "error"
        );
      }
    },
    [deleteAsset, showToast]
  );

  /**
   * Handle bulk move
   */
  const handleBulkMove = useCallback(
    async (assetIds: string[]) => {
      // TODO: Open folder selection modal
      console.log("Bulk move:", assetIds);
    },
    []
  );

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = useCallback(
    async (assetIds: string[]) => {
      if (
        !confirm(
          `Delete ${assetIds.length} asset${assetIds.length > 1 ? "s" : ""}? This cannot be undone.`
        )
      ) {
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const id of assetIds) {
        const asset = assets.find((a) => a.id === id);
        if (asset) {
          try {
            await deleteAsset(id, asset.accountId);
            successCount++;
          } catch {
            errorCount++;
          }
        }
      }

      if (errorCount > 0) {
        showToast(
          `Deleted ${successCount} asset${successCount !== 1 ? "s" : ""}, ${errorCount} failed`,
          "error"
        );
      } else {
        showToast(
          `Deleted ${successCount} asset${successCount !== 1 ? "s" : ""}`,
          "success"
        );
      }
    },
    [assets, deleteAsset, showToast]
  );

  /**
   * Handle upload button click
   */
  const handleUploadClick = useCallback(() => {
    // TODO: Open upload modal/drawer
    console.log("Upload clicked");
  }, []);

  // Loading state
  if (!currentTeam) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading team...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (foldersError || assetsError) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{foldersError || assetsError}</p>
          <button
            onClick={() => {
              fetchFolders({ includeAssetCounts: true });
              fetchAssets({ folderId: selectedFolderId, page: 1, limit: 24 });
            }}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Toast notification */}
      {toast.visible && (
        <div
          className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Asset Library</h1>
            <p className={styles.subtitle}>
              Manage your images, videos, and creative assets
            </p>
          </div>
          <button
            type="button"
            className={styles.uploadButton}
            onClick={handleUploadClick}
          >
            <UploadIcon />
            Upload Assets
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className={styles.content}>
        {/* Folder sidebar */}
        <FolderSidebar
          folders={folderTree}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={() => setShowCreateFolderModal(true)}
          loading={foldersLoading}
        />

        {/* Main area */}
        <div className={styles.mainArea}>
          {/* Breadcrumb */}
          {breadcrumbs.length > 0 && (
            <nav className={styles.breadcrumb} aria-label="Folder navigation">
              <button
                type="button"
                className={styles.breadcrumbLink}
                onClick={() => handleSelectFolder(null)}
              >
                All Assets
              </button>
              {breadcrumbs.map((folder, index) => (
                <span key={folder.id}>
                  <span className={styles.breadcrumbSeparator}>/</span>
                  {index === breadcrumbs.length - 1 ? (
                    <span className={styles.breadcrumbCurrent}>{folder.name}</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.breadcrumbLink}
                      onClick={() => handleSelectFolder(folder.id)}
                    >
                      {folder.name}
                    </button>
                  )}
                </span>
              ))}
              {selectedFolder && !breadcrumbs.find((b) => b.id === selectedFolder.id) && (
                <>
                  <span className={styles.breadcrumbSeparator}>/</span>
                  <span className={styles.breadcrumbCurrent}>{selectedFolder.name}</span>
                </>
              )}
            </nav>
          )}

          {/* Asset grid */}
          <AssetGrid
            assets={assets}
            loading={assetsLoading}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onSearchChange={handleSearchChange}
            onAssetClick={handleAssetClick}
            onQuickView={handleQuickView}
            onDelete={handleDeleteAsset}
            onBulkMove={handleBulkMove}
            onBulkDelete={handleBulkDelete}
            onUpload={handleUploadClick}
            searchValue={searchTerm}
            folderName={selectedFolder?.name}
          />
        </div>
      </div>

      {/* Create folder modal */}
      {showCreateFolderModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowCreateFolderModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-folder-title"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 id="create-folder-title" className={styles.modalTitle}>
              Create New Folder
            </h2>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalSubmit}
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
              >
                {creatingFolder ? "Creating..." : "Create Folder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon component
function UploadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 12V3" />
      <path d="M4 7L8 3L12 7" />
      <path d="M3 14H13" />
    </svg>
  );
}
