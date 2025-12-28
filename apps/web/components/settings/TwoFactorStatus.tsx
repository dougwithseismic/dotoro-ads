/**
 * TwoFactorStatus Component
 *
 * Displays the current 2FA status in the security settings tab.
 * Allows users to enable/disable 2FA and manage backup codes.
 */

"use client";

import { useState, useCallback } from "react";
import { useSession, twoFactor } from "@/lib/auth-client";
import { Shield, ShieldCheck, ShieldOff, Key, AlertTriangle, RefreshCw, Check, Copy } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TwoFactorSetup } from "./TwoFactorSetup";

/**
 * Loading skeleton for 2FA status
 */
function TwoFactorSkeleton() {
  return (
    <div data-testid="2fa-loading" className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
          <div className="space-y-2">
            <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
        </div>
        <div className="h-9 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Backup codes modal
 */
function BackupCodesModal({
  isOpen,
  onClose,
  codes,
  isLoading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  codes: string[];
  isLoading: boolean;
  error: string | null;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopyStatus("success");
      // Reset status after 2 seconds
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy backup codes to clipboard:", err);
      setCopyStatus("error");
      // Reset status after 3 seconds
      setTimeout(() => setCopyStatus("idle"), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Backup Codes
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Keep these codes safe. Each code can only be used once.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-sm">
              {codes.map((code, index) => (
                <div
                  key={index}
                  className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-center"
                >
                  {code}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {copyStatus === "error" && (
                <p className="text-sm text-red-600 dark:text-red-400" data-testid="modal-copy-error-message">
                  Could not copy to clipboard. Please copy manually.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCopy}
                  data-testid="modal-copy-backup-codes"
                  className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
                    copyStatus === "success"
                      ? "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20"
                      : copyStatus === "error"
                        ? "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {copyStatus === "success" ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : copyStatus === "error" ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Copy failed
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy All
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * TwoFactorStatus - 2FA management section for settings
 *
 * @example
 * ```tsx
 * <TwoFactorStatus />
 * ```
 */
export function TwoFactorStatus() {
  const { data: session, isPending } = useSession();
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);

  const is2FAEnabled = session?.user?.twoFactorEnabled ?? false;

  /**
   * Handle disable 2FA
   */
  const handleDisable = useCallback(async () => {
    setIsDisabling(true);
    setDisableError(null);

    try {
      // For passwordless systems, we pass an empty password
      // Better Auth's 2FA plugin will handle this appropriately
      const result = await twoFactor.disable({ password: "" });

      if (result.error) {
        setDisableError(result.error.message || "Failed to disable 2FA");
        return;
      }

      setShowDisableConfirm(false);
      // Session should auto-refresh to update the 2FA status
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setIsDisabling(false);
    }
  }, []);

  /**
   * Handle regenerate backup codes button click
   * Shows confirmation dialog first since this invalidates existing codes
   */
  const handleRegenerateClick = useCallback(() => {
    setShowRegenerateConfirm(true);
  }, []);

  /**
   * Handle confirmed backup code regeneration
   * This creates NEW codes and invalidates any previously saved codes
   */
  const handleConfirmRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    setCodesError(null);

    try {
      // For passwordless systems, we pass an empty password
      const result = await twoFactor.generateBackupCodes({ password: "" });

      if (result.error) {
        setCodesError(result.error.message || "Failed to generate backup codes");
        setShowRegenerateConfirm(false);
        return;
      }

      // Validate backup codes are present and non-empty
      const codes = result.data?.backupCodes;
      if (!codes || codes.length === 0) {
        setCodesError("Server did not return backup codes. Please try again or contact support.");
        setShowRegenerateConfirm(false);
        return;
      }

      setBackupCodes(codes);
      setShowRegenerateConfirm(false);
      setShowBackupCodes(true);
    } catch (err) {
      setCodesError(err instanceof Error ? err.message : "Failed to generate backup codes");
      setShowRegenerateConfirm(false);
    } finally {
      setIsRegenerating(false);
    }
  }, []);

  /**
   * Handle setup completion
   */
  const handleSetupComplete = useCallback(() => {
    setShowSetup(false);
    // Session should auto-refresh to update the 2FA status
  }, []);

  // Loading state
  if (isPending) {
    return <TwoFactorSkeleton />;
  }

  // Setup wizard modal
  if (showSetup) {
    return (
      <div data-testid="two-factor-setup">
        <TwoFactorSetup
          onComplete={handleSetupComplete}
          onCancel={() => setShowSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              is2FAEnabled
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            {is2FAEnabled ? (
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Shield className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
              Two-Factor Authentication
            </h3>
            <div className="flex items-center gap-2">
              {is2FAEnabled ? (
                <span
                  data-testid="2fa-enabled-badge"
                  className="text-sm text-green-600 dark:text-green-400 font-medium"
                >
                  Enabled
                </span>
              ) : (
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  Not enabled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {is2FAEnabled ? (
            <>
              <button
                type="button"
                onClick={handleRegenerateClick}
                className="px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate Codes
              </button>
              <button
                type="button"
                onClick={() => setShowDisableConfirm(true)}
                className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
              >
                <ShieldOff className="w-4 h-4" />
                Disable
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Enable 2FA
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {is2FAEnabled
          ? "Your account is protected with two-factor authentication. You will need to enter a code from your authenticator app when signing in."
          : "Add an extra layer of security to your account by requiring a code from your authenticator app when signing in."}
      </p>

      {/* Disable Error */}
      {disableError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{disableError}</p>
        </div>
      )}

      {/* Backup Codes Generation Error */}
      {codesError && !showBackupCodes && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400" data-testid="codes-error">{codesError}</p>
        </div>
      )}

      {/* Disable Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDisableConfirm}
        onClose={() => setShowDisableConfirm(false)}
        onConfirm={handleDisable}
        title="Disable Two-Factor Authentication"
        message="Are you sure you want to disable two-factor authentication? This will make your account less secure."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDisabling}
      />

      {/* Regenerate Backup Codes Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleConfirmRegenerate}
        title="Regenerate Backup Codes"
        message="This will generate new backup codes and invalidate all your existing codes. Any previously saved codes will no longer work. Are you sure you want to continue?"
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        variant="warning"
        isLoading={isRegenerating}
      />

      {/* Backup Codes Modal */}
      <BackupCodesModal
        isOpen={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        codes={backupCodes}
        isLoading={isLoadingCodes}
        error={codesError}
      />
    </div>
  );
}
