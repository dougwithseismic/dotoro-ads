"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import type { AdAccount, SyncHistoryEntry } from "./types";
import { PLATFORM_CONFIGS } from "./types";
import { AccountsList } from "./components/AccountsList";
import { AccountSelectionModal } from "./components/AccountSelectionModal";
import { ConnectButton } from "./components/ConnectButton";
import { DisconnectDialog } from "./components/DisconnectDialog";
import { SyncHistoryModal } from "./components/SyncHistoryModal";
import { API_BASE_URL, api } from "@/lib/api-client";
import { useTeam } from "@/lib/teams/context";
import styles from "./Accounts.module.css";

interface AccountsApiResponse {
  data: AccountApiItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AccountApiItem {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  email?: string;
  status: string;
  healthStatus: string;
  lastSyncedAt?: string;
  createdAt: string;
  campaignCount: number;
  tokenInfo?: {
    expiresAt?: string;
    isExpired: boolean;
    daysUntilExpiry?: number;
  };
  errorDetails?: string;
  syncHistory?: Array<{
    id: string;
    timestamp: string;
    status: "success" | "failed";
    campaignsSynced?: number;
    errorMessage?: string;
  }>;
}

/**
 * Derive healthStatus from account status
 */
function deriveHealthStatus(status: string): AdAccount["healthStatus"] {
  if (status === "active") return "healthy";
  if (status === "error") return "error";
  return "warning";
}

/**
 * Transform API response dates to Date objects
 */
function transformAccount(account: AccountApiItem): AdAccount {
  return {
    ...account,
    platform: account.platform as AdAccount["platform"],
    status: account.status as AdAccount["status"],
    healthStatus: deriveHealthStatus(account.status),
    lastSyncedAt: account.lastSyncedAt
      ? new Date(account.lastSyncedAt)
      : undefined,
    createdAt: new Date(account.createdAt),
    tokenInfo: account.tokenInfo
      ? {
          ...account.tokenInfo,
          expiresAt: account.tokenInfo.expiresAt
            ? new Date(account.tokenInfo.expiresAt)
            : undefined,
        }
      : undefined,
    syncHistory: account.syncHistory?.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    })),
  };
}

function AccountsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams<{ locale: string; teamSlug: string }>();
  const { currentTeam } = useTeam();

  // Build the current page path for clean URL replacement
  const currentPath = `/${params.locale}/${params.teamSlug}/accounts`;
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
  const [accountSelectionModal, setAccountSelectionModal] = useState<{
    isOpen: boolean;
    platform: string | null;
  }>({
    isOpen: false,
    platform: null,
  });

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<AccountsApiResponse>("/api/v1/accounts");
      const transformedAccounts = response.data.map(transformAccount);
      setAccounts(transformedAccounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle OAuth callback query params
  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");
    const errorMessage = searchParams.get("message");
    const platform = searchParams.get("platform");

    if (oauthStatus === "success") {
      const platformName = platform === "meta" ? "Meta" : platform === "google" ? "Google" : "Reddit";
      setSuccessMessage(`${platformName} account connected successfully!`);
      // Clear query params from URL
      router.replace(currentPath, { scroll: false });
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      // Refresh accounts list
      fetchAccounts();
    } else if (oauthStatus === "pending_selection") {
      // New flow: OAuth completed, user needs to select which accounts to connect
      setAccountSelectionModal({
        isOpen: true,
        platform: platform || "reddit",
      });
      // Clear query params from URL
      router.replace(currentPath, { scroll: false });
    } else if (oauthStatus === "error") {
      const platformName = platform === "meta" ? "Meta" : platform === "google" ? "Google" : "Reddit";
      setError(errorMessage || `Failed to connect ${platformName} account`);
      // Clear query params from URL
      router.replace(currentPath, { scroll: false });
    }
  }, [searchParams, router, fetchAccounts]);

  const handleConnect = async (platform: string) => {
    const config = PLATFORM_CONFIGS.find((c) => c.platform === platform);
    if (!config?.available || !config.oauthUrl) return;

    try {
      setConnectingPlatform(platform);

      // Build redirect URL for OAuth callback (use team-scoped path)
      const redirectUrl = `${window.location.origin}${currentPath}`;

      // Platform-specific OAuth initialization
      if (platform === "reddit") {
        // Ensure team context is available before initiating OAuth
        if (!currentTeam?.id) {
          setError("Team context not available. Please refresh the page.");
          setConnectingPlatform(null);
          return;
        }

        // Reddit uses accountId and teamId in the request
        const tempAccountId = crypto.randomUUID();
        const response = await fetch(`${API_BASE_URL}${config.oauthUrl}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accountId: tempAccountId,
            teamId: currentTeam.id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to initialize OAuth");
        }

        const data = await response.json();
        window.location.href = data.authorizationUrl;
      } else {
        // Google and Meta use the same OAuth pattern with redirectUrl
        const response = await fetch(`${API_BASE_URL}${config.oauthUrl}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            redirectUrl,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to initialize OAuth");
        }

        const data = await response.json();
        window.location.href = data.authorizationUrl;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to connect to ${config.name}`
      );
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

      await api.delete(`/api/v1/accounts/${disconnectDialog.accountId}`);

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
      await api.post(`/api/v1/accounts/${id}/sync`);

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

  const handleAccountSelectionClose = () => {
    setAccountSelectionModal({ isOpen: false, platform: null });
  };

  const handleAccountSelectionSuccess = (connectedCount: number) => {
    const platform = accountSelectionModal.platform;
    const platformName = platform === "meta" ? "Meta" : platform === "google" ? "Google" : "Reddit";
    setAccountSelectionModal({ isOpen: false, platform: null });
    setSuccessMessage(
      `Successfully connected ${connectedCount} ${platformName} account${connectedCount !== 1 ? "s" : ""}!`
    );
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
    // Refresh accounts list
    fetchAccounts();
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

      {successMessage && (
        <div className={styles.success}>
          <p>{successMessage}</p>
        </div>
      )}

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

      {currentTeam?.id && (
        <AccountSelectionModal
          isOpen={accountSelectionModal.isOpen}
          teamId={currentTeam.id}
          onClose={handleAccountSelectionClose}
          onSuccess={handleAccountSelectionSuccess}
        />
      )}
    </div>
  );
}

function AccountsPageFallback() {
  return (
    <div className={styles.page}>
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} />
        <span>Loading accounts...</span>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsPageFallback />}>
      <AccountsPageContent />
    </Suspense>
  );
}
