import type { AdAccount } from "../types";
import { PLATFORM_COLORS, HEALTH_CONFIG } from "../types";
import { AccountStatus } from "./AccountStatus";
import styles from "./AccountCard.module.css";

interface AccountCardProps {
  account: AdAccount;
  onDisconnect: (id: string) => void;
  onRefresh?: (id: string) => void;
  onReconnect?: (id: string) => void;
  onViewHistory?: (id: string) => void;
}

const PLATFORM_LABELS: Record<AdAccount["platform"], string> = {
  reddit: "Reddit",
  google: "Google",
  facebook: "Meta",
};

function formatLastSynced(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatConnectionDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function HealthIndicator({ status }: { status: AdAccount["healthStatus"] }) {
  const config = HEALTH_CONFIG[status];

  return (
    <span
      className={styles.healthIndicator}
      data-health={status}
      style={{ "--health-color": config.color } as React.CSSProperties}
    >
      {config.icon === "check" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {config.icon === "warning" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 3.5V6.5M6 8.5V8.51"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      {config.icon === "error" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span>{config.label}</span>
    </span>
  );
}

function PlatformIcon({ platform }: { platform: AdAccount["platform"] }) {
  if (platform === "reddit") {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="11" r="1.5" fill="currentColor" />
        <circle cx="15" cy="11" r="1.5" fill="currentColor" />
        <path
          d="M8 15c1.2 1.5 2.4 2 4 2s2.8-.5 4-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (platform === "google") {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21.6 12.24c0-.76-.07-1.48-.19-2.18H12v4.12h5.39a4.6 4.6 0 01-2 3.02v2.51h3.24c1.9-1.74 2.99-4.31 2.99-7.47z"
          fill="currentColor"
        />
        <path
          d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.6A10 10 0 0012 22z"
          fill="currentColor"
        />
        <path
          d="M6.4 13.89a6.01 6.01 0 010-3.78V7.51H3.06a10 10 0 000 8.98l3.34-2.6z"
          fill="currentColor"
        />
        <path
          d="M12 5.99c1.47 0 2.79.5 3.82 1.5l2.87-2.87A10 10 0 003.06 7.51L6.4 10.1c.79-2.36 3-4.12 5.6-4.12z"
          fill="currentColor"
        />
      </svg>
    );
  }

  // Meta (infinity logo)
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.6 12c0-1.8 1-3.4 2.4-4.2-.7-.4-1.6-.6-2.4-.6C3.6 7.2 1.2 9.6 1.2 12s2.4 4.8 5.4 4.8c.8 0 1.7-.2 2.4-.6-1.4-.8-2.4-2.4-2.4-4.2zm10.8 0c0 1.8-1 3.4-2.4 4.2.7.4 1.6.6 2.4.6 3 0 5.4-2.4 5.4-4.8s-2.4-4.8-5.4-4.8c-.8 0-1.7.2-2.4.6 1.4.8 2.4 2.4 2.4 4.2zM12 15.6c-2 0-3.6-1.6-3.6-3.6s1.6-3.6 3.6-3.6 3.6 1.6 3.6 3.6-1.6 3.6-3.6 3.6z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AccountCard({
  account,
  onDisconnect,
  onRefresh,
  onReconnect,
  onViewHistory,
}: AccountCardProps) {
  const {
    id,
    platform,
    accountId,
    accountName,
    email,
    status,
    healthStatus,
    lastSyncedAt,
    createdAt,
    campaignCount,
    errorDetails,
    syncHistory,
  } = account;
  const showReconnect = status === "token_expired" || status === "error";
  const campaignLabel = campaignCount === 1 ? "campaign" : "campaigns";
  const hasSyncHistory = syncHistory && syncHistory.length > 0;

  return (
    <article
      className={styles.card}
      data-platform={platform}
      style={
        {
          "--platform-color": PLATFORM_COLORS[platform],
        } as React.CSSProperties
      }
    >
      <div className={styles.header}>
        <div className={styles.platformIcon}>
          <PlatformIcon platform={platform} />
        </div>
        <div className={styles.info}>
          <span className={styles.platform}>{PLATFORM_LABELS[platform]}</span>
          <h3 className={styles.name}>{accountName}</h3>
          <span className={styles.accountId}>{accountId}</span>
          {email && <span className={styles.email}>{email}</span>}
        </div>
        <div className={styles.statusContainer}>
          <AccountStatus status={status} />
          <HealthIndicator status={healthStatus} />
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Connected</span>
          <span className={styles.detailValue}>{formatConnectionDate(createdAt)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Campaigns</span>
          <span className={styles.detailValue}>{campaignCount} {campaignLabel}</span>
        </div>
        {lastSyncedAt && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Last synced</span>
            <span className={styles.detailValue}>{formatLastSynced(lastSyncedAt)}</span>
          </div>
        )}
      </div>

      {errorDetails && (
        <div className={styles.errorDetails}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 4V7.5M7 9.5V9.51" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{errorDetails}</span>
        </div>
      )}

      <div className={styles.actions}>
        {status === "connected" && onRefresh && (
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => onRefresh(id)}
            aria-label="Refresh account"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.65 2.35A8 8 0 103 8h1.5a6.5 6.5 0 118.15-6.15V1h1.5v3.5H10.5V3h1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Refresh
          </button>
        )}

        {hasSyncHistory && onViewHistory && (
          <button
            type="button"
            className={styles.historyButton}
            onClick={() => onViewHistory(id)}
            aria-label="View history"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            View History
          </button>
        )}

        {showReconnect && onReconnect && (
          <button
            type="button"
            className={styles.reconnectButton}
            onClick={() => onReconnect(id)}
            aria-label="Reconnect account"
          >
            Reconnect
          </button>
        )}

        <button
          type="button"
          className={styles.disconnectButton}
          onClick={() => onDisconnect(id)}
          aria-label="Disconnect account"
        >
          Disconnect
        </button>
      </div>
    </article>
  );
}
