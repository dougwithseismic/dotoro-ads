"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAvailableAccounts, useConnectAccounts } from "../hooks";
import type { AvailableAccount, BusinessGroup, AdPlatform } from "../hooks";
import styles from "./AccountSelectionModal.module.css";

interface AccountSelectionModalProps {
  isOpen: boolean;
  teamId: string;
  platform?: AdPlatform;
  onClose: () => void;
  onSuccess: (connectedCount: number) => void;
}

/**
 * Get display name for a platform
 */
function getPlatformDisplayName(platform: AdPlatform): string {
  switch (platform) {
    case "google":
    case "google_ads":
      return "Google Ads";
    case "reddit":
    default:
      return "Reddit";
  }
}

/**
 * Modal for selecting ad accounts to connect after OAuth.
 *
 * This component is displayed when the OAuth callback returns with
 * `oauth=pending_selection`. It fetches available accounts from the
 * pending OAuth tokens and allows the user to select which accounts
 * to connect to their team.
 *
 * Features a searchable combobox-style interface for easy account filtering.
 * Supports both Reddit and Google Ads platforms.
 */
export function AccountSelectionModal({
  isOpen,
  teamId,
  platform = "reddit",
  onClose,
  onSuccess,
}: AccountSelectionModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const {
    businesses,
    isLoading: isLoadingAccounts,
    error: fetchError,
    fetchAvailableAccounts,
    clearError: clearFetchError,
  } = useAvailableAccounts();

  const {
    isConnecting,
    error: connectError,
    connect,
    clearError: clearConnectError,
    reset: resetConnect,
  } = useConnectAccounts();

  // Filter businesses and accounts based on search query
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery.trim()) return businesses;

    const query = searchQuery.toLowerCase();
    return businesses
      .map((biz) => ({
        ...biz,
        accounts: biz.accounts.filter(
          (acc) =>
            acc.name.toLowerCase().includes(query) ||
            acc.id.toLowerCase().includes(query) ||
            (acc.currency && acc.currency.toLowerCase().includes(query)) ||
            biz.name.toLowerCase().includes(query)
        ),
      }))
      .filter((biz) => biz.accounts.length > 0);
  }, [businesses, searchQuery]);

  // Get all selectable accounts (not already connected) from filtered results
  const selectableAccounts = useMemo(() => {
    return filteredBusinesses.flatMap((biz) =>
      biz.accounts.filter((acc) => !acc.alreadyConnected)
    );
  }, [filteredBusinesses]);

  // Get all selectable accounts (not already connected) from ALL businesses (for selection count)
  const allSelectableAccounts = useMemo(() => {
    return businesses.flatMap((biz) =>
      biz.accounts.filter((acc) => !acc.alreadyConnected)
    );
  }, [businesses]);

  // Check if all visible selectable accounts are selected
  const allSelected = useMemo(() => {
    if (selectableAccounts.length === 0) return false;
    return selectableAccounts.every((acc) => selectedIds.has(acc.id));
  }, [selectableAccounts, selectedIds]);

  // Fetch accounts when modal opens
  useEffect(() => {
    if (isOpen && teamId) {
      fetchAvailableAccounts(teamId, platform);
      setSelectedIds(new Set());
      setSearchQuery("");
    }
  }, [isOpen, teamId, platform, fetchAvailableAccounts]);

  // Focus management - focus search input when accounts load
  useEffect(() => {
    if (isOpen && !isLoadingAccounts && !fetchError && businesses.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoadingAccounts, fetchError, businesses.length]);

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isConnecting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, isConnecting, onClose]);

  // Cleanup when closing
  useEffect(() => {
    if (!isOpen) {
      clearFetchError();
      clearConnectError();
      resetConnect();
      setSelectedIds(new Set());
      setSearchQuery("");
    }
  }, [isOpen, clearFetchError, clearConnectError, resetConnect]);

  const handleAccountToggle = useCallback((accountId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      // Deselect only the visible/filtered accounts
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableAccounts.forEach((acc) => next.delete(acc.id));
        return next;
      });
    } else {
      // Select all visible/filtered accounts (add to existing selection)
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableAccounts.forEach((acc) => next.add(acc.id));
        return next;
      });
    }
  }, [allSelected, selectableAccounts]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, []);

  const handleConnect = useCallback(async () => {
    const result = await connect(teamId, Array.from(selectedIds), platform);
    if (result) {
      onSuccess(result.connectedCount);
    }
  }, [connect, teamId, selectedIds, platform, onSuccess]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isConnecting) {
        onClose();
      }
    },
    [isConnecting, onClose]
  );

  if (!isOpen) return null;

  const error = fetchError || connectError;

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-selection-title"
        aria-describedby="account-selection-description"
        className={styles.dialog}
      >
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 12L11 15L16 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 id="account-selection-title" className={styles.title}>
            Select {getPlatformDisplayName(platform)} Accounts
          </h2>

          <p id="account-selection-description" className={styles.description}>
            Choose which {getPlatformDisplayName(platform)} ad accounts you want to connect to your team.
          </p>
        </div>

        <div className={styles.content}>
          {isLoadingAccounts && (
            <div className={styles.loadingWrapper} role="status" aria-live="polite">
              <div className={styles.spinner} />
              <span className={styles.loadingText}>
                Loading available accounts...
              </span>
            </div>
          )}

          {error && !isLoadingAccounts && (
            <div className={styles.errorWrapper}>
              <p className={styles.errorMessage}>{error}</p>
              {fetchError && (
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={() => fetchAvailableAccounts(teamId)}
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {!isLoadingAccounts && !fetchError && businesses.length === 0 && (
            <div className={styles.emptyWrapper}>
              <p className={styles.emptyText}>
                No ad accounts found. Make sure you have access to {getPlatformDisplayName(platform)} accounts.
              </p>
            </div>
          )}

          {!isLoadingAccounts && !fetchError && businesses.length > 0 && (
            <>
              {/* Search Input */}
              <div className={styles.searchWrapper}>
                <div className={styles.searchInputContainer}>
                  <svg
                    className={styles.searchIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 14L10.5 10.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search accounts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isConnecting}
                    aria-label="Search accounts"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={styles.clearSearchButton}
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* No results message */}
              {filteredBusinesses.length === 0 && searchQuery && (
                <div className={styles.noResults}>
                  <p>No accounts match &quot;{searchQuery}&quot;</p>
                  <button
                    type="button"
                    className={styles.clearSearchLink}
                    onClick={handleClearSearch}
                  >
                    Clear search
                  </button>
                </div>
              )}

              {/* Select All - only show when there are visible selectable accounts */}
              {selectableAccounts.length > 0 && (
                <div className={styles.selectAllWrapper}>
                  <button
                    type="button"
                    className={styles.selectAllButton}
                    onClick={handleSelectAll}
                    disabled={isConnecting}
                    aria-pressed={allSelected}
                  >
                    <div className={`${styles.checkbox} ${allSelected ? styles.selected : ""}`}>
                      {allSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6L5 9L10 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span>{searchQuery ? "Select visible" : "Select all"}</span>
                    <span className={styles.selectionCount}>
                      {selectedIds.size} of {allSelectableAccounts.length} selected
                    </span>
                  </button>
                </div>
              )}

              {filteredBusinesses.map((business) => (
                <BusinessSection
                  key={business.id}
                  business={business}
                  selectedIds={selectedIds}
                  onToggle={handleAccountToggle}
                  disabled={isConnecting}
                />
              ))}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.actions}>
            <button
              ref={cancelButtonRef}
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.connectButton}
              onClick={handleConnect}
              disabled={selectedIds.size === 0 || isConnecting || isLoadingAccounts}
            >
              {isConnecting
                ? "Connecting..."
                : `Connect ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Business section component
 */
interface BusinessSectionProps {
  business: BusinessGroup;
  selectedIds: Set<string>;
  onToggle: (accountId: string) => void;
  disabled: boolean;
}

function BusinessSection({
  business,
  selectedIds,
  onToggle,
  disabled,
}: BusinessSectionProps) {
  return (
    <div className={styles.businessSection}>
      <h3 className={styles.businessName}>{business.name}</h3>
      <div className={styles.accountsList}>
        {business.accounts.map((account) => (
          <AccountItem
            key={account.id}
            account={account}
            isSelected={selectedIds.has(account.id)}
            onToggle={onToggle}
            disabled={disabled || account.alreadyConnected}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Account item component
 */
interface AccountItemProps {
  account: AvailableAccount;
  isSelected: boolean;
  onToggle: (accountId: string) => void;
  disabled: boolean;
}

function AccountItem({
  account,
  isSelected,
  onToggle,
  disabled,
}: AccountItemProps) {
  const handleClick = () => {
    if (!disabled) {
      onToggle(account.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !disabled) {
      e.preventDefault();
      onToggle(account.id);
    }
  };

  return (
    <div
      className={`${styles.accountItem} ${isSelected ? styles.selected : ""} ${disabled ? styles.disabled : ""}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="checkbox"
      aria-checked={isSelected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <div className={styles.checkbox}>
        {isSelected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className={styles.accountInfo}>
        <p className={styles.accountName}>{account.name}</p>
        <div className={styles.accountMeta}>
          <span>{account.currency}</span>
          {account.type && <span className={styles.typeBadge}>{account.type}</span>}
          {account.timeZone && <span className={styles.typeBadge}>{account.timeZone}</span>}
          {account.alreadyConnected && (
            <span className={styles.connectedBadge}>Already Connected</span>
          )}
        </div>
      </div>
    </div>
  );
}
