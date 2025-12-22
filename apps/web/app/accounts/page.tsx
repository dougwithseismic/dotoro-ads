"use client";

import { useState, useEffect, useCallback } from "react";
import type { AdAccount, SyncHistoryEntry } from "./types";
import { PLATFORM_CONFIGS } from "./types";
import { AccountsList } from "./components/AccountsList";
import { ConnectButton } from "./components/ConnectButton";
import { DisconnectDialog } from "./components/DisconnectDialog";
import { SyncHistoryModal } from "./components/SyncHistoryModal";
import styles from "./Accounts.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Mock data for development
const MOCK_ACCOUNTS: AdAccount[] = [
  {
    id: "acc-1",
    platform: "reddit",
    accountId: "t2_abc123",
    accountName: "Reddit Ads - Main",
    email: "marketing@mycompany.com",
    status: "connected",
    healthStatus: "healthy",
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    createdAt: new Date("2024-11-15"),
    campaignCount: 12,
    tokenInfo: {
      isExpired: false,
      daysUntilExpiry: 45,
    },
    syncHistory: [
      { id: "s1", timestamp: new Date(Date.now() - 1000 * 60 * 30), status: "success", campaignsSynced: 12 },
      { id: "s2", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), status: "success", campaignsSynced: 11 },
      { id: "s3", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), status: "failed", errorMessage: "API rate limit exceeded" },
    ],
  },
  {
    id: "acc-2",
    platform: "reddit",
    accountId: "t2_xyz789",
    accountName: "Reddit Ads - Secondary",
    email: "ads@otherteam.com",
    status: "token_expired",
    healthStatus: "warning",
    createdAt: new Date("2024-10-01"),
    campaignCount: 5,
    tokenInfo: {
      isExpired: true,
      expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    },
  },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState<{
    isOpen: boolean;
    accountId: string | null;
    accountName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    accountId: null,
    accountName: "",
    isLoading: false,
  });
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    accountName: string;
    history: SyncHistoryEntry[];
  }>({
    isOpen: false,
    accountName: "",
    history: [],
  });

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use mock data for development
      // In production, this would fetch from the API
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
      setAccounts(MOCK_ACCOUNTS);

      // Uncomment below for real API integration
      // const response = await fetch(`${API_BASE}/api/v1/accounts`);
      // if (!response.ok) {
      //   throw new Error("Failed to fetch accounts");
      // }
      // const data = await response.json();
      // const accountsWithDates = data.data.map((acc: AdAccount) => ({
      //   ...acc,
      //   lastSyncedAt: acc.lastSyncedAt ? new Date(acc.lastSyncedAt) : undefined,
      //   createdAt: new Date(acc.createdAt),
      // }));
      // setAccounts(accountsWithDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleConnect = async (platform: string) => {
    const config = PLATFORM_CONFIGS.find((c) => c.platform === platform);
    if (!config?.oauthUrl || !config.available) return;

    try {
      setConnectingPlatform(platform);
      // Simulate OAuth flow delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // In production, this would redirect to OAuth flow
      // window.location.href = `${API_BASE}${config.oauthUrl}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to connect to ${config.name}`
      );
    } finally {
      setConnectingPlatform(null);
    }
  };

  const openDisconnectDialog = (id: string) => {
    const account = accounts.find((acc) => acc.id === id);
    if (account) {
      setDisconnectDialog({
        isOpen: true,
        accountId: id,
        accountName: account.accountName,
        isLoading: false,
      });
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectDialog.accountId) return;

    try {
      setDisconnectDialog((prev) => ({ ...prev, isLoading: true }));

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In production:
      // const response = await fetch(`${API_BASE}/api/v1/accounts/${disconnectDialog.accountId}`, {
      //   method: "DELETE",
      // });
      // if (!response.ok) throw new Error("Failed to disconnect account");

      setAccounts((prev) =>
        prev.filter((acc) => acc.id !== disconnectDialog.accountId)
      );
      setDisconnectDialog({
        isOpen: false,
        accountId: null,
        accountName: "",
        isLoading: false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disconnect account"
      );
      setDisconnectDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In production:
      // const response = await fetch(`${API_BASE}/api/v1/accounts/${id}/sync`, {
      //   method: "POST",
      // });
      // if (!response.ok) throw new Error("Failed to refresh account");

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

  const handleViewHistory = (id: string) => {
    const account = accounts.find((acc) => acc.id === id);
    if (account && account.syncHistory) {
      setHistoryModal({
        isOpen: true,
        accountName: account.accountName,
        history: account.syncHistory,
      });
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
              isLoading={connectingPlatform === config.platform}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <AccountsList
          accounts={accounts}
          onDisconnect={openDisconnectDialog}
          onRefresh={handleRefresh}
          onReconnect={handleReconnect}
          onViewHistory={handleViewHistory}
        />
      </section>

      <DisconnectDialog
        isOpen={disconnectDialog.isOpen}
        accountName={disconnectDialog.accountName}
        onConfirm={handleDisconnect}
        onCancel={() =>
          setDisconnectDialog({
            isOpen: false,
            accountId: null,
            accountName: "",
            isLoading: false,
          })
        }
        isLoading={disconnectDialog.isLoading}
      />

      <SyncHistoryModal
        isOpen={historyModal.isOpen}
        accountName={historyModal.accountName}
        history={historyModal.history}
        onClose={() =>
          setHistoryModal({
            isOpen: false,
            accountName: "",
            history: [],
          })
        }
      />
    </div>
  );
}
