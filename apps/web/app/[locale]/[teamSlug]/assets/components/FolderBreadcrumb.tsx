"use client";

import { useCallback } from "react";
import type { AssetFolder } from "../types";
import styles from "./FolderBreadcrumb.module.css";

interface FolderBreadcrumbProps {
  /** List of ancestor folders (from root to current parent) */
  ancestors: AssetFolder[];
  /** Current folder (optional - if viewing a folder) */
  currentFolder?: AssetFolder | null;
  /** Callback when a breadcrumb item is clicked */
  onNavigate: (folderId: string | null) => void;
  /** Whether to show "All Assets" as the root */
  showRoot?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * FolderBreadcrumb Component
 *
 * Displays the current folder path with clickable ancestors for navigation.
 */
export function FolderBreadcrumb({
  ancestors,
  currentFolder,
  onNavigate,
  showRoot = true,
  className = "",
}: FolderBreadcrumbProps) {
  const handleNavigate = useCallback(
    (folderId: string | null) => {
      onNavigate(folderId);
    },
    [onNavigate]
  );

  // Don't render if we're at root and not showing the root
  if (!showRoot && ancestors.length === 0 && !currentFolder) {
    return null;
  }

  return (
    <nav
      className={`${styles.container} ${className}`}
      aria-label="Folder navigation"
    >
      <ol className={styles.breadcrumbList}>
        {/* Root: All Assets */}
        {showRoot && (
          <li className={styles.item}>
            {ancestors.length > 0 || currentFolder ? (
              <button
                type="button"
                className={styles.link}
                onClick={() => handleNavigate(null)}
              >
                <HomeIcon className={styles.homeIcon} />
                <span>All Assets</span>
              </button>
            ) : (
              <span className={styles.current}>
                <HomeIcon className={styles.homeIcon} />
                <span>All Assets</span>
              </span>
            )}
          </li>
        )}

        {/* Ancestor folders */}
        {ancestors.map((folder) => (
          <li key={folder.id} className={styles.item}>
            <SeparatorIcon className={styles.separator} />
            <button
              type="button"
              className={styles.link}
              onClick={() => handleNavigate(folder.id)}
              title={folder.name}
            >
              {folder.name}
            </button>
          </li>
        ))}

        {/* Current folder */}
        {currentFolder && (
          <li className={styles.item}>
            <SeparatorIcon className={styles.separator} />
            <span className={styles.current} title={currentFolder.name}>
              {currentFolder.name}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

// Icon components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 7.5L7 2L13 7.5" />
      <path d="M3 6V12H6V9H8V12H11V6" />
    </svg>
  );
}

function SeparatorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M4 2L8 6L4 10" />
    </svg>
  );
}
