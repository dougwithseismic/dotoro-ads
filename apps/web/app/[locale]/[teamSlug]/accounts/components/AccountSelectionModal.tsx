"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAvailableAccounts, useConnectAccounts } from "../hooks";
import type { RedditAvailableAccount, RedditBusiness } from "../hooks";
import styles from "./AccountSelectionModal.module.css";

interface AccountSelectionModalProps {
  isOpen: boolean;
  teamId: string;
  onClose: () => void;
  onSuccess: (connectedCount: number) => void;
}

/**
 * Modal for selecting Reddit ad accounts to connect after OAuth.
 *
 * This component is displayed when the OAuth callback returns with
 * `oauth=pending_selection`. It fetches available accounts from the
 * pending OAuth tokens and allows the user to select which accounts
 * to connect to their team.
 */
export function AccountSelectionModal({
  isOpen,
  teamId,
  onClose,
  onSuccess,
}: AccountSelectionModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Get all selectable accounts (not already connected)
  const selectableAccounts = useMemo(() => {
    return businesses.flatMap((biz) =>
      biz.accounts.filter((acc) => !acc.alreadyConnected)
    );
  }, [businesses]);

  // Check if all selectable accounts are selected
  const allSelected = useMemo(() => {
    if (selectableAccounts.length === 0) return false;
    return selectableAccounts.every((acc) => selectedIds.has(acc.id));
  }, [selectableAccounts, selectedIds]);

  // Fetch accounts when modal opens
  useEffect(() => {
    if (isOpen && teamId) {
      fetchAvailableAccounts(teamId);
      setSelectedIds(new Set());
    }
  }, [isOpen, teamId, fetchAvailableAccounts]);

  // Focus management
  useEffect(() => {
    if (isOpen && !isLoadingAccounts && !fetchError) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen, isLoadingAccounts, fetchError]);

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
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableAccounts.map((acc) => acc.id)));
    }
  }, [allSelected, selectableAccounts]);

  const handleConnect = useCallback(async () => {
    const result = await connect(teamId, Array.from(selectedIds));
    if (result) {
      onSuccess(result.connectedCount);
    }
  }, [connect, teamId, selectedIds, onSuccess]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isConnecting) {
        onClose();
      }
    },
    [isConnecting, onClose]
  );

  if (!isOpen) return null;

  const hasSelectableAccounts = selectableAccounts.length > 0;
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
            Select Reddit Ad Accounts
          </h2>

          <p id="account-selection-description" className={styles.description}>
            Choose which ad accounts you want to connect to your team.
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
                No ad accounts found. Make sure you have access to Reddit Ads
                accounts.
              </p>
            </div>
          )}

          {!isLoadingAccounts && !fetchError && businesses.length > 0 && (
            <>
              {hasSelectableAccounts && (
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
                    <span>Select All</span>
                    <span className={styles.selectionCount}>
                      {selectedIds.size} of {selectableAccounts.length} selected
                    </span>
                  </button>
                </div>
              )}

              {businesses.map((business) => (
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
  business: RedditBusiness;
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
  account: RedditAvailableAccount;
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
          <span className={styles.typeBadge}>{account.type}</span>
          {account.alreadyConnected && (
            <span className={styles.connectedBadge}>Already Connected</span>
          )}
        </div>
      </div>
    </div>
  );
}
