/**
 * Settings Page
 *
 * Main settings page with tab-based navigation for:
 * - Account: Email and basic account settings
 * - Sessions: Active session management
 * - Security: Authentication methods and security settings
 * - Notifications: Email and notification preferences
 * - Danger Zone: Account deletion and dangerous actions
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { User, Shield, Bell, Key, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SettingsLayout, type SettingsTab } from "./components/SettingsLayout";
import { SettingsSection } from "./components/SettingsSection";
import { SessionsList } from "@/components/settings/SessionsList";
import { ConnectedAccountsList } from "@/components/settings/ConnectedAccountsList";

// Valid tab IDs
const VALID_TABS = ["account", "sessions", "security", "notifications", "danger"] as const;
type TabId = (typeof VALID_TABS)[number];

/**
 * Tab configuration with icons
 */
const SETTINGS_TABS: SettingsTab[] = [
  { id: "account", label: "Account", icon: <User className="w-4 h-4" /> },
  { id: "sessions", label: "Sessions", icon: <Key className="w-4 h-4" /> },
  { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { id: "danger", label: "Danger Zone", icon: <AlertTriangle className="w-4 h-4" /> },
];

/**
 * Loading skeleton for settings content
 */
function SettingsLoadingSkeleton() {
  return (
    <div data-testid="settings-loading" className="animate-pulse space-y-6">
      <div className="space-y-4">
        <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="h-4 w-72 bg-neutral-200 dark:bg-neutral-700 rounded" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-10 w-full max-w-md bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Error state component
 */
function SettingsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-red-500 dark:text-red-400 mb-4">
        Unable to load settings. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * Account Tab Content (Placeholder for Phase 2)
 */
function AccountTabContent({ user }: { user: { email: string; name?: string | null } }) {
  return (
    <div data-testid="account-tab-content" className="space-y-6">
      <SettingsSection
        title="Email Address"
        description="Manage your email address and verification status."
      >
        <div className="flex items-center gap-3">
          <span className="text-neutral-900 dark:text-neutral-100">{user.email}</span>
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
            Verified
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Email change functionality coming soon.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Display Name"
        description="Your name as it appears across the platform."
      >
        <span className="text-neutral-900 dark:text-neutral-100">
          {user.name || "Not set"}
        </span>
      </SettingsSection>
    </div>
  );
}

/**
 * Sessions Tab Content
 *
 * Displays active sessions with the ability to revoke individual
 * sessions or all other sessions at once.
 */
function SessionsTabContent() {
  return (
    <div data-testid="sessions-tab-content" className="space-y-6">
      <SettingsSection
        title="Active Sessions"
        description="Manage your active sessions across devices. You can sign out of sessions on other devices if you notice any suspicious activity."
      >
        <SessionsList />
      </SettingsSection>
    </div>
  );
}

/**
 * Security Tab Content
 *
 * Displays connected accounts allowing users to link/unlink OAuth providers.
 * Users can connect Google, GitHub, and other providers to their account.
 */
function SecurityTabContent() {
  return (
    <div data-testid="security-tab-content" className="space-y-6">
      <SettingsSection
        title="Connected Accounts"
        description="Manage your linked authentication methods. Connect additional accounts to enable alternative sign-in options."
      >
        <ConnectedAccountsList />
      </SettingsSection>
    </div>
  );
}

/**
 * Notifications Tab Content (Placeholder for Phase 5)
 */
function NotificationsTabContent() {
  return (
    <div data-testid="notifications-tab-content" className="space-y-6">
      <SettingsSection
        title="Email Notifications"
        description="Configure when and how you receive email notifications."
      >
        <div className="p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg text-center">
          <p className="text-neutral-500 dark:text-neutral-400">
            Notification preferences coming soon.
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}

/**
 * Danger Zone Tab Content (Placeholder for Phase 6)
 */
function DangerZoneTabContent() {
  return (
    <div data-testid="danger-tab-content" className="space-y-6">
      <SettingsSection
        title="Delete Account"
        description="Permanently delete your account and all associated data."
        variant="danger"
      >
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          This action cannot be undone. All your data will be permanently removed.
        </p>
        <button
          disabled
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Delete Account (Coming Soon)
        </button>
      </SettingsSection>
    </div>
  );
}

/**
 * Main Settings Page Component
 */
export default function SettingsPage() {
  const { user, isLoading, refreshSession } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get initial tab from URL or default to "account"
  const tabFromUrl = searchParams.get("tab");
  const initialTab: TabId =
    tabFromUrl && VALID_TABS.includes(tabFromUrl as TabId)
      ? (tabFromUrl as TabId)
      : "account";

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sync tab state with URL on mount and URL changes
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab && VALID_TABS.includes(currentTab as TabId)) {
      setActiveTab(currentTab as TabId);
    }
  }, [searchParams]);

  // Handle tab change - update URL
  const handleTabChange = useCallback(
    (tabId: string) => {
      const newTab = tabId as TabId;
      setActiveTab(newTab);
      router.replace(`${pathname}?tab=${newTab}`);
    },
    [router, pathname]
  );

  // Loading state
  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
          Settings
        </h1>
        <SettingsLoadingSkeleton />
      </main>
    );
  }

  // Error state - no user data available
  if (!user) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
          Settings
        </h1>
        <SettingsErrorState onRetry={refreshSession} />
      </main>
    );
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountTabContent user={user} />;
      case "sessions":
        return <SessionsTabContent />;
      case "security":
        return <SecurityTabContent />;
      case "notifications":
        return <NotificationsTabContent />;
      case "danger":
        return <DangerZoneTabContent />;
      default:
        return <AccountTabContent user={user} />;
    }
  };

  return (
    <main>
      <SettingsLayout
        title="Settings"
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {renderTabContent()}
      </SettingsLayout>
    </main>
  );
}
