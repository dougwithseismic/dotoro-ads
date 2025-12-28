/**
 * SettingsLayout Component
 *
 * Provides a consistent layout for settings pages with tab-based navigation.
 * Supports URL-based tab state for bookmarkability and browser history.
 */

import { ReactNode } from "react";

export interface SettingsTab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SettingsLayoutProps {
  title: string;
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  isLoading?: boolean;
}

/**
 * Loading skeleton for the settings content area
 */
function SettingsLoadingSkeleton() {
  return (
    <div data-testid="settings-loading" className="animate-pulse space-y-6">
      {/* Skeleton header */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="h-4 w-72 bg-neutral-200 dark:bg-neutral-700 rounded" />
      </div>

      {/* Skeleton form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-10 w-full max-w-md bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-10 w-full max-w-md bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * SettingsLayout - Tab-based layout for settings pages
 *
 * Features:
 * - Tab navigation with visual feedback
 * - Loading state with skeleton UI
 * - Danger zone styling for destructive tabs
 * - Full accessibility support (ARIA roles)
 *
 * @example
 * ```tsx
 * <SettingsLayout
 *   title="Settings"
 *   tabs={[
 *     { id: "account", label: "Account" },
 *     { id: "security", label: "Security" },
 *   ]}
 *   activeTab="account"
 *   onTabChange={(tab) => setActiveTab(tab)}
 * >
 *   {activeTab === "account" && <AccountSettings />}
 *   {activeTab === "security" && <SecuritySettings />}
 * </SettingsLayout>
 * ```
 */
export function SettingsLayout({
  title,
  tabs,
  activeTab,
  onTabChange,
  children,
  isLoading = false,
}: SettingsLayoutProps) {
  const tabPanelId = "settings-tab-panel";

  const handleTabClick = (tabId: string) => {
    if (tabId !== activeTab) {
      onTabChange(tabId);
    }
  };

  return (
    <div data-testid="settings-layout" className="max-w-4xl mx-auto p-6">
      {/* Page Title */}
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        {title}
      </h1>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200 dark:border-zinc-700 mb-6">
        <nav className="flex gap-4" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDanger = tab.id === "danger";

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={tabPanelId}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  flex items-center gap-2 px-3 py-2 text-sm font-medium
                  border-b-2 transition-colors -mb-px
                  ${
                    isActive
                      ? isDanger
                        ? "border-red-500 text-red-600 dark:text-red-400"
                        : "border-blue-500 text-blue-600 dark:text-blue-400"
                      : isDanger
                        ? "border-transparent text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div
        id={tabPanelId}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="py-4"
      >
        {isLoading ? <SettingsLoadingSkeleton /> : children}
      </div>
    </div>
  );
}
