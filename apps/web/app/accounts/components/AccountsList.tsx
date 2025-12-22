import type { AdAccount } from "../types";
import { AccountCard } from "./AccountCard";
import styles from "./AccountsList.module.css";

interface AccountsListProps {
  accounts: AdAccount[];
  onDisconnect: (id: string) => void;
  onRefresh: (id: string) => void;
  onReconnect: (id: string) => void;
  onViewHistory?: (id: string) => void;
}

export function AccountsList({
  accounts,
  onDisconnect,
  onRefresh,
  onReconnect,
  onViewHistory,
}: AccountsListProps) {
  if (accounts.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="8"
              y="8"
              width="32"
              height="32"
              rx="4"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d="M24 18V30M18 24H30"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h3 className={styles.emptyTitle}>No accounts connected</h3>
        <p className={styles.emptyText}>
          Connect an ad account to start managing your campaigns
        </p>
      </div>
    );
  }

  const accountCount = accounts.length;
  const accountLabel = accountCount === 1 ? "account" : "accounts";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Connected Accounts</h2>
        <span className={styles.count}>
          {accountCount} {accountLabel}
        </span>
      </div>
      <div className={styles.grid}>
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onDisconnect={onDisconnect}
            onRefresh={onRefresh}
            onReconnect={onReconnect}
            onViewHistory={onViewHistory}
          />
        ))}
      </div>
    </div>
  );
}
