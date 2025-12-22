"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { GeneratedCampaign } from "../types";
import styles from "./CampaignRowActions.module.css";

interface CampaignRowActionsProps {
  campaign: GeneratedCampaign;
  onSync: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onViewDiff: (id: string) => void;
  onDelete: (id: string) => void;
  isSyncing?: boolean;
}

export function CampaignRowActions({
  campaign,
  onSync,
  onPause,
  onResume,
  onViewDiff,
  onDelete,
  isSyncing = false,
}: CampaignRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const canSync = campaign.status === "draft" || campaign.status === "pending_sync" || campaign.status === "sync_error";
  const canPause = campaign.status === "synced" && !campaign.paused;
  const canResume = campaign.status === "synced" && campaign.paused;
  const canViewDiff = campaign.status !== "draft";

  return (
    <div className={styles.container}>
      <Link
        href={`/campaigns/${campaign.id}`}
        className={styles.viewButton}
        aria-label={`View ${campaign.name}`}
      >
        View
      </Link>

      <button
        ref={buttonRef}
        type="button"
        className={styles.menuButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Campaign actions"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {isOpen && (
        <div ref={menuRef} className={styles.menu} role="menu">
          {canSync && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleAction(() => onSync(campaign.id))}
              disabled={isSyncing}
              role="menuitem"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M12 4L14 2M14 2V5M14 2H11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          )}

          {canViewDiff && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleAction(() => onViewDiff(campaign.id))}
              role="menuitem"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 4H12M4 8H12M4 12H8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M11 11L13 13M13 11L11 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              View Diff
            </button>
          )}

          {canPause && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleAction(() => onPause(campaign.id))}
              role="menuitem"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="4" y="3" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="3" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Pause
            </button>
          )}

          {canResume && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleAction(() => onResume(campaign.id))}
              role="menuitem"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M5 3L13 8L5 13V3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Resume
            </button>
          )}

          <div className={styles.divider} />

          <button
            type="button"
            className={`${styles.menuItem} ${styles.danger}`}
            onClick={() => handleAction(() => onDelete(campaign.id))}
            role="menuitem"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2 4H14M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
