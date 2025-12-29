"use client";

import { useState, useCallback } from "react";
import type { FolderTreeNode } from "../types";
import styles from "./FolderSidebar.module.css";

interface FolderSidebarProps {
  /** Tree-structured folders */
  folders: FolderTreeNode[];
  /** Currently selected folder ID (null = All Assets) */
  selectedFolderId: string | null;
  /** Callback when folder is selected */
  onSelectFolder: (folderId: string | null) => void;
  /** Callback to create a new folder */
  onCreateFolder: () => void;
  /** Loading state */
  loading?: boolean;
}

/**
 * FolderSidebar Component
 *
 * Displays a tree view of asset folders with expand/collapse functionality.
 * Includes "All Assets" option at the top and a new folder button.
 */
export function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  loading = false,
}: FolderSidebarProps) {
  // Track expanded folders
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  /**
   * Toggle folder expansion
   */
  const toggleExpanded = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  /**
   * Render a folder item and its children recursively
   */
  const renderFolder = (folder: FolderTreeNode, level: number = 0) => {
    const hasChildren = folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = selectedFolderId === folder.id;
    const indent = level * 16 + 8;

    return (
      <div key={folder.id}>
        <div className={styles.folderItem} style={{ paddingLeft: indent }}>
          <button
            type="button"
            className={`${styles.expandButton} ${isExpanded ? styles.expanded : ""} ${!hasChildren ? styles.hidden : ""}`}
            onClick={() => toggleExpanded(folder.id)}
            aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
            aria-expanded={hasChildren ? isExpanded : undefined}
            tabIndex={hasChildren ? 0 : -1}
          >
            <ChevronIcon />
          </button>

          <button
            type="button"
            className={`${styles.folderButton} ${isActive ? styles.active : ""}`}
            onClick={() => onSelectFolder(folder.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <FolderIcon className={styles.folderIcon} />
            <span className={styles.folderName}>{folder.name}</span>
            {folder.assetCount !== undefined && folder.assetCount > 0 && (
              <span className={styles.assetCount}>{folder.assetCount}</span>
            )}
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className={styles.children}>
            {folder.children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={styles.sidebar} role="navigation" aria-label="Folder navigation">
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Folders</h2>
        <button
          type="button"
          className={styles.newFolderButton}
          onClick={onCreateFolder}
          aria-label="Create new folder"
          title="Create new folder"
        >
          <PlusIcon />
        </button>
      </div>

      <div className={styles.folderList}>
        {/* All Assets option */}
        <button
          type="button"
          className={`${styles.allAssets} ${selectedFolderId === null ? styles.active : ""}`}
          onClick={() => onSelectFolder(null)}
          aria-current={selectedFolderId === null ? "page" : undefined}
        >
          <AllAssetsIcon className={styles.allAssetsIcon} />
          <span>All Assets</span>
        </button>

        <div className={styles.divider} />

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
          </div>
        ) : folders.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No folders yet</p>
          </div>
        ) : (
          folders.map((folder) => renderFolder(folder, 0))
        )}
      </div>
    </aside>
  );
}

// Icon components
function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 2.5L7.5 6L4.5 9.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M7 2V12M2 7H12" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 13H2V4H6L7.5 6H14V13Z" />
      <path d="M2 4V3H6L7.5 4" />
    </svg>
  );
}

function AllAssetsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="6" height="6" rx="1" />
      <rect x="10" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="10" width="6" height="6" rx="1" />
      <rect x="10" y="10" width="6" height="6" rx="1" />
    </svg>
  );
}
