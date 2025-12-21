"use client";

import { useState, useEffect, useCallback } from "react";
import type { AdAccount } from "./types";
import { PLATFORM_CONFIGS } from "./types";
import { AccountsList } from "./components/AccountsList";
import { ConnectButton } from "./components/ConnectButton";
import styles from "./Accounts.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/v1/accounts`);
      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }
      const data = await response.json();
      // Convert date strings to Date objects
      const accountsWithDates = data.data.map((acc: AdAccount) => ({
        ...acc,
        lastSyncedAt: acc.lastSyncedAt ? new Date(acc.lastSyncedAt) : undefined,
        createdAt: new Date(acc.createdAt),
      }));
      setAccounts(accountsWithDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleConnect = (platform: string) => {
    const config = PLATFORM_CONFIGS.find((c) => c.platform === platform);
    if (config?.oauthUrl) {
      // In production, this would redirect to OAuth flow
      window.location.href = `${API_BASE}${config.oauthUrl}`;
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/accounts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect account");
      }
      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disconnect account"
      );
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/accounts/${id}/sync`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to refresh account");
      }
      // Update the lastSyncedAt for this account
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === id ? { ...acc, lastSyncedAt: new Date() } : acc
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh account");
    }
  };

  const handleReconnect = (id: string) => {
    const account = accounts.find((acc) => acc.id === id);
    if (account) {
      handleConnect(account.platform);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading accounts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Ad Accounts</h1>
          <p className={styles.subtitle}>
            Connect and manage your advertising platform accounts
          </p>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchAccounts} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Connect a Platform</h2>
        <div className={styles.connectGrid}>
          {PLATFORM_CONFIGS.map((config) => (
            <ConnectButton
              key={config.platform}
              config={config}
              onClick={() => handleConnect(config.platform)}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <AccountsList
          accounts={accounts}
          onDisconnect={handleDisconnect}
          onRefresh={handleRefresh}
          onReconnect={handleReconnect}
        />
      </section>
    </div>
  );
}
