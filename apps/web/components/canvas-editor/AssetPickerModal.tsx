'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Search, FolderOpen, ImageIcon, Loader2 } from 'lucide-react';
import { useAssets } from '@/lib/hooks/useAssets';
import { useAssetFolders } from '@/lib/hooks/useAssetFolders';
import styles from './AssetPickerModal.module.css';

/**
 * Selected asset data passed to onSelect callback
 */
export interface SelectedAsset {
  /** Asset download URL */
  url: string;
  /** Asset name */
  name: string;
  /** Asset width in pixels */
  width?: number;
  /** Asset height in pixels */
  height?: number;
}

/**
 * AssetPickerModal Props
 */
export interface AssetPickerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when an asset is selected */
  onSelect: (asset: SelectedAsset) => void;
  /** Team ID for fetching assets */
  teamId: string;
}

/**
 * AssetPickerModal - Modal for selecting images from the asset library
 *
 * Features:
 * - Browse assets by folder
 * - Search assets by name
 * - Thumbnail grid view
 * - Click to select and insert into canvas
 * - Keyboard accessible (Escape to close)
 *
 * @example
 * ```tsx
 * <AssetPickerModal
 *   isOpen={showPicker}
 *   onClose={() => setShowPicker(false)}
 *   onSelect={(asset) => addImageToCanvas(asset.url)}
 *   teamId={currentTeam.id}
 * />
 * ```
 */
export function AssetPickerModal({
  isOpen,
  onClose,
  onSelect,
  teamId,
}: AssetPickerModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Asset and folder hooks
  const {
    assets,
    loading: assetsLoading,
    fetchAssets,
  } = useAssets(teamId);

  const {
    folders,
    loading: foldersLoading,
    fetchFolders,
  } = useAssetFolders(teamId);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data when modal opens or filters change
  useEffect(() => {
    if (!isOpen) return;

    fetchAssets({
      folderId: selectedFolderId,
      search: debouncedSearch || undefined,
      type: 'IMAGE',
    });
  }, [isOpen, selectedFolderId, debouncedSearch, fetchAssets]);

  // Fetch folders when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchFolders({ includeAssetCounts: true });
  }, [isOpen, fetchFolders]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle asset selection
  const handleAssetClick = useCallback(
    (asset: (typeof assets)[0]) => {
      // Check if asset has downloadUrl (AssetWithUrl type) or fallback to empty
      const url = 'downloadUrl' in asset && asset.downloadUrl
        ? (asset as { downloadUrl: string }).downloadUrl
        : '';

      onSelect({
        url,
        name: asset.name,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
      });
      onClose();
    },
    [onSelect, onClose]
  );

  // Handle folder selection
  const handleFolderClick = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
  }, []);

  // Handle overlay click to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const isLoading = assetsLoading || foldersLoading;

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      data-testid="modal-overlay"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-label="Select image from asset library"
        aria-modal="true"
        data-testid="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className={styles.header}>
          <h2 className={styles.title}>Select Image</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <div className={styles.content}>
          {/* Sidebar - Folder List */}
          <aside className={styles.sidebar}>
            <div className={styles.folderList}>
              <button
                type="button"
                className={`${styles.folderButton} ${selectedFolderId === null ? styles.active : ''}`}
                onClick={() => handleFolderClick(null)}
                aria-pressed={selectedFolderId === null}
              >
                <ImageIcon size={16} />
                <span>All Assets</span>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={`${styles.folderButton} ${selectedFolderId === folder.id ? styles.active : ''}`}
                  onClick={() => handleFolderClick(folder.id)}
                  aria-pressed={selectedFolderId === folder.id}
                >
                  <FolderOpen size={16} />
                  <span>{folder.name}</span>
                  {folder.assetCount !== undefined && (
                    <span className={styles.assetCount}>{folder.assetCount}</span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Main Content - Search and Grid */}
          <main className={styles.main}>
            {/* Search Bar */}
            <div className={styles.searchBar}>
              <Search size={18} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className={styles.loading}>
                <Loader2 size={24} className={styles.spinner} />
                <span>Loading...</span>
              </div>
            )}

            {/* Asset Grid */}
            {!isLoading && (
              <div className={styles.assetGrid}>
                {assets.map((asset) => {
                  // Get thumbnail or download URL if available
                  const assetWithUrl = asset as typeof asset & { thumbnailUrl?: string; downloadUrl?: string };
                  const imageSrc = assetWithUrl.thumbnailUrl || assetWithUrl.downloadUrl || '';

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className={styles.assetCard}
                      onClick={() => handleAssetClick(asset)}
                      aria-label={asset.name}
                    >
                      <div className={styles.thumbnailContainer}>
                        <img
                          src={imageSrc}
                          alt={asset.name}
                          className={styles.thumbnail}
                          loading="lazy"
                        />
                      </div>
                      <span className={styles.assetName}>{asset.name}</span>
                    </button>
                  );
                })}
                {assets.length === 0 && (
                  <div className={styles.empty}>
                    <ImageIcon size={48} strokeWidth={1} />
                    <p>No images found</p>
                    {searchQuery && (
                      <p className={styles.emptyHint}>
                        Try a different search term
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default AssetPickerModal;
